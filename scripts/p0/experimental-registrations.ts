// Builds the two experimental-v1 registrations (one hypothesis, one $1,000 simulated account each).
//   npx vite-node --config scripts/vite.node.config.ts scripts/p0/experimental-registrations.ts            # write as 'proposed'
//   npx vite-node --config scripts/vite.node.config.ts scripts/p0/experimental-registrations.ts --activate # set active + start
// Activation sets registeredAt = now and startAt = the next 00:00 UTC bar, then recomputes the v3 hash. Run only after
// the safeguard tests pass. Nothing here trades: forward-paper.ts does the paper observation.
import { writeFileSync } from 'node:fs';
import { registrationHash, snapshotOf, type ForwardRegistration } from '../../src/bot/forward';
import { COST_PRESETS } from '../../src/bot/costs';
import { EXPERIMENTAL_POLICY } from '../../src/bot/experimental';

const DAY = 86_400_000;
const PRESET = 'coinbase_experimental_conservative_2026_11';
const activate = process.argv.includes('--activate');
const now = Date.now();
const base = {
  status: 'proposed' as const,
  registeredAt: new Date(now).toISOString(),
  startAt: null as number | null,
  capitalUsd: 1000,
  costPreset: PRESET,
  evaluation: { minMonths: 12, familyAlpha: 0.01 }, // 0.05 family alpha split across the 5 active hypotheses
  costSnapshot: snapshotOf(COST_PRESETS[PRESET]),
  hashVersion: 3 as const,
  policy: { version: EXPERIMENTAL_POLICY.version, positionFraction: EXPERIMENTAL_POLICY.positionFraction, maxDrawdown: EXPERIMENTAL_POLICY.maxDrawdown }
};
const common = [
  'Experimental paper observation only. No real money, no leverage, no averaging down, 5% maximum per position, drawdown guard at 5% latches new entries.',
  'Retrospectively selected from already-inspected history; that history is NOT evidence. Only bars at or after startAt count.',
  'Costs are a conservative UNVERIFIED bound (Coinbase 1.20% taker + 2 bps half-spread + 3 bps slippage). The account tier is not verified; this is not the account fee.',
  'Experimental approval is not a validation: the final qualification gates (gates-v4) are unchanged and a validated status requires them all.',
  'Activation starts at the next 00:00 UTC bar; registrations a and b are untouched.'
];
const defs: ForwardRegistration[] = [
  {
    ...base,
    id: 'experimental-e1-xrp-bollinger-2026-11-27',
    rules: [{ id: 'E1-xrp-bollinger-20-2', kind: 'pooled', family: 'bollinger_reversion', params: { n: 20, k: 2, maxHold: 24 }, markets: ['XRP-USD'], intervalMs: DAY }],
    rationale: ['Candidate: XRP daily Bollinger reversion (n=20, k=2, maxHold=24), from the P0 screen (validation net 66.4%, DD 12.0%, 7 validation trades).'],
    disclosures: common,
    rulesHash: ''
  },
  {
    ...base,
    id: 'experimental-e2-eth-rsi-2026-11-27',
    rules: [{ id: 'E2-eth-rsi-14-25-55', kind: 'pooled', family: 'rsi_reversion', params: { n: 14, lo: 25, hi: 55, maxHold: 24 }, markets: ['ETH-USD'], intervalMs: DAY }],
    rationale: ['Candidate: ETH daily RSI reversion (n=14, lo=25, hi=55, maxHold=24), from the P0 screen (validation net 24.1%, DD 11.2%, 2 validation trades).'],
    disclosures: [...common, 'Only 2 historical validation trades: the weakest evidence among the two accounts.'],
    rulesHash: ''
  }
];
for (const d of defs) {
  if (activate) {
    d.status = 'active';
    d.registeredAt = new Date(now).toISOString();
    d.startAt = Math.floor(now / DAY) * DAY + DAY;
  }
  d.rulesHash = registrationHash(d);
  const f = `research/forward/registration-${d.id.split('-')[1]}.json`;
  writeFileSync(f, JSON.stringify(d, null, 1) + '\n');
  console.log(f, d.status, d.startAt ? new Date(d.startAt).toISOString() : 'no start', d.rulesHash);
}
