import { describe, expect, it } from 'vitest';
import { fmtUsd } from '../services/marketData';

describe('price formatting', () => {
  it('keeps sub-cent prices readable instead of $0.00', () => {
    expect(fmtUsd(0.0000034567)).toBe('$0.000003457');
    expect(fmtUsd(0.0548)).toBe('$0.0548');
    expect(fmtUsd(60755.43)).toBe('$60,755.43');
    expect(fmtUsd(null)).toBe('—');
    expect(fmtUsd(1.24e12, { compact: true })).toBe('$1.24T');
  });
});
