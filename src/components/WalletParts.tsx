import { useEffect, useState } from 'react';
import type { WalletNetwork } from '../types';
import { Button, Note, Panel, Sheet } from './ui';
import { NETWORK_LABEL, explorerAddressUrl, fetchBalance, fetchHistory, type Chain, type TxSummary } from '../services/walletSafety';
import { fmtAge } from '../services/marketData';

const GUIDE = [
  ['What a wallet is', 'A wallet is a set of keys that control coins on a blockchain. The coins stay on the blockchain; the keys prove they are yours.'],
  ['Self-custody', 'HELIX creates the keys on this phone and stores them encrypted with your vault password. Nobody else, including HELIX, can recover them.'],
  ['Testnet vs mainnet', 'Testnet coins are free and worthless, for practice. Mainnet coins are real money. HELIX starts on testnet.'],
  ['Creating a wallet', 'You get 12 or 24 recovery words. HELIX asks you to confirm some of them so you know you wrote them down.'],
  ['Recovery and backup', 'The recovery words are the only backup. Write them on paper and keep them offline. Anyone with them can take the coins.'],
  ['Network fees', 'Every transfer pays a small fee to the network, not to HELIX. Fees depend on how busy the network is.'],
  ['Sending', 'Transfers cannot be reversed. HELIX checks the address and network before signing and shows a review step first. In this preview, sending works on testnet only.']
];

export function WalletGuide() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <Panel title="How self-custody works">
      <ol className="divide-y divide-ink-600">
        {GUIDE.map(([h, b], i) => (
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

  return (
    <>
      <Panel title="Accounts" action={<Button kind="ghost" onClick={refresh}>Refresh</Button>}>
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
                    {b === undefined ? '…' : b === 'error' ? <span className="text-amber-400">unavailable</span> : `${b.toLocaleString(undefined, { maximumFractionDigits: 8 })} ${symbol}`}
                  </p>
                </div>
                {a && <p className="break-all font-mono text-xs text-slate-400">{a}</p>}
                <div className="grid grid-cols-3 gap-2">
                  <Button onClick={() => setReceive(chain)} className="!min-h-[44px] !px-2 text-xs">Receive</Button>
                  <Button onClick={() => a && doCopy(a)} className="!min-h-[44px] !px-2 text-xs">{copied === a ? 'Copied ✓' : 'Copy'}</Button>
                  <Button onClick={() => setHistory(chain)} className="!min-h-[44px] !px-2 text-xs">History</Button>
                </div>
              </li>
            );
          })}
        </ul>
        {copied === 'failed' && <Note tone="warn">Copy is blocked here. Long-press the address to select it.</Note>}
        <Note>{checkedAt ? `Balances from public blockchain data, checked ${fmtAge(checkedAt)}.` : ''} {network === 'testnet' ? 'Testnet coins have no value.' : 'Mainnet: real funds.'}</Note>
      </Panel>

      <Sheet open={receive !== null} onClose={() => setReceive(null)} title={`Receive ${receive ? CHAINS.find((c) => c.chain === receive)!.name : ''}`}>
        {receive && addresses[receive] && (
          <div className="space-y-3">
            <p className="rounded-xl bg-amber-500/10 p-3 text-sm text-amber-300">Only send {NETWORK_LABEL[receive][network]} coins to this address. Coins from another network can be lost.</p>
            <p className="break-all rounded-xl bg-ink-900 p-3 font-code text-sm text-white" aria-label="Your address">{addresses[receive]}</p>
            <Button kind="primary" className="w-full" onClick={() => doCopy(addresses[receive]!)}>{copied === addresses[receive] ? 'Copied ✓' : 'Copy address'}</Button>
            <a href={explorerAddressUrl(receive, addresses[receive]!, network)} target="_blank" rel="noreferrer" className="flex min-h-[44px] items-center justify-center text-sm text-helix-400">View on block explorer</a>
          </div>
        )}
      </Sheet>

      <Sheet open={history !== null} onClose={() => { setHistory(null); setTxs(null); }} title={`${history ? CHAINS.find((c) => c.chain === history)!.name : ''} history`}>
        {history && (
          <div className="space-y-3">
            {txs === null && <p className="text-sm text-slate-400">Loading…</p>}
            {txs === 'error' && <p className="text-sm text-amber-400">History is unavailable right now.</p>}
            {txs === 'unsupported' && (
              <p className="text-sm text-slate-300">Ethereum history needs an indexer HELIX doesn&apos;t have for free. Open the explorer to see every transaction.</p>
            )}
            {Array.isArray(txs) && txs.length === 0 && <p className="text-sm text-slate-400">No transactions yet.</p>}
            {Array.isArray(txs) && txs.length > 0 && (
              <ul className="divide-y divide-ink-600">
                {txs.map((t) => (
                  <li key={t.id}>
                    <a href={t.url} target="_blank" rel="noreferrer" className="flex min-h-[52px] items-center justify-between gap-3 py-2 text-sm">
                      <span>
                        <span className="block font-code text-xs text-slate-300">{t.id.slice(0, 10)}…{t.id.slice(-6)}</span>
                        <span className="block text-xs text-slate-500">{t.confirmed ? 'Confirmed' : 'Pending'}{t.when ? ` · ${fmtAge(t.when)}` : ''}</span>
                      </span>
                      {t.amount !== null && <span className={`font-mono ${t.amount >= 0 ? 'text-up' : 'text-down'}`}>{t.amount >= 0 ? '▲ +' : '▼ −'}{Math.abs(t.amount)}</span>}
                    </a>
                  </li>
                ))}
              </ul>
            )}
            {addresses[history] && <a href={explorerAddressUrl(history, addresses[history]!, network)} target="_blank" rel="noreferrer" className="flex min-h-[44px] items-center justify-center text-sm text-helix-400">Open block explorer</a>}
          </div>
        )}
      </Sheet>
    </>
  );
}
