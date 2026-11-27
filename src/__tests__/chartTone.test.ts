import { describe, expect, it } from 'vitest';
import { chartTone } from '../components/chartTone';

describe('chart colour follows the period on screen', () => {
  it('falling period is red, rising or flat is green, unknown is neutral green', () => {
    expect(chartTone(90_000, 57_000).line).toBe('#F07A6A');
    expect(chartTone(57_000, 90_000).line).toBe('#4CC38A');
    expect(chartTone(100, 100).line).toBe('#4CC38A');
    expect(chartTone(null, 5).line).toBe('#4CC38A');
  });
});
