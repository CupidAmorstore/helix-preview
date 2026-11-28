import { useEffect, useState } from 'react';
import type { WalletNetwork } from '../types';
import { Button, Note, Panel, Sheet } from './ui';
import { NETWORK_LABEL, explorerAddressUrl, fetchBalance, fetchHistory, type Chain, type TxSummary } from '../services/walletSafety';
import { fmtAge } from '../services/marketData';
import { getLang, useT } from '../i18n';

const GUIDE = [
  ['What a wallet is', 'A wallet is a set of keys that control coins on a blockchain. The coins stay on the blockchain; the keys prove they are yours.'],
  ['Self-custody', 'HELIX creates the keys on this phone and stores them encrypted with your vault password. Nobody else, including HELIX, can recover them.'],
  ['Testnet vs mainnet', 'Testnet coins are free and worthless, for practice. Mainnet coins are real money. HELIX starts on testnet.'],
  ['Creating a wallet', 'You get 12 or 24 recovery words. HELIX asks you to confirm some of them so you know you wrote them down.'],
  ['Recovery and backup', 'The recovery words are the only backup. Write them on paper and keep them offline. Anyone with them can take the coins.'],
  ['Network fees', 'Every transfer pays a small fee to the network, not to HELIX. Fees depend on how busy the network is.'],
  ['Sending', 'Transfers cannot be reversed. HELIX checks the address and network before signing and shows a review step first. Sending is disabled in this private beta build.']
];
const GUIDE_FR = [
  ['Ce qu’est un portefeuille', 'Un portefeuille est un ensemble de clés qui contrôlent des pièces sur une chaîne de blocs. Les pièces restent sur la chaîne; les clés prouvent qu’elles vous appartiennent.'],
  ['Autogarde', 'HELIX crée les clés sur ce téléphone et les conserve chiffrées avec le mot de passe de votre coffre. Personne d’autre, pas même HELIX, ne peut les récupérer.'],
  ['Réseau de test ou principal', 'Les pièces du réseau de test sont gratuites et sans valeur, pour s’exercer. Celles du réseau principal sont de l’argent réel. HELIX démarre sur le réseau de test.'],
  ['Créer un portefeuille', 'Vous recevez 12 ou 24 mots de récupération. HELIX vous demande d’en confirmer quelques-uns pour s’assurer que vous les avez notés.'],
  ['Récupération et sauvegarde', 'Les mots de récupération sont la seule sauvegarde. Écrivez-les sur papier et gardez-les hors ligne. Quiconque les possède peut prendre les pièces.'],
  ['Frais de réseau', 'Chaque transfert paie de petits frais au réseau, pas à HELIX. Les frais dépendent de l’achalandage du réseau.'],
  ['Envoi', 'Les transferts sont irréversibles. HELIX vérifie l’adresse et le réseau avant de signer et affiche d’abord une étape de révision. L’envoi est désactivé dans cette version bêta privée.']
];

export function WalletGuide() {
  const [open, setOpen] = useState<number | null>(0);
  const t = useT();
  return (
    <Panel title={t('How self-custody works', 'Fonctionnement de l’autogarde')}>
      <ol className="divide-y divide-ink-600">
        {(getLang() === 'fr' ? GUIDE_FR : GUIDE).map(([h, b], i) => (
          <li key={h}>
            <button type="button" aria-expanded={open === i} onClick={() => setOpen(open === i ? null : i)} className="flex min-h-[48px] w-full items-center gap-3 text-left text-sm text-white">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-ink-700 font-mono text-xs text-slate-300">{i + 1}</span>
              <span className="flex-1">{h}</span>
              <span aria-hidden="true" className="text-slate-400">{open === i ? '−' : '+'}</span>
            </button>
            {open === i && <p className="pb-3 pl-9 text-sm text-slate-300">{b}</p>}
          </li>
        ))}
      </ol>
    </Panel>
  );
}

