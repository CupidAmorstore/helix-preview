// Paper account export (audit DAT-1): every order, including refusals, as CSV. Pure function; tested.
import type { PaperAccount } from './engine';

const esc = (v: unknown) => {
  const s = v === undefined || v === null ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export const CSV_HEADER = ['time_utc', 'order_id', 'symbol', 'side', 'status', 'reason', 'quote_price_usd', 'fill_price_usd', 'quantity', 'cash_usd', 'fee_usd', 'spread_impact_usd', 'realized_pnl_usd'];

export function ordersCsv(acc: PaperAccount): string {
  const rows = acc.orders.map((o) => [
    new Date(o.ts).toISOString(), o.id, o.symbol, o.side, o.status, o.reason ?? '',
    o.quotePx, o.status === 'filled' ? o.fillPx : '', o.status === 'filled' ? o.qty : '',
    o.status === 'filled' ? (o.side === 'buy' ? -o.cashUsd : o.cashUsd) : '', o.feeUsd, o.slippageUsd ?? '', o.realizedPnl ?? ''
  ]);
  const footer = [`# paper account opened ${new Date(acc.createdAt).toISOString()} with ${acc.startingCash} USD; cash now ${acc.cash} USD; simulated, not real money`];
  return [CSV_HEADER.join(','), ...rows.map((r) => r.map(esc).join(',')), ...footer].join('\n') + '\n';
}
