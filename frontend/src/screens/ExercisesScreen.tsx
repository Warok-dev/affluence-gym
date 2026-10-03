import { useId, useState } from "react";
import { ExerciseThumb } from "../components/ExerciseFigure";
import { useT } from "../i18n";
import { ROUTES } from "../router";
import { useContent } from "../workouts/content";
import { MUSCLE_GROUPS, type MuscleGroup } from "../workouts/exercises";

/** Library tab: ready-made programs first, then every exercise, filterable. */
export function ExercisesScreen() {
  const t = useT();
  const content = useContent();
  const [group, setGroup] = useState<MuscleGroup | null>(null);
  const [query, setQuery] = useState("");
  const searchId = useId();
  const list = content.search(query).filter((e) => group === null || e.group === group);

  return (
    <div className="workouts">
      <section aria-labelledby="programs-title">
        <h2 id="programs-title" className="block-title">
          {t.programsTitle}
        </h2>
        <ul className="rows">
          {content.programs.map((p) => (
            <li key={p.id}>
              <a className="row row-link" href={`#${ROUTES.program(p.id)}`}>
                <span>
                  <span className="row-title">{p.name}</span>
                  <span className="row-sub">{p.frequency}</span>
                </span>
                <span className="row-figure">{p.level}</span>
              </a>
            </li>
          ))}
        </ul>
      </section>

      <section className="block" aria-labelledby="library-title">
        <h2 id="library-title" className="block-title">
          {t.libraryTitle}
        </h2>
        <label htmlFor={searchId} className="sr-only">
          {t.searchExercise}
        </label>
        <input
          id={searchId}
          className="search"
          type="search"
          placeholder={t.searchExercise}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="chips" role="group" aria-label={t.filterLabel}>
          {[null, ...MUSCLE_GROUPS].map((g) => (
            <button
              key={g ?? "all"}
              type="button"
              className="chip"
              aria-pressed={group === g}
              onClick={() => setGroup(g)}
            >
              {g === null ? t.allGroups : t.groups[g]}
            </button>
          ))}
        </div>
        <p className="muted-text" aria-live="polite">
          {t.exerciseCount(list.length)}
        </p>
        {list.length === 0 ? (
          <p className="muted-text">{t.noExerciseFound}</p>
        ) : (
          <ul className="rows">
            {list.map((e) => (
              <li key={e.id}>
                <a className="row row-link" href={`#${ROUTES.exercise(e.id)}`}>
                  <ExerciseThumb id={e.id} />
                  <span className="row-title row-grow">{e.name}</span>
                  <span className="row-sub">{t.groups[e.group]}</span>
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
