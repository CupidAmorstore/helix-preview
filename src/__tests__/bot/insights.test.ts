import { describe, expect, it } from 'vitest';
import raw from '../../bot/data/latest.json';
import type { BotSummary } from '../../bot/summary';
import { botHeadline, dailyRegimes, plainReasons } from '../../bot/insights';

const S = raw as unknown as BotSummary;

describe('bot insights from the real bundled results', () => {
  it('headline matches the research record (199 tested, 0 qualified, 4 reached test)', () => {
    expect(botHeadline(S)).toEqual({ tested: 199, qualified: 0, reachedTest: 4, holdingCash: true });
  });
  it('reasons are plain language, counted once per candidate, most common first', () => {
    const r = plainReasons(S, 9);
    expect(r[0].text).toBe('Too few test trades to trust the result');
    expect(r.every((x) => !/<=|\d+ < \d+|_/.test(x.text))).toBe(true);
    for (let i = 1; i < r.length; i++) expect(r[i - 1].count).toBeGreaterThanOrEqual(r[i].count);
    expect(r[0].count).toBeLessThanOrEqual(199);
  });
  it('daily regimes cover the 10 research markets', () => {
    expect(dailyRegimes(S)).toHaveLength(10);
  });
});

describe('strategy catalogue evidence', () => {
  it('every catalogued family has research evidence, none qualified', async () => {
    const { strategyEvidence, STRATEGIES } = await import('../../bot/insights');
    const ev = strategyEvidence(S);
    expect(ev).toHaveLength(STRATEGIES.length);
    for (const e of ev) {
      // newer families have daily evidence only (hourly data was stale in the offline run)
      const daily = ['vol_filtered_trend', 'regime_switch', 'weekly_trend', 'monthly_momentum'].includes(e.info.family);
      expect(e.tested).toBe(e.info.family === 'xs_momentum' ? 1 : daily ? 11 : 22);
      expect(e.qualified).toBe(0);
      expect(e.pooledDaily).toBeDefined();
    }
    const boll = ev.find((e) => e.info.family === 'bollinger_reversion')!;
    expect(boll.pooledDaily!.testNet).toBeCloseTo(-0.382, 2);
  });
});
