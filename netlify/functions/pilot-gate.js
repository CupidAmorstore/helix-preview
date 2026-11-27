const { URL } = require('url');
const { loadStore, isActiveStatus } = require('./_lib/helix-store');

function html(body, statusCode = 200) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
      'Access-Control-Allow-Origin': '*'
    },
    body
  };
}

function deny(reason) {
  return html(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>HELIX | Access Required</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0a0b0f; color: #e2e8f0; padding: 40px; }
    .card { max-width: 560px; margin: 0 auto; background: #111318; border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 24px; }
    h1 { margin: 0 0 12px; font-size: 22px; }
    p { margin: 0 0 12px; color: #94a3b8; line-height: 1.6; }
    a { color: #10b981; text-decoration: none; }
    .meta { font-size: 12px; color: #64748b; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Access Required</h1>
    <p>This pilot endpoint is gated. Provide a valid access token or Stripe session to continue.</p>
    <p>Request access via <a href="/checkout/index.html">HELIX Access</a>.</p>
    <p class="meta">Reason: ${reason}</p>
  </div>
</body>
</html>`, 403);
}

function allowHtml(note, source) {
  const timestamp = new Date().toISOString();
  return html(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>HELIX | Pilot Access</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0a0b0f; color: #e2e8f0; padding: 40px; }
    .card { max-width: 640px; margin: 0 auto; background: #111318; border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 24px; }
    h1 { margin: 0 0 12px; font-size: 22px; }
    p { margin: 0 0 12px; color: #94a3b8; line-height: 1.6; }
    .ok { color: #10b981; font-weight: 700; }
    .meta { font-size: 12px; color: #64748b; }
    a { color: #10b981; text-decoration: none; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Pilot Access Confirmed</h1>
    <p class="ok">Access gate check passed.</p>
    <p>${note}</p>
    <p>Continue to the <a href="/index.html">HELIX dashboard</a>.</p>
    <p class="meta">Source: ${source} | ${timestamp}</p>
    <p class="meta">This gate is minimal and must be backed by server-side enforcement before production.</p>
  </div>
</body>
</html>`);
}

function formatPlan(plan) {
  if (!plan) return '';
  const tier = plan.tier ? `Tier: ${plan.tier}` : null;
  const interval = plan.interval ? `${plan.interval}${plan.interval_count && plan.interval_count > 1 ? ` x${plan.interval_count}` : ''}` : null;
  const amount = plan.amount && plan.currency ? `${(plan.amount / 100).toFixed(2)} ${plan.currency.toUpperCase()}` : null;
  const parts = [tier, interval, amount].filter(Boolean);
  if (!parts.length) return '';
  return ` Plan: ${parts.join(' | ')}.`;
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
    return html('Method Not Allowed', 405);
  }

  const tokenHeader = event.headers?.authorization || event.headers?.Authorization || '';
  const tokenFromHeader = tokenHeader.toLowerCase().startsWith('bearer ') ? tokenHeader.slice(7) : '';
  const qs = event.queryStringParameters || {};
  const token = qs.token || tokenFromHeader || '';
  const sessionId = qs.session_id;
  const customerId = qs.customer_id;

  const sharedToken = process.env.HELIX_ACCESS_TOKEN;
  if (sharedToken && token && token === sharedToken) {
    return allowHtml('Access granted via shared pilot token.', 'token');
  }

  const store = loadStore();
  const storeResult = resolveAccessFromStore(store, sessionId, customerId);
  if (storeResult) {
    if (storeResult.access === 'active') {
      return allowHtml(`Access confirmed from stored subscription status.${formatPlan(storeResult.plan)}`, storeResult.source);
    }
    return deny(`stored_${storeResult.subscription_status}`);
  }

  const stripeSecret = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecret) {
    return deny('stripe_not_configured');
  }

  if (!sessionId && !customerId) {
    return deny('missing_identifier');
  }

  let stripe;
  try {
    stripe = require('stripe')(stripeSecret, { apiVersion: process.env.STRIPE_API_VERSION || '2026-02-25.clover' });
  } catch {
    return deny('stripe_sdk_missing');
  }

  try {
    if (sessionId) {
      const session = await stripe.checkout.sessions.retrieve(sessionId, { expand: ['subscription'] });
      const sub = session.subscription;
      const active = session.payment_status === 'paid' && sub && ['active', 'trialing'].includes(sub.status);
      if (active) {
        const plan = sub ? { interval: sub.items && sub.items.data && sub.items.data[0] && sub.items.data[0].price && sub.items.data[0].price.recurring && sub.items.data[0].price.recurring.interval || null,
          interval_count: sub.items && sub.items.data && sub.items.data[0] && sub.items.data[0].price && sub.items.data[0].price.recurring && sub.items.data[0].price.recurring.interval_count || null,
          amount: sub.items && sub.items.data && sub.items.data[0] && sub.items.data[0].price && sub.items.data[0].price.unit_amount || null,
          currency: sub.items && sub.items.data && sub.items.data[0] && sub.items.data[0].price && sub.items.data[0].price.currency || null,
          tier: sub.metadata && sub.metadata.helix_tier || null } : null;
        return allowHtml(`Access confirmed from Stripe session status.${formatPlan(plan)}`, 'stripe_session');
      }
      return deny(sub ? `stripe_subscription_${sub.status}` : 'stripe_subscription_missing');
    }

    if (customerId) {
      const subs = await stripe.subscriptions.list({ customer: customerId, status: 'all', limit: 10 });
      const active = subs.data.some(s => ['active', 'trialing'].includes(s.status));
      if (active) {
        const activeSub = subs.data.find(s => ['active', 'trialing'].includes(s.status));
        const plan = activeSub ? { interval: activeSub.items && activeSub.items.data && activeSub.items.data[0] && activeSub.items.data[0].price && activeSub.items.data[0].price.recurring && activeSub.items.data[0].price.recurring.interval || null,
          interval_count: activeSub.items && activeSub.items.data && activeSub.items.data[0] && activeSub.items.data[0].price && activeSub.items.data[0].price.recurring && activeSub.items.data[0].price.recurring.interval_count || null,
          amount: activeSub.items && activeSub.items.data && activeSub.items.data[0] && activeSub.items.data[0].price && activeSub.items.data[0].price.unit_amount || null,
          currency: activeSub.items && activeSub.items.data && activeSub.items.data[0] && activeSub.items.data[0].price && activeSub.items.data[0].price.currency || null,
          tier: activeSub.metadata && activeSub.metadata.helix_tier || null } : null;
        return allowHtml(`Access confirmed from Stripe customer subscription status.${formatPlan(plan)}`, 'stripe_customer');
      }
      return deny('stripe_subscription_inactive');
    }
  } catch (err) {
    return deny(`stripe_error_${err.message}`);
  }

  return deny('unhandled');
};
