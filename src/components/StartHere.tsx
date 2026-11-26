import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getSetting, setSetting } from '../services/storage';
import { useT } from '../i18n';

const KEY = 'onboarding.v1.dismissed';

/**
 * First-run orientation (audit ONB-1): the three different things in HELIX, what is real and what is not.
 * Inline on Home (never blocks an action); dismissed once, remembered on this device.
 */
export default function StartHere() {
  const t = useT();
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
    ['1', t('Paper trading', 'Trading fictif'), t('Practise with simulated dollars at live Coinbase prices, with realistic fees. Nothing is sent to an exchange and no real money is involved.', 'Exercez-vous avec des dollars simulés aux prix réels de Coinbase, avec des frais réalistes. Rien n’est envoyé à une plateforme et aucun argent réel n’est en jeu.'), '/markets'],
    ['2', t('Trading bot (research)', 'Robot de trading (recherche)'), t('Tests trading strategies on past and new data. It only trades simulated money, and only if a strategy passes every test — none has yet, so it holds cash.', 'Teste des stratégies sur des données passées et nouvelles. Il ne négocie que de l’argent fictif, et seulement si une stratégie réussit tous les tests — aucune ne l’a fait pour l’instant, donc il reste en liquidités.'), '/bot'],
    ['3', t('Wallet (your own keys)', 'Portefeuille (vos propres clés)'), t('Creates or imports a real self-custody wallet. Keys stay encrypted on this phone. In this preview it can receive and show balances but cannot send.', 'Crée ou importe un vrai portefeuille autonome. Les clés restent chiffrées sur ce téléphone. Dans cette préversion, il peut recevoir et afficher les soldes, mais pas envoyer.'), '/wallet']
  ];
  return (
    <section aria-labelledby="start-here" className="space-y-3 border-y border-ink-600 py-4">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="start-here" className="text-base font-semibold text-white">{t('Start here: three different things', 'Pour commencer : trois choses différentes')}</h2>
        <button type="button" onClick={done} className="min-h-[44px] shrink-0 px-2 text-sm text-slate-400 underline underline-offset-2">{t('Got it', 'Compris')}</button>
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
      <p className="text-xs text-slate-500">{t('No account, no sign-up: everything stays on this device.', 'Aucun compte, aucune inscription : tout reste sur cet appareil.')}</p>
    </section>
  );
}
