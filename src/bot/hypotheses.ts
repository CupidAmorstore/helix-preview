// P0 hypothesis registry. Each research idea states WHY an edge could exist, who creates it, what kills it and
// whether a $20–$1,000 account can use it — BEFORE any test. Status is evidence-based, never aspirational.
import type { Fingerprint } from './failureRegistry';

export type HypothesisStatus = 'rejected_historical' | 'forward_registered' | 'blocked_no_data' | 'blocked_costs' | 'not_started';

export type Hypothesis = {
  id: string;
  name: string;
  fingerprint: Fingerprint;
  mechanism: string;
  counterparty: string;
  persistence: string;
  dataRequired: string;
  decay: string;
  survivesCosts: string;
  smallAccount: string;
  invalidation: string;
  evidence: string;
  status: HypothesisStatus;
};

export const HYPOTHESES: Hypothesis[] = [
  {
    id: 'H-TSMOM', name: 'Time-series momentum (multi-week)', fingerprint: { signal: 'momentum', horizon: 'weekly', information: 'own price' },
    mechanism: 'Under-reaction to information and trend-chasing flows make past multi-week returns weakly predictive (documented in equities/futures; crypto evidence mixed and regime-heavy).',
    counterparty: 'Slow-moving retail and allocators entering after trends', persistence: 'Behavioural; weak and crowded', dataRequired: 'Completed daily closes',
    decay: 'Weeks–months', survivesCosts: 'Only at weekly+ holding (weekly move ≈ 3.4× verified round trip)', smallAccount: 'Yes from $20 (Coinbase), one position',
    invalidation: 'Forward complete-month inference not positive after 12+ months; gross ≤ exposure-matched passive',
    evidence: 'Historical: every daily/hourly variant rejected; P0 diagnostic shows gross ≈ passive exposure (beta-only). Forward: F1 registered 2026-11-26.', status: 'forward_registered'
  },
  {
    id: 'H-TREND-W', name: 'Low-turnover trend filter (weekly check vs SMA200)', fingerprint: { signal: 'trend', horizon: 'weekly', information: 'own price' },
    mechanism: 'Trend filters mainly reduce exposure in prolonged drawdowns (risk reduction, not alpha).', counterparty: 'None required — it is an exposure rule',
    persistence: 'Structural as risk control; return edge unproven', dataRequired: 'Completed daily closes', decay: 'Months', survivesCosts: 'Yes (few trades)',
    smallAccount: 'Yes from $20 on Coinbase ($1 minimum); one position below $50', invalidation: 'Drawdown not lower than passive at equal exposure; or net ≤ cash', evidence: 'Too few historical trades to test (3.7 expected); forward F2.', status: 'forward_registered'
  },
  {
    id: 'H-XSMOM', name: 'Cross-sectional momentum (top-3 of 10, weekly)', fingerprint: { signal: 'cross_sectional', horizon: 'weekly', information: 'peer prices' },
    mechanism: 'Relative-strength persistence between coins (attention, flows).', counterparty: 'Rotating retail flows',
    persistence: 'Weak; ~1.8 effectively independent assets (ρ≈0.70) limits breadth', dataRequired: 'Point-in-time universe incl. delisted coins', decay: 'Weeks',
    survivesCosts: 'Marginal: 3 positions × weekly rebalance', smallAccount: 'Diversification impossible below ~$250', invalidation: 'Does not beat equal-weight passive after costs forward',
    evidence: 'Historical rejected; survivorship study shows universe bias; forward F3.', status: 'forward_registered'
  },
  {
    id: 'H-HOURLY', name: 'Hourly technical rules (all 7 legacy families)', fingerprint: { signal: 'trend', horizon: 'intraday', information: 'own price' },
    mechanism: 'Short-horizon patterns', counterparty: 'Unclear', persistence: 'Not demonstrated', dataRequired: 'Hourly bars', decay: 'Hours',
    survivesCosts: 'NO: median hourly move 0.30% vs 1.70–1.90% verified round trip', smallAccount: 'No: costs exceed the typical move at every tier', invalidation: 'Already invalidated',
    evidence: '70 hourly candidates rejected; admission layer rejects all < 1 week horizons on CEX.', status: 'blocked_costs'
  },
  {
    id: 'H-MAKER', name: 'Maker execution of existing weekly rules', fingerprint: { signal: 'other', horizon: 'weekly', information: 'order book' },
    mechanism: 'Earn maker instead of taker fee (Kraken 40 vs 80 bps) on low-urgency rebalances.', counterparty: 'Takers', persistence: 'Structural fee schedule',
    dataRequired: 'Trade-level prints + queue position; candles cannot verify fills', decay: 'n/a', survivesCosts: 'Saves ≤ 0.8% per round trip if fills occur without adverse selection',
    smallAccount: 'Yes, but Kraken $5 minimum excludes 5% slices below $100', invalidation: 'Fill rate × fee saving < adverse selection + missed-trade cost', evidence: 'Candle model only (src/bot/maker.ts) → UNVERIFIED.', status: 'blocked_no_data'
  },
  {
    id: 'H-XVENUE', name: 'Cross-venue price discrepancy', fingerprint: { signal: 'microstructure', horizon: 'intraday', information: 'multi-venue books' },
    mechanism: 'Temporary dislocations between venues', counterparty: 'Latency-insensitive takers', persistence: 'Competed away by professional arbitrageurs in ms',
    dataRequired: 'Synchronised multi-venue books + transfer costs/times', decay: 'Milliseconds–seconds', survivesCosts: 'Measured spreads 2–3 bps << 80+ bps taker fees per leg',
    smallAccount: 'No (needs pre-funded inventory on both venues)', invalidation: 'Dislocation < fees of both legs', evidence: 'Fee arithmetic alone rules it out at retail tiers.', status: 'blocked_costs'
  },
  {
    id: 'H-ONCHAIN', name: 'Public on-chain activity / flows', fingerprint: { signal: 'onchain', horizon: 'weekly', information: 'chain data' },
    mechanism: 'Exchange inflows/outflows precede selling/buying pressure', counterparty: 'Large holders', persistence: 'Unknown; widely watched',
    dataRequired: 'Free point-in-time on-chain series (not revised later)', decay: 'Days–weeks', survivesCosts: 'Possibly at weekly horizon', smallAccount: 'Yes at weekly horizon on Coinbase/Kraken',
    invalidation: 'No incremental prediction beyond price momentum', evidence: 'No point-in-time free dataset integrated.', status: 'blocked_no_data'
  },
  {
    id: 'H-MEANREV', name: 'Mean reversion after extreme moves (daily)', fingerprint: { signal: 'mean_reversion', horizon: 'daily', information: 'own price' },
    mechanism: 'Liquidity-provision premium after forced selling', counterparty: 'Liquidated/forced sellers', persistence: 'Plausible but regime-dependent',
    dataRequired: 'Daily bars incl. delisted coins (survivorship flips sign)', decay: 'Days', survivesCosts: 'Borderline at daily (1d move 2.27% ≈ 1.2× round trip)',
    smallAccount: 'Feasible size, but daily horizon fails the admission break-even test', invalidation: 'Delisted-coin results negative', evidence: 'Bollinger/RSI reversion rejected; pooled Bollinger test −38.2%.', status: 'rejected_historical'
  }
];
