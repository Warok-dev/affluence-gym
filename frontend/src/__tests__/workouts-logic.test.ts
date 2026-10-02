import { describe, expect, it } from "vitest";
import { searchExercises } from "../workouts/exercises";
import {
  completedSets,
  estimatedOneRepMax,
  formatDuration,
  fromUnit,
  lastPerformance,
  personalBests,
  toUnit,
  volumeKg,
  workoutsThisWeek,
} from "../workouts/stats";
import { loadSettings, makeBackup, mergeWorkouts, parseBackup, saveSettings } from "../workouts/store";
import type { Workout } from "../workouts/types";

const workout = (id: string, startedAt: number, sets: [string, number, number, boolean][], ended = true): Workout => ({
  id,
  startedAt,
  endedAt: ended ? startedAt + 3_600_000 : undefined,
  exercises: sets.map(([exerciseId, reps, weightKg, done], i) => ({
    id: `${id}-${i}`,
    exerciseId,
    sets: [{ reps, weightKg, done }],
  })),
});

describe("unités et calculs", () => {
  it("convertit kg et lb sans dériver (45 lb reste 45 lb)", () => {
    expect(toUnit(fromUnit(45, "lb"), "lb")).toBe(45);
    expect(toUnit(100, "lb")).toBe(220.5);
    expect(toUnit(62.3, "kg")).toBe(62.5); // display rounds to 0.5
  });

  it("calcule volume, séries faites et 1RM estimé", () => {
    const w = workout("a", 0, [
      ["bench-press", 10, 60, true],
      ["bench-press", 8, 70, false],
      ["pull-up", 12, 0, true],
    ]);
    expect(volumeKg(w)).toBe(600);
    expect(completedSets(w)).toBe(2);
    expect(estimatedOneRepMax({ reps: 10, weightKg: 60 })).toBeCloseTo(80);
    expect(estimatedOneRepMax({ reps: 1, weightKg: 100 })).toBe(100);
  });

  it("formate les durées", () => {
    expect(formatDuration(65_000)).toBe("1:05");
    expect(formatDuration(3_909_000)).toBe("1:05:09");
  });

  it("garde le meilleur set par exercice, en ignorant les séances non terminées", () => {
    const list = [
      workout("new", 2_000, [["bench-press", 5, 90, true]], false),
      workout("b", 1_000, [["bench-press", 3, 80, true]]),
      workout("a", 0, [["bench-press", 10, 70, true]]),
    ];
    const best = personalBests(list).get("bench-press")!;
    expect([best.weightKg, best.reps]).toEqual([70, 10]); // 70x10 (93.3) beats 80x3 (88)
  });

  it("retrouve la dernière performance d'un exercice", () => {
    const list = [workout("b", 1_000, [["squat", 5, 100, true]]), workout("a", 0, [["bench-press", 8, 60, true]])];
    expect(lastPerformance(list, "bench-press")).toEqual([{ reps: 8, weightKg: 60, done: true }]);
    expect(lastPerformance(list, "bench-press", "a")).toBeNull();
    expect(lastPerformance(list, "deadlift")).toBeNull();
  });

  it("compte les séances de la semaine en cours (depuis lundi)", () => {
    const thursday = new Date(2026, 9, 1, 12).getTime(); // Thu 1 Oct 2026
    const list = [
      workout("thu", thursday - 3_600_000, []),
      workout("mon", new Date(2026, 8, 28, 8).getTime(), []),
      workout("sun", new Date(2026, 8, 27, 20).getTime(), []),
    ];
    expect(workoutsThisWeek(list, thursday)).toBe(2);
  });

  it("cherche les exercices sans tenir compte des accents ni de la casse", () => {
    expect(searchExercises("developpe").map((e) => e.id)).toContain("bench-press");
    expect(searchExercises("TRACTION").map((e) => e.id)).toEqual(["pull-up"]);
    expect(searchExercises("zzz")).toEqual([]);
  });
});

describe("stockage et sauvegarde", () => {
  it("relit des réglages invalides avec des valeurs par défaut sûres", () => {
    localStorage.setItem("affluence-gym.settings", JSON.stringify({ unit: "stone", restSeconds: 9999 }));
    expect(loadSettings()).toEqual({ unit: "kg", restSeconds: 600 });
    saveSettings({ unit: "lb", restSeconds: 120 });
    expect(loadSettings()).toEqual({ unit: "lb", restSeconds: 120 });
  });

  it("refuse un fichier qui n'est pas une sauvegarde", () => {
    expect(() => parseBackup("pas du json")).toThrow("invalid-json");
    expect(() => parseBackup(JSON.stringify({ hello: 1 }))).toThrow("not-a-backup");
    const broken = { ...makeBackup([], { unit: "kg", restSeconds: 90 }), workouts: [{ id: 1 }] };
    expect(() => parseBackup(JSON.stringify(broken))).toThrow("corrupted");
  });

  it("relit une sauvegarde exportée et fusionne sans doublons", () => {
    const a = workout("a", 0, [["squat", 5, 100, true]]);
    const b = workout("b", 1_000, [["squat", 5, 105, true]]);
    const parsed = parseBackup(JSON.stringify(makeBackup([a, b], { unit: "kg", restSeconds: 90 })));
    expect(parsed.workouts).toHaveLength(2);
    const merged = mergeWorkouts([a], parsed.workouts);
    expect(merged.map((w) => w.id)).toEqual(["b", "a"]);
  });
});
