// Builds src/bot/data/p0.json — the evidence summary shown in the Research Lab "P0 diagnosis" panel.
// Every number is read from a committed study file; nothing is typed in by hand.
//   npx vite-node --config scripts/vite.node.config.ts scripts/p0/build-summary.ts
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { FEE_EVIDENCE } from '../../src/bot/feeEvidence';
import { HYPOTHESES } from '../../src/bot/hypotheses';

const j = (p: string) => JSON.parse(readFileSync(p, 'utf8'));
const claims = j('research/p0/claims-reproduction.json');
const diag = j('research/p0/execution-diagnostic.json');
const fail = j('research/p0/failure-registry.json');
const cap = j('research/p0/capital-feasibility.json');
const lab = j('research/p0/research-lab.json');
const fwdA = existsSync('research/forward/report-forward-2026-11-25-a.json') ? j('research/forward/report-forward-2026-11-25-a.json') : null;
const regB = j('research/forward/registration-b.json');
const scan = existsSync('research/watchbot/scan-latest.json') ? j('research/watchbot/scan-latest.json') : null;

const s = diag.summary;
const out = {
  generatedAt: new Date().toISOString(),
  verdict: 'no_profitable_strategy_established',
  execution: {
    candidates: diag.candidates,
    zeroCost: { profitable: s['next_open|zero|mark'].profitable, pnl: s['next_open|zero|mark'].pnl },
    realCost: { profitable: s['next_open|real|liquidate'].profitable, pnl: s['next_open|real|liquidate'].pnl },
    nextCloseRealCost: { profitable: s['next_close|real|mark'].profitable, pnl: s['next_close|real|mark'].pnl },
    passiveExposureMatchedPnl: diag.exposureControl.passive,
    beatPassive: diag.exposureControl.beatPassive
  },
  failureCauses: fail.primaryCauseCounts,
  costs: {
    legacyRoundTripPct: claims.claims.roundTripCost.legacyReproduced * 100,
    verified: FEE_EVIDENCE.filter((e) => !e.supersededBy && (e.kind === 'official' || e.kind === 'secondary')).map((e) => ({ id: e.id, venue: e.venue, regions: e.regions, makerBps: e.makerBps, takerBps: e.takerBps, kind: e.kind, verifiedAt: e.verifiedAt })),
    medianMovePct: Object.fromEntries(Object.entries(claims.claims.horizonTable).map(([k, v]) => [k, (v as { medianAbsMove: number }).medianAbsMove * 100]))
  },
  capital: cap.shortest.filter((x: { venue: string }) => x.venue === 'coinbase' || x.venue === 'kraken' || x.venue === 'ethereum_dex'),
  regime: lab.regime,
  forward: {
    a: fwdA ? { id: fwdA.registrationId, state: fwdA.state, dataThrough: fwdA.dataThrough, startAt: '2026-11-26', problems: fwdA.problems, results: fwdA.results.map((r: Record<string, unknown>) => ({ ruleId: r.ruleId, status: r.status, forwardMonths: r.forwardMonths, netReturn: r.netReturn, realizedPnlUsd: r.realizedPnlUsd ?? null, unrealizedPnlUsd: r.unrealizedPnlUsd ?? null })) } : null,
    b: { id: regB.id, status: regB.status, takerFeeBps: regB.costSnapshot.takerFeeBps },
    minMonths: regB.evaluation.minMonths,
    persistentProcess: 'workflow .github/workflows/forward-paper.yml — not operational until merged to main'
  },
  marketScreen: scan ? (scan.capital_1000 as { symbol: string; status: string; headroom: number | null; blocking: string[]; facts: { regime: string | null; typicalWeeklyMovePct: number | null } }[]).map((r) => ({ symbol: r.symbol, status: r.status, headroom: r.headroom, regime: r.facts.regime, weeklyMovePct: r.facts.typicalWeeklyMovePct, firstBlocking: r.blocking[0] ?? null })) : [],
  hypotheses: HYPOTHESES.map((h) => ({ id: h.id, name: h.name, status: h.status })),
  nextActions: [
    'Owner: confirm the Coinbase/Kraken fee tier on the real account and record it as fee evidence',
    'Owner: decide whether to activate forward registration b (verified-cost version of a)',
    'Owner: merge so the daily forward-paper workflow runs (state goes to the forward-ledger branch)',
    'Research: wait for 12 complete forward months; no new history-based candidates (novelty guard blocks all 11 families)'
  ]
};
writeFileSync('src/bot/data/p0.json', JSON.stringify(out, null, 1));
console.log('wrote src/bot/data/p0.json');
