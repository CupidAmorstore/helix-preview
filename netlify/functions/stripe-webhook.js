const { loadStore, saveStore, applyStripeEvent } = require('./_lib/helix-store');

function json(body, statusCode = 200) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  };
}

exports.handler = async (event) => {
  const stripeSecret = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripeSecret || !webhookSecret) {
    return json({ error: 'stripe_not_configured' }, 500);
  }

  let stripe;
  try {
    stripe = require('stripe')(stripeSecret, { apiVersion: process.env.STRIPE_API_VERSION || '2026-02-25.clover' });
  } catch {
    return json({ error: 'stripe_sdk_missing' }, 500);
  }

  const sig = event.headers['stripe-signature'];
  let stripeEvent;

  try {
    stripeEvent = stripe.webhooks.constructEvent(event.body, sig, webhookSecret);
  } catch (err) {
    return json({ error: 'invalid_signature', message: err.message }, 400);
  }

  const store = loadStore();
  const change = applyStripeEvent(store, stripeEvent);
  const persist = saveStore(store);

  console.log('[HELIX] Stripe webhook received:', stripeEvent.type, change, persist);

  return json({ received: true, stored: persist.persisted, change });
};
