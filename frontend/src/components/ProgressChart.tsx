import { useT } from "../i18n";
import { toUnit, type Progress } from "../workouts/stats";
import type { WeightUnit } from "../workouts/types";

const W = 320;
const H = 112;
const PAD_X = 8;
const PAD_Y = 10;
const DATE_OPTIONS: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" };

/** One line, one dot per workout: the exercise's estimated 1RM (or best reps) over time. */
export function ProgressChart({ progress, unit }: { progress: Progress; unit: WeightUnit }) {
  const t = useT();
  const { points, metric } = progress;
  if (points.length < 2) return <p className="muted-text">{t.progressNeedMore}</p>;

  const shown = points.map((p) => (metric === "load" ? toUnit(p.value, unit) : p.value));
  const lo = Math.min(...shown);
  const hi = Math.max(...shown);
  const span = hi - lo || 1;
  const x = (i: number) => PAD_X + (i * (W - 2 * PAD_X)) / (points.length - 1);
  const y = (v: number) => H - PAD_Y - ((v - lo) / span) * (H - 2 * PAD_Y);
  const line = shown.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(" ");

  const number = (v: number) => v.toLocaleString(t.intl, { maximumFractionDigits: 1 });
  const value = (v: number) => (metric === "load" ? `${number(v)} ${unit}` : t.repsCount(v));
  const last = shown[shown.length - 1];
  const delta = last - shown[0];
  const deltaText = delta === 0 ? "=" : `${delta > 0 ? "+" : "−"}${value(Math.abs(delta))}`;
  const dateFormat = new Intl.DateTimeFormat(t.intl, DATE_OPTIONS);
  const first = dateFormat.format(points[0].at);
  const lastDate = dateFormat.format(points[points.length - 1].at);

  return (
    <figure className="progress">
      <p className="progress-now">
        <strong>{metric === "load" ? t.progressLoad(value(last)) : t.progressReps(value(last))}</strong>
        <span className="progress-change">{t.progressChange(deltaText, points.length)}</span>
      </p>
      <div className="progress-plot">
        <svg
          className="progress-chart"
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          role="img"
          aria-label={t.progressChartLabel(points.length, first, lastDate, value(shown[0]), value(last))}
        >
          <line className="progress-base" x1={0} x2={W} y1={H - 0.5} y2={H - 0.5} />
          <path className="progress-line" d={line} vectorEffect="non-scaling-stroke" />
        </svg>
        {/* Dots drawn in HTML so they stay round whatever the chart's aspect ratio. */}
        <div className="progress-dots" aria-hidden="true">
          {shown.map((v, i) => (
            <span key={points[i].workoutId} style={{ left: `${(x(i) / W) * 100}%`, top: `${(y(v) / H) * 100}%` }} />
          ))}
        </div>
      </div>
      <figcaption className="progress-axis">
        <span>{first}</span>
        <span>{lastDate}</span>
      </figcaption>
      {metric === "load" && <p className="muted-text">{t.progressHint}</p>}
    </figure>
  );
}
