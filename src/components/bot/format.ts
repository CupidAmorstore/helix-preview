// Pure formatting helpers and labels for the Trading Bot UI (kept out of ui.tsx for fast refresh).

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

export const pct = (x: number | null | undefined, d = 1) => (x == null || !Number.isFinite(x) ? '—' : `${x >= 0 ? '+' : ''}${(x * 100).toFixed(d)}%`);
export const usd = (x: number | null | undefined) =>
  x == null || !Number.isFinite(x) ? '—' : `${x < 0 ? '-' : ''}$${Math.abs(x).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
export const date = (t: number | null | undefined) => (t ? new Date(t).toISOString().slice(0, 10) : '—');
export const dateTime = (t: number | string | null | undefined) => (t ? new Date(t).toISOString().slice(0, 16).replace('T', ' ') + ' UTC' : '—');
export const ivLabel = (ms: number) => (ms === 86_400_000 ? '1d' : ms === 3_600_000 ? '1h' : `${ms / 60000}m`);
