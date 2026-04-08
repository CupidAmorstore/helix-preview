import { useEffect, useMemo, useState } from 'react';
import MarketChart from '../components/MarketChart';
import { MARKET_COINS, fetchMarketOverview } from '../services/market';
import { useLivePrices } from '../hooks/useLivePrices';

export default function DashboardPage() {
  const [overview, setOverview] = useState<any[]>([]);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [selected, setSelected] = useState(MARKET_COINS[0]);
  const [timeframe, setTimeframe] = useState('1h');

  const symbols = useMemo(() => MARKET_COINS.map((coin) => coin.binance), []);
  const livePrices = useLivePrices(symbols);

  useEffect(() => {
    let active = true;
    setStatus('loading');
    fetchMarketOverview()
      .then((data) => {
        if (!active) return;
        setOverview(data);
        setStatus('idle');
      })
      .catch(() => {
        if (!active) return;
        setStatus('error');
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="space-y-10 fade-in">
      <section className="space-y-3">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Market</p>
        <h1 className="text-3xl font-semibold text-white">Live Market Intelligence</h1>
        <p className="max-w-2xl text-sm text-slate-400">
          Real-time price streaming from Binance with CoinGecko market context. Signals are informational only.
        </p>
      </section>

      <section className="grid gap-8 lg:grid-cols-[1.2fr_1.8fr]">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-200">Live Snapshot</h2>
            <span className="text-xs text-slate-500">Binance WS</span>
          </div>
          <div className="space-y-2">
            {MARKET_COINS.map((coin) => {
              const live = livePrices[coin.symbol];
              return (
                <button
                  key={coin.id}
                  type="button"
                  onClick={() => setSelected(coin)}
                  className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition ${
                    selected.id === coin.id ? 'border-mint-500/70 bg-white/5' : 'border-white/10 hover:border-white/20'
                  }`}
                >
                  <div>
                    <div className="text-sm font-semibold text-white">{coin.symbol}</div>
                    <div className="text-xs text-slate-400">{coin.name}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-slate-200">
                      {live ? `$${live.toFixed(2)}` : '...'}
                    </div>
                    <div className="text-[11px] text-slate-500">live</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-200">{selected.symbol} Price Action</h2>
              <p className="text-xs text-slate-500">Chart data via Binance REST</p>
            </div>
            <div className="flex gap-2 text-xs">
              {['1m', '5m', '15m', '1h', '4h', '1d', '1w'].map((tf) => (
                <button
                  key={tf}
                  type="button"
                  onClick={() => setTimeframe(tf)}
                  className={`rounded-full border px-3 py-1 ${
                    timeframe === tf ? 'border-mint-500/70 text-mint-300' : 'border-white/10 text-slate-400'
                  }`}
                >
                  {tf}
                </button>
              ))}
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <MarketChart symbol={selected.binance} timeframe={timeframe} />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-200">Top 100 by Market Cap</h2>
            <p className="text-xs text-slate-500">CoinGecko refreshes on demand.</p>
          </div>
          <span className="text-xs text-slate-500">Read-only</span>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5">
          <div className="grid grid-cols-4 gap-4 border-b border-white/10 px-4 py-3 text-[11px] uppercase tracking-[0.2em] text-slate-500">
            <div>Asset</div>
            <div>Price</div>
            <div>24h</div>
            <div>Market Cap</div>
          </div>
          {status === 'loading' && (
            <div className="px-4 py-6 text-sm text-slate-400">Loading market list...</div>
          )}
          {status === 'error' && (
            <div className="px-4 py-6 text-sm text-rose-400">Market list unavailable. Check your connection.</div>
          )}
          {status === 'idle' && overview.slice(0, 20).map((coin) => (
            <div
              key={coin.id}
              className="grid grid-cols-4 gap-4 border-b border-white/5 px-4 py-3 text-sm text-slate-200"
            >
              <div className="flex items-center gap-2">
                <img src={coin.image} alt="" className="h-5 w-5 rounded-full" />
                <div>
                  <div className="text-sm font-semibold text-white">{coin.symbol.toUpperCase()}</div>
                  <div className="text-xs text-slate-500">{coin.name}</div>
                </div>
              </div>
              <div>${coin.current_price.toLocaleString()}</div>
              <div className={coin.price_change_percentage_24h >= 0 ? 'text-mint-300' : 'text-rose-400'}>
                {coin.price_change_percentage_24h?.toFixed(2)}%
              </div>
              <div>${coin.market_cap.toLocaleString()}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

