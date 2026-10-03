import { useEffect, useId, useRef, useState } from "react";
import { CheckIcon, PlusIcon, TrashIcon } from "../components/icons";
import { useT } from "../i18n";
import { navigate, ROUTES } from "../router";
import { useContent } from "../workouts/content";
import { MUSCLE_GROUPS } from "../workouts/exercises";
import { durationMs, formatDuration, fromUnit, lastPerformance } from "../workouts/stats";
import { inputValue, summarizeSets } from "../workouts/format";
import type { WorkoutSet } from "../workouts/types";
import { useWorkouts } from "../workouts/WorkoutsContext";

export function ActiveWorkoutScreen() {
  const t = useT();
  const content = useContent();
  const { active, workouts, settings, storageError, addExercise, removeExercise, addSet, updateSet, removeSet, finish, discard } =
    useWorkouts();
  const [picking, setPicking] = useState(false);
  const [confirm, setConfirm] = useState<"finish" | "discard" | null>(null);
  const [restEndsAt, setRestEndsAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  if (!active) {
    // No workout in progress (finished elsewhere, or deep link): go back to the list.
    return (
      <div className="workouts">
        <p className="muted-text">{t.noWorkouts}</p>
        <a className="text-button" href={`#${ROUTES.workouts}`}>
          {t.backToWorkouts}
        </a>
      </div>
    );
  }

  function toggleDone(entryId: string, index: number, set: WorkoutSet) {
    updateSet(entryId, index, { done: !set.done });
    if (!set.done) setRestEndsAt(Date.now() + settings.restSeconds * 1000);
  }

  return (
    <div className="workouts active-workout">
      <div className="live-card is-static">
        {/* The screen's heading (exercises below are h3), styled as the card's small title. */}
        <h2 className="live-title">{t.activeWorkoutTitle}</h2>
        <span className="live-clock" role="timer">
          {formatDuration(durationMs(active, now))}
        </span>
        <button type="button" className="live-action" onClick={() => setConfirm("finish")}>
          {t.finishWorkout}
        </button>
      </div>

      {storageError && (
        <p className="banner is-error" role="alert">
          {t.storageFull}
        </p>
      )}

      {confirm && (
        <div className="confirm" role="alertdialog" aria-labelledby="confirm-text">
          <p id="confirm-text">{confirm === "finish" ? t.confirmFinish : t.confirmDiscard}</p>
          <div className="button-row">
            <button
              type="button"
              className="primary-button"
              onClick={() => {
                if (confirm === "finish") {
                  const saved = finish();
                  navigate(saved ? ROUTES.workout(saved.id) : ROUTES.workouts);
                } else {
                  discard();
                  navigate(ROUTES.workouts);
                }
              }}
            >
              {confirm === "finish" ? t.confirmFinishYes : t.confirmDiscardYes}
            </button>
            <button type="button" className="secondary-button" onClick={() => setConfirm(null)}>
              {t.keepGoing}
            </button>
          </div>
        </div>
      )}

      {active.exercises.length === 0 && !picking && <p className="muted-text">{t.emptyWorkout}</p>}

      {active.exercises.map((entry) => {
        const exercise = content.exercise(entry.exerciseId);
        const name = exercise?.name ?? entry.exerciseId;
        const last = lastPerformance(workouts, entry.exerciseId);
        return (
          <section key={entry.id} className="exercise" aria-label={exercise?.name ?? entry.exerciseId}>
            <header className="exercise-head">
              <h3>{exercise?.name ?? entry.exerciseId}</h3>
              <button
                type="button"
                className="icon-button"
                aria-label={`${t.removeExercise}${t.colon}${exercise?.name ?? ""}`}
                onClick={() => removeExercise(entry.id)}
              >
                <TrashIcon />
              </button>
            </header>
            <p className="muted-text">{last ? t.lastTime(summarizeSets(last, settings.unit, t.intl)) : t.firstTime}</p>
            <table className="sets">
              <thead>
                <tr>
                  <th scope="col">{t.setLabel}</th>
                  <th scope="col">{t.repsLabel}</th>
                  <th scope="col">{t.weightLabel(settings.unit)}</th>
                  <th scope="col">
                    <span className="sr-only">{t.doneColumn}</span>
                  </th>
                  <th scope="col">
                    <span className="sr-only">{t.deleteColumn}</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {entry.sets.map((set, i) => (
                  <tr key={i} className={set.done ? "is-done" : undefined}>
                    <td className="set-number">{i + 1}</td>
                    <td>
                      <NumberField
                        label={`${name} · ${t.setLabel} ${i + 1} · ${t.repsLabel}`}
                        value={set.reps}
                        step={1}
                        onChange={(reps) => updateSet(entry.id, i, { reps: Math.round(reps) })}
                      />
                    </td>
                    <td>
                      <NumberField
                        label={`${name} · ${t.setLabel} ${i + 1} · ${t.weightLabel(settings.unit)}`}
                        value={inputValue(set.weightKg, settings.unit)}
                        step={settings.unit === "lb" ? 5 : 2.5}
                        placeholder={exercise?.bodyweight ? t.bodyweight : undefined}
                        onChange={(v) => updateSet(entry.id, i, { weightKg: fromUnit(v, settings.unit) })}
                      />
                    </td>
                    <td>
                      <button
                        type="button"
                        className="check"
                        role="checkbox"
                        aria-checked={set.done}
                        aria-label={`${name} · ${t.doneLabel(i + 1)}`}
                        onClick={() => toggleDone(entry.id, i, set)}
                      >
                        {set.done && <CheckIcon />}
                      </button>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="icon-button"
                        aria-label={`${name} · ${t.removeSet(i + 1)}`}
                        onClick={() => removeSet(entry.id, i)}
                      >
                        <TrashIcon />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button type="button" className="text-button" onClick={() => addSet(entry.id)}>
              <PlusIcon /> {t.addSet}
            </button>
          </section>
        );
      })}

      {picking ? (
        <ExercisePicker
          onPick={(id) => {
            addExercise(id);
            setPicking(false);
          }}
          onClose={() => setPicking(false)}
        />
      ) : (
        <button type="button" className="primary-button" onClick={() => setPicking(true)}>
          <PlusIcon /> {t.addExercise}
        </button>
      )}

      <button type="button" className="text-button danger" onClick={() => setConfirm("discard")}>
        {t.discardWorkout}
      </button>

      {restEndsAt !== null && (
        <RestTimer
          endsAt={restEndsAt}
          now={now}
          onAdjust={(delta) => setRestEndsAt(Math.max(Date.now(), restEndsAt + delta * 1000))}
          onSkip={() => setRestEndsAt(null)}
        />
      )}
    </div>
  );
}

/** Number input that keeps what the user is typing (empty, "62.") until it parses. */
function NumberField({
  label,
  value,
  step,
  placeholder,
  onChange,
}: {
  label: string;
  value: number;
  step: number;
  placeholder?: string;
  onChange: (v: number) => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const shown = draft ?? (value === 0 && placeholder ? "" : String(value));
  return (
    <input
      className="num"
      type="number"
      inputMode="decimal"
      min={0}
      step={step}
      aria-label={label}
      placeholder={placeholder}
      value={shown}
      onFocus={(e) => e.target.select()}
      onChange={(e) => {
        setDraft(e.target.value);
        const v = Number(e.target.value.replace(",", "."));
        if (e.target.value !== "" && Number.isFinite(v) && v >= 0) onChange(v);
        if (e.target.value === "") onChange(0);
      }}
      onBlur={() => setDraft(null)}
    />
  );
}

function ExercisePicker({ onPick, onClose }: { onPick: (id: string) => void; onClose: () => void }) {
  const t = useT();
  const content = useContent();
  const [query, setQuery] = useState("");
  const searchId = useId();
  const input = useRef<HTMLInputElement>(null);
  const results = content.search(query);

  useEffect(() => input.current?.focus(), []);

  return (
    <section className="picker-panel" aria-label={t.addExercise}>
      <div className="picker-search">
        <label htmlFor={searchId} className="sr-only">
          {t.searchExercise}
        </label>
        <input
          ref={input}
          id={searchId}
          type="search"
          placeholder={t.searchExercise}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button type="button" className="text-button" onClick={onClose}>
          {t.close}
        </button>
      </div>
      {results.length === 0 ? (
        <p className="muted-text">{t.noExerciseFound}</p>
      ) : (
        MUSCLE_GROUPS.map((group) => {
          const items = results.filter((e) => e.group === group);
          if (!items.length) return null;
          return (
            <div key={group} className="picker-group">
              <h4>{t.groups[group]}</h4>
              <ul>
                {items.map((e) => (
                  <li key={e.id}>
                    <button type="button" className="picker-item" onClick={() => onPick(e.id)}>
                      {e.name}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          );
        })
      )}
      <p className="sr-only" aria-live="polite">
        {results.length} / {content.exercises.length}
      </p>
    </section>
  );
}

function RestTimer({
  endsAt,
  now,
  onAdjust,
  onSkip,
}: {
  endsAt: number;
  now: number;
  onAdjust: (deltaSeconds: number) => void;
  onSkip: () => void;
}) {
  const t = useT();
  const left = Math.max(0, endsAt - now);
  const over = left === 0;
  const buzzed = useRef(false);

  useEffect(() => {
    if (over && !buzzed.current) {
      buzzed.current = true;
      navigator.vibrate?.([200, 100, 200]);
    }
    if (!over) buzzed.current = false;
  }, [over]);

  const clock = formatDuration(left);
  return (
    <div className={`rest${over ? " is-over" : ""}`} role="timer" aria-label={t.restTimerLabel(clock)}>
      <span className="rest-label">{over ? t.restDone : t.rest}</span>
      {!over && <span className="rest-clock">{clock}</span>}
      {!over && (
        <>
          <button type="button" className="rest-adjust" aria-label={t.lessRest} onClick={() => onAdjust(-15)}>
            −15
          </button>
          <button type="button" className="rest-adjust" aria-label={t.moreRest} onClick={() => onAdjust(15)}>
            +15
          </button>
        </>
      )}
      <button type="button" className="rest-skip" onClick={onSkip}>
        {over ? t.close : t.skipRest}
      </button>
    </div>
  );
}
