// Checks every saved alert against live prices on every screen (not only the Alerts page).
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { listAlerts, saveAlert } from '../services/storage';
import { usePaper } from '../paper/PaperProvider';
import { fmtUsd } from '../services/marketData';
import type { AlertRecord } from '../types';
import { ALERTS_CHANGED, checkAlerts } from './logic';
import { tr } from '../i18n';

export default function AlertWatcher() {
  const { feed } = usePaper();
  const [alerts, setAlerts] = useState<AlertRecord[]>([]);
  const armed = useRef<Record<string, boolean>>({});
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    const load = () => listAlerts().then((a) => {
      setAlerts(a);
      // an alert whose condition is already true when created/loaded should not fire until it re-arms
      // only if it already fired before; new alerts fire on the first matching price
      for (const x of a) if (x.lastTriggeredAt && armed.current[x.id] === undefined) armed.current[x.id] = false;
    }).catch(() => undefined);
    load();
    window.addEventListener(ALERTS_CHANGED, load);
    return () => window.removeEventListener(ALERTS_CHANGED, load);
  }, []);

  useEffect(() => {
    const { fired, armed: next } = checkAlerts(alerts, feed.prices, armed.current);
    armed.current = next;
    if (!fired.length) return;
    const f = fired[0];
    setToast(tr(`${f.alert.symbol} is ${f.alert.direction === 'above' ? 'above' : 'below'} ${fmtUsd(f.alert.threshold)} · now ${fmtUsd(f.price)}`, `${f.alert.symbol} est ${f.alert.direction === 'above' ? 'au-dessus de' : 'sous'} ${fmtUsd(f.alert.threshold)} · maintenant ${fmtUsd(f.price)}`));
    for (const { alert } of fired) void saveAlert({ ...alert, lastTriggeredAt: new Date().toISOString() }).then(() => window.dispatchEvent(new Event(ALERTS_CHANGED + ':fired')));
    try {
      navigator.vibrate?.(80);
    } catch {
      /* not supported */
    }
  }, [alerts, feed.prices]);

  if (!toast) return null;
  return (
    <div role="alert" className="fixed inset-x-3 z-40 flex items-center justify-between gap-3 rounded-xl border border-ink-500 bg-ink-800 px-4 py-3 shadow-soft"
      style={{ top: 'calc(max(env(safe-area-inset-top, 0px), var(--safe-area-inset-top, 0px)) + 64px)' }}>
      <Link to="/alerts" onClick={() => setToast(null)} className="min-w-0 flex-1 text-sm text-white">
        <span className="eyebrow block text-paper">{tr('Price alert', 'Alerte de prix')}</span>
        {toast}
      </Link>
      <button type="button" onClick={() => setToast(null)} aria-label={tr('Dismiss alert', 'Fermer l’alerte')} className="grid h-11 w-11 shrink-0 place-items-center text-slate-400">✕</button>
    </div>
  );
}
