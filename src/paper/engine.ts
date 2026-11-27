// HELIX paper-trading engine. Simulated money only: nothing here talks to an exchange or a blockchain.
// Pure functions (no I/O) so every rule is unit-tested; persistence lives in ./store.ts.
import { COST_PRESETS, sideCostFrac } from '../bot/costs';
import { assertPaperOnly } from '../bot/risk';

export const STARTING_CAPITAL_OPTIONS = [20, 50, 100, 250, 500, 1000] as const;

export type PaperLimits = {
  /** max value of one coin position as a fraction of account equity */
  maxPositionFraction: number;
  /** venue minimum order (Coinbase min_market_funds is $1) */
  minOrderUsd: number;
  /** quotes older than this are refused (stale price) */
  maxQuoteAgeMs: number;
};

export const DEFAULT_LIMITS: PaperLimits = { maxPositionFraction: 0.5, minOrderUsd: 1, maxQuoteAgeMs: 60_000 };

/** Fee model: Coinbase lowest-tier taker fee + half spread + slippage (same assumptions as the bot). */
export const PAPER_COST = COST_PRESETS.coinbase_taker;

export type PaperPosition = { symbol: string; product: string; qty: number; costUsd: number };

export type PaperOrder = {
  id: string;
  clientId: string;
  ts: number;
  symbol: string;
  product: string;
  side: 'buy' | 'sell';
  status: 'filled' | 'rejected';
  reason?: string;
  /** market price used (last live trade) */
  quotePx: number;
  /** price after half-spread + slippage */
  fillPx: number;
  qty: number;
  /** cash spent (buy) or received (sell), after fees */
  cashUsd: number;
  feeUsd: number;
  /** spread + slippage cost versus the quote */
  slippageUsd: number;
  realizedPnl?: number;
  /** 'book' = walked the live order book; 'model' = fixed half-spread + slippage assumption */
  fillModel?: 'book' | 'model';
  /** true when only part of the order could fill within the price band */
  partial?: boolean;
  /** what was asked for: USD (buy) or coin quantity (sell) */
  requested?: number;
};

export type PaperAccount = {
  version: 1;
  createdAt: number;
  startingCash: number;
  cash: number;
  positions: Record<string, PaperPosition>;
  orders: PaperOrder[];
  /** [timestamp, equity] recorded after every fill and on valuation snapshots */
  equity: [number, number][];
  halted: boolean;
  haltReason?: string;
  limits: PaperLimits;
};

/** price levels as [price, size]; best first */
export type Book = { bids: [number, number][]; asks: [number, number][]; ts: number };
export type Quote = { symbol: string; product: string; price: number; ts: number; book?: Book };

/** Orders never fill further than this from the quoted price; the rest stays unfilled (partial fill). */
export const MAX_BOOK_BAND = 0.02;

/**
 * Walk one side of the book. Buy: spend up to `budgetUsd` on asks. Sell: sell up to `qty` into bids.
 * Only levels within MAX_BOOK_BAND of the reference price are used.
 */
export function walkBook(levels: [number, number][], ref: number, side: 'buy' | 'sell', amount: number) {
  const limit = side === 'buy' ? ref * (1 + MAX_BOOK_BAND) : ref * (1 - MAX_BOOK_BAND);
  let qty = 0;
  let usd = 0;
  for (const [px, size] of levels) {
    if (!(px > 0) || !(size > 0)) continue;
    if (side === 'buy' ? px > limit : px < limit) break;
    if (side === 'buy') {
      const left = amount - usd;
      if (left <= 1e-12) break;
      const take = Math.min(size, left / px);
      qty += take;
      usd += take * px;
    } else {
      const left = amount - qty;
      if (left <= 1e-12) break;
      const take = Math.min(size, left);
      qty += take;
      usd += take * px;
    }
  }
  const complete = side === 'buy' ? usd >= amount * (1 - 1e-9) : qty >= amount * (1 - 1e-9);
  return { qty, usd, vwap: qty > 0 ? usd / qty : 0, complete };
}

const bookUsable = (q: Quote, maxAge: number, now: number) =>
  !!q.book && now - q.book.ts <= maxAge && q.book.ts <= now + 5_000 && q.book.asks.length > 0 && q.book.bids.length > 0;

