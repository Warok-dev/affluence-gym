import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "../App";
import type { TrendDay, Trends } from "../api";
import { I18nProvider } from "../i18n";
import { weekExtremes, weekHours } from "../trends";

// Thursday 2026-10-01, 14:00 in Toronto.
const NOW = new Date("2026-10-01T18:00:00Z").getTime();

const day = (weekday: number, levels: Record<number, number>, people?: Record<number, number>): TrendDay => ({
  weekday,
  opening_hours: { open: "06:30", close: "23:00" },
  hours: Array.from({ length: 17 }, (_, i) => {
    const hour = 6 + i;
    const level = levels[hour] ?? null;
    return { hour, level, samples: level === null ? 0 : 8, people: people?.[hour] ?? null };
  }),
});
const closed = (weekday: number): TrendDay => ({ weekday, opening_hours: null, hours: [] });

const trends = (facility: string, days: TrendDay[]): Trends => ({
  facility,
  weeks: 8,
  timezone: "America/Toronto",
  capacity: 120,
  days,
});

const MINTO = trends("minto", [
  day(0, { 8: 1.2, 18: 3.9 }, { 18: 104 }),
  day(1, { 8: 1.5, 18: 3.9 }, { 18: 98 }),
  day(2, { 14: 2.5 }),
  day(3, { 14: 3.0 }),
  day(4, {}),
  day(5, {}),
  closed(6),
]);

let failing: boolean;

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
  failing = false;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      if (failing) throw new TypeError("network down");
      if (url.endsWith("/trends/minto")) return new Response(JSON.stringify(MINTO));
      if (url.endsWith("/trends/montpetit")) return new Response(JSON.stringify(trends("montpetit", [day(0, {})])));
      return new Response("{}", { status: 503 });
    }),
  );
  window.location.hash = "#/tendances/minto";
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  window.location.hash = "";
});

const renderApp = () =>
  render(
    <I18nProvider>
      <App />
    </I18nProvider>,
  );

describe("semaine type", () => {
  it("dessine la grille jour × heure et nomme les créneaux extrêmes", async () => {
    renderApp();
    expect(await screen.findByText("Le plus calme : lundi vers 8 h")).toBeInTheDocument();
    expect(screen.getByText("Le plus chargé : lundi vers 18 h (≈ 104 personnes)")).toBeInTheDocument();
    expect(screen.getByText("Moyenne des 8 dernières semaines")).toBeInTheDocument();

    const table = screen.getByRole("table", { name: "Affluence moyenne de Minto par jour et par heure" });
    const rows = within(table).getAllByRole("row");
    expect(rows).toHaveLength(1 + 17); // header + 6 h … 22 h
    const six = rows.find((r) => within(r).queryByRole("rowheader", { name: "18 h" }))!;
    const cells = within(six).getAllByRole("cell");
    expect(cells[0]).toHaveTextContent("Bondé, ≈ 104 personnes");
    expect(cells[0]).toHaveClass("lvl-4");
    expect(cells[4]).toHaveTextContent("Pas de données");
    expect(cells[6]).toHaveTextContent("Fermé");

    const eight = rows.find((r) => within(r).queryByRole("rowheader", { name: "8 h" }))!;
    expect(within(eight).getAllByRole("cell")[0]).toHaveClass("is-best");
    // Thursday 14 h is "now" (red frame).
    const two = rows.find((r) => within(r).queryByRole("rowheader", { name: "14 h" }))!;
    expect(within(two).getAllByRole("cell")[3]).toHaveClass("is-now");
  });

  it("passe d'une salle à l'autre et dit quand l'historique manque", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderApp();
    await screen.findByRole("table");
    await user.click(screen.getByRole("tab", { name: "Montpetit" }));
    expect(await screen.findByText("Pas encore assez d'historique pour dessiner la semaine type.")).toBeInTheDocument();
    expect(window.location.hash).toBe("#/tendances/montpetit");
  });

  it("propose de réessayer si le serveur ne répond pas", async () => {
    failing = true;
    renderApp();
    expect(await screen.findByRole("alert")).toHaveTextContent("Semaine type indisponible pour le moment.");
    failing = false;
    await userEvent.setup({ advanceTimers: vi.advanceTimersByTime }).click(screen.getByRole("button", { name: /Réessayer/ }));
    expect(await screen.findByRole("table")).toBeInTheDocument();
  });

  it("est accessible depuis « Quand y aller aujourd'hui »", async () => {
    window.location.hash = "";
    renderApp();
    expect(await screen.findByRole("link", { name: "Voir la semaine type" })).toHaveAttribute("href", "#/tendances/minto");
  });
});

describe("créneaux extrêmes", () => {
  it("ignore les heures trop peu échantillonnées et une semaine plate", () => {
    const thin = trends("x", [
      { weekday: 0, opening_hours: null, hours: [{ hour: 8, level: 1, samples: 1, people: null }, { hour: 9, level: 3, samples: 4, people: null }, { hour: 10, level: 2, samples: 4, people: null }] },
    ]);
    expect(weekExtremes(thin).quietest?.hour).toBe(10);
    expect(weekExtremes(thin).busiest?.hour).toBe(9);

    const flat = trends("x", [day(0, { 8: 2, 9: 2 })]);
    expect(weekExtremes(flat)).toEqual({ quietest: null, busiest: null });
  });

  it("réunit les heures d'ouverture de tous les jours", () => {
    const t = trends("x", [
      { weekday: 0, opening_hours: null, hours: [{ hour: 9, level: null, samples: 0, people: null }] },
      { weekday: 1, opening_hours: null, hours: [{ hour: 7, level: null, samples: 0, people: null }] },
    ]);
    expect(weekHours(t)).toEqual([7, 9]);
  });
});
