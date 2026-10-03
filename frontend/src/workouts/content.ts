// Workout content in the app's language. French is the source; English overrides by id
// and falls back to French for anything not translated.

import { useMemo } from "react";
import { useLocale, type Locale } from "../i18n";
import { EXERCISE_NAMES_EN, GUIDES_EN, MACHINE_NAMES_EN, PROGRAMS_EN } from "./content-en";
import { EXERCISES, searchExercises, type Exercise } from "./exercises";
import { GUIDES, type ExerciseGuide } from "./guide";
import { PROGRAMS, type Program } from "./programs";

export interface Content {
  exercises: readonly Exercise[];
  exercise: (id: string) => Exercise | undefined;
  /** Display name of a catalog exercise, or the raw id for an unknown one. */
  exerciseName: (id: string) => string;
  search: (query: string) => Exercise[];
  guide: (id: string) => ExerciseGuide | undefined;
  programs: readonly Program[];
  program: (id: string) => Program | undefined;
  /** Name of a gym machine; `apiName` is the French name the API serves. */
  machineName: (id: string, apiName: string) => string;
}

function build(locale: Locale): Content {
  const en = locale === "en";
  const exercises = en ? EXERCISES.map((e) => ({ ...e, name: EXERCISE_NAMES_EN[e.id] ?? e.name })) : EXERCISES;
  const byId = new Map(exercises.map((e) => [e.id, e]));
  const programs = en
    ? PROGRAMS.map((p) => {
        const text = PROGRAMS_EN[p.id];
        if (!text) return p;
        return {
          ...p,
          name: text.name,
          level: text.level,
          frequency: text.frequency,
          summary: text.summary,
          days: p.days.map((d) => ({ ...d, name: text.days[d.id] ?? d.name })),
        };
      })
    : PROGRAMS;

  return {
    exercises,
    exercise: (id) => byId.get(id),
    exerciseName: (id) => byId.get(id)?.name ?? id,
    search: (query) => searchExercises(query, exercises),
    guide: (id) => (en ? (GUIDES_EN[id] ?? GUIDES[id]) : GUIDES[id]),
    programs,
    program: (id) => programs.find((p) => p.id === id),
    machineName: (id, apiName) => {
      if (!en) return apiName;
      const [, prefix, n] = id.match(/^(.*?)(?:-(\d+))?$/) ?? [];
      const name = MACHINE_NAMES_EN[prefix];
      if (!name) return apiName;
      // The API numbers machines only when a gym has several of a kind ("Tapis de course 2").
      return n && apiName.endsWith(` ${n}`) ? `${name} ${n}` : name;
    },
  };
}

const CACHE = new Map<Locale, Content>();

export function contentFor(locale: Locale): Content {
  let content = CACHE.get(locale);
  if (!content) {
    content = build(locale);
    CACHE.set(locale, content);
  }
  return content;
}

export function useContent(): Content {
  const { locale } = useLocale();
  return useMemo(() => contentFor(locale), [locale]);
}
