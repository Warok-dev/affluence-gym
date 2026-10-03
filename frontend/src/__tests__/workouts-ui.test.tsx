import { act, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "../App";
import { I18nProvider } from "../i18n";
import { makeBackup } from "../workouts/store";
import type { Workout } from "../workouts/types";

const NOW = new Date("2026-10-01T18:00:00Z").getTime();

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date", "setInterval", "clearInterval"] });
  vi.setSystemTime(NOW);
  // The occupancy screen is not under test here: answer every API call with "no data".
  vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 503 })));
  window.location.hash = "#/seances";
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  window.location.hash = "";
});

const setup = () => userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

function renderApp() {
  return render(
    <I18nProvider>
      <App />
    </I18nProvider>,
  );
}

const saved = (): Workout[] => JSON.parse(localStorage.getItem("affluence-gym.workouts") ?? "[]");

async function addExercise(user: ReturnType<typeof setup>, query: string, name: string) {
  await user.click(screen.getByRole("button", { name: "Ajouter un exercice" }));
  await user.type(screen.getByRole("searchbox", { name: "Rechercher un exercice" }), query);
  await user.click(screen.getByRole("button", { name }));
}

describe("séances", () => {
  it("montre un état vide clair et l'avertissement de sauvegarde locale", () => {
    renderApp();
    expect(screen.getByText(/Aucune séance enregistrée pour l'instant/)).toBeInTheDocument();
    expect(screen.getByText(/uniquement sur ce téléphone, jamais sur un serveur/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Exporter une sauvegarde" })).toBeDisabled();
    expect(screen.getByRole("link", { name: /Séances/ })).toHaveAttribute("aria-current", "page");
  });

  it("enregistre une séance complète : exercice, séries, repos, fin", async () => {
    const user = setup();
    renderApp();
    await user.click(screen.getByRole("button", { name: "Commencer une séance" }));
    expect(window.location.hash).toBe("#/seances/en-cours");
    expect(screen.getByText("Séance en cours")).toBeInTheDocument();

    await addExercise(user, "couché", "Développé couché");
    expect(screen.getByText("Première fois : choisis une charge confortable.")).toBeInTheDocument();
    const reps = screen.getByRole("spinbutton", { name: "Série 1 · Rép." });
    const load = screen.getByRole("spinbutton", { name: "Série 1 · Charge (kg)" });
    await user.clear(reps);
    await user.type(reps, "8");
    await user.clear(load);
    await user.type(load, "60");

    await user.click(screen.getByRole("checkbox", { name: "Série 1 faite" }));
    expect(screen.getByRole("timer", { name: "Repos restant : 1:30" })).toBeInTheDocument();
    await act(async () => {
      vi.advanceTimersByTime(30_000);
    });
    expect(screen.getByRole("timer", { name: "Repos restant : 1:00" })).toBeInTheDocument();

    // A new set copies the previous one; left unchecked, it is not saved.
    await user.click(screen.getByRole("button", { name: "Ajouter une série" }));
    expect(screen.getByRole("spinbutton", { name: "Série 2 · Charge (kg)" })).toHaveValue(60);

    await user.click(screen.getByRole("button", { name: "Terminer" }));
    expect(screen.getByText(/Les séries non cochées ne seront pas enregistrées/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Oui, terminer" }));

    expect(window.location.hash).toMatch(/^#\/seances\/[\w-]+$/);
    expect(screen.getByText("1 × 8 · 60 kg")).toBeInTheDocument();
    expect(saved()).toHaveLength(1);
    expect(saved()[0].exercises[0].sets).toEqual([{ reps: 8, weightKg: 60, done: true }]);
    expect(localStorage.getItem("affluence-gym.active-workout")).toBeNull();

    await user.click(screen.getByRole("link", { name: "Toutes les séances" }));
    const history = screen.getByRole("region", { name: "Historique" });
    expect(within(history).getByText("1 exercice · 1 série")).toBeInTheDocument();
    expect(within(screen.getByRole("region", { name: "Records" })).getByText("60 kg × 8")).toBeInTheDocument();
  });

  it("n'écrase aucune série quand on coche vite plusieurs séries", async () => {
    const user = setup();
    renderApp();
    await user.click(screen.getByRole("button", { name: "Commencer une séance" }));
    await addExercise(user, "squat", "Squat");
    await user.click(screen.getByRole("button", { name: "Ajouter une série" }));
    const boxes = screen.getAllByRole("checkbox");
    act(() => {
      boxes.forEach((box) => fireEvent.click(box));
    });
    expect(screen.getAllByRole("checkbox").map((b) => b.getAttribute("aria-checked"))).toEqual(["true", "true"]);
  });

  it("préremplit avec la dernière performance et l'affiche", async () => {
    const user = setup();
    const previous: Workout = {
      id: "old",
      startedAt: NOW - 86_400_000,
      endedAt: NOW - 86_000_000,
      exercises: [{ id: "e", exerciseId: "bench-press", sets: [{ reps: 5, weightKg: 80, done: true }] }],
    };
    localStorage.setItem("affluence-gym.workouts", JSON.stringify([previous]));
    renderApp();
    await user.click(screen.getByRole("button", { name: "Commencer une séance" }));
    await addExercise(user, "couché", "Développé couché");
    expect(screen.getByText("Dernière fois : 1 × 5 · 80 kg")).toBeInTheDocument();
    expect(screen.getByRole("spinbutton", { name: "Série 1 · Charge (kg)" })).toHaveValue(80);
  });

  it("affiche les charges en livres quand on choisit lb", async () => {
    const user = setup();
    localStorage.setItem(
      "affluence-gym.workouts",
      JSON.stringify([
        {
          id: "w",
          startedAt: NOW - 7_200_000,
          endedAt: NOW - 3_600_000,
          exercises: [{ id: "e", exerciseId: "back-squat", sets: [{ reps: 5, weightKg: 100, done: true }] }],
        },
      ]),
    );
    renderApp();
    await user.click(screen.getByRole("radio", { name: "lb" }));
    expect(within(screen.getByRole("region", { name: "Records" })).getByText("220,5 lb × 5")).toBeInTheDocument();
  });

  it("permet d'abandonner une séance sans rien enregistrer", async () => {
    const user = setup();
    renderApp();
    await user.click(screen.getByRole("button", { name: "Commencer une séance" }));
    expect(screen.getByRole("link", { name: /Séances/ })).toHaveTextContent("en cours");
    await user.click(screen.getByRole("button", { name: "Abandonner la séance" }));
    await user.click(screen.getByRole("button", { name: "Oui, abandonner" }));
    expect(window.location.hash).toBe("#/seances");
    expect(saved()).toHaveLength(0);
  });

  it("supprime une séance après confirmation", async () => {
    const user = setup();
    localStorage.setItem(
      "affluence-gym.workouts",
      JSON.stringify([{ id: "w1", startedAt: NOW - 7_200_000, endedAt: NOW - 3_600_000, exercises: [] }]),
    );
    window.location.hash = "#/seances/w1";
    renderApp();
    await user.click(screen.getByRole("button", { name: "Supprimer la séance" }));
    await user.click(screen.getByRole("button", { name: "Oui, supprimer" }));
    expect(saved()).toHaveLength(0);
    expect(window.location.hash).toBe("#/seances");
  });

  it("importe une sauvegarde valide et refuse un mauvais fichier", async () => {
    const user = setup();
    renderApp();
    const backup = makeBackup(
      [{ id: "imp", startedAt: NOW - 7_200_000, endedAt: NOW - 3_600_000, exercises: [] }],
      { unit: "kg", restSeconds: 90 },
    );
    const input = screen.getByTestId("import-input");
    await user.upload(input, new File([JSON.stringify(backup)], "sauvegarde.json", { type: "application/json" }));
    expect(await screen.findByText("1 séance ajoutée.")).toBeInTheDocument();
    expect(saved().map((w) => w.id)).toEqual(["imp"]);

    await user.upload(input, new File(["n'importe quoi"], "x.json", { type: "application/json" }));
    expect(await screen.findByText("Ce fichier n'est pas une sauvegarde Affluence Gym valide.")).toBeInTheDocument();
  });

  it("garde la séance en cours après un rechargement", async () => {
    const user = setup();
    const { unmount } = renderApp();
    await user.click(screen.getByRole("button", { name: "Commencer une séance" }));
    await addExercise(user, "tract", "Tractions");
    unmount();
    renderApp();
    expect(screen.getByRole("heading", { name: "Tractions" })).toBeInTheDocument();
  });
});
