// Ready-made programs (original, deliberately simple and classic in structure).
// Starting a program day opens a workout prefilled with its exercises and sets.

export interface ProgramItem {
  exerciseId: string;
  sets: number;
  reps: number;
}

export interface ProgramDay {
  id: string;
  name: string;
  items: ProgramItem[];
}

export interface Program {
  id: string;
  name: string;
  level: string;
  frequency: string;
  summary: string;
  days: ProgramDay[];
}

const it = (exerciseId: string, sets: number, reps: number): ProgramItem => ({ exerciseId, sets, reps });

export const PROGRAMS: readonly Program[] = [
  {
    id: "debutant-full-body",
    name: "Débutant : corps entier",
    level: "Débutant",
    frequency: "3 séances par semaine, en alternant A et B",
    summary:
      "Pour découvrir la salle : des exercices simples, surtout des machines, qui travaillent tout le corps à chaque séance.",
    days: [
      {
        id: "a",
        name: "Séance A",
        items: [
          it("leg-press", 3, 10),
          it("chest-fly-machine", 3, 12),
          it("lat-pulldown", 3, 10),
          it("dumbbell-shoulder-press", 2, 10),
          it("plank", 3, 30),
        ],
      },
      {
        id: "b",
        name: "Séance B",
        items: [
          it("romanian-deadlift", 3, 10),
          it("incline-dumbbell-press", 3, 10),
          it("seated-cable-row", 3, 10),
          it("walking-lunge", 2, 10),
          it("crunch", 3, 15),
        ],
      },
    ],
  },
  {
    id: "force-5x5",
    name: "Force : 5 × 5",
    level: "Intermédiaire",
    frequency: "3 séances par semaine, en alternant A et B",
    summary:
      "Peu d'exercices, de lourds mouvements de base en 5 séries de 5. On ajoute un peu de charge chaque séance tant que la technique reste propre.",
    days: [
      { id: "a", name: "Séance A", items: [it("back-squat", 5, 5), it("bench-press", 5, 5), it("barbell-row", 5, 5)] },
      { id: "b", name: "Séance B", items: [it("back-squat", 5, 5), it("overhead-press", 5, 5), it("deadlift", 1, 5)] },
    ],
  },
  {
    id: "haut-bas",
    name: "Haut / bas du corps",
    level: "Intermédiaire",
    frequency: "4 séances par semaine : haut, bas, repos, haut, bas",
    summary: "Le haut et le bas du corps sur des jours séparés, avec plus de volume par groupe musculaire.",
    days: [
      {
        id: "haut-1",
        name: "Haut 1",
        items: [
          it("bench-press", 4, 6),
          it("barbell-row", 4, 8),
          it("overhead-press", 3, 8),
          it("lat-pulldown", 3, 10),
          it("barbell-curl", 3, 10),
          it("triceps-pushdown", 3, 12),
        ],
      },
      {
        id: "bas-1",
        name: "Bas 1",
        items: [
          it("back-squat", 4, 6),
          it("romanian-deadlift", 3, 8),
          it("leg-curl", 3, 12),
          it("calf-raise", 4, 12),
          it("hanging-leg-raise", 3, 10),
        ],
      },
      {
        id: "haut-2",
        name: "Haut 2",
        items: [
          it("incline-dumbbell-press", 4, 10),
          it("pull-up", 4, 8),
          it("lateral-raise", 3, 15),
          it("face-pull", 3, 15),
          it("hammer-curl", 3, 12),
          it("skull-crusher", 3, 10),
        ],
      },
      {
        id: "bas-2",
        name: "Bas 2",
        items: [
          it("deadlift", 3, 5),
          it("leg-press", 3, 12),
          it("walking-lunge", 3, 12),
          it("leg-extension", 3, 15),
          it("plank", 3, 45),
        ],
      },
    ],
  },
  {
    id: "poids-du-corps",
    name: "Poids du corps",
    level: "Tous niveaux",
    frequency: "2 à 3 séances par semaine",
    summary: "Sans charge : quand la salle est bondée, il suffit d'un coin libre et d'une barre de traction.",
    days: [
      {
        id: "a",
        name: "Séance unique",
        items: [it("push-up", 3, 12), it("pull-up", 3, 6), it("walking-lunge", 3, 12), it("dips", 3, 8), it("plank", 3, 45)],
      },
    ],
  },
];

export function getProgram(id: string): Program | undefined {
  return PROGRAMS.find((p) => p.id === id);
}
