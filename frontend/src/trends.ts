import type { Trends } from "./api";

export interface Slot {
  weekday: number;
  hour: number;
  level: number;
  people: number | null;
}

/** Below this many snapshots, an hour's average is too thin to be called the week's extreme. */
export const MIN_TREND_SAMPLES = 2;

/**
 * The quietest and the busiest opening hour of the typical week.
 * Ties go to the earliest slot (quietest) or to the higher head count, then the earliest (busiest).
 */
export function weekExtremes(trends: Trends): { quietest: Slot | null; busiest: Slot | null } {
  let quietest: Slot | null = null;
  let busiest: Slot | null = null;
  for (const day of trends.days) {
    for (const h of day.hours) {
      if (h.level === null || h.samples < MIN_TREND_SAMPLES) continue;
      const slot = { weekday: day.weekday, hour: h.hour, level: h.level, people: h.people };
      if (!quietest || slot.level < quietest.level) quietest = slot;
      if (
        !busiest ||
        slot.level > busiest.level ||
        (slot.level === busiest.level && (slot.people ?? 0) > (busiest.people ?? 0))
      )
        busiest = slot;
    }
  }
  // A flat week has no meaningful extreme.
  if (quietest && busiest && quietest.level === busiest.level) return { quietest: null, busiest: null };
  return { quietest, busiest };
}

/** Every hour that is open on at least one day, in order (the rows of the week grid). */
export function weekHours(trends: Trends): number[] {
  const hours = new Set<number>();
  for (const day of trends.days) for (const h of day.hours) hours.add(h.hour);
  return [...hours].sort((a, b) => a - b);
}
