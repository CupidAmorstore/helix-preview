const fs = require('fs');
const path = require('path');

const DEFAULT_STORE = {
  updated_at: null,
  customers: {},
  subscriptions: {},
  sessions: {}
};

function cloneDefault() {
  return JSON.parse(JSON.stringify(DEFAULT_STORE));
}

function getStorePath() {
  if (process.env.HELIX_STORAGE_PATH) {
    return process.env.HELIX_STORAGE_PATH;
  }
  return path.join(process.cwd(), '.netlify', 'state', 'helix-access.json');
}

function loadStore() {
  if (global.__HELIX_STORE__) {
    return global.__HELIX_STORE__;
  }

  const file = getStorePath();
  try {
    const raw = fs.readFileSync(file, 'utf8');
    const parsed = JSON.parse(raw);
    const store = {
      ...cloneDefault(),
      ...parsed,
      customers: parsed.customers || {},
      subscriptions: parsed.subscriptions || {},
      sessions: parsed.sessions || {}
    };
    global.__HELIX_STORE__ = store;
    return store;
  } catch {
    const store = cloneDefault();
    global.__HELIX_STORE__ = store;
    return store;
  }
}

function saveStore(store) {
  store.updated_at = new Date().toISOString();
  global.__HELIX_STORE__ = store;

  if (process.env.HELIX_STORAGE_READONLY === 'true') {
    return { persisted: false, reason: 'readonly' };
  }

  const file = getStorePath();
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(store, null, 2));
    return { persisted: true, path: file };
  } catch (err) {
    return { persisted: false, reason: err.message };
  }
}

function toId(value) {
  if (!value) return null;
  if (typeof value === 'string') return value;
  return value.id || null;
}

function isActiveStatus(status) {
  return status === 'active' || status === 'trialing';
}

function extractPriceMeta(price) {
  if (!price) return null;
  if (typeof price === 'string') {
    return {
      price_id: price,
      product_id: null,
      amount: null,
      currency: null,
      interval: null,
      interval_count: null,
      nickname: null,
      metadata: null
    };
  }
  return {
    price_id: price.id || null,
    product_id: typeof price.product === 'string' ? price.product : price.product && price.product.id || null,
    amount: price.unit_amount || null,
    currency: price.currency || null,
    interval: price.recurring && price.recurring.interval || null,
    interval_count: price.recurring && price.recurring.interval_count || null,
    nickname: price.nickname || null,
    metadata: price.metadata || null
  };
}

function extractTier(subscription, priceMeta) {
  if (subscription && subscription.metadata && subscription.metadata.helix_tier) {
    return subscription.metadata.helix_tier;
  }
  if (priceMeta && priceMeta.metadata && priceMeta.metadata.helix_tier) {
    return priceMeta.metadata.helix_tier;
  }
  return null;
}

function ensureCustomer(store, customerId, email) {
  if (!customerId) return null;
  if (!store.customers[customerId]) {
    store.customers[customerId] = {
      id: customerId,
      email: email || null,
      status: 'inactive',
      subscriptions: [],
      updated_at: new Date().toISOString()
    };
  } else if (email && !store.customers[customerId].email) {
    store.customers[customerId].email = email;
  }
  return store.customers[customerId];
}

function upsertSubscription(store, subscription) {
  if (!subscription) return null;
  const subId = toId(subscription.id || subscription);
  if (!subId) return null;

  const customerId = toId(subscription.customer);
  const priceObj = subscription.items && subscription.items.data && subscription.items.data[0]
    ? subscription.items.data[0].price
    : subscription.plan || null;
  const priceMeta = extractPriceMeta(priceObj);
  const tier = extractTier(subscription, priceMeta);

  store.subscriptions[subId] = {
    id: subId,
    customer: customerId,
    status: subscription.status || 'unknown',
    current_period_end: subscription.current_period_end || null,
    cancel_at_period_end: Boolean(subscription.cancel_at_period_end),
    price_id: priceMeta ? priceMeta.price_id : null,
    product_id: priceMeta ? priceMeta.product_id : null,
    amount: priceMeta ? priceMeta.amount : null,
    currency: priceMeta ? priceMeta.currency : null,
    interval: priceMeta ? priceMeta.interval : null,
    interval_count: priceMeta ? priceMeta.interval_count : null,
    nickname: priceMeta ? priceMeta.nickname : null,
    tier: tier,
    updated_at: new Date().toISOString()
  };

  if (customerId) {
    const customer = ensureCustomer(store, customerId);
    if (customer && !customer.subscriptions.includes(subId)) {
      customer.subscriptions.push(subId);
    }
    updateCustomerStatus(store, customerId);
  }

  return store.subscriptions[subId];
}

function updateCustomerStatus(store, customerId) {
  const customer = store.customers[customerId];
  if (!customer) return;
  const active = (customer.subscriptions || []).some((id) => {
    const sub = store.subscriptions[id];
    return sub && isActiveStatus(sub.status);
  });
  customer.status = active ? 'active' : 'inactive';
  customer.updated_at = new Date().toISOString();
}

function upsertSession(store, session) {
  if (!session) return null;
  const sessionId = toId(session.id || session);
  if (!sessionId) return null;

  const customerId = toId(session.customer);
  const subscriptionId = toId(session.subscription);

  store.sessions[sessionId] = {
    id: sessionId,
    customer: customerId,
    subscription: subscriptionId,
    payment_status: session.payment_status || 'unknown',
    status: session.status || 'unknown',
    created: session.created || null,
    updated_at: new Date().toISOString()
  };

  if (customerId) {
    ensureCustomer(store, customerId, session.customer_details && session.customer_details.email);
  }
  if (subscriptionId) {
    const customer = store.customers[customerId];
    if (customer && !customer.subscriptions.includes(subscriptionId)) {
      customer.subscriptions.push(subscriptionId);
    }
  }
  if (customerId) {
    updateCustomerStatus(store, customerId);
  }

  return store.sessions[sessionId];
}

function applyStripeEvent(store, stripeEvent) {
  const type = stripeEvent.type || 'unknown';
  const obj = stripeEvent.data && stripeEvent.data.object;
  const changes = { type, updated: false };

  if (!obj) return changes;

  switch (type) {
    case 'checkout.session.completed':
    case 'checkout.session.async_payment_succeeded':
    case 'checkout.session.async_payment_failed':
    case 'checkout.session.expired':
      upsertSession(store, obj);
      changes.updated = true;
      break;
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted':
      upsertSubscription(store, obj);
      changes.updated = true;
      break;
    case 'invoice.payment_succeeded':
    case 'invoice.payment_failed':
      if (obj.subscription) {
        upsertSubscription(store, { id: obj.subscription, customer: obj.customer, status: obj.paid ? 'active' : 'past_due' });
        changes.updated = true;
      }
      break;
    default:
      break;
  }

  return changes;
}

module.exports = {
  loadStore,
  saveStore,
  applyStripeEvent,
  isActiveStatus
};
