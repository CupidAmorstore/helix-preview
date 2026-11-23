import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchPriceMap } from '../services/market';
import { listAddresses, listExchanges, saveSnapshot, getSetting, setSetting } from '../services/storage';
import { useVault } from '../services/vault';
import { fetchExchangeBalances } from '../services/exchanges';
import { fetchBtcBalance, fetchEthBalance, fetchSolBalance } from '../services/onchain';
import type { EncryptedPayload } from '../types';

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
            localNotes.push('Unable to decrypt Etherscan API key.');
          }
        }
        if (encryptedSolRpc) {
          try {
            solRpc = await vault.decrypt(encryptedSolRpc);
          } catch {
            localNotes.push('Unable to decrypt Solana RPC setting.');
          }
        }
      } else {
        localNotes.push('Unlock the vault to load encrypted API keys and exchange balances.');
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
              localNotes.push('Etherscan API key not configured.');
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
    <div className="space-y-8 slide-up">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Portfolio</p>
        <h1 className="text-3xl font-semibold text-white">Read-only Portfolio View</h1>
        <p className="text-sm text-slate-400">
          Aggregates exchange balances and public address holdings. No keys stored on servers.
        </p>
      </header>

      <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-xs text-slate-500">Total value</div>
            <div className="text-2xl font-semibold text-white">${totalUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
          </div>
          <button
            type="button"
            onClick={refresh}
            className="rounded-full border border-white/10 px-4 py-2 text-xs text-slate-300"
          >
            Refresh balances
          </button>
        </div>
        {notes.length > 0 && (
          <div className="mt-4 space-y-1 text-xs text-amber-400">
            {notes.map((note) => (
              <div key={note}>{note}</div>
            ))}
          </div>
        )}
      </section>

      <section tabIndex={0} aria-label="Holdings table (scrolls sideways)" className="overflow-x-auto rounded-2xl border border-white/10 bg-white/5">
        <div className="min-w-[560px]">
        <div className="grid grid-cols-5 gap-4 border-b border-white/10 px-4 py-3 text-[11px] uppercase tracking-[0.2em] text-slate-500">
          <div>Asset</div>
          <div>Quantity</div>
          <div>Price</div>
          <div>Cost Basis</div>
          <div>P&amp;L</div>
        </div>
        {status === 'loading' && (
          <div className="px-4 py-6 text-sm text-slate-400">Loading balances...</div>
        )}
        {status === 'error' && (
          <div className="px-4 py-6 text-sm text-rose-400">Unable to load portfolio data.</div>
        )}
        {status === 'idle' && rows.length === 0 && (
          <div className="px-4 py-6 text-sm text-slate-400">No balances found. Add exchanges or addresses.</div>
        )}
        {rows.map((row) => {
          // P&L is only meaningful once the user has entered what they paid. Never treat a missing
          // cost basis as zero, which would show the whole holding as profit.
          const costBasis = costBasisMap[row.symbol] ?? 0;
          const pnl = costBasis > 0 ? row.usdValue - costBasis : null;
          return (
          <div key={row.symbol} className="grid grid-cols-5 gap-4 border-b border-white/5 px-4 py-3 text-sm text-slate-200">
            <div className="font-semibold text-white">{row.symbol}</div>
            <div>{row.quantity.toFixed(6)}</div>
            <div>${row.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
            <div>
              <input
                type="number"
                min={0}
                placeholder="What you paid"
                aria-label={`Cost basis for ${row.symbol} in US dollars`}
                value={costBasis || ''}
                onChange={(e) => updateCostBasis(row.symbol, Math.max(0, Number(e.target.value) || 0))}
                className="w-28 rounded-md border border-white/10 bg-transparent px-2 py-1 text-xs text-slate-200"
              />
            </div>
            {pnl === null ? (
              <div className="text-slate-500">Set cost basis</div>
            ) : (
              <div className={pnl >= 0 ? 'text-mint-300' : 'text-rose-400'}>
                {pnl >= 0 ? '▲ +' : '▼ −'}${Math.abs(pnl).toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </div>
            )}
          </div>
          );
        })}
        </div>
      </section>
    </div>
  );
}

