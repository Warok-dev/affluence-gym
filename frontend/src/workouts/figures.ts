// Exercise illustrations: one stick figure per pose, drawn from joint angles, so every
// figure shares the same proportions and line style. Pure geometry: the React component
// (components/ExerciseFigure.tsx) and the gallery script (scripts/figures-gallery.ts) draw
// the primitives returned by `drawFigure`.
//
// Coordinates: viewBox 0 -14 100 92, floor at y = 74, the figure faces right (side view).
// Angles are absolute, in degrees: 0 = straight down, 90 = forward (right), 180 = up,
// 270 = backward (left).

export type Pt = [number, number];
export type Anchor = "hand" | "hand2" | "hip" | "neck" | "ankle" | "ankle2";

export type Prop =
  | { t: "line"; from: Pt | Anchor; to: Pt | Anchor; w?: number }
  | { t: "plate"; at: Pt | Anchor; r: number; dx?: number; dy?: number }
  | { t: "floor" };

export interface Pose {
  hip: Pt;
  torso: number;
  head?: number;
  /** Upper arm and forearm angles (the near arm). */
  arm: [number, number];
  /** Thigh and shin angles (the near leg). */
  leg: [number, number];
  /** Far arm and leg: drawn fainter in side view; same as the near ones when omitted. */
  arm2?: [number, number];
  leg2?: [number, number];
  /** Foot angles (default 90: flat, pointing forward). */
  foot?: number;
  foot2?: number;
  /** Front view: shoulders and hips spread apart, both sides drawn at full strength. */
  front?: boolean;
  /** Props that only belong to this pose (a moving platform, a cable to the hand...). */
  props?: Prop[];
}

export interface Figure {
  props?: Prop[];
  start: Pose;
  /** Omitted for static exercises (plank): a single panel. */
  end?: Pose;
}

const L = { torso: 26, neck: 3, head: 5, upperArm: 13, forearm: 12, thigh: 17, shin: 16, foot: 6 };
export const FLOOR_Y = 74;
export const VIEWBOX = "0 -14 100 92";

const dir = (deg: number): Pt => {
  const r = (deg * Math.PI) / 180;
  return [Math.sin(r), Math.cos(r)];
};
const go = (p: Pt, deg: number, len: number): Pt => {
  const [dx, dy] = dir(deg);
  return [p[0] + dx * len, p[1] + dy * len];
};

export interface Skeleton {
  hip: Pt;
  neck: Pt;
  head: Pt;
  shoulder: Pt;
  elbow: Pt;
  hand: Pt;
  shoulder2: Pt;
  elbow2: Pt;
  hand2: Pt;
  hipL: Pt;
  knee: Pt;
  ankle: Pt;
  toe: Pt;
  hip2: Pt;
  knee2: Pt;
  ankle2: Pt;
  toe2: Pt;
}

export function skeleton(p: Pose): Skeleton {
  const neck = go(p.hip, p.torso, L.torso);
  const head = go(neck, p.head ?? p.torso, L.neck + L.head);
  const spread = p.front ? 6 : 0;
  const hipSpread = p.front ? 4 : 0;
  const shoulder: Pt = [neck[0] + spread, neck[1] + (p.front ? 2 : 0)];
  const shoulder2: Pt = [neck[0] - spread, neck[1] + (p.front ? 2 : 0)];
  const arm2 = p.arm2 ?? p.arm;
  const leg2 = p.leg2 ?? p.leg;
  const elbow = go(shoulder, p.arm[0], L.upperArm);
  const elbow2 = go(shoulder2, arm2[0], L.upperArm);
  const hipL: Pt = [p.hip[0] + hipSpread, p.hip[1]];
  const hip2: Pt = [p.hip[0] - hipSpread, p.hip[1]];
  const knee = go(hipL, p.leg[0], L.thigh);
  const knee2 = go(hip2, leg2[0], L.thigh);
  const ankle = go(knee, p.leg[1], L.shin);
  const ankle2 = go(knee2, leg2[1], L.shin);
  const footLen = p.front ? 3 : L.foot;
  return {
    hip: p.hip,
    neck,
    head,
    shoulder,
    elbow,
    hand: go(elbow, p.arm[1], L.forearm),
    shoulder2,
    elbow2,
    hand2: go(elbow2, arm2[1], L.forearm),
    hipL,
    knee,
    ankle,
    toe: go(ankle, p.foot ?? 90, footLen),
    hip2,
    knee2,
    ankle2,
    toe2: go(ankle2, p.foot2 ?? (p.front ? 270 : (p.foot ?? 90)), footLen),
  };
}

export type Primitive =
  | { kind: "line"; a: Pt; b: Pt; cls: "gear" | "limb" | "limb far" | "torso"; w?: number }
  | { kind: "circle"; c: Pt; r: number; cls: "head" | "plate" };

/** Everything to draw for one pose, back to front. */
export function drawFigure(figure: Figure, pose: Pose): Primitive[] {
  const s = skeleton(pose);
  const anchor = (a: Pt | Anchor): Pt => (typeof a === "string" ? s[a] : a);
  const out: Primitive[] = [];
  const props = [...(figure.props ?? []), ...(pose.props ?? [])];

  for (const prop of props) {
    if (prop.t === "floor") out.push({ kind: "line", a: [4, FLOOR_Y + 1.5], b: [96, FLOOR_Y + 1.5], cls: "gear", w: 1.5 });
    else if (prop.t === "line") out.push({ kind: "line", a: anchor(prop.from), b: anchor(prop.to), cls: "gear", w: prop.w });
  }

  const far = pose.front ? "limb" : "limb far";
  out.push(
    { kind: "line", a: s.shoulder2, b: s.elbow2, cls: far },
    { kind: "line", a: s.elbow2, b: s.hand2, cls: far },
    { kind: "line", a: s.hip2, b: s.knee2, cls: far },
    { kind: "line", a: s.knee2, b: s.ankle2, cls: far },
    { kind: "line", a: s.ankle2, b: s.toe2, cls: far },
  );
  if (pose.front) {
    out.push({ kind: "line", a: s.shoulder2, b: s.shoulder, cls: "torso" }, { kind: "line", a: s.hip2, b: s.hipL, cls: "torso" });
  }
  out.push(
    { kind: "line", a: s.hip, b: s.neck, cls: "torso" },
    { kind: "line", a: s.hipL, b: s.knee, cls: "limb" },
    { kind: "line", a: s.knee, b: s.ankle, cls: "limb" },
    { kind: "line", a: s.ankle, b: s.toe, cls: "limb" },
    { kind: "line", a: s.shoulder, b: s.elbow, cls: "limb" },
    { kind: "line", a: s.elbow, b: s.hand, cls: "limb" },
    { kind: "circle", c: s.head, r: L.head, cls: "head" },
  );

  for (const prop of props) {
    if (prop.t === "plate") {
      const [x, y] = anchor(prop.at);
      out.push({ kind: "circle", c: [x + (prop.dx ?? 0), y + (prop.dy ?? 0)], r: prop.r, cls: "plate" });
    }
  }
  return out;
}
