import type { WeightUnit, Workout, WorkoutSet } from "./types";

const LB_PER_KG = 2.2046226218;

/** kg -> display value in the user's unit, rounded to 0.5. */
export function toUnit(kg: number, unit: WeightUnit): number {
  const value = unit === "lb" ? kg * LB_PER_KG : kg;
  return Math.round(value * 2) / 2;
}

/** Display value in the user's unit -> kg (kept precise, so 45 lb stays 45 lb). */
export function fromUnit(value: number, unit: WeightUnit): number {
  return unit === "lb" ? value / LB_PER_KG : value;
}

export function formatWeight(kg: number, unit: WeightUnit, locale = "fr-CA"): string {
  return `${toUnit(kg, unit).toLocaleString(locale, { maximumFractionDigits: 1 })} ${unit}`;
}

const doneSets = (w: Workout): WorkoutSet[] => w.exercises.flatMap((e) => e.sets.filter((s) => s.done));

/** Total load moved (sum of reps x weight over completed sets), in kg. */
export function volumeKg(w: Workout): number {
  return doneSets(w).reduce((sum, s) => sum + s.reps * s.weightKg, 0);
}

export function completedSets(w: Workout): number {
  return doneSets(w).length;
}

export function durationMs(w: Workout, now = Date.now()): number {
  return Math.max(0, (w.endedAt ?? now) - w.startedAt);
}

/** "1:05:09" or "42:07". */
export function formatDuration(ms: number): string {
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = h ? String(m).padStart(2, "0") : String(m);
  return `${h ? `${h}:` : ""}${mm}:${String(s).padStart(2, "0")}`;
}

/** Estimated one-rep max (Epley), for comparing sets of different reps. */
export function estimatedOneRepMax(set: Pick<WorkoutSet, "reps" | "weightKg">): number {
  return set.reps <= 1 ? set.weightKg : set.weightKg * (1 + set.reps / 30);
}

export interface PersonalBest {
  exerciseId: string;
  weightKg: number;
  reps: number;
  estimated1RmKg: number;
  at: number;
}

/** Best completed set per exercise (by estimated 1RM), over finished workouts. */
export function personalBests(workouts: Workout[]): Map<string, PersonalBest> {
  const bests = new Map<string, PersonalBest>();
  for (const w of workouts) {
    if (w.endedAt === undefined) continue;
    for (const e of w.exercises) {
      for (const s of e.sets) {
        if (!s.done || s.weightKg <= 0 || s.reps <= 0) continue;
        const e1rm = estimatedOneRepMax(s);
        const prev = bests.get(e.exerciseId);
        if (!prev || e1rm > prev.estimated1RmKg) {
          bests.set(e.exerciseId, {
            exerciseId: e.exerciseId,
            weightKg: s.weightKg,
            reps: s.reps,
            estimated1RmKg: e1rm,
            at: w.startedAt,
          });
        }
      }
    }
  }
  return bests;
}

/** Completed sets of an exercise in the most recent finished workout that has it. */
export function lastPerformance(workouts: Workout[], exerciseId: string, excludeId?: string): WorkoutSet[] | null {
  for (const w of workouts) {
    if (w.id === excludeId || w.endedAt === undefined) continue;
    const sets = w.exercises.filter((e) => e.exerciseId === exerciseId).flatMap((e) => e.sets.filter((s) => s.done));
    if (sets.length) return sets;
  }
  return null;
}

/** Number of finished workouts in the current week (Monday 00:00 local). */
export function workoutsThisWeek(workouts: Workout[], now = Date.now()): number {
  const d = new Date(now);
  const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate() - ((d.getDay() + 6) % 7)).getTime();
  return workouts.filter((w) => w.endedAt !== undefined && w.startedAt >= monday).length;
}