const CHAINS: { chain: Chain; symbol: string; name: string }[] = [
  { chain: 'btc', symbol: 'BTC', name: 'Bitcoin' },
  { chain: 'eth', symbol: 'ETH', name: 'Ethereum' },
  { chain: 'sol', symbol: 'SOL', name: 'Solana' }
];

async function copy(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function WalletAccounts({ addresses, network, rpc }: { addresses: Partial<Record<Chain, string>>; network: WalletNetwork; rpc: { eth: string; sol: string } }) {
  const [bal, setBal] = useState<Partial<Record<Chain, number | 'error'>>>({});
  const [checkedAt, setCheckedAt] = useState<number | null>(null);
  const [receive, setReceive] = useState<Chain | null>(null);
  const [history, setHistory] = useState<Chain | null>(null);
  const [txs, setTxs] = useState<TxSummary[] | 'unsupported' | 'error' | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const refresh = () => {
    setBal({});
    CHAINS.forEach(({ chain }) => {
      const a = addresses[chain];
      if (!a) return;
      fetchBalance(chain, a, network, chain === 'btc' ? undefined : rpc[chain])
        .then((v) => setBal((b) => ({ ...b, [chain]: v })))
        .catch(() => setBal((b) => ({ ...b, [chain]: 'error' })));
    });
    setCheckedAt(Date.now());
  };
  useEffect(refresh, [addresses.btc, addresses.eth, addresses.sol, network]); // eslint-disable-line react-hooks/exhaustive-deps -- refresh when the wallet or network changes

  useEffect(() => {
    if (!history || !addresses[history]) return;
    setTxs(null);
    fetchHistory(history, addresses[history]!, network, history === 'btc' ? undefined : rpc[history as 'eth' | 'sol'])
      .then(setTxs)
      .catch(() => setTxs('error'));
  }, [history, addresses, network, rpc]);

  const doCopy = async (a: string) => setCopied((await copy(a)) ? a : 'failed');
  const tt = useT();

  return (
    <>
      <Panel title={tt('Accounts', 'Comptes')} action={<Button kind="ghost" onClick={refresh}>{tt('Refresh', 'Actualiser')}</Button>}>
        <ul className="divide-y divide-ink-600">
          {CHAINS.map(({ chain, symbol, name }) => {
            const a = addresses[chain];
            const b = bal[chain];
            return (
              <li key={chain} className="space-y-2 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white">{name}</p>
                    <p className="text-xs text-slate-400">{NETWORK_LABEL[chain][network]}</p>
                  </div>
                  <p className="text-right font-mono text-sm text-white tabular-nums">
                    {b === undefined ? '…' : b === 'error' ? <span className="text-amber-400">{tt('unavailable', 'indisponible')}</span> : `${b.toLocaleString(undefined, { maximumFractionDigits: 8 })} ${symbol}`}
                  </p>
                </div>
                {a && <p className="break-all font-mono text-xs text-slate-400">{a}</p>}
                <div className="grid grid-cols-3 gap-2">
                  <Button onClick={() => setReceive(chain)} className="!min-h-[44px] !px-2 text-xs">{tt('Receive', 'Recevoir')}</Button>
                  <Button onClick={() => a && doCopy(a)} className="!min-h-[44px] !px-2 text-xs">{copied === a ? tt('Copied ✓', 'Copié ✓') : tt('Copy', 'Copier')}</Button>
                  <Button onClick={() => setHistory(chain)} className="!min-h-[44px] !px-2 text-xs">{tt('History', 'Historique')}</Button>
                </div>
              </li>
            );
          })}
        </ul>
        {copied === 'failed' && <Note tone="warn">{tt('Copy is blocked here. Long-press the address to select it.', 'La copie est bloquée ici. Appuyez longuement sur l’adresse pour la sélectionner.')}</Note>}
        <Note>{checkedAt ? tt(`Balances from public blockchain data, checked ${fmtAge(checkedAt)}.`, `Soldes tirés des données publiques de la chaîne de blocs, vérifiés ${fmtAge(checkedAt)}.`) : ''} {network === 'testnet' ? tt('Testnet coins have no value.', 'Les pièces du réseau de test n’ont aucune valeur.') : tt('Mainnet: real funds.', 'Réseau principal : vrais fonds.')}</Note>
      </Panel>

      <Sheet open={receive !== null} onClose={() => setReceive(null)} title={`${tt('Receive', 'Recevoir')} ${receive ? CHAINS.find((c) => c.chain === receive)!.name : ''}`}>
        {receive && addresses[receive] && (
          <div className="space-y-3">
            <p className="rounded-xl bg-amber-500/10 p-3 text-sm text-amber-300">{tt(`Only send ${NETWORK_LABEL[receive][network]} coins to this address. Coins from another network can be lost.`, `N’envoyez à cette adresse que des pièces ${NETWORK_LABEL[receive][network]}. Des pièces d’un autre réseau peuvent être perdues.`)}</p>
            <p className="break-all rounded-xl bg-ink-900 p-3 font-code text-sm text-white" aria-label={tt('Your address', 'Votre adresse')}>{addresses[receive]}</p>
            <Button kind="primary" className="w-full" onClick={() => doCopy(addresses[receive]!)}>{copied === addresses[receive] ? tt('Copied ✓', 'Copié ✓') : tt('Copy address', 'Copier l’adresse')}</Button>
            <a href={explorerAddressUrl(receive, addresses[receive]!, network)} target="_blank" rel="noreferrer" className="flex min-h-[44px] items-center justify-center text-sm text-helix-400">{tt('View on block explorer', 'Voir dans l’explorateur de blocs')}</a>
          </div>
        )}
      </Sheet>

      <Sheet open={history !== null} onClose={() => { setHistory(null); setTxs(null); }} title={`${tt('History', 'Historique')} ${history ? CHAINS.find((c) => c.chain === history)!.name : ''}`}>
        {history && (
          <div className="space-y-3">
            {txs === null && <p className="text-sm text-slate-400">{tt('Loading…', 'Chargement…')}</p>}
            {txs === 'error' && <p className="text-sm text-amber-400">{tt('History is unavailable right now.', 'L’historique est indisponible pour l’instant.')}</p>}
            {txs === 'unsupported' && (
              <p className="text-sm text-slate-300">{tt('Ethereum history needs an indexer HELIX doesn’t have for free. Open the explorer to see every transaction.', 'L’historique Ethereum exige un service d’indexation que HELIX n’a pas gratuitement. Ouvrez l’explorateur pour voir chaque transaction.')}</p>
            )}
            {Array.isArray(txs) && txs.length === 0 && <p className="text-sm text-slate-400">{tt('No transactions yet.', 'Aucune transaction pour l’instant.')}</p>}
            {Array.isArray(txs) && txs.length > 0 && (
              <ul className="divide-y divide-ink-600">
                {txs.map((t) => (
                  <li key={t.id}>
                    <a href={t.url} target="_blank" rel="noreferrer" className="flex min-h-[52px] items-center justify-between gap-3 py-2 text-sm">
                      <span>
                        <span className="block font-code text-xs text-slate-300">{t.id.slice(0, 10)}…{t.id.slice(-6)}</span>
                        <span className="block text-xs text-slate-500">{t.confirmed ? tt('Confirmed', 'Confirmée') : tt('Pending', 'En attente')}{t.when ? ` · ${fmtAge(t.when)}` : ''}</span>
                      </span>
                      {t.amount !== null && <span className={`font-mono ${t.amount >= 0 ? 'text-up' : 'text-down'}`}>{t.amount >= 0 ? '▲ +' : '▼ −'}{Math.abs(t.amount)}</span>}
                    </a>
                  </li>
                ))}
              </ul>
            )}
            {addresses[history] && <a href={explorerAddressUrl(history, addresses[history]!, network)} target="_blank" rel="noreferrer" className="flex min-h-[44px] items-center justify-center text-sm text-helix-400">{tt('Open block explorer', 'Ouvrir l’explorateur de blocs')}</a>}
          </div>
        )}
      </Sheet>
    </>
  );
}
