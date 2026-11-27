// Bot research data: the bundled snapshot is the fallback; the app checks the daily published feed
// (written by the scheduled GitHub Action) and keeps whichever is newer. Nothing here is streamed or
// invented: every number comes from a research run record.
import { useEffect, useSyncExternalStore } from 'react';
import raw from './data/latest.json';
import type { BotSummary } from './summary';
import { getSetting, setSetting } from '../services/storage';
import { MAX_FEED_BYTES, validateSummary } from './feedValidation';

export const REMOTE_SUMMARY_URL = 'https://cupidamorstore.github.io/helix-preview/data/latest.json';
const CACHE_KEY = 'bot.summary.v1';
/** the online feed does not exist (yet): not the same as 'no newer research' */
export const FEED_NOT_PUBLISHED = 'feed not published';
const BUNDLED = raw as unknown as BotSummary;

export type BotDataSource = 'bundled' | 'published' | 'cached';
export type BotDataState = {
  summary: BotSummary;
  source: BotDataSource;
  checkedAt: number | null;
  error: string | null;
  loading: boolean;
};

let state: BotDataState = { summary: BUNDLED, source: 'bundled', checkedAt: null, error: null, loading: false };
const subs = new Set<() => void>();
const set = (patch: Partial<BotDataState>) => {
  state = { ...state, ...patch };
  subs.forEach((f) => f());
};

/** Current summary (for render code). Components re-render through useBotData(). */
export const bot = () => state.summary;

export function isValidSummary(x: unknown, now = Date.now(), bytes?: number): x is BotSummary {
  return validateSummary(x, now, bytes).length === 0;
}

const ts = (s: BotSummary) => new Date(s.generatedAt).getTime();
/** Accept a candidate only if it is valid, newer than what we show, and not dated in the future. */
export function shouldReplace(current: BotSummary, candidate: unknown, now = Date.now()): candidate is BotSummary {
  return isValidSummary(candidate, now) && ts(candidate) > ts(current) && ts(candidate) <= now + 5 * 60_000;
}

export async function refreshBotData(fetchImpl: typeof fetch = fetch): Promise<void> {
  if (state.loading) return;
  set({ loading: true, error: null });
  try {
    const res = await fetchImpl(`${REMOTE_SUMMARY_URL}?t=${Math.floor(Date.now() / 60_000)}`, { cache: 'no-store' });
    if (res.status === 404) throw new Error(FEED_NOT_PUBLISHED);
    if (!res.ok) throw new Error(`feed HTTP ${res.status}`);
    const text = await res.text();
    if (text.length > MAX_FEED_BYTES) throw new Error('feed too large');
    const json: unknown = JSON.parse(text);
    const problems = validateSummary(json, Date.now(), text.length);
    if (problems.length) throw new Error(`feed failed validation (${problems[0]})`);
    if (shouldReplace(state.summary, json)) {
      set({ summary: json, source: 'published' });
      void setSetting(CACHE_KEY, json).catch(() => undefined);
    }
    set({ checkedAt: Date.now() });
  } catch (e) {
    set({ error: e instanceof Error ? e.message : 'feed unavailable', checkedAt: Date.now() });
  } finally {
    set({ loading: false });
  }
}

let started = false;
async function start() {
  if (started) return;
  started = true;
  try {
    const cached = await getSetting<unknown>(CACHE_KEY);
    if (shouldReplace(state.summary, cached)) set({ summary: cached, source: 'cached' });
  } catch {
    /* no cache (private mode etc.) */
  }
  await refreshBotData();
}

export function useBotData(): BotDataState & { refresh: () => Promise<void> } {
  const s = useSyncExternalStore(
    (f) => {
      subs.add(f);
      return () => subs.delete(f);
    },
    () => state
  );
  useEffect(() => {
    void start();
  }, []);
  return { ...s, refresh: () => refreshBotData() };
}

/** current state (tests and non-React callers) */
export const botDataState = () => state;

/** test hook */
export function __resetBotData() {
  state = { summary: BUNDLED, source: 'bundled', checkedAt: null, error: null, loading: false };
  started = false;
}
