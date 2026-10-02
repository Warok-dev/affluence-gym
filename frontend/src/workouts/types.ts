// Workout data. It lives only on this device (localStorage), never on the server.

export interface WorkoutSet {
  reps: number;
  /** Load in kilograms (canonical unit; displayed in the user's unit). 0 for bodyweight. */
  weightKg: number;
  done: boolean;
}

export interface WorkoutExercise {
  /** Unique within the workout. */
  id: string;
  /** Catalog id (see exercises.ts). */
  exerciseId: string;
  sets: WorkoutSet[];
}

export interface Workout {
  id: string;
  /** Epoch milliseconds. */
  startedAt: number;
  /** Epoch milliseconds; absent while the workout is in progress. */
  endedAt?: number;
  /** Which gym, when the user picked one. */
  gym?: string;
  exercises: WorkoutExercise[];
}

export type WeightUnit = "kg" | "lb";

export interface Settings {
  unit: WeightUnit;
  /** Default rest between sets, in seconds. */
  restSeconds: number;
}

export const DEFAULT_SETTINGS: Settings = { unit: "kg", restSeconds: 90 };

/** Shape of the backup file (export / import). */
export interface Backup {
  app: "affluence-gym";
  kind: "workouts";
  version: 1;
  exportedAt: number;
  settings: Settings;
  workouts: Workout[];
}