export type OrderRequest =
  | { clientId: string; side: 'buy'; symbol: string; product: string; notionalUsd: number }
  | { clientId: string; side: 'sell'; symbol: string; product: string; qty: number };

const round = (x: number, d = 8) => Math.round(x * 10 ** d) / 10 ** d;

export function createAccount(startingCash: number, now: number, limits: PaperLimits = DEFAULT_LIMITS): PaperAccount {
  assertPaperOnly();
  if (!(startingCash > 0)) throw new Error('Starting cash must be positive');
  return { version: 1, createdAt: now, startingCash, cash: startingCash, positions: {}, orders: [], equity: [[now, startingCash]], halted: false, limits };
}

export function valueAccount(acc: PaperAccount, prices: Record<string, number>) {
  let positionsValue = 0;
  let unrealized = 0;
  let missingPrice = false;
  for (const p of Object.values(acc.positions)) {
    const px = prices[p.symbol];
    if (!px) {
      missingPrice = true;
      positionsValue += p.costUsd; // fall back to cost so equity is not overstated
      continue;
    }
    positionsValue += p.qty * px;
    unrealized += p.qty * px - p.costUsd;
  }
  const filled = acc.orders.filter((o) => o.status === 'filled');
  const realized = filled.reduce((s, o) => s + (o.realizedPnl ?? 0), 0);
  const fees = filled.reduce((s, o) => s + o.feeUsd, 0);
  const slippage = filled.reduce((s, o) => s + o.slippageUsd, 0);
  const equity = acc.cash + positionsValue;
  return {
    equity,
    cash: acc.cash,
    positionsValue,
    unrealized,
    realized,
    fees,
    slippage,
    totalPnl: equity - acc.startingCash,
    returnPct: ((equity - acc.startingCash) / acc.startingCash) * 100,
    missingPrice
  };
}

function reject(acc: PaperAccount, req: OrderRequest, quote: Quote, now: number, reason: string) {
  const order: PaperOrder = {
    id: `po_${now}_${req.clientId.slice(0, 8)}`,
    clientId: req.clientId,
    ts: now,
    symbol: req.symbol,
    product: req.product,
    side: req.side,
    status: 'rejected',
    reason,
    quotePx: quote.price,
    fillPx: 0,
    qty: 0,
    cashUsd: 0,
    feeUsd: 0,
    slippageUsd: 0
  };
  return { account: { ...acc, orders: [...acc.orders, order] }, order };
}

/**
 * Fill a market order at the live quote with the fee model. Every request produces an order record
 * (filled or rejected with a reason) so the activity log is complete. Duplicate clientIds are ignored.
 */
