import type { WeightUnit, WorkoutSet } from "./types";

/** Precise enough for input fields (no 0.5 rounding while typing). */
export function inputValue(kg: number, unit: WeightUnit): number {
  return unit === "lb" ? Math.round(kg * 2.2046226218 * 10) / 10 : Math.round(kg * 100) / 100;
}

/** "3 × 8 · 60 kg" when all sets match, else "8 × 60 kg, 6 × 62,5 kg". */
export function summarizeSets(sets: WorkoutSet[], unit: WeightUnit, locale = "fr-CA"): string {
  const fmt = (s: WorkoutSet) =>
    s.weightKg > 0 ? `${inputValue(s.weightKg, unit).toLocaleString(locale)} ${unit}` : null;
  const same = sets.every((s) => s.reps === sets[0].reps && s.weightKg === sets[0].weightKg);
  if (same) {
    const w = fmt(sets[0]);
    return `${sets.length} × ${sets[0].reps}${w ? ` · ${w}` : ""}`;
  }
  return sets.map((s) => `${s.reps}${fmt(s) ? ` × ${fmt(s)}` : ""}`).join(", ");
}
