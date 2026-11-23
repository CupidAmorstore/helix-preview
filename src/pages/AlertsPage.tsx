import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { listAlerts, saveAlert, deleteAlert } from '../services/storage';
import { MARKET_COINS } from '../services/market';
import { usePaper } from '../paper/PaperProvider';
import { fmtAge, fmtUsd } from '../services/marketData';
import { Button, Note, PageHeader, Segmented } from '../components/ui';
import { ALERTS_CHANGED, isMet, parseThreshold, validateThreshold } from '../alerts/logic';
import type { AlertRecord } from '../types';

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<AlertRecord[]>([]);
  const [params] = useSearchParams();
  const preset = (params.get('symbol') || '').toUpperCase();
  const [symbol, setSymbol] = useState(MARKET_COINS.some((c) => c.symbol === preset) ? preset : 'BTC');
  const [direction, setDirection] = useState<'above' | 'below'>('above');
  const [threshold, setThreshold] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const { feed } = usePaper();
  const price = feed.prices[symbol];

  useEffect(() => {
    const load = () => listAlerts().then((a) => setAlerts([...a].sort((x, y) => y.createdAt.localeCompare(x.createdAt)))).catch(() => undefined);
    load();
    window.addEventListener(ALERTS_CHANGED + ':fired', load);
    return () => window.removeEventListener(ALERTS_CHANGED + ':fired', load);
  }, []);

  const addAlert = async () => {
    setSaved(null);
    const err = validateThreshold(threshold);
    if (err) return setError(err);
    const value = parseThreshold(threshold);
    const record: AlertRecord = { id: crypto.randomUUID(), symbol, direction, threshold: value, enabled: true, createdAt: new Date().toISOString() };
    await saveAlert(record);
    setAlerts((prev) => [record, ...prev]);
    setThreshold('');
    setError(null);
    setSaved(price && isMet(record, price) ? `Saved. ${symbol} is already ${direction} ${fmtUsd(value)}, so it fires right away.` : `Saved. You'll see it when ${symbol} goes ${direction} ${fmtUsd(value)}.`);
    window.dispatchEvent(new Event(ALERTS_CHANGED));
  };

  const remove = async (id: string) => {
    await deleteAlert(id);
    setAlerts((prev) => prev.filter((a) => a.id !== id));
    window.dispatchEvent(new Event(ALERTS_CHANGED));
  };

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <PageHeader title="Price alerts" back subtitle="Checked against live Coinbase prices while HELIX is open" />

      <section className="space-y-4 border-t border-ink-600 pt-5" aria-labelledby="new-alert">
        <h2 id="new-alert" className="eyebrow text-slate-400">New alert</h2>
        <div className="grid grid-cols-2 gap-3">
          <label className="space-y-1 text-xs text-slate-400">
            Coin
            <select value={symbol} onChange={(e) => setSymbol(e.target.value)} className="min-h-[48px] w-full rounded-lg border border-ink-500 bg-ink-800 px-3 text-sm text-white">
              {MARKET_COINS.map((c) => <option key={c.symbol} value={c.symbol}>{c.symbol} · {c.name}</option>)}
            </select>
          </label>
          <div className="space-y-1 text-xs text-slate-400">
            Now
            <div className="flex min-h-[48px] items-center font-mono text-base text-white">{price ? fmtUsd(price) : '…'}</div>
          </div>
        </div>
        <Segmented label="Alert when the price goes" value={direction} onChange={setDirection} options={[{ value: 'above', label: 'Goes above' }, { value: 'below', label: 'Goes below' }]} />
        <label className="block space-y-1 text-xs text-slate-400">
          Price in USD
          <input
            inputMode="decimal"
            value={threshold}
            onChange={(e) => { setThreshold(e.target.value); setError(null); }}
            placeholder={price ? fmtUsd(price * (direction === 'above' ? 1.05 : 0.95)).replace('$', '') : '0.00'}
            aria-invalid={!!error}
            className="min-h-[48px] w-full rounded-lg border border-ink-500 bg-ink-800 px-3 font-mono text-base text-white"
          />
        </label>
        {error && <p role="alert" className="text-sm text-down">{error}</p>}
        {saved && <p role="status" className="text-sm text-up">{saved}</p>}
        <Button kind="primary" className="w-full" onClick={addAlert}>Save alert</Button>
      </section>

      <section className="space-y-2 border-t border-ink-600 pt-5">
        <h2 className="eyebrow text-slate-400">Your alerts ({alerts.length})</h2>
        {alerts.length === 0 ? (
          <p className="text-sm text-slate-400">No alerts yet.</p>
        ) : (
          <ul className="divide-y divide-ink-600">
            {alerts.map((a) => {
              const p = feed.prices[a.symbol];
              return (
                <li key={a.id} className="flex min-h-[60px] items-center justify-between gap-3 py-2">
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-white">{a.symbol} {a.direction === 'above' ? '▲ above' : '▼ below'} {fmtUsd(a.threshold)}</span>
                    <span className="block text-xs text-slate-500">
                      {p ? `Now ${fmtUsd(p)}` : 'Waiting for price'}
                      {a.lastTriggeredAt ? ` · last fired ${fmtAge(new Date(a.lastTriggeredAt).getTime())}` : ' · not fired yet'}
                    </span>
                  </span>
                  <button type="button" onClick={() => remove(a.id)} className="min-h-[44px] shrink-0 px-2 text-sm text-down">Remove</button>
                </li>
              );
            })}
          </ul>
        )}
        <Note>Alerts show inside the app on any screen. HELIX cannot notify you while the app is closed.</Note>
      </section>
    </div>
  );
}
