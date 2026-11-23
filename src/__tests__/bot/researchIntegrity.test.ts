import { describe, expect, it } from 'vitest';
import { guardReusedHoldout, priorHoldoutLooks, type Registry } from '../../bot/research';
import { evaluateFamily } from '../../bot/validation';
import { COST_PRESETS } from '../../bot/costs';
import { PARAM_GRID } from '../../bot/strategies';
import type { StrategyFamily } from '../../bot/types';
import { randomWalk } from './helpers';

describe('reused holdout (data snooping across runs)', () => {
  it('a qualified candidate on an already-inspected dataset is downgraded, never qualified', () => {
    const reg: Registry = { 'sma_cross|BTC-USD|86400000|abc': { runId: 'r1', status: 'rejected', reasons: [] } };
    expect(priorHoldoutLooks(reg, 'BTC-USD', 86_400_000)).toBe(1);
    // REGRESSION (self-audit): a refreshed dataset (new hash, one more bar) is still the same inspected history
    expect(priorHoldoutLooks({ ...reg, 'regime_switch|BTC-USD|86400000|def': { runId: 'r2', status: 'rejected', reasons: [] } }, 'BTC-USD', 86_400_000)).toBe(2);
    expect(priorHoldoutLooks(reg, 'BTC-USD', 3_600_000)).toBe(0);
    expect(priorHoldoutLooks(reg, 'ETH-USD', 86_400_000)).toBe(0);
    const rep = guardReusedHoldout({ status: 'qualified_paper_strategy', rejectionReasons: [] as string[] }, priorHoldoutLooks(reg, 'BTC-USD', 86_400_000));
    expect(rep.status).toBe('backtested_candidate');
    expect(rep.rejectionReasons[0]).toMatch(/already inspected/);
    expect(guardReusedHoldout({ status: 'qualified_paper_strategy', rejectionReasons: [] as string[] }, 0).status).toBe('qualified_paper_strategy');
    expect(guardReusedHoldout({ status: 'rejected', rejectionReasons: ['x'] }, 3).status).toBe('rejected');
  });
});

describe('null data: the pipeline does not qualify strategies on random walks', () => {
  it('0 qualifications across every family (no multiple-testing correction, ~zero costs)', () => {
    const cost = { ...COST_PRESETS.coinbase_taker, takerFeeBps: 0.5, halfSpreadBps: 0, slippageBps: 0 };
    let q = 0;
    for (const f of Object.keys(PARAM_GRID) as StrategyFamily[])
      for (const seed of [11, 23, 37]) if (evaluateFamily(randomWalk(2000, seed, 0.03), f, cost, 1).status === 'qualified_paper_strategy') q++;
    expect(q).toBe(0);
  });
});
