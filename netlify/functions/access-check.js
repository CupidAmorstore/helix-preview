const { URL } = require('url');
const { loadStore, isActiveStatus } = require('./_lib/helix-store');

function json(body, statusCode = 200) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type'
    },
    body: JSON.stringify(body)
  };
}

function extractPlan(sub) {
  if (!sub) return null;
  const price = sub.items && sub.items.data && sub.items.data[0]
    ? sub.items.data[0].price
    : sub.plan || null;
  if (!price) return null;
  if (typeof price === 'string') {
    return { price_id: price, tier: sub.metadata && sub.metadata.helix_tier || null };
  }
  return {
    price_id: price.id || null,
    product_id: typeof price.product === 'string' ? price.product : price.product && price.product.id || null,
    amount: price.unit_amount || null,
    currency: price.currency || null,
    interval: price.recurring && price.recurring.interval || null,
    interval_count: price.recurring && price.recurring.interval_count || null,
    nickname: price.nickname || null,
    tier: sub.metadata && sub.metadata.helix_tier || price.metadata && price.metadata.helix_tier || null
  };
}

function resolveAccessFromStore(store, sessionId, customerId) {
  if (sessionId && store.sessions[sessionId]) {
    const session = store.sessions[sessionId];
    const sub = session.subscription && store.subscriptions[session.subscription];
    const active = session.payment_status === 'paid' && sub && isActiveStatus(sub.status);
    return {
      access: active ? 'active' : 'inactive',
      source: 'store_session',
      subscription_status: sub ? sub.status : 'unknown',
      plan: sub ? {
        price_id: sub.price_id || null,
        product_id: sub.product_id || null,
        amount: sub.amount || null,
        currency: sub.currency || null,
        interval: sub.interval || null,
        interval_count: sub.interval_count || null,
        nickname: sub.nickname || null,
        tier: sub.tier || null
      } : null
    };
  }

  if (customerId && store.customers[customerId]) {
    const customer = store.customers[customerId];
    const active = customer.status === 'active';
    return {
      access: active ? 'active' : 'inactive',
      source: 'store_customer',
      subscription_status: active ? 'active' : 'inactive',
      plan: null
    };
  }

  return null;
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'GET') {
    return json({ error: 'method_not_allowed' }, 405);
  }

  const stripeSecret = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecret) {
    return json({ access: 'unknown', reason: 'stripe_not_configured' }, 500);
  }

  const sessionId = event.queryStringParameters && event.queryStringParameters.session_id;
  const customerId = event.queryStringParameters && event.queryStringParameters.customer_id;

  if (!sessionId && !customerId) {
    return json({ access: 'unknown', reason: 'missing_identifier' }, 400);
  }

  const store = loadStore();
  const storeResult = resolveAccessFromStore(store, sessionId, customerId);
  if (storeResult) {
    return json({
      ...storeResult,
      note: 'Access check resolved from local store. Replace with persistent backend before production.'
    });
  }

  let stripe;
  try {
    stripe = require('stripe')(stripeSecret, { apiVersion: process.env.STRIPE_API_VERSION || '2026-02-25.clover' });
  } catch {
    return json({ access: 'unknown', reason: 'stripe_sdk_missing' }, 500);
  }

  try {
    if (sessionId) {
      const session = await stripe.checkout.sessions.retrieve(sessionId, { expand: ['subscription'] });
      const sub = session.subscription;
      const active = session.payment_status === 'paid' && sub && ['active', 'trialing'].includes(sub.status);
      return json({
        access: active ? 'active' : 'inactive',
        subscription_status: sub ? sub.status : 'none',
        plan: extractPlan(sub),
        source: 'stripe_session',
        note: 'Access check uses Stripe session only. Map this to a real user record server-side.'
      });
    }

    if (customerId) {
      const subs = await stripe.subscriptions.list({ customer: customerId, status: 'all', limit: 10 });
      const active = subs.data.some(s => ['active', 'trialing'].includes(s.status));
      const activeSub = subs.data.find(s => ['active', 'trialing'].includes(s.status));
      return json({
        access: active ? 'active' : 'inactive',
        subscription_status: active ? 'active' : 'inactive',
        plan: activeSub ? extractPlan(activeSub) : null,
        source: 'stripe_customer',
        note: 'Access check uses Stripe customer only. Map this to a real user record server-side.'
      });
    }
  } catch (err) {
    return json({ access: 'unknown', reason: 'stripe_error', message: err.message }, 500);
  }

  return json({ access: 'unknown', reason: 'unhandled' }, 500);
};
