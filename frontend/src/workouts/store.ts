// Device-only persistence of workouts (localStorage behind a tiny API, so it can
// move to IndexedDB later without touching the screens). Nothing here is sent anywhere.
import { DEFAULT_SETTINGS, type Backup, type Settings, type Workout } from "./types";

const KEYS = {
  workouts: "affluence-gym.workouts",
  active: "affluence-gym.active-workout",
  settings: "affluence-gym.settings",
};

export class StorageError extends Error {}

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown): void {
  try {
    if (value === undefined) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    // Quota exceeded or storage blocked (private mode): the caller tells the user.
    throw new StorageError(String(err));
  }
}

const newestFirst = (a: Workout, b: Workout) => b.startedAt - a.startedAt;

export function loadWorkouts(): Workout[] {
  const list = read<Workout[]>(KEYS.workouts, []);
  return Array.isArray(list) ? list.filter(isWorkout).sort(newestFirst) : [];
}

export function saveWorkouts(workouts: Workout[]): void {
  write(KEYS.workouts, [...workouts].sort(newestFirst));
}

export function loadActive(): Workout | null {
  const w = read<Workout | null>(KEYS.active, null);
  return w && isWorkout(w) ? w : null;
}

export function saveActive(workout: Workout | null): void {
  write(KEYS.active, workout ?? undefined);
}

export function loadSettings(): Settings {
  const s = read<Partial<Settings>>(KEYS.settings, {});
  return {
    unit: s.unit === "lb" ? "lb" : "kg",
    restSeconds: Number.isFinite(s.restSeconds) ? clampRest(Number(s.restSeconds)) : DEFAULT_SETTINGS.restSeconds,
  };
}

export function saveSettings(settings: Settings): void {
  write(KEYS.settings, settings);
}

export const clampRest = (seconds: number) => Math.min(600, Math.max(15, Math.round(seconds / 15) * 15));

// --- backup -----------------------------------------------------------------------

export function makeBackup(workouts: Workout[], settings: Settings, now = Date.now()): Backup {
  return { app: "affluence-gym", kind: "workouts", version: 1, exportedAt: now, settings, workouts };
}

/** Parses a backup file; throws a readable Error when the file is not one of ours. */
export function parseBackup(text: string): Backup {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("invalid-json");
  }
  const b = data as Partial<Backup>;
  if (!b || b.app !== "affluence-gym" || b.kind !== "workouts" || b.version !== 1 || !Array.isArray(b.workouts)) {
    throw new Error("not-a-backup");
  }
  const workouts = b.workouts.filter(isWorkout);
  if (workouts.length !== b.workouts.length) throw new Error("corrupted");
  return { ...(b as Backup), workouts };
}

/** Merges imported workouts into the current ones (same id: the imported copy wins). */
export function mergeWorkouts(current: Workout[], imported: Workout[]): Workout[] {
  const byId = new Map(current.map((w) => [w.id, w]));
  for (const w of imported) byId.set(w.id, w);
  return [...byId.values()].sort(newestFirst);
}

function isWorkout(value: unknown): value is Workout {
  const w = value as Workout;
  return (
    !!w &&
    typeof w.id === "string" &&
    Number.isFinite(w.startedAt) &&
    (w.endedAt === undefined || Number.isFinite(w.endedAt)) &&
    Array.isArray(w.exercises) &&
    w.exercises.every(
      (e) =>
        typeof e.id === "string" &&
        typeof e.exerciseId === "string" &&
        Array.isArray(e.sets) &&
        e.sets.every(
          (s) => Number.isFinite(s.reps) && Number.isFinite(s.weightKg) && s.reps >= 0 && s.weightKg >= 0,
        ),
    )
  );
}

export function newId(): string {
  return typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
