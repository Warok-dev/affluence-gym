import { useState } from "react";
import { BackIcon, TrashIcon } from "../components/icons";
import { useT } from "../i18n";
import { navigate, ROUTES } from "../router";
import { getExercise } from "../workouts/exercises";
import { completedSets, durationMs, formatDuration, formatWeight, volumeKg } from "../workouts/stats";
import { useWorkouts } from "../workouts/WorkoutsContext";
import { summarizeSets } from "../workouts/format";

const dateFormat = new Intl.DateTimeFormat("fr-CA", {
  weekday: "long",
  day: "numeric",
  month: "long",
  hour: "numeric",
  minute: "2-digit",
});

export function WorkoutDetailScreen({ id }: { id: string }) {
  const t = useT();
  const { workouts, settings, deleteWorkout } = useWorkouts();
  const [confirming, setConfirming] = useState(false);
  const workout = workouts.find((w) => w.id === id);

  const back = (
    <a className="text-button back-link" href={`#${ROUTES.workouts}`}>
      <BackIcon /> {t.backToWorkouts}
    </a>
  );

  if (!workout) {
    return (
      <div className="workouts">
        {back}
        <p className="muted-text">{t.workoutNotFound}</p>
      </div>
    );
  }

  return (
    <div className="workouts">
      {back}
      <h2 className="section-title">{dateFormat.format(workout.startedAt)}</h2>
      <p className="workouts-stats">
        {t.duration(formatDuration(durationMs(workout)))} ·{" "}
        {t.workoutSummary(workout.exercises.length, completedSets(workout))}
        {volumeKg(workout) > 0 && ` · ${t.volume(formatWeight(volumeKg(workout), settings.unit))}`}
      </p>

      <ul className="rows">
        {workout.exercises.map((e) => (
          <li key={e.id} className="row">
            <span>{getExercise(e.exerciseId)?.name ?? e.exerciseId}</span>
            <span className="row-figure">{summarizeSets(e.sets, settings.unit)}</span>
          </li>
        ))}
      </ul>

      {confirming ? (
        <div className="confirm" role="alertdialog" aria-labelledby="delete-text">
          <p id="delete-text">{t.confirmDelete}</p>
          <div className="button-row">
            <button
              type="button"
              className="primary-button"
              onClick={() => {
                deleteWorkout(workout.id);
                navigate(ROUTES.workouts);
              }}
            >
              {t.confirmDeleteYes}
            </button>
            <button type="button" className="secondary-button" onClick={() => setConfirming(false)}>
              {t.keepGoing}
            </button>
          </div>
        </div>
      ) : (
        <button type="button" className="text-button danger" onClick={() => setConfirming(true)}>
          <TrashIcon /> {t.deleteWorkout}
        </button>
      )}
    </div>
  );
}