export function placeOrder(acc: PaperAccount, req: OrderRequest, quote: Quote, now: number): { account: PaperAccount; order: PaperOrder; duplicate?: true } {
  assertPaperOnly();
  const dup = acc.orders.find((o) => o.clientId === req.clientId);
  if (dup) return { account: acc, order: dup, duplicate: true };
  if (acc.halted) return reject(acc, req, quote, now, `Trading paused: ${acc.haltReason ?? 'paused by you'}`);
  if (quote.symbol !== req.symbol || !(quote.price > 0)) return reject(acc, req, quote, now, 'No valid live price for this coin');
  if (now - quote.ts > acc.limits.maxQuoteAgeMs) return reject(acc, req, quote, now, 'Price is out of date. Wait for a live price and try again.');
  if (quote.ts > now + 5_000) return reject(acc, req, quote, now, 'Price time is in the future; check the device clock.');

  const feeFrac = PAPER_COST.takerFeeBps / 10_000;
  const impactFrac = sideCostFrac(PAPER_COST) - feeFrac; // half spread + slippage

  if (req.side === 'buy') {
    const n = req.notionalUsd;
    if (!(n > 0)) return reject(acc, req, quote, now, 'Enter an amount');
    if (n < acc.limits.minOrderUsd) return reject(acc, req, quote, now, `Minimum order is $${acc.limits.minOrderUsd}`);
    if (n > acc.cash + 1e-9) return reject(acc, req, quote, now, 'Not enough paper cash');
    const before = valueAccount(acc, { [req.symbol]: quote.price });
    const held = acc.positions[req.symbol];
    const after = (held ? held.qty * quote.price : 0) + n;
    const cap = acc.limits.maxPositionFraction * before.equity;
    if (after > cap + 1e-9)
      return reject(acc, req, quote, now, `Position limit: one coin can be at most ${Math.round(acc.limits.maxPositionFraction * 100)}% of your account ($${cap.toFixed(2)})`);
    let spend = n;
    let fillPx = quote.price * (1 + impactFrac);
    let qty = round((n - n * feeFrac) / fillPx);
    let partial = false;
    const useBook = bookUsable(quote, acc.limits.maxQuoteAgeMs, now);
    if (useBook) {
      const w = walkBook(quote.book!.asks, quote.price, 'buy', n * (1 - feeFrac));
      if (!(w.qty > 0)) return reject(acc, req, quote, now, `No sellers within ${MAX_BOOK_BAND * 100}% of the price right now`);
      partial = !w.complete;
      spend = w.usd / (1 - feeFrac);
      if (spend < acc.limits.minOrderUsd) return reject(acc, req, quote, now, `Only $${spend.toFixed(2)} available within ${MAX_BOOK_BAND * 100}% of the price`);
      fillPx = w.vwap;
      qty = round(w.qty);
    }
    const fee = spend * feeFrac;
    const slippage = qty * (fillPx - quote.price);
    const pos: PaperPosition = held
      ? { ...held, qty: round(held.qty + qty), costUsd: held.costUsd + spend }
      : { symbol: req.symbol, product: req.product, qty, costUsd: spend };
    const order: PaperOrder = {
      id: `po_${now}_${req.clientId.slice(0, 8)}`,
      clientId: req.clientId,
      ts: now,
      symbol: req.symbol,
      product: req.product,
      side: 'buy',
      status: 'filled',
      quotePx: quote.price,
      fillPx,
      qty,
      cashUsd: spend,
      feeUsd: fee,
      slippageUsd: slippage,
      fillModel: useBook ? 'book' : 'model',
      requested: n,
      ...(partial ? { partial: true, reason: `Partly filled: only $${spend.toFixed(2)} of $${n.toFixed(2)} was available within ${MAX_BOOK_BAND * 100}% of the price` } : {})
    };
    const next: PaperAccount = { ...acc, cash: round(acc.cash - spend, 10), positions: { ...acc.positions, [req.symbol]: pos }, orders: [...acc.orders, order] };
    next.equity = [...acc.equity, [now, valueAccount(next, { [req.symbol]: quote.price }).equity]];
    return { account: next, order };
  }

  const held = acc.positions[req.symbol];
  if (!held || held.qty <= 0) return reject(acc, req, quote, now, `You don't hold any ${req.symbol}`);
  const wanted = Math.min(req.qty, held.qty);
  if (!(wanted > 0)) return reject(acc, req, quote, now, 'Enter an amount');
  let qty = wanted;
  let fillPx = quote.price * (1 - impactFrac);
  let partial = false;
  const useBook = bookUsable(quote, acc.limits.maxQuoteAgeMs, now);
  if (useBook) {
    const w = walkBook(quote.book!.bids, quote.price, 'sell', wanted);
    if (!(w.qty > 0)) return reject(acc, req, quote, now, `No buyers within ${MAX_BOOK_BAND * 100}% of the price right now`);
    partial = !w.complete;
    qty = round(w.qty);
    fillPx = w.vwap;
  }
  const gross = qty * fillPx;
  if (gross < acc.limits.minOrderUsd) return reject(acc, req, quote, now, `Minimum order is $${acc.limits.minOrderUsd}`);
  const fee = gross * feeFrac;
  const net = gross - fee;
  const avgCost = held.costUsd / held.qty;
  const costSold = avgCost * qty;
  const realized = net - costSold;
  const remainingQty = round(held.qty - qty);
  const positions = { ...acc.positions };
  if (remainingQty <= 1e-10) delete positions[req.symbol];
  else positions[req.symbol] = { ...held, qty: remainingQty, costUsd: held.costUsd - costSold };
  const order: PaperOrder = {
    id: `po_${now}_${req.clientId.slice(0, 8)}`,
    clientId: req.clientId,
    ts: now,
    symbol: req.symbol,
    product: req.product,
    side: 'sell',
    status: 'filled',
    quotePx: quote.price,
    fillPx,
    qty,
    cashUsd: net,
    feeUsd: fee,
    slippageUsd: qty * (quote.price - fillPx),
    realizedPnl: realized,
    fillModel: useBook ? 'book' : 'model',
    requested: wanted,
    ...(partial ? { partial: true, reason: `Partly filled: sold ${qty} of ${wanted} ${req.symbol} within ${MAX_BOOK_BAND * 100}% of the price` } : {})
  };
  const next: PaperAccount = { ...acc, cash: round(acc.cash + net, 10), positions, orders: [...acc.orders, order] };
  next.equity = [...acc.equity, [now, valueAccount(next, { [req.symbol]: quote.price }).equity]];
  return { account: next, order };
}

