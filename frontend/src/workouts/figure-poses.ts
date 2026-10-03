// Start and end poses of every exercise (ids from exercises.ts). See figures.ts for the
// conventions: viewBox 0 -14 100 92, floor at y = 74, facing right, 0° = down, 90° = forward.

import type { Figure, Pose, Prop } from "./figures";

const STAND: Pose = { hip: [50, 41], torso: 180, arm: [8, 4], leg: [0, 0] };
const stand = (p: Partial<Pose> = {}): Pose => ({ ...STAND, ...p });
const floor: Prop = { t: "floor" };
const barbell = (at: "hand" | "neck" | "hip" = "hand", dx = 0, dy = 0): Prop => ({ t: "plate", at, r: 6, dx, dy });
const dumbbell: Prop = { t: "plate", at: "hand", r: 3.5 };
const handle: Prop = { t: "plate", at: "hand", r: 2 };
/** Flat bench (pad + two legs). */
const flatBench = (x1: number, x2: number, y: number): Prop[] => [
  { t: "line", from: [x1, y], to: [x2, y], w: 4 },
  { t: "line", from: [x1 + 4, y], to: [x1 + 4, 74], w: 2 },
  { t: "line", from: [x2 - 4, y], to: [x2 - 4, 74], w: 2 },
];
/** Seat with a backrest, for seated machine work. */
const seat = (x: number, y: number, back = true): Prop[] => [
  { t: "line", from: [x - 8, y], to: [x + 10, y], w: 4 },
  { t: "line", from: [x, y], to: [x, 74], w: 2 },
  ...(back ? [{ t: "line" as const, from: [x - 7, y] as [number, number], to: [x - 7, y - 26] as [number, number], w: 4 }] : []),
];
const SEATED: Pose = { hip: [45, 54], torso: 180, arm: [0, 0], leg: [90, 0] };
const seated = (p: Partial<Pose> = {}): Pose => ({ ...SEATED, ...p });
const LYING: Pose = { hip: [36, 49], torso: 90, arm: [180, 180], leg: [-55, 0] };
const lying = (p: Partial<Pose> = {}): Pose => ({ ...LYING, ...p });

