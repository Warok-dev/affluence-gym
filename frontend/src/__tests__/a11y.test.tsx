import { render, screen } from "@testing-library/react";
import axe from "axe-core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "../App";
import { I18nProvider, type Locale } from "../i18n";
import type { Workout } from "../workouts/types";

// Automated accessibility check of every screen (axe-core, WCAG 2.x A and AA rules).
// Colour contrast is left out: jsdom does not compute styles; it is checked by hand in DESIGN.md.

const NOW = new Date("2026-10-01T18:00:00Z").getTime(); // Thursday 14:00 in Toronto
const nowSec = NOW / 1000;

const occupancy = (facility: string, people: number, level: number) => ({
  facility,
  level,
  label: "",
  reports: 0,
  last_report_ts: null,
  source: "official",
  people,
  capacity: 120,
  estimated: false,
  updated_ts: nowSec - 30,
});
const hours = Array.from({ length: 17 }, (_, i) => ({ hour: 6 + i, level: 1 + (i % 4), samples: 8, calm: i % 4 < 2 }));
const profile = (facility: string) => ({
  facility,
  weekday: 3,
  weeks: 8,
  timezone: "America/Toronto",
  opening_hours: { open: "06:30", close: "23:00" },
  hours,
});
const trends = (facility: string) => ({
  facility,
  weeks: 8,
  timezone: "America/Toronto",
  capacity: 120,
  days: Array.from({ length: 7 }, (_, weekday) => ({
    weekday,
    opening_hours: { open: "06:30", close: "23:00" },
    hours: hours.map((h) => ({ hour: h.hour, level: h.level, samples: 8, people: h.level * 25 })),
  })),
});
const equipment = (facility: string) => ({
  facility,
  window_days: 7,
  machines: [
    { id: "treadmill-1", name: "Tapis de course 1", category: "cardio", status: "broken", since_ts: nowSec - 3600, reports: 1 },
    { id: "bench-1", name: "Banc 1", category: "free-weights", status: "unknown", since_ts: null, reports: 0 },
  ],
});

const RESPONSES: [RegExp, (m: RegExpMatchArray) => unknown][] = [
  [/\/health$/, () => ({ status: "ok", demo: true })],
  [/\/notifications\/config$/, () => ({ enabled: true, public_key: "BPublicKey" })],
  [/\/occupancy\/(\w+)$/, (m) => occupancy(m[1], m[1] === "minto" ? 94 : 41, m[1] === "minto" ? 4 : 2)],
  [/\/profile\/(\w+)$/, (m) => profile(m[1])],
  [/\/forecast\/(\w+)$/, (m) => ({ facility: m[1], available: false, hours: [], next_calm: null })],
  [/\/trends\/(\w+)$/, (m) => trends(m[1])],
  [/\/equipment\/(\w+)$/, (m) => equipment(m[1])],
];

const benchWorkout = (d: number, kg: number): Workout => ({
  id: `w${d}`,
  startedAt: NOW - d * 86_400_000,
  endedAt: NOW - d * 86_400_000 + 3_600_000,
  exercises: [{ id: "e1", exerciseId: "bench-press", sets: [{ reps: 5, weightKg: kg, done: true }] }],
});

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      for (const [pattern, body] of RESPONSES) {
        const m = url.match(pattern);
        if (m) return new Response(JSON.stringify(body(m)));
      }
      return new Response("{}", { status: 404 });
    }),
  );
  localStorage.setItem("affluence-gym.workouts", JSON.stringify([benchWorkout(2, 65), benchWorkout(9, 60)]));
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  localStorage.clear();
  window.location.hash = "";
});

async function violations(route: string, ready: () => Promise<unknown>, locale: Locale = "fr") {
  window.location.hash = route;
  const { container } = render(
    <I18nProvider locale={locale}>
      <App />
    </I18nProvider>,
  );
  await ready();
  const result = await axe.run(container, {
    runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "best-practice"] },
    rules: { "color-contrast": { enabled: false }, region: { enabled: false } },
  });
  return result.violations.map((v) => `${v.id}: ${v.help} (${v.nodes.map((n) => n.target.join(" ")).join(", ")})`);
}

describe("accessibilité (axe-core)", () => {
  const screens: [string, string, () => Promise<unknown>][] = [
    ["affluence", "#/", () => screen.findByText(/94/)],
    ["semaine type", "#/tendances/minto", () => screen.findByRole("table")],
    ["séances", "#/seances", () => screen.findByRole("button", { name: /Commencer/ })],
    ["détail d'une séance", "#/seances/w2", () => screen.findByRole("heading", { level: 2 })],
    ["bibliothèque", "#/exercices", () => screen.findByRole("searchbox")],
    ["fiche d'exercice", "#/exercices/bench-press", () => screen.findByRole("img", { name: /Progression/ })],
    ["programme", "#/programmes/force-5x5", () => screen.findByRole("heading", { name: /5 × 5/ })],
    ["matériel", "#/equipements", () => screen.findByText(/Tapis de course 1/)],
    ["mode écran", "#/ecran", () => screen.findByRole("img", { name: /QR/ })],
    ["à propos", "#/a-propos", () => screen.findByRole("heading", { name: "À propos" })],
  ];

  it.each(screens)("%s : aucune violation", async (_name, route, ready) => {
    expect(await violations(route, ready)).toEqual([]);
  });

  it("séance en cours : aucune violation", async () => {
    localStorage.setItem(
      "affluence-gym.active-workout",
      JSON.stringify({ ...benchWorkout(0, 70), id: "live", endedAt: undefined }),
    );
    expect(await violations("#/seances/en-cours", () => screen.findByRole("heading", { name: "Développé couché" }))).toEqual([]);
  });

  it("version anglaise : aucune violation", async () => {
    expect(await violations("#/", () => screen.findByText(/94/), "en")).toEqual([]);
  });
});
