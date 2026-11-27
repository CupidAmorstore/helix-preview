const { URL } = require('url');

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

function getBaseUrl(event) {
  const fromEnv = process.env.APP_BASE_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, '');
  const origin = event.headers?.origin || event.headers?.Origin;
  if (origin) return origin.replace(/\/$/, '');
  return 'http://localhost:8888';
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    return json({ error: 'method_not_allowed' }, 405);
  }

  let payload = {};
  try {
    payload = event.body ? JSON.parse(event.body) : {};
  } catch {
    return json({ error: 'invalid_json' }, 400);
  }

  const plan = (payload.plan || 'monthly').toLowerCase();
  const email = payload.email && String(payload.email).trim();

  const stripeSecret = process.env.STRIPE_SECRET_KEY;
  const priceMonthly = process.env.STRIPE_PRICE_MONTHLY;
  const priceAnnual = process.env.STRIPE_PRICE_ANNUAL;

  if (!stripeSecret || !priceMonthly || !priceAnnual) {
    return json({ error: 'stripe_not_configured', message: 'Stripe environment variables are missing.' }, 500);
  }

  let stripe;
  try {
    stripe = require('stripe')(stripeSecret, { apiVersion: process.env.STRIPE_API_VERSION || '2026-02-25.clover' });
  } catch (err) {
    return json({ error: 'stripe_sdk_missing', message: 'Stripe SDK is not installed.' }, 500);
  }

  const priceId = plan === 'annual' ? priceAnnual : priceMonthly;
  if (!priceId) {
    return json({ error: 'invalid_plan' }, 400);
  }

  const baseUrl = getBaseUrl(event);
  const successUrl = new URL('/checkout/success.html', baseUrl).toString() + '?session_id={CHECKOUT_SESSION_ID}';
  const cancelUrl = new URL('/checkout/cancel.html', baseUrl).toString();

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      allow_promotion_codes: true,
      billing_address_collection: 'required',
      customer_email: email || undefined,
      automatic_tax: { enabled: false },
      metadata: {
        helix_tier: plan
      },
      subscription_data: {
        metadata: {
          helix_tier: plan
        }
      }
    });

    return json({ url: session.url });
  } catch (err) {
    return json({ error: 'stripe_error', message: err.message }, 500);
  }
};
