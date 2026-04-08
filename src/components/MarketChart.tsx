import { createChart, ColorType, LineData } from 'lightweight-charts';
import { useEffect, useRef, useState } from 'react';
import { fetchBinanceKlines, intervalLabelToBinance } from '../services/market';

type MarketChartProps = {
  symbol: string;
  timeframe: string;
};

export default function MarketChart({ symbol, timeframe }: MarketChartProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<ReturnType<typeof createChart> | null>(null);
  const seriesRef = useRef<ReturnType<typeof chartRef.current.addAreaSeries> | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');

  useEffect(() => {
    if (!containerRef.current) return undefined;

    const chart = createChart(containerRef.current, {
      height: 280,
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#cbd5f5'
      },
      grid: {
        vertLines: { color: 'rgba(148, 163, 184, 0.12)' },
        horzLines: { color: 'rgba(148, 163, 184, 0.12)' }
      },
      rightPriceScale: { borderColor: 'rgba(148, 163, 184, 0.2)' },
      timeScale: { borderColor: 'rgba(148, 163, 184, 0.2)' }
    });

    const series = chart.addAreaSeries({
      lineColor: '#10b981',
      topColor: 'rgba(16, 185, 129, 0.25)',
      bottomColor: 'rgba(16, 185, 129, 0.02)'
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
        const interval = intervalLabelToBinance(timeframe);
        const klines = await fetchBinanceKlines(symbol, interval, 300);
        if (!active) return;
        const data: LineData[] = klines.map((kline) => ({
          time: Math.floor(kline[0] / 1000),
          value: parseFloat(kline[4])
        }));
        seriesRef.current?.setData(data);
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

  return (
    <div className="relative">
      <div ref={containerRef} className="h-[280px] w-full" />
      {status === 'loading' && (
        <div className="absolute inset-0 flex items-center justify-center text-xs text-slate-400">Loading chart...</div>
      )}
      {status === 'error' && (
        <div className="absolute inset-0 flex items-center justify-center text-xs text-rose-400">Chart unavailable</div>
      )}
    </div>
  );
}

