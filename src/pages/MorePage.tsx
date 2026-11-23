import { Link } from 'react-router-dom';
import { legalItems, secondaryNav } from '../components/navigation';

export default function MorePage() {
  return (
    <div className="mx-auto max-w-xl space-y-6 fade-in">
      <h1 className="text-2xl font-semibold text-white">More</h1>
      <nav aria-label="More" className="overflow-hidden rounded-2xl border border-white/10 bg-ink-800/60">
        {secondaryNav.map((item) => (
          <Link key={item.path} to={item.path} className="flex min-h-[64px] items-center justify-between gap-3 border-b border-white/10 px-4 py-3 last:border-b-0">
            <span>
              <span className="block text-sm font-semibold text-white">{item.label}</span>
              <span className="block text-xs text-slate-400">{item.description}</span>
            </span>
            <span aria-hidden="true" className="text-slate-400">›</span>
          </Link>
        ))}
      </nav>
      <section className="space-y-2">
        <h2 className="text-xs uppercase tracking-[0.2em] text-slate-400">Help &amp; legal</h2>
        <nav aria-label="Help and legal" className="overflow-hidden rounded-2xl border border-white/10 bg-ink-800/60">
          {legalItems.map((item) => (
            <Link key={item.path} to={item.path} className="flex min-h-[52px] items-center justify-between border-b border-white/10 px-4 text-sm text-slate-200 last:border-b-0">
              {item.label}
              <span aria-hidden="true" className="text-slate-400">›</span>
            </Link>
          ))}
        </nav>
      </section>
      <p className="text-xs text-slate-400">
        HELIX does not hold your funds. The Trading Bot uses simulated money only; real-money trading is disabled.
      </p>
    </div>
  );
}
