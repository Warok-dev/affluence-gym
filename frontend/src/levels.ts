import type { Occupancy } from "./api";
import type { Level } from "./config";

/**
 * Index of the quieter gym, or null when the comparison is not meaningful.
 * Occupancy ratios when both gyms have a counter (5-point margin against noise), else levels.
 * A closed gym (`open[i]` false) takes no part in the comparison.
 */
export function quieterIndex(gyms: readonly (Occupancy | undefined)[], open: readonly boolean[]): number | null {
  const levels = gyms.map((o, i) => (open[i] ? (o?.level ?? null) : null));
  const ratios = gyms.map((o, i) =>
    open[i] && o?.source === "official" && o.people != null && o.capacity ? o.people / o.capacity : null,
  );
  if (ratios[0] != null && ratios[1] != null) {
    if (Math.abs(ratios[0] - ratios[1]) >= 0.05) return ratios[0] < ratios[1] ? 0 : 1;
    return null;
  }
  if (levels[0] != null && levels[1] != null && levels[0] !== levels[1]) return levels[0] < levels[1] ? 0 : 1;
  return null;
}

/**
 * Level word for an average level, using the backend's thresholds so that the
 * word and the "calm" colour always agree: "Calme" means an average <= 2.0,
 * exactly the rule behind the calm flag (backend/app/history.py, CALM_MAX_LEVEL).
 */
export function levelFromAverage(avg: number): Level {
  if (avg <= 1.5) return 1;
  if (avg <= 2.0) return 2;
  if (avg <= 3.0) return 3;
  return 4;
}
