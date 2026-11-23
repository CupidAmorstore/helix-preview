import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, Money, Note, Segmented, Sheet } from './ui';
import { usePaper } from '../paper/PaperProvider';
import { previewBuy, previewSell, type PaperOrder } from '../paper/engine';
import { fmtAge } from '../services/marketData';

const newTicketId = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`);

export default function TradeSheet({
  open, onClose, symbol, product, name, price, priceTs, initialSide = 'buy'
}: {
  open: boolean; onClose: () => void; symbol: string; product: string; name: string; price: number | null; priceTs: number | null; initialSide?: 'buy' | 'sell';
}) {
  const { account, value, place } = usePaper();
  const [side, setSide] = useState<'buy' | 'sell'>(initialSide);
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<PaperOrder | null>(null);
  const [ticket, setTicket] = useState(newTicketId);

  useEffect(() => {
    if (open) {
      setSide(initialSide);
      setAmount('');
      setResult(null);
      setTicket(newTicketId());
    }
  }, [open, initialSide]);

  const held = account?.positions[symbol];
  const num = Number(amount) || 0;
  const preview = useMemo(() => {
    if (!price) return null;
    return side === 'buy' ? previewBuy(num, price) : previewSell(num, price);
  }, [side, num, price]);
  const stale = !priceTs || Date.now() - priceTs > (account?.limits.maxQuoteAgeMs ?? 60_000);

  const submit = async () => {
    if (!price || !priceTs || busy) return;
    setBusy(true);
    try {
      const order = await place(
        side === 'buy'
          ? { clientId: ticket, side: 'buy', symbol, product, notionalUsd: num }
          : { clientId: ticket, side: 'sell', symbol, product, qty: num },
        price,
        priceTs
      );
      setResult(order);
      if (order.status === 'rejected') setTicket(newTicketId()); // allow a corrected retry
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title={`${side === 'buy' ? 'Buy' : 'Sell'} ${name}`}>
      <div className="flex items-center gap-2">
        <span className="rounded-md border border-dashed border-paper px-2 py-0.5 text-[11px] font-bold tracking-wider text-paper">PAPER ORDER</span>
        <span className="text-xs text-slate-400">Simulated. No real order is sent.</span>
      </div>

      {!account ? (
        <div className="space-y-3">
          <p className="text-sm text-slate-300">Open a paper account first to practise trading with simulated money.</p>
          <Link to="/" onClick={onClose} className="flex min-h-[48px] items-center justify-center rounded-xl bg-helix-400 text-sm font-semibold text-ink-900">
            Open paper account on Home
          </Link>
        </div>
      ) : result?.status === 'filled' ? (
        <div className="space-y-3" role="status">
          <p className="text-base font-semibold text-up">✓ Paper {result.side === 'buy' ? 'buy' : 'sell'} filled</p>
          <dl className="grid grid-cols-2 gap-y-1 text-sm">
            <dt className="text-slate-400">Amount</dt>
            <dd className="text-right font-mono text-white">{result.qty.toFixed(8)} {symbol}</dd>
            <dt className="text-slate-400">Fill price</dt>
            <dd className="text-right"><Money v={result.fillPx} className="text-white" /></dd>
            <dt className="text-slate-400">Fee</dt>
            <dd className="text-right"><Money v={result.feeUsd} className="text-white" /></dd>
            <dt className="text-slate-400">{result.side === 'buy' ? 'Cash spent' : 'Cash received'}</dt>
            <dd className="text-right"><Money v={result.cashUsd} className="text-white" /></dd>
            {result.realizedPnl !== undefined && (
              <>
                <dt className="text-slate-400">Realized P&amp;L</dt>
                <dd className={`text-right font-mono ${result.realizedPnl >= 0 ? 'text-up' : 'text-down'}`}>
                  {result.realizedPnl >= 0 ? '▲ +' : '▼ −'}${Math.abs(result.realizedPnl).toFixed(2)}
                </dd>
              </>
            )}
          </dl>
          <Button kind="primary" className="w-full" onClick={onClose}>Done</Button>
        </div>
      ) : (
        <div className="space-y-4">
          <Segmented label="Order side" value={side} onChange={(v) => { setSide(v); setAmount(''); setResult(null); }} options={[{ value: 'buy', label: 'Buy' }, { value: 'sell', label: 'Sell' }]} />
          <div className="space-y-1">
            <label htmlFor="trade-amount" className="text-sm text-slate-300">
              {side === 'buy' ? 'Amount in US dollars' : `Amount in ${symbol}`}
            </label>
            <input
              id="trade-amount"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ''))}
              placeholder={side === 'buy' ? '0.00' : '0.00000000'}
              className="min-h-[52px] w-full rounded-xl border border-ink-600 bg-ink-900 px-4 font-mono text-xl text-white"
            />
            <div className="flex flex-wrap gap-2 pt-1">
              {(side === 'buy' ? [0.1, 0.25, 0.5] : [0.25, 0.5, 1]).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setAmount(side === 'buy' ? ((account.cash * f) | 0).toString() : ((held?.qty ?? 0) * f).toFixed(8))}
                  className="min-h-[40px] rounded-full border border-ink-600 px-3 text-xs text-slate-300"
                >
                  {f === 1 ? 'All' : `${f * 100}%`}
                </button>
              ))}
            </div>
            <Note>
              {side === 'buy' ? <>Available paper cash: <Money v={account.cash} className="text-slate-300" /></> : <>You hold {(held?.qty ?? 0).toFixed(8)} {symbol}</>}
            </Note>
          </div>

          {preview && num > 0 && (
            <dl className="grid grid-cols-2 gap-y-1 rounded-xl bg-ink-900 p-3 text-sm">
              <dt className="text-slate-400">Live price</dt>
              <dd className="text-right"><Money v={price} className="text-white" /></dd>
              <dt className="text-slate-400">{side === 'buy' ? 'You get about' : 'You receive about'}</dt>
              <dd className="text-right font-mono text-white">
                {side === 'buy' ? `${(preview as ReturnType<typeof previewBuy>).qty.toFixed(8)} ${symbol}` : <Money v={(preview as ReturnType<typeof previewSell>).net} />}
              </dd>
              <dt className="text-slate-400">Fee (0.60%)</dt>
              <dd className="text-right"><Money v={preview.fee} className="text-white" /></dd>
              <dt className="text-slate-400">Spread + slippage</dt>
              <dd className="text-right text-white">≈ 0.05%</dd>
            </dl>
          )}

          {result?.status === 'rejected' && (
            <p role="alert" className="rounded-xl bg-down/15 p-3 text-sm text-[#F7A3A3]">{result.reason}</p>
          )}
          {stale && <Note tone="warn">Waiting for a live price{priceTs ? ` (last ${fmtAge(priceTs)})` : ''}…</Note>}
          {value && account.halted && <Note tone="warn">Paper trading is paused. Resume it in Bot → Risk.</Note>}

          <Button kind="primary" className="w-full" onClick={submit} disabled={busy || !num || stale}>
            {busy ? 'Placing…' : `Place paper ${side}`}
          </Button>
          <Note>Fills at the live Coinbase price plus a 0.05% spread/slippage estimate and a 0.60% fee. Limits: $1 minimum; one coin up to 50% of your paper account.</Note>
        </div>
      )}
    </Sheet>
  );
}
