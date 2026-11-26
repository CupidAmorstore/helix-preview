import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { usePaper } from '../paper/PaperProvider';
import { Money, Note, PageHeader, Segmented } from '../components/ui';
import { fmtUsd } from '../services/marketData';
import type { PaperOrder } from '../paper/engine';
import { ordersCsv } from '../paper/exportCsv';
import { getLang, useT } from '../i18n';
import { reasonFr } from '../paper/reasonFr';

type Filter = 'all' | 'filled' | 'refused';
const when = (t: number) => new Date(t).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

function OrderRow({ o }: { o: PaperOrder }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const filled = o.status === 'filled';
  return (
    <li className="py-3">
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="flex min-h-[48px] w-full items-start justify-between gap-3 text-left">
        <span className="min-w-0">
          <span className="block text-sm font-semibold text-white">
            {o.side === 'buy' ? t('Buy', 'Achat') : t('Sell', 'Vente')} {o.symbol}
            {!filled && <span className="ml-2 text-xs font-normal text-down">{t('Refused', 'Refusé')}</span>}
            {o.partial && <span className="ml-2 text-xs font-normal text-paper">{t('Partly filled', 'Exécuté en partie')}</span>}
          </span>
          <span className="block text-xs text-slate-500">
            {when(o.ts)} · {filled ? `${o.qty.toFixed(8)} @ ${fmtUsd(o.fillPx)}` : getLang() === 'fr' ? reasonFr(o.reason) : o.reason}
          </span>
        </span>
        {filled && <Money v={o.side === 'buy' ? -o.cashUsd : o.cashUsd} className={`shrink-0 text-sm ${o.side === 'buy' ? 'text-slate-300' : 'text-white'}`} />}
      </button>
      {open && filled && (
        <dl className="mt-2 grid grid-cols-2 gap-y-1 border-l border-ink-600 pl-3 text-xs">
          <dt className="text-slate-500">{t('Quoted price', 'Prix coté')}</dt>
          <dd className="text-right font-mono text-slate-200">{fmtUsd(o.quotePx)}</dd>
          <dt className="text-slate-500">{t('Fill price', 'Prix d’exécution')}</dt>
          <dd className="text-right font-mono text-slate-200">{fmtUsd(o.fillPx)}</dd>
          <dt className="text-slate-500">{t('Fee (0.60%)', 'Frais (0,60 %)')}</dt>
          <dd className="text-right"><Money v={o.feeUsd} className="text-slate-200" /></dd>
          <dt className="text-slate-500">{t('Spread & impact', 'Écart et impact')}</dt>
          <dd className="text-right"><Money v={o.slippageUsd} className="text-slate-200" /></dd>
          {o.realizedPnl !== undefined && (
            <>
              <dt className="text-slate-500">Realized P&amp;L (paper)</dt>
              <dd className={`text-right font-mono ${o.realizedPnl >= 0 ? 'text-up' : 'text-down'}`}>
                {o.realizedPnl >= 0 ? '+' : '−'}${Math.abs(o.realizedPnl).toFixed(2)}
              </dd>
            </>
          )}
          <dt className="text-slate-500">Fill model</dt>
          <dd className="text-right text-slate-200">{o.fillModel === 'book' ? 'Live order book' : 'Cost estimate'}</dd>
          <dt className="text-slate-500">Order id</dt>
          <dd className="truncate text-right font-code text-slate-400">{o.id}</dd>
        </dl>
      )}
    </li>
  );
}

const stat = 'py-3 pl-3 first:pl-0 border-l border-ink-600 first:border-l-0';