export const FIGURES: Record<string, Figure> = {
  // --- Chest ---
  "bench-press": {
    props: [floor, ...flatBench(28, 72, 53), barbell()],
    start: lying({ arm: [20, 180] }),
    end: lying(),
  },
  "incline-dumbbell-press": {
    props: [
      floor,
      { t: "line", from: [44, 61], to: [21, 38], w: 4 },
      { t: "line", from: [36, 61], to: [56, 61], w: 4 },
      { t: "line", from: [46, 61], to: [46, 74], w: 2 },
      dumbbell,
    ],
    start: { hip: [44, 57], torso: 225, arm: [60, 150], leg: [90, 0] },
    end: { hip: [44, 57], torso: 225, arm: [135, 135], leg: [90, 0] },
  },
  "chest-fly-machine": {
    props: [floor, ...seat(45, 56), handle],
    start: seated({ hip: [45, 54], arm: [255, 270], arm2: [255, 270] }),
    end: seated({ hip: [45, 54], arm: [95, 90], arm2: [95, 90] }),
  },
  "push-up": {
    props: [floor],
    start: { hip: [46, 60], torso: 113, arm: [3, 0], leg: [293, 293], foot: 30 },
    end: { hip: [48, 65], torso: 100, arm: [280, 15], leg: [280, 280], foot: 20 },
  },
  dips: {
    props: [
      floor,
      { t: "line", from: [38, 42], to: [68, 42], w: 3 },
      { t: "line", from: [64, 42], to: [64, 74], w: 2 },
    ],
    start: { hip: [50, 44], torso: 180, arm: [0, 0], leg: [5, -80], foot: -60 },
    end: { hip: [50, 54], torso: 172, arm: [300, 50], leg: [5, -80], foot: -60 },
  },

  // --- Back ---
  deadlift: {
    props: [floor, barbell()],
    start: { hip: [40, 50], torso: 120, arm: [0, 0], leg: [50, -21] },
    end: stand(),
  },
  "pull-up": {
    props: [{ t: "line", from: [30, -4], to: [80, -4], w: 3 }],
    start: { hip: [52, 47], torso: 180, arm: [176, 180], leg: [0, -80], foot: 0 },
    end: { hip: [52, 26], torso: 180, arm: [100, 260], leg: [0, -80], foot: 0 },
  },
  "lat-pulldown": {
    props: [floor, ...seat(45, 56, false), { t: "line", from: "hand", to: [47, -14], w: 1.5 }, handle],
    start: seated({ torso: 175, arm: [180, 180] }),
    end: seated({ torso: 170, arm: [20, 160] }),
  },
  "barbell-row": {
    props: [floor, barbell()],
    start: { hip: [42, 42], torso: 115, arm: [0, 0], leg: [15, -5] },
    end: { hip: [42, 42], torso: 115, arm: [-60, 10], leg: [15, -5] },
  },
  "seated-cable-row": {
    props: [
      floor,
      { t: "line", from: [24, 66], to: [46, 66], w: 4 },
      { t: "line", from: [70, 52], to: [70, 74], w: 3 },
      { t: "line", from: "hand", to: [92, 60], w: 1.5 },
      handle,
    ],
    start: { hip: [35, 62], torso: 160, arm: [95, 95], leg: [80, 100], foot: 180 },
    end: { hip: [35, 62], torso: 185, arm: [-75, 90], leg: [80, 100], foot: 180 },
  },

  // --- Legs ---
  "back-squat": {
    props: [floor, { t: "plate", at: "neck", r: 5, dx: -5, dy: 4 }],
    start: stand({ arm: [-30, 160] }),
    end: { hip: [37, 58], torso: 140, arm: [-55, 130], leg: [90, -17] },
  },
  "leg-press": {
    props: [{ t: "line", from: [40, 64], to: [16, 46], w: 4 }, { t: "line", from: [30, 64], to: [52, 64], w: 4 }, floor],
    start: {
      hip: [40, 60],
      torso: 230,
      arm: [60, 100],
      leg: [140, 60],
      foot: 150,
      props: [{ t: "line", from: [60, 40], to: [72, 58], w: 4 }],
    },
    end: {
      hip: [40, 60],
      torso: 230,
      arm: [60, 100],
      leg: [118, 122],
      foot: 150,
      props: [{ t: "line", from: [64, 32], to: [76, 50], w: 4 }],
    },
  },
  "romanian-deadlift": {
    props: [floor, barbell()],
    start: stand(),
    end: { hip: [44, 40], torso: 105, arm: [0, 0], leg: [10, -5] },
  },
  "walking-lunge": {
    props: [floor],
    start: stand({ leg2: [0, 0] }),
    end: { hip: [48, 55], torso: 180, arm: [10, 0], arm2: [-10, 0], leg: [80, 2], leg2: [-25, -85], foot2: 100 },
  },
  "leg-curl": {
    props: [floor, ...flatBench(10, 70, 54), { t: "plate", at: "ankle", r: 3 }],
    start: { hip: [46, 50], torso: 270, arm: [0, 90], leg: [90, 90], foot: 0 },
    end: { hip: [46, 50], torso: 270, arm: [0, 90], leg: [90, 205], foot: 270 },
  },
  "leg-extension": {
    props: [floor, ...seat(45, 56), { t: "plate", at: "ankle", r: 3 }],
    start: seated({ arm: [0, 60] }),
    end: seated({ arm: [0, 60], leg: [90, 90], foot: 180 }),
  },
  "calf-raise": {
    props: [{ t: "line", from: [48, 76], to: [80, 76], w: 4 }],
    start: stand({ hip: [50, 43], foot: 115 }),
    end: stand({ hip: [50, 38], foot: 35 }),
  },
  "hip-thrust": {
    props: [floor, ...flatBench(4, 22, 60), barbell("hip", 0, -6)],
    start: { hip: [40, 66], torso: 250, arm: [90, 90], leg: [120, 5] },
    end: { hip: [42, 57], torso: 270, arm: [90, 90], leg: [90, 0] },
  },

  // --- Shoulders ---
  "overhead-press": {
    props: [floor, barbell()],
    start: stand({ arm: [20, 170] }),
    end: stand({ arm: [180, 180] }),
  },
  "dumbbell-shoulder-press": {
    props: [floor, ...seat(45, 56), dumbbell],
    start: seated({ arm: [80, 180] }),
    end: seated({ arm: [165, 180] }),
  },
  "lateral-raise": {
    props: [floor, dumbbell, { t: "plate", at: "hand2", r: 3.5 }],
    start: stand({ front: true, arm: [8, 4], arm2: [-8, -4], leg: [4, 0], leg2: [-4, 0] }),
    end: stand({ front: true, arm: [88, 92], arm2: [-88, -92], leg: [4, 0], leg2: [-4, 0] }),
  },
  "face-pull": {
    props: [floor, { t: "line", from: "hand", to: [96, 6], w: 1.5 }, handle],
    start: stand({ arm: [90, 92] }),
    end: stand({ arm: [115, 265] }),
  },

  // --- Arms ---
  "barbell-curl": { props: [floor, barbell()], start: stand({ arm: [12, 10] }), end: stand({ arm: [12, 165] }) },
  "dumbbell-curl": { props: [floor, dumbbell], start: stand({ arm: [12, 10] }), end: stand({ arm: [12, 165] }) },
  "hammer-curl": {
    props: [floor, { t: "plate", at: "hand", r: 3 }],
    start: stand({ arm: [12, 10] }),
    end: stand({ arm: [12, 160] }),
  },
  "triceps-pushdown": {
    props: [floor, { t: "line", from: "hand", to: [60, -14], w: 1.5 }, handle],
    start: stand({ torso: 172, arm: [18, 145] }),
    end: stand({ torso: 172, arm: [18, 15] }),
  },
  "skull-crusher": {
    props: [floor, ...flatBench(28, 72, 53), barbell("hand", 0, 0)],
    start: lying(),
    end: lying({ arm: [170, 95] }),
  },

  // --- Core ---
  plank: {
    props: [floor],
    start: { hip: [46, 63], torso: 96, arm: [0, 90], leg: [283, 283], foot: 0 },
  },
  crunch: {
    props: [floor],
    start: { hip: [45, 71], torso: 270, head: 270, arm: [90, 90], leg: [130, 15] },
    end: { hip: [45, 71], torso: 240, head: 230, arm: [110, 110], leg: [130, 15] },
  },
  "hanging-leg-raise": {
    props: [{ t: "line", from: [30, -10], to: [80, -10], w: 3 }],
    start: stand({ arm: [180, 180], leg: [5, -10] }),
    end: stand({ arm: [180, 180], leg: [100, 0] }),
  },

  // --- Cardio ---
  "rowing-machine": {
    props: [
      { t: "line", from: [6, 70], to: [90, 70], w: 3 },
      { t: "line", from: [78, 70], to: [78, 58], w: 4 },
      { t: "line", from: "hand", to: [88, 56], w: 1.5 },
      handle,
    ],
    start: { hip: [30, 66], torso: 150, arm: [95, 95], leg: [140, 30], foot: 160 },
    end: { hip: [30, 66], torso: 200, arm: [-60, 90], leg: [90, 92], foot: 170 },
  },
  treadmill: {
    props: [
      { t: "line", from: [12, 75], to: [86, 75], w: 3 },
      { t: "line", from: [86, 75], to: [92, 40], w: 3 },
      { t: "line", from: [92, 40], to: [80, 36], w: 3 },
    ],
    start: { hip: [50, 42], torso: 172, arm: [-30, 70], arm2: [30, 140], leg: [25, -10], leg2: [-20, -70] },
    end: { hip: [50, 42], torso: 172, arm: [30, 140], arm2: [-30, 70], leg: [-20, -70], leg2: [25, -10] },
  },
  bike: {
    props: [
      floor,
      { t: "line", from: [34, 46], to: [46, 46], w: 4 },
      { t: "line", from: [42, 46], to: [52, 66], w: 3 },
      { t: "line", from: [52, 66], to: [70, 34], w: 3 },
      { t: "line", from: [70, 34], to: [76, 34], w: 3 },
      { t: "line", from: [52, 66], to: [44, 74], w: 3 },
      { t: "line", from: [52, 66], to: [64, 74], w: 3 },
    ],
    start: { hip: [40, 43], torso: 145, arm: [75, 110], leg: [100, 10], leg2: [60, -30] },
    end: { hip: [40, 43], torso: 145, arm: [75, 110], leg: [60, -30], leg2: [100, 10] },
  },
};
