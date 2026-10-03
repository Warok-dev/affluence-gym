// Exercise catalog (original texts written for this project).
// Phase 7 adds instructions and ready-made programs on top of these ids, so ids are stable.

export type MuscleGroup = "chest" | "back" | "legs" | "shoulders" | "arms" | "core" | "cardio";

export interface Exercise {
  id: string;
  name: string;
  group: MuscleGroup;
  /** Bodyweight exercises log reps only by default (load optional). */
  bodyweight?: boolean;
}

export const MUSCLE_GROUPS: readonly MuscleGroup[] = ["chest", "back", "legs", "shoulders", "arms", "core", "cardio"];

export const EXERCISES: readonly Exercise[] = [
  { id: "bench-press", name: "Développé couché", group: "chest" },
  { id: "incline-dumbbell-press", name: "Développé incliné haltères", group: "chest" },
  { id: "chest-fly-machine", name: "Écarté à la machine", group: "chest" },
  { id: "push-up", name: "Pompes", group: "chest", bodyweight: true },
  { id: "dips", name: "Dips", group: "chest", bodyweight: true },
  { id: "deadlift", name: "Soulevé de terre", group: "back" },
  { id: "pull-up", name: "Tractions", group: "back", bodyweight: true },
  { id: "lat-pulldown", name: "Tirage vertical", group: "back" },
  { id: "barbell-row", name: "Rowing barre", group: "back" },
  { id: "seated-cable-row", name: "Tirage horizontal à la poulie", group: "back" },
  { id: "back-squat", name: "Squat", group: "legs" },
  { id: "leg-press", name: "Presse à cuisses", group: "legs" },
  { id: "romanian-deadlift", name: "Soulevé de terre jambes tendues", group: "legs" },
  { id: "walking-lunge", name: "Fentes marchées", group: "legs" },
  { id: "leg-curl", name: "Leg curl", group: "legs" },
  { id: "leg-extension", name: "Leg extension", group: "legs" },
  { id: "calf-raise", name: "Mollets debout", group: "legs" },
  { id: "hip-thrust", name: "Hip thrust", group: "legs" },
  { id: "overhead-press", name: "Développé militaire", group: "shoulders" },
  { id: "dumbbell-shoulder-press", name: "Développé épaules haltères", group: "shoulders" },
  { id: "lateral-raise", name: "Élévations latérales", group: "shoulders" },
  { id: "face-pull", name: "Face pull", group: "shoulders" },
  { id: "barbell-curl", name: "Curl barre", group: "arms" },
  { id: "dumbbell-curl", name: "Curl haltères", group: "arms" },
  { id: "hammer-curl", name: "Curl marteau", group: "arms" },
  { id: "triceps-pushdown", name: "Extension triceps à la poulie", group: "arms" },
  { id: "skull-crusher", name: "Barre au front", group: "arms" },
  { id: "plank", name: "Gainage (secondes)", group: "core", bodyweight: true },
  { id: "crunch", name: "Crunch", group: "core", bodyweight: true },
  { id: "hanging-leg-raise", name: "Relevés de jambes suspendu", group: "core", bodyweight: true },
  { id: "rowing-machine", name: "Rameur (minutes)", group: "cardio", bodyweight: true },
  { id: "treadmill", name: "Tapis de course (minutes)", group: "cardio", bodyweight: true },
  { id: "bike", name: "Vélo (minutes)", group: "cardio", bodyweight: true },
];

const BY_ID = new Map(EXERCISES.map((e) => [e.id, e]));

export function getExercise(id: string): Exercise | undefined {
  return BY_ID.get(id);
}

/** Accent- and case-insensitive search on the exercise name (in `list`'s language). */
export function searchExercises(query: string, list: readonly Exercise[] = EXERCISES): Exercise[] {
  const norm = (s: string) =>
    s
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .trim();
  const q = norm(query);
  return q ? list.filter((e) => norm(e.name).includes(q)) : [...list];
}
