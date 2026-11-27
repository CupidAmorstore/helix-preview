// Audit fixes BOT-1..5, QR-1, TXT-1/2: the bot screen tells the truth about timing, cadence and evidence.
import { describe, expect, it, vi } from 'vitest';
import raw from '../../bot/data/latest.json';
import type { BotSummary } from '../../bot/summary';
import { plainAccountLabel, plainSpec, plural, researchAgeHours, researchRunAt, runIdTime } from '../../bot/insights';
import { validateSummary } from '../../bot/feedValidation';
vi.mock('../../services/storage', () => ({ getSetting: async () => null, setSetting: async () => undefined }));
const { FEED_NOT_PUBLISHED, botDataState, refreshBotData } = await import('../../bot/botData');

const S = raw as unknown as BotSummary;

describe('BOT-1 research time is not the data-refresh time', () => {
  it('uses lastResearchRunAt, which is earlier than generatedAt after a data-only refresh', () => {
    expect(new Date(researchRunAt(S)).toISOString()).toBe(S.lastResearchRunAt);
    expect(researchRunAt(S)).toBeLessThan(Date.parse(S.generatedAt));
    expect(new Date(researchRunAt(S)).toISOString().slice(0, 10)).toBe('2026-11-24');
  });
  it('falls back to the newest run id for bundles without lastResearchRunAt (never to generatedAt)', () => {
    const old = { ...S, lastResearchRunAt: undefined, generatedAt: '2026-12-31T00:00:00.000Z' } as BotSummary;
    expect(runIdTime('run-2026-11-24T19-36-41-194Z-1d')).toBe(Date.parse('2026-11-24T19:36:41.194Z'));
    expect(researchRunAt(old)).toBeLessThan(Date.parse('2026-12-01'));
    expect(researchAgeHours(old, Date.parse('2026-11-25T19:36:41.194Z'))).toBeCloseTo(24, 0);
  });
});

describe('BOT-2 a missing feed is reported as missing, not as "no newer research"', () => {
  it('404 → FEED_NOT_PUBLISHED', async () => {
    const fake = (async () => new Response('nope', { status: 404 })) as unknown as typeof fetch;
    await refreshBotData(fake);
    expect(botDataState().error).toBe(FEED_NOT_PUBLISHED);
    expect(botDataState().source).toBe('bundled');
  });
});

describe('QR-1 forward protocol is in the summary and validated', () => {
  it('bundled summary carries the active registration with 3 rules and plain labels', () => {
    expect(S.forward?.status).toBe('active');
    expect(S.forward?.startAt).toBe(Date.UTC(2026, 10, 26));
    expect(S.forward?.rules).toHaveLength(3);
    for (const r of S.forward!.rules) expect(r.label).not.toMatch(/[a-z]+_[a-z]+/);
    expect(validateSummary(S, Date.parse('2026-11-26'))).toEqual([]);
  });
  it('a forward rule shown as qualified before the minimum months is refused', () => {
    const bad = JSON.parse(JSON.stringify(S));
    bad.forward.rules[0].status = 'forward_qualified';
    bad.forward.rules[0].forwardMonths = 2;
    expect(validateSummary(bad, Date.parse('2026-11-26')).join(' ')).toMatch(/before minimum months/);
  });
  it('lastResearchRunAt later than the summary itself is refused', () => {
    const bad = { ...S, lastResearchRunAt: '2027-01-01T00:00:00Z' };
    expect(validateSummary(bad, Date.parse('2027-02-01')).join(' ')).toMatch(/lastResearchRunAt/);
  });
});

describe('TXT-1/TXT-2 plain language', () => {
  it('internal keys become names and readable parameters', () => {
    expect(plainSpec('sma_cross(fast=10,slow=100)')).toEqual({ name: 'Trend following (moving averages)', params: 'fast 10 · slow 100' });
    expect(plainSpec('POOLED:weekly_trend(n=200,period=7)').params).toBe('window 200 · every 7 days');
    expect(plainAccountLabel('BTC-USD|86400000|rsi_reversion(hi=55,lo=25,maxHold=24,n=14)').title).toBe('BTC daily · Oversold bounce (RSI)');
  });
  it('plurals', () => {
    expect(plural(1, 'test')).toBe('1 test');
    expect(plural(0, 'bar')).toBe('0 bars');
    expect(plural(199, 'test')).toBe('199 tests');
  });
});
