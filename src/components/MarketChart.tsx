import { createChart, ColorType, type IChartApi, type ISeriesApi, type LineData, type UTCTimestamp } from 'lightweight-charts';
import { useEffect, useRef, useState } from 'react';
import { fetchCandles } from '../services/market';
import { chartTone } from './chartTone';

type MarketChartProps = {
  /** Coinbase product id, e.g. BTC-USD */
  symbol: string;
  timeframe: string;
  /** live last-trade price: keeps the newest point in step with the price shown above the chart */
  livePrice?: number | null;
};

const fmtAxis = (v: number) =>
  v >= 1000 ? v.toLocaleString('en-US', { maximumFractionDigits: 0 }) : v >= 1 ? v.toLocaleString('en-US', { maximumFractionDigits: 2 }) : v.toPrecision(4);

export default function MarketChart({ symbol, timeframe, livePrice }: MarketChartProps) {
  const lastTime = useRef<UTCTimestamp | null>(null);
  const firstValue = useRef<number | null>(null);
  const paint = (last: number | null) => {
    const t = chartTone(firstValue.current, last);
    seriesRef.current?.applyOptions({ lineColor: t.line, topColor: t.top, bottomColor: t.bottom });
  };
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Area'> | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');

  useEffect(() => {
    if (!containerRef.current) return undefined;

    const chart = createChart(containerRef.current, {
      height: 280,
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#A6A093',
        fontFamily: 'Instrument Sans, system-ui, sans-serif'
      },
      localization: { priceFormatter: fmtAxis },
      grid: {
        vertLines: { visible: false },
        horzLines: { color: 'rgba(243, 239, 230, 0.06)' }
      },
      crosshair: {
        vertLine: { color: 'rgba(243, 239, 230, 0.35)', labelBackgroundColor: '#2E2D28' },
        horzLine: { color: 'rgba(243, 239, 230, 0.35)', labelBackgroundColor: '#2E2D28' }
      },
      rightPriceScale: { borderVisible: false },
      timeScale: { borderVisible: false }
    });

    const series = chart.addAreaSeries({
      lineColor: '#4CC38A',
      lineWidth: 2,
      topColor: 'rgba(76, 195, 138, 0.18)',
      bottomColor: 'rgba(76, 195, 138, 0)'
    });

    chartRef.current = chart;
    seriesRef.current = series;

    const resize = () => {
      chart.applyOptions({ width: containerRef.current?.clientWidth ?? 0 });
    };
    resize();
    window.addEventListener('resize', resize);

    return () => {
      window.removeEventListener('resize', resize);
      chart.remove();
    };
  }, []);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setStatus('loading');
      try {
        const candles = await fetchCandles(symbol, timeframe);
        if (!active) return;
        const data: LineData[] = candles.map((k) => ({
          time: Math.floor(k.t / 1000) as UTCTimestamp,
          value: k.c
        }));
        seriesRef.current?.setData(data);
        lastTime.current = data.length ? (data[data.length - 1].time as UTCTimestamp) : null;
        firstValue.current = data.length ? data[0].value : null;
        paint(data.length ? data[data.length - 1].value : null);
        chartRef.current?.timeScale().fitContent();
        setStatus('idle');
      } catch {
        if (!active) return;
        setStatus('error');
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [symbol, timeframe]);

  // move the newest point with the live price (same bucket), so chart and header never disagree
  useEffect(() => {
    if (!livePrice || lastTime.current === null || status !== 'idle') return;
    try {
      seriesRef.current?.update({ time: lastTime.current, value: livePrice });
      paint(livePrice);
    } catch {
      /* chart not ready */
    }
  }, [livePrice, status]);

  return (
    <div className="relative">
      <div ref={containerRef} className="h-[280px] w-full" role="img" aria-label={`${symbol} price chart, ${timeframe} intervals`} />
      <p className="mt-1 text-[11px] text-slate-500">Times in your time zone ({Intl.DateTimeFormat().resolvedOptions().timeZone}). The last point is the current, unfinished interval and moves with the live price.</p>
      {status === 'loading' && (
        <div className="absolute inset-0 flex items-center justify-center text-xs text-slate-400">Loading chart...</div>
      )}
      {status === 'error' && (
        <div className="absolute inset-0 flex items-center justify-center text-xs text-slate-400">Chart unavailable · check your connection</div>
      )}
    </div>
  );
}

