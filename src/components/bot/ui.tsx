import type { ReactNode } from 'react';

export function Card({ title, right, children, className = '' }: { title?: string; right?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl border border-white/10 bg-ink-800/60 p-4 sm:p-5 ${className}`}>
      {(title || right) && (
        <div className="mb-3 flex items-center justify-between gap-3">
          {title && <h2 className="text-sm font-semibold text-slate-200">{title}</h2>}
          {right}
        </div>
      )}
      {children}
    </section>
  );
}

export function Stat({ label, value, sub, tone = 'default' }: { label: string; value: ReactNode; sub?: ReactNode; tone?: 'default' | 'good' | 'bad' | 'warn' }) {
  const toneCls = { default: 'text-white', good: 'text-mint-400', bad: 'text-rose-500', warn: 'text-amber-500' }[tone];
  return (
    <div className="min-w-0 rounded-xl border border-white/10 bg-ink-900/60 px-3 py-3">
      <div className="text-[11px] uppercase tracking-wider text-slate-500">{label}</div>
      <div className={`mt-1 truncate font-mono text-lg ${toneCls}`}>{value}</div>
      {sub && <div className="mt-0.5 text-xs text-slate-500">{sub}</div>}
    </div>
  );
}

const PILL: Record<string, string> = {
  qualified_paper_strategy: 'border-mint-500/50 bg-mint-500/10 text-mint-300',
  rejected: 'border-rose-500/40 bg-rose-500/10 text-rose-300',
  backtested_candidate: 'border-sky-400/40 bg-sky-400/10 text-sky-300',
  research_hypothesis: 'border-slate-400/40 bg-slate-400/10 text-slate-300',
  detected_opportunity: 'border-amber-500/40 bg-amber-500/10 text-amber-300',
  diagnostic: 'border-amber-500/40 bg-amber-500/10 text-amber-300',
  qualified: 'border-mint-500/50 bg-mint-500/10 text-mint-300',
  paper: 'border-amber-500/50 bg-amber-500/15 text-amber-300'
};

export const STATUS_LABEL: Record<string, string> = {
  detected_opportunity: 'Detected opportunity',
  research_hypothesis: 'Research hypothesis',
  backtested_candidate: 'Backtested candidate',
  rejected: 'Rejected',
  qualified_paper_strategy: 'Qualified for paper',
  owner_approved_live_candidate: 'Owner-approved live candidate',
  diagnostic: 'Diagnostic (not qualified)',
  qualified: 'Qualified'
};

export function Pill({ status, children }: { status: string; children?: ReactNode }) {
  return (
    <span className={`inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[11px] ${PILL[status] ?? PILL.research_hypothesis}`}>
      {children ?? STATUS_LABEL[status] ?? status}
    </span>
  );
}

export const pct = (x: number | null | undefined, d = 1) => (x == null || !Number.isFinite(x) ? '—' : `${x >= 0 ? '+' : ''}${(x * 100).toFixed(d)}%`);
export const usd = (x: number | null | undefined) =>
  x == null || !Number.isFinite(x) ? '—' : `${x < 0 ? '-' : ''}$${Math.abs(x).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
export const date = (t: number | null | undefined) => (t ? new Date(t).toISOString().slice(0, 10) : '—');
export const dateTime = (t: number | string | null | undefined) => (t ? new Date(t).toISOString().slice(0, 16).replace('T', ' ') + ' UTC' : '—');
export const ivLabel = (ms: number) => (ms === 86_400_000 ? '1d' : ms === 3_600_000 ? '1h' : `${ms / 60000}m`);
