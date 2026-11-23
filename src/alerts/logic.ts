import type { AlertRecord } from '../types';

export const ALERTS_CHANGED = 'helix:alerts-changed';

export function isMet(a: Pick<AlertRecord, 'direction' | 'threshold'>, price: number) {
  return a.direction === 'above' ? price >= a.threshold : price <= a.threshold;
}

/**
 * An alert fires once when its condition becomes true, then re-arms only after the price moves back.
 * `armed[id] === false` means it already fired and is waiting to re-arm.
 */
export function checkAlerts(alerts: AlertRecord[], prices: Record<string, number>, armed: Record<string, boolean>) {
  const next = { ...armed };
  const fired: { alert: AlertRecord; price: number }[] = [];
  for (const a of alerts) {
    if (!a.enabled) continue;
    const p = prices[a.symbol];
    if (!(p > 0)) continue;
    const met = isMet(a, p);
    if (met && next[a.id] !== false) {
      fired.push({ alert: a, price: p });
      next[a.id] = false;
    } else if (!met) next[a.id] = true;
  }
  return { fired, armed: next };
}

/** Validation for the create form; returns an error message or null. */
export function validateThreshold(raw: string): string | null {
  const t = raw.trim().replace(/[$,\s]/g, '');
  if (!t) return 'Enter a price.';
  const v = Number(t);
  if (!Number.isFinite(v) || v <= 0) return 'Enter a price above $0.';
  return null;
}
export const parseThreshold = (raw: string) => Number(raw.trim().replace(/[$,\s]/g, ''));