/** CSV export: download where the browser supports it, otherwise copy to the clipboard (Android WebView). */
function ExportOrders() {
  const t = useT();
  const { account } = usePaper();
  const [msg, setMsg] = useState('');
  if (!account || account.orders.length === 0) return null;
  const csv = () => ordersCsv(account);
  const download = () => {
    const url = URL.createObjectURL(new Blob([csv()], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `helix-paper-orders-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setMsg(t('CSV file saved (check your downloads).', 'Fichier CSV enregistré (voir vos téléchargements).'));
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(csv());
      setMsg(t(`Copied ${account.orders.length} orders as CSV.`, `${account.orders.length} ordres copiés en CSV.`));
    } catch {
      setMsg(t('Copying is not allowed here. Use Download instead.', 'La copie n’est pas permise ici. Utilisez Télécharger.'));
    }
  };
  return (
    <div className="space-y-1">
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={download} className="min-h-[44px] rounded-full border border-ink-500 px-4 text-sm text-white">{t('Download CSV', 'Télécharger CSV')}</button>
        <button type="button" onClick={() => void copy()} className="min-h-[44px] rounded-full border border-ink-500 px-4 text-sm text-white">{t('Copy as CSV', 'Copier en CSV')}</button>
      </div>
      <p className="text-xs text-slate-400" aria-live="polite">{msg}</p>
    </div>
  );
}

export default function OrdersPage() {
  const t = useT();
  const { account } = usePaper();
  const [filter, setFilter] = useState<Filter>('all');
  const orders = useMemo(() => {
    const all = [...(account?.orders ?? [])].reverse();
    if (filter === 'all') return all;
    return all.filter((o) => (filter === 'filled' ? o.status === 'filled' : o.status !== 'filled'));
  }, [account, filter]);
  const filled = account?.orders.filter((o) => o.status === 'filled') ?? [];
  const fees = filled.reduce((s, o) => s + o.feeUsd, 0);

  return (
    <div className="mx-auto max-w-xl space-y-5">
      <PageHeader title={t('Paper orders', 'Ordres fictifs')} back subtitle={t('Simulated orders · nothing was sent to an exchange', 'Ordres simulés · rien n’a été envoyé à une plateforme')} />
      {!account ? (
        <section className="space-y-3 border-t border-ink-600 pt-5">
          <p className="text-sm text-slate-300">{t('Open a paper account on Home to start practising.', 'Ouvrez un compte fictif à l’accueil pour commencer.')}</p>
          <Link to="/" className="inline-flex min-h-[48px] items-center rounded-full bg-white px-5 text-sm font-semibold text-ink-900">{t('Go to Home', 'Aller à l’accueil')}</Link>
        </section>
      ) : (
        <>
          <dl className="grid grid-cols-3 border-y border-ink-600 text-sm">
            <div className={stat}><dd className="font-mono text-lg text-white">{account.orders.length}</dd><dt className="text-xs text-slate-500">{t('Orders', 'Ordres')}</dt></div>
            <div className={stat}><dd className="font-mono text-lg text-white">{filled.length}</dd><dt className="text-xs text-slate-500">{t('Filled', 'Exécutés')}</dt></div>
            <div className={stat}><dd className="font-mono text-lg text-white">${fees.toFixed(2)}</dd><dt className="text-xs text-slate-500">{t('Fees paid', 'Frais payés')}</dt></div>
          </dl>
          <Segmented
            label={t('Order filter', 'Filtre des ordres')}
            value={filter}
            onChange={setFilter}
            options={[{ value: 'all', label: t('All', 'Tous') }, { value: 'filled', label: t('Filled', 'Exécutés') }, { value: 'refused', label: t('Refused', 'Refusés') }]}
          />
          {orders.length === 0 ? (
            <p className="text-sm text-slate-400">{filter === 'refused' ? t('No refused orders.', 'Aucun ordre refusé.') : t('No paper orders yet. Open a coin in Markets and tap Paper buy.', 'Aucun ordre fictif pour l’instant. Ouvrez une crypto dans Marchés et touchez Achat fictif.')}</p>
          ) : (
            <ul className="divide-y divide-ink-600">{orders.map((o) => <OrderRow key={o.id} o={o} />)}</ul>
          )}
          <ExportOrders />
          <Note>{t('Every order is kept, including refusals, so the history matches the account balance exactly.', 'Chaque ordre est conservé, y compris les refus, pour que l’historique corresponde exactement au solde du compte.')}</Note>
        </>
      )}
    </div>
  );
}
