import { useEffect, useRef, useState } from 'react';
import { listAlerts, saveAlert, deleteAlert } from '../services/storage';
import { useLivePrices } from '../hooks/useLivePrices';
import { MARKET_COINS } from '../services/market';
import type { AlertRecord } from '../types';

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<AlertRecord[]>([]);
  const [symbol, setSymbol] = useState('BTC');
  const [direction, setDirection] = useState<'above' | 'below'>('above');
  const [threshold, setThreshold] = useState('');
  const [notifications, setNotifications] = useState<string[]>([]);
  const triggered = useRef<Record<string, boolean>>({});

  const livePrices = useLivePrices(MARKET_COINS.map((coin) => coin.binance));

  useEffect(() => {
    listAlerts().then(setAlerts);
  }, []);

  useEffect(() => {
    alerts.forEach((alert) => {
      if (!alert.enabled) return;
      const price = livePrices[alert.symbol];
      if (!price) return;
      const condition = alert.direction === 'above' ? price >= alert.threshold : price <= alert.threshold;
      if (condition && !triggered.current[alert.id]) {
        triggered.current[alert.id] = true;
        setNotifications((prev) => [
          `Alert: ${alert.symbol} ${alert.direction} ${alert.threshold} (price: ${price.toFixed(2)})`,
          ...prev
        ]);
      }
      if (!condition) {
        triggered.current[alert.id] = false;
      }
    });
  }, [alerts, livePrices]);

  const addAlert = async () => {
    const value = parseFloat(threshold);
    if (!value) return;
    const record: AlertRecord = {
      id: crypto.randomUUID(),
      symbol,
      direction,
      threshold: value,
      enabled: true,
      createdAt: new Date().toISOString()
    };
    await saveAlert(record);
    setAlerts((prev) => [...prev, record]);
    setThreshold('');
  };

  return (
    <div className="space-y-8 slide-up">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Alerts</p>
        <h1 className="text-3xl font-semibold text-white">Price Alert Center</h1>
        <p className="text-sm text-slate-400">
          Create read-only alerts on live prices. Notifications stay local to your browser.
        </p>
      </header>

      <section className="rounded-2xl border border-white/10 bg-white/5 p-6 space-y-4">
        <h2 className="text-sm font-semibold text-slate-200">Create alert</h2>
        <div className="grid gap-3 md:grid-cols-4">
          <select
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            className="rounded-lg border border-white/10 bg-transparent px-3 py-2 text-sm text-slate-200"
          >
            {MARKET_COINS.map((coin) => (
              <option key={coin.symbol} value={coin.symbol} className="text-black">
                {coin.symbol}
              </option>
            ))}
          </select>
          <select
            value={direction}
            onChange={(e) => setDirection(e.target.value as 'above' | 'below')}
            className="rounded-lg border border-white/10 bg-transparent px-3 py-2 text-sm text-slate-200"
          >
            <option value="above" className="text-black">Above</option>
            <option value="below" className="text-black">Below</option>
          </select>
          <input
            value={threshold}
            onChange={(e) => setThreshold(e.target.value)}
            placeholder="Price threshold"
            className="rounded-lg border border-white/10 bg-transparent px-3 py-2 text-sm text-slate-200"
          />
          <button
            type="button"
            onClick={addAlert}
            className="rounded-lg border border-mint-500/50 px-4 py-2 text-sm text-mint-300"
          >
            Save alert
          </button>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div className="rounded-2xl border border-white/10 bg-white/5">
          <div className="border-b border-white/10 px-4 py-3 text-xs uppercase tracking-[0.2em] text-slate-500">Active Alerts</div>
          {alerts.length === 0 && <div className="px-4 py-6 text-sm text-slate-400">No alerts yet.</div>}
          {alerts.map((alert) => (
            <div key={alert.id} className="flex items-center justify-between border-b border-white/5 px-4 py-3 text-sm text-slate-200">
              <div>
                <div className="font-semibold text-white">{alert.symbol}</div>
                <div className="text-xs text-slate-500">{alert.direction} {alert.threshold}</div>
              </div>
              <button
                type="button"
                onClick={async () => {
                  await deleteAlert(alert.id);
                  setAlerts((prev) => prev.filter((item) => item.id !== alert.id));
                }}
                className="text-rose-400 text-xs"
              >
                Remove
              </button>
            </div>
          ))}
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5">
          <div className="border-b border-white/10 px-4 py-3 text-xs uppercase tracking-[0.2em] text-slate-500">Notifications</div>
          {notifications.length === 0 && <div className="px-4 py-6 text-sm text-slate-400">No alerts triggered yet.</div>}
          {notifications.map((note, idx) => (
            <div key={`${note}-${idx}`} className="border-b border-white/5 px-4 py-3 text-xs text-slate-300">
              {note}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

