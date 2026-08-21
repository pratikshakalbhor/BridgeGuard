// Bounded exponential backoff for polling endpoints like /api/state.
// The cap (15s max) guarantees retries can never turn into a request storm,
// no matter how long the backend stays unavailable.

export const BACKOFF_STEPS_MS = [1_000, 2_000, 4_000, 8_000, 15_000];

/**
 * Delay before the next poll after `consecutiveFailures` failures.
 * First failure → 1s, then 2s → 4s → 8s, capped at 15s forever after.
 */
export function nextBackoffDelayMs(
  consecutiveFailures: number,
  steps: number[] = BACKOFF_STEPS_MS,
): number {
  if (consecutiveFailures <= 0) return steps[0] ?? 1_000;
  return steps[Math.min(consecutiveFailures - 1, steps.length - 1)] ?? 15_000;
}