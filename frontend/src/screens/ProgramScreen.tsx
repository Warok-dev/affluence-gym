import { BackIcon } from "../components/icons";
import { useT } from "../i18n";
import { navigate, ROUTES } from "../router";
import { getExercise } from "../workouts/exercises";
import { getProgram } from "../workouts/programs";
import { useWorkouts } from "../workouts/WorkoutsContext";

export function ProgramScreen({ id }: { id: string }) {
  const t = useT();
  const { active, startProgramDay } = useWorkouts();
  const program = getProgram(id);

  const back = (
    <a className="text-button back-link" href={`#${ROUTES.exercises}`}>
      <BackIcon /> {t.backToPrograms}
    </a>
  );
  if (!program) {
    return (
      <div className="workouts">
        {back}
        <p className="muted-text">{t.programNotFound}</p>
      </div>
    );
  }

  return (
    <div className="workouts">
      {back}
      <h2 className="section-title">{program.name}</h2>
      <p>{program.summary}</p>
      <dl className="facts">
        <dt>{t.levelLabel}</dt>
        <dd>{program.level}</dd>
        <dt>{t.frequencyLabel}</dt>
        <dd>{program.frequency}</dd>
      </dl>

      {active && (
        <p className="banner" role="status">
          {t.finishCurrentFirst}{" "}
          <a href={`#${ROUTES.activeWorkout}`} className="inline-link">
            {t.goToActive}
          </a>
        </p>
      )}

      {program.days.map((day) => (
        <section key={day.id} className="block" aria-labelledby={`day-${day.id}`}>
          <h3 id={`day-${day.id}`} className="block-title">
            {day.name}
          </h3>
          <ul className="rows">
            {day.items.map((item) => (
              <li key={item.exerciseId}>
                <a className="row row-link" href={`#${ROUTES.exercise(item.exerciseId)}`}>
                  <span className="row-title">{getExercise(item.exerciseId)?.name ?? item.exerciseId}</span>
                  <span className="row-figure">{t.programItem(item.sets, item.reps)}</span>
                </a>
              </li>
            ))}
          </ul>
          <button
            type="button"
            className="primary-button day-start"
            disabled={active !== null}
            onClick={() => {
              startProgramDay(day.items);
              navigate(ROUTES.activeWorkout);
            }}
          >
            {t.startDay(day.name)}
          </button>
        </section>
      ))}
    </div>
  );
}
