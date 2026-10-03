import { useState } from "react";
import { ExerciseFigure } from "../components/ExerciseFigure";
import { BackIcon, PlusIcon } from "../components/icons";
import { ProgressChart } from "../components/ProgressChart";
import { useT } from "../i18n";
import { ROUTES } from "../router";
import { useContent } from "../workouts/content";
import { summarizeSets } from "../workouts/format";
import { formatWeight, personalBests, progression } from "../workouts/stats";
import { useWorkouts } from "../workouts/WorkoutsContext";

const DATE_OPTIONS: Intl.DateTimeFormatOptions = { weekday: "short", day: "numeric", month: "short" };

export function ExerciseDetailScreen({ id }: { id: string }) {
  const t = useT();
  const content = useContent();
  const dateFormat = new Intl.DateTimeFormat(t.intl, DATE_OPTIONS);
  const { workouts, active, settings, addExercise } = useWorkouts();
  const [added, setAdded] = useState(false);
  const exercise = content.exercise(id);
  const guide = content.guide(id);

  const back = (
    <a className="text-button back-link" href={`#${ROUTES.exercises}`}>
      <BackIcon /> {t.backToLibrary}
    </a>
  );
  if (!exercise) {
    return (
      <div className="workouts">
        {back}
        <p className="muted-text">{t.exerciseNotFound}</p>
      </div>
    );
  }

  const best = personalBests(workouts).get(id);
  const history = workouts
    .filter((w) => w.endedAt !== undefined)
    .map((w) => ({ w, sets: w.exercises.filter((e) => e.exerciseId === id).flatMap((e) => e.sets) }))
    .filter((h) => h.sets.length > 0)
    .slice(0, 5);

  return (
    <div className="workouts">
      {back}
      <h2 className="section-title">{exercise.name}</h2>
      <ExerciseFigure id={id} name={exercise.name} />
      {guide && (
        <dl className="facts">
          <dt>{t.musclesLabel}</dt>
          <dd>{guide.muscles}</dd>
          <dt>{t.equipmentLabel}</dt>
          <dd>{guide.equipment}</dd>
        </dl>
      )}

      {active &&
        (added ? (
          <p className="muted-text" role="status">
            {t.addedToActive}{" "}
            <a href={`#${ROUTES.activeWorkout}`} className="inline-link">
              {t.goToActive}
            </a>
          </p>
        ) : (
          <button
            type="button"
            className="primary-button"
            onClick={() => {
              addExercise(id);
              setAdded(true);
            }}
          >
            <PlusIcon /> {t.addToActive}
          </button>
        ))}

      {guide && (
        <section className="block" aria-labelledby="howto-title">
          <h3 id="howto-title" className="block-title">
            {t.howToTitle}
          </h3>
          <ol className="steps">
            {guide.steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
          <p className="tip">
            <strong>
              {t.tipTitle}
              {t.colon}
            </strong>
            {guide.tip}
          </p>
          <p className="muted-text">{t.safetyNote}</p>
        </section>
      )}

      <section className="block" aria-labelledby="mine-title">
        <h3 id="mine-title" className="block-title">
          {t.yourHistory}
        </h3>
        {best && (
          <p className="record">
            {t.yourRecord}
            {t.colon}
            <strong>{t.recordLine(formatWeight(best.weightKg, settings.unit, t.intl), best.reps)}</strong>
          </p>
        )}
        {history.length > 0 && <ProgressChart progress={progression(workouts, id)} unit={settings.unit} />}
        {history.length === 0 ? (
          <p className="muted-text">{t.noHistoryYet}</p>
        ) : (
          <ul className="rows">
            {history.map(({ w, sets }) => (
              <li key={w.id}>
                <a className="row row-link" href={`#${ROUTES.workout(w.id)}`}>
                  <span className="row-title">{dateFormat.format(w.startedAt)}</span>
                  <span className="row-figure">{summarizeSets(sets, settings.unit, t.intl)}</span>
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
