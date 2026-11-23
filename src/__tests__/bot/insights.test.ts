import { describe, expect, it } from 'vitest';
import raw from '../../bot/data/latest.json';
import type { BotSummary } from '../../bot/summary';
import { botHeadline, dailyRegimes, plainReasons } from '../../bot/insights';

const S = raw as unknown as BotSummary;

describe('bot insights from the real bundled results', () => {
  it('headline matches the research record (154 tested, 0 qualified, 2 reached test)', () => {
    expect(botHeadline(S)).toEqual({ tested: 154, qualified: 0, reachedTest: 2, holdingCash: true });
  });
  it('reasons are plain language, counted once per candidate, most common first', () => {
    const r = plainReasons(S, 9);
    expect(r[0].text).toBe('Too few test trades to trust the result');
    expect(r.every((x) => !/<=|\d+ < \d+|_/.test(x.text))).toBe(true);
    for (let i = 1; i < r.length; i++) expect(r[i - 1].count).toBeGreaterThanOrEqual(r[i].count);
    expect(r[0].count).toBeLessThanOrEqual(154);
  });
  it('daily regimes cover the 10 research markets', () => {
    expect(dailyRegimes(S)).toHaveLength(10);
  });
});
