import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "../App";
import { I18nProvider } from "../i18n";
import { progression } from "../workouts/stats";
import type { Workout } from "../workouts/types";

const DAY = 86_400_000;
const START = new Date("2026-09-01T16:00:00Z").getTime();

/** A finished workout on day `d` with the given [exerciseId, reps, kg, done] sets. */
const workout = (d: number, sets: [string, number, number, boolean][]): Workout => ({
  id: `w${d}`,
  startedAt: START + d * DAY,
  endedAt: START + d * DAY + 3_600_000,
  exercises: sets.map(([exerciseId, reps, weightKg, done], i) => ({
    id: `e${i}`,
    exerciseId,
    sets: [{ reps, weightKg, done }],
  })),
});

describe("progression d'un exercice", () => {
  it("suit le meilleur 1RM estimé par séance, de la plus ancienne à la plus récente", () => {
    const history = [
      workout(14, [["bench-press", 5, 70, true]]),
      workout(0, [["bench-press", 8, 60, true], ["bench-press", 3, 65, true]]),
      workout(7, [["bench-press", 5, 65, true], ["squat", 5, 100, true]]),
      workout(10, [["bench-press", 5, 90, false]]), // not done: ignored
    ];
    const p = progression(history, "bench-press");
    expect(p.metric).toBe("load");
    expect(p.points.map((x) => x.workoutId)).toEqual(["w0", "w7", "w14"]);
    expect(p.points[0].value).toBe(76); // 60 × (1 + 8/30) beats 65 × (1 + 3/30)
    expect(p.points[2].value).toBeCloseTo(81.67, 2);
  });

  it("compte les répétitions quand l'exercice se fait au poids du corps", () => {
    const p = progression(
      [workout(0, [["pull-up", 6, 0, true]]), workout(3, [["pull-up", 9, 0, true]])],
      "pull-up",
    );
    expect(p).toEqual({ metric: "reps", points: [expect.objectContaining({ value: 6 }), expect.objectContaining({ value: 9 })] });
  });

  it("garde les séances les plus récentes", () => {
    const many = Array.from({ length: 20 }, (_, d) => workout(d, [["bench-press", 5, 50 + d, true]]));
    const p = progression(many, "bench-press", 12);
    expect(p.points).toHaveLength(12);
    expect(p.points[11].workoutId).toBe("w19");
  });
});

describe("courbe sur l'écran d'un exercice", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("{}", { status: 503 })),
    );
    window.location.hash = "#/exercices/bench-press";
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
    window.location.hash = "";
  });

  const renderApp = () =>
    render(
      <I18nProvider>
        <App />
      </I18nProvider>,
    );

  it("montre le 1RM estimé actuel, l'écart et une courbe décrite", () => {
    localStorage.setItem(
      "affluence-gym.workouts",
      JSON.stringify([workout(14, [["bench-press", 1, 80, true]]), workout(0, [["bench-press", 1, 70, true]])]),
    );
    renderApp();
    expect(screen.getByText("1RM estimé : 80 kg")).toBeInTheDocument();
    expect(screen.getByText("+10 kg en 2 séances")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: /Progression sur 2 séances.*de 70 kg à 80 kg/ })).toBeInTheDocument();
  });

  it("annonce la courbe tant qu'il n'y a qu'une séance", () => {
    localStorage.setItem("affluence-gym.workouts", JSON.stringify([workout(0, [["bench-press", 5, 60, true]])]));
    renderApp();
    expect(screen.getByText("La courbe apparaît dès ta 2e séance avec cet exercice.")).toBeInTheDocument();
  });
});
