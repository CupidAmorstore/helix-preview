import { Link } from 'react-router-dom';
import { Note, PageHeader } from '../components/ui';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchPriceMap } from '../services/market';
import { listAddresses, listExchanges, saveSnapshot, getSetting, setSetting } from '../services/storage';
import { useVault } from '../services/vault';
import { fetchExchangeBalances } from '../services/exchanges';
import { fetchBtcBalance, fetchEthBalance, fetchSolBalance } from '../services/onchain';
import type { EncryptedPayload } from '../types';
import { tr, useT } from '../i18n';

const COIN_ID_MAP: Record<string, string> = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
  SOL: 'solana',
  BNB: 'binancecoin',
  XRP: 'ripple',
  DOGE: 'dogecoin',
  ADA: 'cardano',
  AVAX: 'avalanche-2'
};

type AssetRow = {
  symbol: string;
  quantity: number;
  price: number;
  usdValue: number;
  costBasis: number;
};

export default function PortfolioPage() {
  const t = useT();
  const vault = useVault();
  const [rows, setRows] = useState<AssetRow[]>([]);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [notes, setNotes] = useState<string[]>([]);
  const [costBasisMap, setCostBasisMap] = useState<Record<string, number>>({});
  const totalUsd = useMemo(() => rows.reduce((sum, r) => sum + r.usdValue, 0), [rows]);

  useEffect(() => {
    getSetting<Record<string, number>>('cost_basis').then((stored) => {
      if (stored) setCostBasisMap(stored);
    });
  }, []);

  const refresh = useCallback(async () => {
    setStatus('loading');
    setNotes([]);
    try {
      const [addresses, exchanges] = await Promise.all([listAddresses(), listExchanges()]);
      if (addresses.length === 0 && exchanges.length === 0) {
        setNotes([tr('Nothing to refresh yet: add a public address in Connections first.', 'Rien à actualiser pour l’instant : ajoutez d’abord une adresse publique dans Connexions.')]);
        setStatus('idle');
        return;
      }
      const assetTotals = new Map<string, number>();
      const localNotes: string[] = [];
      let etherscanKey: string | null = null;
      let solRpc = 'https://api.mainnet-beta.solana.com';

      if (!vault.locked) {
        const encryptedEtherscan = await getSetting<EncryptedPayload>('etherscan_key');
        const encryptedSolRpc = await getSetting<EncryptedPayload>('sol_rpc');
        if (encryptedEtherscan) {
          try {
            etherscanKey = await vault.decrypt(encryptedEtherscan);
          } catch {
            localNotes.push(tr('Unable to decrypt Etherscan API key.', 'Impossible de déchiffrer la clé API Etherscan.'));
          }
        }
        if (encryptedSolRpc) {
          try {
            solRpc = await vault.decrypt(encryptedSolRpc);
          } catch {
            localNotes.push(tr('Unable to decrypt Solana RPC setting.', 'Impossible de déchiffrer le réglage RPC Solana.'));
          }
        }
      } else {
        localNotes.push(tr('Ethereum tokens need an Etherscan key: unlock the vault in Connections to use a saved key.', 'Les jetons Ethereum exigent une clé Etherscan : déverrouillez le coffre dans Connexions pour utiliser une clé enregistrée.'));
      }

      // On-chain balances
      for (const address of addresses) {
        try {
          if (address.chain === 'btc') {
            const balance = await fetchBtcBalance(address.address, 'mainnet');
            assetTotals.set('BTC', (assetTotals.get('BTC') ?? 0) + balance.balanceBtc);
          }
          if (address.chain === 'eth') {
            if (!etherscanKey) {
              localNotes.push(tr('Etherscan API key not configured.', 'Clé API Etherscan non configurée.'));
            } else {
              const balance = await fetchEthBalance(address.address, etherscanKey);
              assetTotals.set('ETH', (assetTotals.get('ETH') ?? 0) + balance.eth);
            }
          }
          if (address.chain === 'sol') {
            const balance = await fetchSolBalance(address.address, solRpc);
            assetTotals.set('SOL', (assetTotals.get('SOL') ?? 0) + balance.sol);
          }
        } catch {
          localNotes.push(`Address lookup failed for ${address.label || address.address}.`);
        }
      }

      // Exchange balances
      if (!vault.locked) {
        for (const exchange of exchanges) {
          try {
            const creds = JSON.parse(await vault.decrypt(exchange.payload));
            const balance = await fetchExchangeBalances(exchange.exchange, creds);
            Object.entries(balance.total || {}).forEach(([symbol, total]) => {
              if (!total || total === 0) return;
              assetTotals.set(symbol.toUpperCase(), (assetTotals.get(symbol.toUpperCase()) ?? 0) + Number(total));
            });
          } catch {
            localNotes.push(`Exchange lookup failed for ${exchange.label}.`);
          }
        }
      }

      const ids = Array.from(assetTotals.keys())
        .map((symbol) => COIN_ID_MAP[symbol])
        .filter(Boolean);
      const priceMap = ids.length ? await fetchPriceMap(ids as string[]) : {};

      const data: AssetRow[] = Array.from(assetTotals.entries()).map(([symbol, quantity]) => {
        const id = COIN_ID_MAP[symbol];
        const price = id ? priceMap[id]?.usd ?? 0 : 0;
        const usdValue = price * quantity;
        const costBasis = costBasisMap[symbol] ?? 0;
        return {
          symbol,
          quantity,
          price,
          usdValue,
          costBasis
        };
      });

      setRows(data.sort((a, b) => b.usdValue - a.usdValue));
      setNotes(localNotes);

      // One snapshot per day, overwritten on each refresh so Home always shows the latest value.
      const today = new Date().toISOString().slice(0, 10);
      await saveSnapshot({
        id: `snap_${today}`,
        date: today,
        totalUsd: data.reduce((sum, r) => sum + r.usdValue, 0),
        assets: Object.fromEntries(Array.from(assetTotals.entries()))
      });

      setStatus('idle');
    } catch {
      setStatus('error');
    }
  }, [vault, costBasisMap]);

  const updateCostBasis = async (symbol: string, value: number) => {
    const next = { ...costBasisMap, [symbol]: value };
    setCostBasisMap(next);
    await setSetting('cost_basis', next);
  };

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <PageHeader title={t('Watched addresses', 'Adresses suivies')} back subtitle={t('Read-only balances from public blockchain data', 'Soldes en lecture seule tirés des données publiques de la chaîne de blocs')} />

      <section className="space-y-3 border-t border-ink-600 pt-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="eyebrow text-slate-500">{t('Total value', 'Valeur totale')}</div>
            <div className="font-mono text-[32px] font-semibold leading-tight text-white">${totalUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          </div>
          <button type="button" onClick={refresh} disabled={status === 'loading'} className="min-h-[44px] shrink-0 rounded-full border border-ink-500 px-4 text-sm text-white disabled:opacity-50">
            {status === 'loading' ? t('Refreshing…', 'Actualisation…') : t('Refresh balances', 'Actualiser les soldes')}
          </button>
        </div>
        {notes.length > 0 && <div className="space-y-1 text-xs text-slate-400">{notes.map((n) => <p key={n}>{n}</p>)}</div>}
        <Note>{t('Not part of your paper account and not tradable here.', 'Ne fait pas partie de votre compte fictif et ne peut pas être négocié ici.')} {t('Add or remove addresses in', 'Ajoutez ou retirez des adresses dans')} <Link className="underline" to="/connections">{t('Connections', 'Connexions')}</Link>.</Note>
      </section>

      <section className="border-t border-ink-600" aria-label={t('Holdings', 'Avoirs')}>
        {status === 'loading' && rows.length === 0 && <p className="py-6 text-sm text-slate-400">{t('Loading balances…', 'Chargement des soldes…')}</p>}
        {status === 'error' && <p role="alert" className="py-6 text-sm text-down">{t('Balances could not be loaded. Check your connection and try again.', 'Les soldes n’ont pas pu être chargés. Vérifiez votre connexion et réessayez.')}</p>}
        {status === 'idle' && rows.length === 0 && (
          <p className="py-6 text-sm text-slate-400">{t('No balances yet.', 'Aucun solde pour l’instant.')} <Link className="text-helix-400 underline" to="/connections">{t('Add a public address', 'Ajoutez une adresse publique')}</Link> {t('to track it here.', 'pour la suivre ici.')}</p>
        )}
        <ul className="divide-y divide-ink-600">
          {rows.map((row) => {
            // P&L only once the user has entered what they paid; a missing cost basis is never treated as zero.
            const costBasis = costBasisMap[row.symbol] ?? 0;
            const pnl = costBasis > 0 ? row.usdValue - costBasis : null;
            return (
              <li key={row.symbol} className="space-y-2 py-3">
                <div className="flex items-baseline justify-between gap-3">
                  <span>
                    <span className="block text-[15px] font-semibold text-white">{row.symbol}</span>
                    <span className="block font-mono text-xs text-slate-500">{row.quantity.toFixed(6)} × ${row.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                  </span>
                  <span className="font-mono text-[15px] text-white">${row.usdValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <label className="flex items-center gap-2 text-xs text-slate-400">
                    {t('You paid $', 'Vous avez payé $')}
                    <input
                      type="number"
                      inputMode="decimal"
                      min={0}
                      placeholder={t('optional', 'facultatif')}
                      aria-label={t(`What you paid for ${row.symbol}, in US dollars`, `Montant payé pour ${row.symbol}, en dollars US`)}
                      value={costBasis || ''}
                      onChange={(e) => updateCostBasis(row.symbol, Math.max(0, Number(e.target.value) || 0))}
                      className="min-h-[40px] w-28 rounded-lg border border-ink-500 bg-ink-800 px-2 font-mono text-sm text-white"
                    />
                  </label>
                  {pnl === null ? (
                    <span className="text-xs text-slate-500">{t('Enter what you paid to see P&amp;L', 'Entrez le montant payé pour voir le gain ou la perte')}</span>
                  ) : (
                    <span className={`font-mono text-sm ${pnl >= 0 ? 'text-up' : 'text-down'}`}>
                      {pnl >= 0 ? '▲ +' : '▼ −'}${Math.abs(pnl).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
