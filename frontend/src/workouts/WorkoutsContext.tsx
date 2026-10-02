import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
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
import type { ProgramItem } from "./programs";
import type { Backup, Settings, Workout, WorkoutSet } from "./types";

interface WorkoutsApi {
  workouts: Workout[];
  active: Workout | null;
  settings: Settings;
  /** Set when the device refused to save (storage full or blocked). */
  storageError: boolean;
  start: (gym?: string) => void;
  /** Starts a workout prefilled with a program day (loads from the last performance). */
  startProgramDay: (items: ProgramItem[]) => void;
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

/** Persists a value after every change (not on first render), reporting storage failures. */
function usePersist<T>(value: T, save: (v: T) => void, onError: (failed: boolean) => void) {
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    try {
      save(value);
      onError(false);
    } catch (err) {
      if (err instanceof StorageError) onError(true);
      else throw err;
    }
  }, [value, save, onError]);
}

export function WorkoutsProvider({ children }: { children: ReactNode }) {
  const [workouts, setWorkouts] = useState<Workout[]>(loadWorkouts);
  const [active, setActive] = useState<Workout | null>(loadActive);
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const [storageError, setStorageError] = useState(false);

  usePersist(workouts, saveWorkouts, setStorageError);
  usePersist(active, saveActive, setStorageError);
  usePersist(settings, saveSettings, setStorageError);

  // Every edit is a functional update, so several quick taps never overwrite each other.
  const api = useMemo<WorkoutsApi>(() => {
    const editActive = (fn: (w: Workout) => Workout) => setActive((w) => (w ? fn(w) : w));
    const editEntry = (entryId: string, fn: (sets: WorkoutSet[]) => WorkoutSet[]) =>
      editActive((w) => ({
        ...w,
        exercises: w.exercises.map((e) => (e.id === entryId ? { ...e, sets: fn(e.sets) } : e)),
      }));

    return {
      workouts,
      active,
      settings,
      storageError,
      start: (gym) => setActive({ id: newId(), startedAt: Date.now(), gym, exercises: [] }),
      startProgramDay: (items) =>
        setActive({
          id: newId(),
          startedAt: Date.now(),
          exercises: items.map((item) => {
            const weightKg = lastPerformance(workouts, item.exerciseId)?.[0]?.weightKg ?? 0;
            return {
              id: newId(),
              exerciseId: item.exerciseId,
              sets: Array.from({ length: item.sets }, () => ({ reps: item.reps, weightKg, done: false })),
            };
          }),
        }),
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
        setWorkouts((list) => [done, ...list]);
        setActive(null);
        return done;
      },
      discard: () => setActive(null),
      deleteWorkout: (id) => setWorkouts((list) => list.filter((w) => w.id !== id)),
      updateSettings: (patch) => setSettings((s) => ({ ...s, ...patch })),
      importBackup: (backup) => {
        const merged = mergeWorkouts(workouts, backup.workouts);
        setWorkouts(merged);
        return merged.length - workouts.length;
      },
    };
  }, [workouts, active, settings, storageError]);

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useWorkouts(): WorkoutsApi {
  const api = useContext(Ctx);
  if (!api) throw new Error("useWorkouts must be used inside <WorkoutsProvider>");
  return api;
}
