import { useT } from "../i18n";
import { FIGURES } from "../workouts/figure-poses";
import { drawFigure, VIEWBOX, type Figure, type Pose, type Primitive } from "../workouts/figures";

const CLASS: Record<string, string> = {
  gear: "fig-gear",
  limb: "fig-limb",
  "limb far": "fig-limb fig-far",
  torso: "fig-torso",
  head: "fig-head",
  plate: "fig-plate",
};

function Drawing({ figure, pose, className }: { figure: Figure; pose: Pose; className: string }) {
  const prims: Primitive[] = drawFigure(figure, pose);
  return (
    <svg className={className} viewBox={VIEWBOX} aria-hidden="true" focusable="false">
      {prims.map((p, i) =>
        p.kind === "line" ? (
          <line
            key={i}
            x1={p.a[0]}
            y1={p.a[1]}
            x2={p.b[0]}
            y2={p.b[1]}
            className={CLASS[p.cls]}
            style={p.w !== undefined ? { strokeWidth: p.w } : undefined}
          />
        ) : (
          <circle key={i} cx={p.c[0]} cy={p.c[1]} r={p.r} className={CLASS[p.cls]} />
        ),
      )}
    </svg>
  );
}

/** How the exercise is done: start and finish positions side by side (one panel when static). */
export function ExerciseFigure({ id, name }: { id: string; name: string }) {
  const t = useT();
  const figure = FIGURES[id];
  if (!figure) return null;
  const poses = figure.end ? [figure.start, figure.end] : [figure.start];
  const captions = figure.end ? [t.figureStart, t.figureEnd] : [t.figureHold];
  return (
    <figure className="exercise-figure" role="img" aria-label={t.figureLabel(name, poses.length)}>
      {poses.map((pose, i) => (
        <div key={i} className="figure-panel">
          <Drawing figure={figure} pose={pose} className="figure-drawing" />
          <span className="figure-caption" aria-hidden="true">
            {poses.length > 1 && <span className="figure-step">{i + 1}</span>}
            {captions[i]}
          </span>
        </div>
      ))}
    </figure>
  );
}

/** Small finish position, for lists. Decorative: the row already names the exercise. */
export function ExerciseThumb({ id }: { id: string }) {
  const figure = FIGURES[id];
  if (!figure) return null;
  return <Drawing figure={figure} pose={figure.end ?? figure.start} className="exercise-thumb" />;
}
