import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "../App";
import { I18nProvider } from "../i18n";
import { EXERCISES, getExercise } from "../workouts/exercises";
import { GUIDES } from "../workouts/guide";
import { PROGRAMS } from "../workouts/programs";
import type { Workout } from "../workouts/types";

const NOW = new Date("2026-10-01T18:00:00Z").getTime();

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date", "setInterval", "clearInterval"] });
  vi.setSystemTime(NOW);
  vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 503 })));
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  window.location.hash = "";
});

const setup = () => userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

function renderAt(hash: string) {
  window.location.hash = hash;
  return render(
    <I18nProvider>
      <App />
    </I18nProvider>,
  );
}

const benchSession: Workout = {
  id: "w-bench",
  startedAt: NOW - 86_400_000,
  endedAt: NOW - 86_000_000,
  exercises: [
    { id: "e", exerciseId: "bench-press", sets: [{ reps: 5, weightKg: 82.5, done: true }] },
    { id: "f", exerciseId: "back-squat", sets: [{ reps: 5, weightKg: 100, done: true }] },
  ],
};

describe("contenu", () => {
  it("chaque exercice a une fiche complète", () => {
    for (const e of EXERCISES) {
      const guide = GUIDES[e.id];
      expect(guide, e.id).toBeDefined();
      expect(guide.steps.length, e.id).toBeGreaterThanOrEqual(3);
      expect(guide.tip.length, e.id).toBeGreaterThan(10);
    }
    expect(Object.keys(GUIDES).sort()).toEqual(EXERCISES.map((e) => e.id).sort());
  });

  it("les programmes ne citent que des exercices existants, avec des séries plausibles", () => {
    for (const p of PROGRAMS) {
      for (const day of p.days) {
        for (const item of day.items) {
          expect(getExercise(item.exerciseId), `${p.id}/${item.exerciseId}`).toBeDefined();
          expect(item.sets).toBeGreaterThanOrEqual(1);
          expect(item.reps).toBeGreaterThanOrEqual(1);
        }
      }
    }
  });
});

describe("bibliothèque", () => {
  it("liste les programmes puis les exercices, filtrables par groupe et par recherche", async () => {
    const user = setup();
    renderAt("#/exercices");
    expect(screen.getByRole("link", { name: /Exercices/ })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: /Débutant : corps entier/ })).toBeInTheDocument();
    expect(screen.getByText(`${EXERCISES.length} exercices`)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Dos" }));
    expect(screen.getByRole("button", { name: "Dos" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("5 exercices")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Squat/ })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Tous" }));
    await user.type(screen.getByRole("searchbox"), "curl");
    expect(screen.getByText("4 exercices")).toBeInTheDocument(); // 3 biceps curls + leg curl
  });

  it("montre la fiche d'un exercice avec ton record et tes séances", () => {
    localStorage.setItem("affluence-gym.workouts", JSON.stringify([benchSession]));
    renderAt("#/exercices/bench-press");
    expect(screen.getByRole("heading", { name: "Développé couché" })).toBeInTheDocument();
    expect(screen.getByText("Barre et banc plat")).toBeInTheDocument();
    expect(screen.getAllByRole("listitem").length).toBeGreaterThan(3);
    expect(screen.getByText(/En cas de douleur/)).toBeInTheDocument();
    expect(screen.getByText("82,5 kg × 5")).toBeInTheDocument();
    expect(screen.getByText("1 × 5 · 82.5 kg".replace("82.5", "82,5"))).toBeInTheDocument();
  });

  it("ajoute l'exercice à la séance en cours", async () => {
    const user = setup();
    localStorage.setItem(
      "affluence-gym.active-workout",
      JSON.stringify({ id: "live", startedAt: NOW - 600_000, exercises: [] }),
    );
    renderAt("#/exercices/pull-up");
    await user.click(screen.getByRole("button", { name: "Ajouter à la séance en cours" }));
    expect(screen.getByRole("status")).toHaveTextContent("Ajouté à la séance en cours.");
    const active = JSON.parse(localStorage.getItem("affluence-gym.active-workout")!);
    expect(active.exercises.map((e: { exerciseId: string }) => e.exerciseId)).toEqual(["pull-up"]);
  });

  it("indique un exercice inconnu", () => {
    renderAt("#/exercices/inconnu");
    expect(screen.getByText("Cet exercice n'existe pas.")).toBeInTheDocument();
  });
});

describe("programmes", () => {
  it("lance un jour de programme prérempli avec les dernières charges", async () => {
    const user = setup();
    localStorage.setItem("affluence-gym.workouts", JSON.stringify([benchSession]));
    renderAt("#/programmes/force-5x5");
    expect(screen.getByRole("heading", { name: "Force : 5 × 5" })).toBeInTheDocument();
    const dayA = screen.getByRole("region", { name: "Séance A" });
    expect(within(dayA).getAllByText("5 × 5")).toHaveLength(3);

    await user.click(within(dayA).getByRole("button", { name: "Commencer « Séance A »" }));
    expect(window.location.hash).toBe("#/seances/en-cours");
    expect(screen.getByRole("heading", { name: "Squat" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Développé couché" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Rowing barre" })).toBeInTheDocument();
    expect(screen.getByRole("spinbutton", { name: "Squat · Série 5 · Charge (kg)" })).toBeInTheDocument();
    const active = JSON.parse(localStorage.getItem("affluence-gym.active-workout")!);
    const bench = active.exercises.find((e: { exerciseId: string }) => e.exerciseId === "bench-press");
    expect(bench.sets).toHaveLength(5);
    expect(bench.sets[0]).toEqual({ reps: 5, weightKg: 82.5, done: false });
  });

  it("ne lance pas un programme par-dessus une séance en cours", () => {
    localStorage.setItem(
      "affluence-gym.active-workout",
      JSON.stringify({ id: "live", startedAt: NOW - 600_000, exercises: [] }),
    );
    renderAt("#/programmes/poids-du-corps");
    expect(screen.getByText(/Une séance est déjà en cours/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Commencer « Séance unique »" })).toBeDisabled();
  });
});
