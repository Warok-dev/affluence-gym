import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import {
  loadActive,
  loadSettings,
  loadWorkouts,
  mergeWorkouts,
  newId,
  saveActive,
  saveSettings,
  saveWorkouts,
  StorageError,
} from "./store";
import { lastPerformance } from "./stats";
import type { Backup, Settings, Workout, WorkoutSet } from "./types";

interface WorkoutsApi {
  workouts: Workout[];
  active: Workout | null;
  settings: Settings;
  /** Set when the device refused to save (storage full or blocked). */
  storageError: boolean;
  start: (gym?: string) => void;
  addExercise: (exerciseId: string) => void;
  removeExercise: (entryId: string) => void;
  addSet: (entryId: string) => void;
  updateSet: (entryId: string, index: number, patch: Partial<WorkoutSet>) => void;
  removeSet: (entryId: string, index: number) => void;
  finish: () => Workout | null;
  discard: () => void;
  deleteWorkout: (id: string) => void;
  updateSettings: (patch: Partial<Settings>) => void;
  importBackup: (backup: Backup) => number;
}

const Ctx = createContext<WorkoutsApi | null>(null);

export function WorkoutsProvider({ children }: { children: ReactNode }) {
  const [workouts, setWorkouts] = useState<Workout[]>(loadWorkouts);
  const [active, setActive] = useState<Workout | null>(loadActive);
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const [storageError, setStorageError] = useState(false);

  const persist = useCallback((fn: () => void) => {
    try {
      fn();
      setStorageError(false);
    } catch (err) {
      if (err instanceof StorageError) setStorageError(true);
      else throw err;
    }
  }, []);

  const commitActive = useCallback(
    (next: Workout | null) => {
      setActive(next);
      persist(() => saveActive(next));
    },
    [persist],
  );

  const commitWorkouts = useCallback(
    (next: Workout[]) => {
      setWorkouts(next);
      persist(() => saveWorkouts(next));
    },
    [persist],
  );

  const editActive = useCallback(
    (fn: (w: Workout) => Workout) => {
      if (active) commitActive(fn(active));
    },
    [active, commitActive],
  );

  const editEntry = useCallback(
    (entryId: string, fn: (sets: WorkoutSet[]) => WorkoutSet[]) =>
      editActive((w) => ({
        ...w,
        exercises: w.exercises.map((e) => (e.id === entryId ? { ...e, sets: fn(e.sets) } : e)),
      })),
    [editActive],
  );

  const api = useMemo<WorkoutsApi>(
    () => ({
      workouts,
      active,
      settings,
      storageError,
      start: (gym) => commitActive({ id: newId(), startedAt: Date.now(), gym, exercises: [] }),
      addExercise: (exerciseId) =>
        editActive((w) => {
          // Start from what was done last time, so logging is mostly ticking boxes.
          const last = lastPerformance(workouts, exerciseId);
          const sets = last
            ? last.map((s) => ({ reps: s.reps, weightKg: s.weightKg, done: false }))
            : [{ reps: 10, weightKg: 0, done: false }];
          return { ...w, exercises: [...w.exercises, { id: newId(), exerciseId, sets }] };
        }),
      removeExercise: (entryId) => editActive((w) => ({ ...w, exercises: w.exercises.filter((e) => e.id !== entryId) })),
      addSet: (entryId) =>
        editEntry(entryId, (sets) => {
          const prev = sets[sets.length - 1];
          return [...sets, { reps: prev?.reps ?? 10, weightKg: prev?.weightKg ?? 0, done: false }];
        }),
      updateSet: (entryId, index, patch) =>
        editEntry(entryId, (sets) => sets.map((s, i) => (i === index ? { ...s, ...patch } : s))),
      removeSet: (entryId, index) => editEntry(entryId, (sets) => sets.filter((_, i) => i !== index)),
      finish: () => {
        if (!active) return null;
        // Exercises without any completed set are dropped from the saved workout.
        const done: Workout = {
          ...active,
          endedAt: Date.now(),
          exercises: active.exercises
            .map((e) => ({ ...e, sets: e.sets.filter((s) => s.done) }))
            .filter((e) => e.sets.length > 0),
        };
        commitWorkouts([done, ...workouts]);
        commitActive(null);
        return done;
      },
      discard: () => commitActive(null),
      deleteWorkout: (id) => commitWorkouts(workouts.filter((w) => w.id !== id)),
      updateSettings: (patch) => {
        const next = { ...settings, ...patch };
        setSettings(next);
        persist(() => saveSettings(next));
      },
      importBackup: (backup) => {
        const merged = mergeWorkouts(workouts, backup.workouts);
        commitWorkouts(merged);
        return merged.length - workouts.length;
      },
    }),
    [workouts, active, settings, storageError, commitActive, commitWorkouts, editActive, editEntry, persist],
  );

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useWorkouts(): WorkoutsApi {
  const api = useContext(Ctx);
  if (!api) throw new Error("useWorkouts must be used inside <WorkoutsProvider>");
  return api;
}
