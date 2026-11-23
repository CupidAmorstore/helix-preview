import { beforeEach, describe, expect, it, vi } from 'vitest';
import raw from '../../bot/data/latest.json';
import type { BotSummary } from '../../bot/summary';

vi.mock('../../services/storage', () => ({ getSetting: async () => null, setSetting: async () => undefined }));
const mod = await import('../../bot/botData');
const B = raw as unknown as BotSummary;
const later = (h: number) => ({ ...B, generatedAt: new Date(new Date(B.generatedAt).getTime() + h * 3_600_000).toISOString() });
const ok = (body: unknown) => (async () => ({ ok: true, status: 200, json: async () => body, text: async () => JSON.stringify(body) })) as unknown as typeof fetch;

describe('bot data feed', () => {
  beforeEach(() => mod.__resetBotData());

  it('bundled snapshot is a valid summary and the default', () => {
    expect(mod.isValidSummary(B)).toBe(true);
    expect(mod.bot().generatedAt).toBe(B.generatedAt);
  });

  it('rejects malformed, live-mode, older and future-dated feeds', () => {
    expect(mod.isValidSummary({})).toBe(false);
    expect(mod.isValidSummary({ ...B, mode: 'live' })).toBe(false);
    expect(mod.isValidSummary({ ...B, runs: 'x' })).toBe(false);
    expect(mod.shouldReplace(B, later(-1))).toBe(false);
    expect(mod.shouldReplace(B, later(24), new Date(B.generatedAt).getTime())).toBe(false);
    expect(mod.shouldReplace(B, later(1), Date.now() + 365 * 86_400_000)).toBe(true);
  });

  it('a newer published feed replaces the bundled one', async () => {
    const newer = later(0.05); // 3 minutes after the bundled run, i.e. not in the future
    await mod.refreshBotData(ok(newer));
    expect(mod.bot().generatedAt).toBe(newer.generatedAt);
  });

  it('a failing feed keeps the current data and reports the error', async () => {
    await mod.refreshBotData((async () => ({ ok: false, status: 503 })) as unknown as typeof fetch);
    expect(mod.bot().generatedAt).toBe(B.generatedAt);
    await mod.refreshBotData(ok({ junk: true }));
    expect(mod.bot().generatedAt).toBe(B.generatedAt);
  });
});
