import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getSetting, setSetting } from '../services/storage';

const KEY = 'onboarding.v1.dismissed';

/**
 * First-run orientation (audit ONB-1): the three different things in HELIX, what is real and what is not.
 * Inline on Home (never blocks an action); dismissed once, remembered on this device.
 */
export default function StartHere() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    let alive = true;
    getSetting<boolean>(KEY)
      .then((d) => alive && setShow(!d))
      .catch(() => alive && setShow(true));
    return () => {
      alive = false;
    };
  }, []);
  if (!show) return null;
  const done = () => {
    setShow(false);
    void setSetting(KEY, true).catch(() => undefined);
  };
  const items: [string, string, string, string][] = [
    ['1', 'Paper trading', 'Practise with simulated dollars at live Coinbase prices, with realistic fees. Nothing is sent to an exchange and no real money is involved.', '/markets'],
    ['2', 'Trading bot (research)', 'Tests trading strategies on past and new data. It only trades simulated money, and only if a strategy passes every test — none has yet, so it holds cash.', '/bot'],
    ['3', 'Wallet (your own keys)', 'Creates or imports a real self-custody wallet. Keys stay encrypted on this phone. In this preview it can receive and show balances but cannot send.', '/wallet']
  ];
  return (
    <section aria-labelledby="start-here" className="space-y-3 border-y border-ink-600 py-4">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="start-here" className="text-base font-semibold text-white">Start here: three different things</h2>
        <button type="button" onClick={done} className="min-h-[44px] shrink-0 px-2 text-sm text-slate-400 underline underline-offset-2">Got it</button>
      </div>
      <ol className="space-y-3">
        {items.map(([n, title, text, to]) => (
          <li key={n} className="flex gap-3">
            <span aria-hidden="true" className="mt-0.5 font-mono text-sm text-paper">{n}</span>
            <span className="space-y-0.5">
              <Link to={to} className="block text-sm font-semibold text-white underline-offset-2 hover:underline">{title}</Link>
              <span className="block text-sm text-slate-400">{text}</span>
            </span>
          </li>
        ))}
      </ol>
      <p className="text-xs text-slate-500">No account, no sign-up: everything stays on this device.</p>
    </section>
  );
}
