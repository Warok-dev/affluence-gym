import { useRef, useState, type ChangeEvent } from "react";
import { MinusIcon, PlusIcon } from "../components/icons";
import { useT } from "../i18n";
import { navigate, ROUTES } from "../router";
import { useContent } from "../workouts/content";
import {
  completedSets,
  durationMs,
  formatDuration,
  formatWeight,
  personalBests,
  volumeKg,
  workoutsThisWeek,
} from "../workouts/stats";
import { clampRest, makeBackup, parseBackup } from "../workouts/store";
import type { WeightUnit } from "../workouts/types";
import { useWorkouts } from "../workouts/WorkoutsContext";

const DATE_OPTIONS: Intl.DateTimeFormatOptions = { weekday: "short", day: "numeric", month: "short" };

export function WorkoutsScreen() {
  const t = useT();
  const content = useContent();
  const dateFormat = new Intl.DateTimeFormat(t.intl, DATE_OPTIONS);
  const { workouts, active, settings, storageError, start, updateSettings, importBackup } = useWorkouts();
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const bests = [...personalBests(workouts).values()].sort((a, b) => b.at - a.at).slice(0, 8);

  function exportBackup() {
    const blob = new Blob([JSON.stringify(makeBackup(workouts, settings), null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `affluence-gym-seances-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function onImport(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const added = importBackup(parseBackup(await file.text()));
      setImportMessage(t.importDone(added));
    } catch {
      setImportMessage(t.importError);
    }
  }

  return (
    <div className="workouts">
      <h2 className="section-title">{t.workoutsTitle}</h2>

      {storageError && (
        <p className="banner is-error" role="alert">
          {t.storageFull}
        </p>
      )}

      {active ? (
        <a className="live-card" href={`#${ROUTES.activeWorkout}`}>
          <span className="live-title">{t.activeWorkoutTitle}</span>
          <span className="live-clock">{formatDuration(durationMs(active))}</span>
          <span className="live-action">{t.resumeWorkout}</span>
        </a>
      ) : (
        <button
          type="button"
          className="primary-button"
          onClick={() => {
            start();
            navigate(ROUTES.activeWorkout);
          }}
        >
          <PlusIcon /> {t.startWorkout}
        </button>
      )}

      {workouts.length > 0 && (
        <p className="workouts-stats">
          {t.thisWeek(workoutsThisWeek(workouts))} · {t.totalWorkouts(workouts.length)}
        </p>
      )}

      {bests.length > 0 && (
        <section className="block" aria-labelledby="records-title">
          <h3 id="records-title" className="block-title">
            {t.recordsTitle}
          </h3>
          <ul className="rows">
            {bests.map((b) => (
              <li key={b.exerciseId} className="row">
                <span>{content.exerciseName(b.exerciseId)}</span>
                <span className="row-figure">{t.recordLine(formatWeight(b.weightKg, settings.unit, t.intl), b.reps)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="block" aria-labelledby="history-title">
        <h3 id="history-title" className="block-title">
          {t.historyTitle}
        </h3>
        {workouts.length === 0 ? (
          <p className="muted-text">{t.noWorkouts}</p>
        ) : (
          <ul className="rows">
            {workouts.map((w) => (
              <li key={w.id}>
                <a className="row row-link" href={`#${ROUTES.workout(w.id)}`}>
                  <span>
                    <span className="row-title">{dateFormat.format(w.startedAt)}</span>
                    <span className="row-sub">{t.workoutSummary(w.exercises.length, completedSets(w))}</span>
                  </span>
                  <span className="row-figure">
                    {formatDuration(durationMs(w))}
                    {volumeKg(w) > 0 && (
                      <span className="row-sub">{t.volume(formatWeight(volumeKg(w), settings.unit, t.intl))}</span>
                    )}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="block" aria-labelledby="settings-title">
        <h3 id="settings-title" className="block-title">
          {t.settingsTitle}
        </h3>
        <div className="setting">
          <span id="unit-label">{t.unitLabel}</span>
          <div className="segmented" role="radiogroup" aria-labelledby="unit-label">
            {(["kg", "lb"] as WeightUnit[]).map((unit) => (
              <button
                key={unit}
                type="button"
                role="radio"
                aria-checked={settings.unit === unit}
                onClick={() => updateSettings({ unit })}
              >
                {unit}
              </button>
            ))}
          </div>
        </div>
        <div className="setting">
          <span>{t.restLabel}</span>
          <div className="stepper">
            <button
              type="button"
              aria-label={t.lessRest}
              onClick={() => updateSettings({ restSeconds: clampRest(settings.restSeconds - 15) })}
            >
              <MinusIcon />
            </button>
            <output aria-live="polite">{formatDuration(settings.restSeconds * 1000)}</output>
            <button
              type="button"
              aria-label={t.moreRest}
              onClick={() => updateSettings({ restSeconds: clampRest(settings.restSeconds + 15) })}
            >
              <PlusIcon />
            </button>
          </div>
        </div>
      </section>

      <section className="block" aria-labelledby="backup-title">
        <h3 id="backup-title" className="block-title">
          {t.backupTitle}
        </h3>
        <p className="muted-text">{t.backupWarning}</p>
        <div className="button-row">
          <button type="button" className="secondary-button" onClick={exportBackup} disabled={workouts.length === 0}>
            {t.exportBackup}
          </button>
          <button type="button" className="secondary-button" onClick={() => fileInput.current?.click()}>
            {t.importBackup}
          </button>
          <input
            ref={fileInput}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={onImport}
            data-testid="import-input"
          />
        </div>
        {importMessage && (
          <p className="muted-text" role="status">
            {importMessage}
          </p>
        )}
      </section>
    </div>
  );
}
