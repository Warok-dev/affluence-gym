/** Whole minutes elapsed since an epoch-seconds timestamp (never negative). */
export function minutesSince(epochSeconds: number, nowMs: number): number {
  return Math.max(0, Math.floor((nowMs - epochSeconds * 1000) / 60_000));
}
