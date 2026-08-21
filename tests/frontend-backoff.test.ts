import { describe, expect, it } from 'vitest';
import { BACKOFF_STEPS_MS, nextBackoffDelayMs } from '../frontend/src/utils/backoff';

// The frontend polls /api/state with bounded exponential backoff. These tests
// pin the exact cadence (1s → 2s → 4s → 8s → 15s max) so a regression can
// never reintroduce a request storm against the production backend.

describe('frontend backoff util', () => {
  it('steps 1s → 2s → 4s → 8s → 15s on consecutive failures', () => {
    expect(BACKOFF_STEPS_MS).toEqual([1_000, 2_000, 4_000, 8_000, 15_000]);
    expect(nextBackoffDelayMs(1)).toBe(1_000);
    expect(nextBackoffDelayMs(2)).toBe(2_000);
    expect(nextBackoffDelayMs(3)).toBe(4_000);
    expect(nextBackoffDelayMs(4)).toBe(8_000);
    expect(nextBackoffDelayMs(5)).toBe(15_000);
  });

  it('caps at 15s forever — never grows into a storm', () => {
    expect(nextBackoffDelayMs(6)).toBe(15_000);
    expect(nextBackoffDelayMs(10)).toBe(15_000);
    expect(nextBackoffDelayMs(1000)).toBe(15_000);
  });

  it('returns the first step when no failure has occurred yet', () => {
    expect(nextBackoffDelayMs(0)).toBe(1_000);
    expect(nextBackoffDelayMs(-1)).toBe(1_000);
  });

  it('respects custom step lists and still bounds the delay', () => {
    expect(nextBackoffDelayMs(1, [500, 1_000])).toBe(500);
    expect(nextBackoffDelayMs(2, [500, 1_000])).toBe(1_000);
    expect(nextBackoffDelayMs(50, [500, 1_000])).toBe(1_000);
  });
});