/** Preview of what an order would cost, for the ticket (no state change). */
export function previewBuy(notionalUsd: number, price: number) {
  const feeFrac = PAPER_COST.takerFeeBps / 10_000;
  const fillPx = price * (1 + sideCostFrac(PAPER_COST) - feeFrac);
  const fee = notionalUsd * feeFrac;
  const qty = notionalUsd > 0 && price > 0 ? (notionalUsd - fee) / fillPx : 0;
  return { qty, fee, fillPx, costPct: sideCostFrac(PAPER_COST) * 100 };
}

export function previewSell(qty: number, price: number) {
  const feeFrac = PAPER_COST.takerFeeBps / 10_000;
  const fillPx = price * (1 - (sideCostFrac(PAPER_COST) - feeFrac));
  const gross = qty * fillPx;
  return { gross, fee: gross * feeFrac, net: gross * (1 - feeFrac), fillPx, costPct: sideCostFrac(PAPER_COST) * 100 };
}

export function setHalted(acc: PaperAccount, halted: boolean, reason?: string): PaperAccount {
  return { ...acc, halted, haltReason: halted ? reason ?? 'paused by you' : undefined };
}

/** Record a valuation point at most once per hour (keeps the chart meaningful without bloating storage). */
export function recordEquity(acc: PaperAccount, equity: number, now: number): PaperAccount {
  const last = acc.equity[acc.equity.length - 1];
  if (last && now - last[0] < 3_600_000) return acc;
  return { ...acc, equity: [...acc.equity, [now, equity]].slice(-2000) as [number, number][] };
}

/**
 * Ledger reconciliation: recompute cash and quantities from the order history and compare with the stored
 * balances. Returns problems (empty = consistent). Used on every load; a failing ledger is paused (fail-closed).
 */
export function reconcileAccount(a: PaperAccount): string[] {
  const errs: string[] = [];
  const fin = (x: unknown) => typeof x === 'number' && Number.isFinite(x);
  if (!fin(a.startingCash) || a.startingCash <= 0) errs.push('starting cash invalid');
  if (!fin(a.cash) || a.cash < -1e-6) errs.push('cash invalid or negative');
  const ids = new Set<string>();
  let cash = a.startingCash;
  const qty: Record<string, number> = {};
  for (const o of a.orders ?? []) {
    if (ids.has(o.clientId)) errs.push(`duplicate order ${o.clientId}`);
    ids.add(o.clientId);
    if (o.status !== 'filled') continue;
    if (![o.qty, o.cashUsd, o.feeUsd, o.fillPx].every(fin) || o.qty < 0 || o.cashUsd < 0 || o.feeUsd < 0) {
      errs.push(`order ${o.clientId} has invalid numbers`);
      continue;
    }
    cash += o.side === 'buy' ? -o.cashUsd : o.cashUsd;
    qty[o.symbol] = (qty[o.symbol] ?? 0) + (o.side === 'buy' ? o.qty : -o.qty);
  }
  if (fin(a.cash) && Math.abs(cash - a.cash) > 1e-6 * Math.max(1, a.startingCash)) errs.push(`cash ${a.cash.toFixed(2)} ≠ order history ${cash.toFixed(2)}`);
  const syms = new Set([...Object.keys(qty), ...Object.keys(a.positions ?? {})]);
  for (const s of syms) {
    const p = a.positions?.[s];
    const held = p?.qty ?? 0;
    if (p && (!fin(p.qty) || p.qty < 0 || !fin(p.costUsd) || p.costUsd < -1e-9)) errs.push(`position ${s} invalid`);
    if (Math.abs(held - (qty[s] ?? 0)) > 1e-7) errs.push(`${s} quantity ${held} ≠ order history ${(qty[s] ?? 0).toFixed(8)}`);
  }
  return errs;
}
