// Remembers, on this device only, when the user last reported each gym, so the
// interface can show the wait before the next report. The server stays the
// authority (it answers 429); nothing here leaves the browser.
import type { FacilityId } from "./config";

export const COOLDOWN_MS = 15 * 60_000;
const key = (facility: FacilityId) => `affluence-gym.reported.${facility}`;

export function markReported(facility: FacilityId, at = Date.now()): void {
  try {
    localStorage.setItem(key(facility), String(at));
  } catch {
    // Storage blocked: the wait clock is simply not shown.
  }
}

/** Milliseconds left before the next report is allowed (0 when none). */
export function cooldownRemaining(facility: FacilityId, now = Date.now()): number {
  try {
    const at = Number(localStorage.getItem(key(facility)));
    return at ? Math.max(0, at + COOLDOWN_MS - now) : 0;
  } catch {
    return 0;
  }
}
