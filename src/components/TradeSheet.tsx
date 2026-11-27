import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, Money, Note, Segmented, Sheet } from './ui';
import { usePaper } from '../paper/PaperProvider';
import { useLang } from '../i18n';
import { reasonFr } from '../paper/reasonFr';
import { previewBuy, previewSell, type PaperOrder } from '../paper/engine';
import { fmtAge } from '../services/marketData';

const newTicketId = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`);

export default function TradeSheet({
  open, onClose, symbol, product, name, price, priceTs, initialSide = 'buy'
}: {
  open: boolean; onClose: () => void; symbol: string; product: string; name: string; price: number | null; priceTs: number | null; initialSide?: 'buy' | 'sell';
}) {
  const { account, value, place, pause } = usePaper();
  const lang = useLang();
  const t = (en: string, fr: string) => (lang === 'fr' ? fr : en);
  const why = (r?: string) => (lang === 'fr' ? reasonFr(r) : r ?? '');
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
    <Sheet open={open} onClose={onClose} title={`${side === 'buy' ? t('Buy', 'Acheter') : t('Sell', 'Vendre')} ${name}`}>
      <div className="flex items-center gap-2">
        <span className="eyebrow text-paper">{t('Paper order', 'Ordre fictif')}</span>
        <span className="text-xs text-slate-400">{t('Simulated. No real order is sent.', 'Simulé. Aucun ordre réel n’est envoyé.')}</span>
      </div>

      {!account ? (
        <div className="space-y-3">
          <p className="text-sm text-slate-300">{t('Open a paper account first to practise trading with simulated money.', 'Ouvrez d’abord un compte fictif pour vous exercer avec de l’argent simulé.')}</p>
          <Link to="/" onClick={onClose} className="flex min-h-[48px] items-center justify-center rounded-full bg-white text-sm font-semibold text-ink-900">
            {t('Open paper account on Home', 'Ouvrir un compte fictif à l’accueil')}
          </Link>
        </div>
      ) : result?.status === 'filled' ? (
        <div className="space-y-3" role="status">
          <p className={`text-base font-semibold ${result.partial ? 'text-paper' : 'text-up'}`}>
            ✓ {result.side === 'buy' ? t('Paper buy', 'Achat fictif') : t('Paper sell', 'Vente fictive')} {result.partial ? t('partly filled', 'exécuté en partie') : t('filled', 'exécuté')}
          </p>
          {result.partial && <p className="text-sm text-slate-300">{why(result.reason)}. {t('The rest was not filled and no money was taken for it.', 'Le reste n’a pas été exécuté et aucun argent n’a été pris pour cette partie.')}</p>}
          <dl className="grid grid-cols-2 gap-y-1 text-sm">
            <dt className="text-slate-400">{t('Amount', 'Quantité')}</dt>
            <dd className="text-right font-mono text-white">{result.qty.toFixed(8)} {symbol}</dd>
            <dt className="text-slate-400">{t('Fill price', 'Prix d’exécution')}</dt>
            <dd className="text-right"><Money v={result.fillPx} className="text-white" /></dd>
            <dt className="text-slate-400">{t('Fee', 'Frais')}</dt>
            <dd className="text-right"><Money v={result.feeUsd} className="text-white" /></dd>
            <dt className="text-slate-400">{result.side === 'buy' ? t('Cash spent', 'Montant dépensé') : t('Cash received', 'Montant reçu')}</dt>
            <dd className="text-right"><Money v={result.cashUsd} className="text-white" /></dd>
            <dt className="text-slate-400">{t('Spread & price impact', 'Écart et impact sur le prix')}</dt>
            <dd className="text-right text-white">{result.slippageUsd > 0.005 ? <Money v={result.slippageUsd} /> : result.slippageUsd < -0.005 ? <>{t('Better than last price', 'Meilleur que le dernier prix')}</> : <>{t('Under 1¢', 'Moins de 1 ¢')}</>}</dd>
            {result.realizedPnl !== undefined && (
              <>
                <dt className="text-slate-400">{t('Realized P&L', 'Gain/perte réalisé')}</dt>
                <dd className={`text-right font-mono ${result.realizedPnl >= 0 ? 'text-up' : 'text-down'}`}>
                  {result.realizedPnl >= 0 ? '▲ +' : '▼ −'}${Math.abs(result.realizedPnl).toFixed(2)}
                </dd>
              </>
            )}
          </dl>
          <p className="text-xs text-slate-500">
            {result.fillModel === 'book'
              ? t('Simulated against the live Coinbase order book at the time of your order. No real order was sent.', 'Simulé contre le carnet d’ordres Coinbase en direct au moment de votre ordre. Aucun ordre réel n’a été envoyé.')
              : t('Order book unavailable, so the standard cost assumption was used (0.05% spread and slippage). No real order was sent.', 'Carnet d’ordres indisponible : l’hypothèse de coût standard a été utilisée (0,05 % d’écart et de glissement). Aucun ordre réel n’a été envoyé.')}
          </p>
          <Button kind="primary" className="w-full" onClick={onClose}>{t('Done', 'Terminé')}</Button>
        </div>
      ) : (
        <div className="space-y-4">
          <Segmented label={t('Order side', 'Sens de l’ordre')} value={side} onChange={(v) => { setSide(v); setAmount(''); setResult(null); }} options={[{ value: 'buy', label: t('Buy', 'Achat') }, { value: 'sell', label: t('Sell', 'Vente') }]} />
          <div className="space-y-1">
            <label htmlFor="trade-amount" className="text-sm text-slate-300">
              {side === 'buy' ? t('Amount in US dollars', 'Montant en dollars US') : t(`Amount in ${symbol}`, `Quantité en ${symbol}`)}
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
                  {f === 1 ? t('All', 'Tout') : `${f * 100}%`}
                </button>
              ))}
            </div>
            <Note>
              {side === 'buy' ? <>{t('Available paper cash', 'Liquidités fictives disponibles')} : <Money v={account.cash} className="text-slate-300" /></> : <>{t('You hold', 'Vous détenez')} {(held?.qty ?? 0).toFixed(8)} {symbol}</>}
            </Note>
          </div>

          {preview && num > 0 && (
            <dl className="grid grid-cols-2 gap-y-1 rounded-xl bg-ink-900 p-3 text-sm">
              <dt className="text-slate-400">{t('Live price', 'Prix en direct')}</dt>
              <dd className="text-right"><Money v={price} className="text-white" /></dd>
              <dt className="text-slate-400">{side === 'buy' ? t('You get about', 'Vous obtenez environ') : t('You receive about', 'Vous recevez environ')}</dt>
              <dd className="text-right font-mono text-white">
                {side === 'buy' ? `${(preview as ReturnType<typeof previewBuy>).qty.toFixed(8)} ${symbol}` : <Money v={(preview as ReturnType<typeof previewSell>).net} />}
              </dd>
              <dt className="text-slate-400">{t('Fee (0.60%)', 'Frais (0,60 %)')}</dt>
              <dd className="text-right"><Money v={preview.fee} className="text-white" /></dd>
              <dt className="text-slate-400">{t('Spread & price impact', 'Écart et impact sur le prix')}</dt>
              <dd className="text-right text-white">{t('From the live order book', 'Selon le carnet d’ordres en direct')}</dd>
            </dl>
          )}

          {result?.status === 'rejected' && (
            <p role="alert" className="border-l-2 border-down py-1 pl-3 text-sm text-slate-200">{why(result.reason)}</p>
          )}
          {stale && <Note tone="warn">{t('Waiting for a live price', 'En attente d’un prix en direct')}{priceTs ? ` (${t('last', 'dernier')} ${fmtAge(priceTs)})` : ''}…</Note>}
          {value && account.halted && (
            <div className="flex items-center justify-between gap-3">
              <Note tone="warn">{t('Paper trading is paused.', 'Le trading fictif est en pause.')}</Note>
              <button type="button" onClick={() => void pause(false)} className="min-h-[44px] shrink-0 rounded-full border border-ink-500 px-4 text-sm font-medium text-white">{t('Resume', 'Reprendre')}</button>
            </div>
          )}

          <Button kind="primary" className="w-full" onClick={submit} disabled={busy || !num || stale}>
            {busy ? t('Placing…', 'Envoi…') : side === 'buy' ? t('Place paper buy', 'Passer l’achat fictif') : t('Place paper sell', 'Passer la vente fictive')}
          </Button>
          <Note>{t('Fills against the live Coinbase order book (never more than 2% from the price; anything beyond that stays unfilled) plus a 0.60% fee. If the book cannot be loaded, a 0.05% spread/slippage estimate is used. Limits: $1 minimum; one coin up to 50% of your paper account.', 'Exécution contre le carnet d’ordres Coinbase en direct (jamais à plus de 2 % du prix; au-delà, l’ordre reste non exécuté) plus des frais de 0,60 %. Si le carnet ne peut pas être chargé, une estimation de 0,05 % d’écart et de glissement est utilisée. Limites : minimum 1 $; une crypto peut représenter au plus 50 % de votre compte fictif.')}</Note>
        </div>
      )}
    </Sheet>
  );
}
