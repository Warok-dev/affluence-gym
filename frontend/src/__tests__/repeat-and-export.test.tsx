import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "../App";
import type { Trends } from "../api";
import { I18nProvider } from "../i18n";
import { trendsCsv } from "../trends";
import type { Workout } from "../workouts/types";

const past: Workout = {
  id: "w1",
  startedAt: new Date("2026-09-28T16:00:00Z").getTime(),
  endedAt: new Date("2026-09-28T17:00:00Z").getTime(),
  gym: "minto",
  exercises: [
    {
      id: "e1",
      exerciseId: "bench-press",
      sets: [
        { reps: 5, weightKg: 70, done: true },
        { reps: 5, weightKg: 72.5, done: true },
      ],
    },
    { id: "e2", exerciseId: "pull-up", sets: [{ reps: 8, weightKg: 0, done: true }] },
  ],
};

describe("refaire une séance", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("{}", { status: 503 })),
    );
    localStorage.setItem("affluence-gym.workouts", JSON.stringify([past]));
    window.location.hash = "#/seances/w1";
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

  it("démarre une séance avec les mêmes exercices, séries et charges, à cocher", async () => {
    const user = userEvent.setup();
    renderApp();
    await user.click(screen.getByRole("button", { name: "Refaire cette séance" }));

    expect(window.location.hash).toBe("#/seances/en-cours");
    const active = JSON.parse(localStorage.getItem("affluence-gym.active-workout")!) as Workout;
    expect(active.id).not.toBe("w1");
    expect(active.gym).toBe("minto");
    expect(active.exercises.map((e) => e.exerciseId)).toEqual(["bench-press", "pull-up"]);
    expect(active.exercises[0].sets).toEqual([
      { reps: 5, weightKg: 70, done: false },
      { reps: 5, weightKg: 72.5, done: false },
    ]);
    expect(await screen.findByRole("heading", { name: "Développé couché" })).toBeInTheDocument();
  });

  it("propose de terminer la séance en cours d'abord", () => {
    localStorage.setItem("affluence-gym.active-workout", JSON.stringify({ ...past, id: "live", endedAt: undefined }));
    renderApp();
    expect(screen.queryByRole("button", { name: "Refaire cette séance" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /séance en cours/i })).toHaveAttribute("href", "#/seances/en-cours");
  });
});

describe("export CSV de la semaine type", () => {
  const trends: Trends = {
    facility: "minto",
    weeks: 8,
    timezone: "America/Toronto",
    capacity: 120,
    days: [
      {
        weekday: 0,
        opening_hours: { open: "06:30", close: "23:00" },
        hours: [
          { hour: 6, level: 1.25, samples: 8, people: 12.5 },
          { hour: 7, level: null, samples: 0, people: null },
        ],
      },
      { weekday: 6, opening_hours: null, hours: [] },
    ],
  };

  it("une ligne par heure d'ouverture, nombres à la française, lisible par Excel", () => {
    const csv = trendsCsv(
      trends,
      'Minto "A"',
      ["salle", "jour", "heure", "niveau", "personnes", "relevés"],
      (d) => ["lundi", "", "", "", "", "", "dimanche"][d],
      (n) => n.toLocaleString("fr-CA", { useGrouping: false }),
    );
    expect(csv.startsWith("﻿")).toBe(true);
    expect(csv.slice(1).split("\r\n")).toEqual([
      "salle;jour;heure;niveau;personnes;relevés",
      '"Minto ""A""";lundi;6;1,25;12,5;8',
      '"Minto ""A""";lundi;7;;;0',
      "",
    ]);
  });
});
