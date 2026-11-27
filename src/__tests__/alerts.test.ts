import { describe, expect, it } from 'vitest';
import { checkAlerts, validateThreshold } from '../alerts/logic';
import type { AlertRecord } from '../types';

const A = (id: string, direction: 'above' | 'below', threshold: number): AlertRecord => ({ id, symbol: 'BTC', direction, threshold, enabled: true, createdAt: '' });

describe('price alerts', () => {
  it('fires once when crossed, then re-arms after moving back', () => {
    const al = [A('a', 'above', 100)];
    let s = checkAlerts(al, { BTC: 99 }, {});
    expect(s.fired).toHaveLength(0);
    s = checkAlerts(al, { BTC: 101 }, s.armed);
    expect(s.fired).toHaveLength(1);
    s = checkAlerts(al, { BTC: 102 }, s.armed);
    expect(s.fired).toHaveLength(0);
    s = checkAlerts(al, { BTC: 98 }, s.armed);
    s = checkAlerts(al, { BTC: 100 }, s.armed);
    expect(s.fired).toHaveLength(1);
  });
  it('below alerts and missing prices', () => {
    expect(checkAlerts([A('b', 'below', 50)], { BTC: 49 }, {}).fired).toHaveLength(1);
    expect(checkAlerts([A('b', 'below', 50)], {}, {}).fired).toHaveLength(0);
  });
  it('validates input instead of silently ignoring it', () => {
    expect(validateThreshold('')).toMatch(/Enter a price/);
    expect(validateThreshold('abc')).toMatch(/above \$0/);
    expect(validateThreshold('-5')).toMatch(/above \$0/);
    expect(validateThreshold('$61,500')).toBeNull();
  });
});
