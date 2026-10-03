import { act, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "../App";
import type { Occupancy, Profile } from "../api";
import { I18nProvider } from "../i18n";
import { quieterIndex } from "../levels";

// 14:00 in Toronto: both gyms open (6 h – 22 h).
const NOW = new Date("2026-10-01T18:00:00Z").getTime();
const nowSec = NOW / 1000;

const official = (facility: string, people: number, level: 1 | 2 | 3 | 4): Occupancy => ({
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
const profile = (facility: string): Profile => ({
  facility,
  weekday: 3,
  weeks: 8,
  timezone: "America/Toronto",
  opening_hours: { open: "06:00", close: "22:00" },
  hours: [],
});

let failing: boolean;

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date", "setInterval", "clearInterval"] });
  vi.setSystemTime(NOW);
  failing = false;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      if (failing) throw new TypeError("network down");
      if (url.endsWith("/health")) return new Response(JSON.stringify({ status: "ok", demo: true }));
      if (url.endsWith("/occupancy/minto")) return new Response(JSON.stringify(official("minto", 94, 4)));
      if (url.endsWith("/occupancy/montpetit")) return new Response(JSON.stringify(official("montpetit", 41, 2)));
      if (url.endsWith("/profile/minto")) return new Response(JSON.stringify(profile("minto")));
      if (url.endsWith("/profile/montpetit")) return new Response(JSON.stringify(profile("montpetit")));
      return new Response("{}", { status: 404 });
    }),
  );
  window.location.hash = "#/ecran";
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

describe("mode écran", () => {
  it("affiche le nombre de personnes des deux salles, sans onglets ni boutons de signalement", async () => {
    renderApp();
    const minto = await screen.findByRole("region", { name: /^Minto : 94 personnes · Bondé/ });
    expect(within(minto).getByText("sur 120 places")).toBeInTheDocument();
    expect(within(minto).getByText("Ouvert jusqu'à 22 h")).toBeInTheDocument();
    expect(screen.getByRole("region", { name: /^Montpetit : 41 personnes · Calme/ })).toBeInTheDocument();

    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Signaler/ })).not.toBeInTheDocument();
  });

  it("met en avant la salle la plus calme et signale les chiffres fictifs", async () => {
    renderApp();
    const montpetit = await screen.findByRole("region", { name: /^Montpetit/ });
    expect(within(montpetit).getByText("Plus calme")).toBeInTheDocument();
    expect(within(screen.getByRole("region", { name: /^Minto/ })).queryByText("Plus calme")).not.toBeInTheDocument();
    expect(await screen.findByTestId("demo-banner")).toBeInTheDocument();
  });

  it("montre un code QR vers l'application et une sortie discrète", async () => {
    renderApp();
    const qr = await screen.findByRole("img", { name: "Code QR menant à l'application" });
    expect(qr.getAttribute("data-url")).toBe(`${window.location.origin}${window.location.pathname}`);
    expect(qr.querySelector("path")?.getAttribute("d")).toMatch(/^M\d+ \d+h1v1h-1z/);
    expect(screen.getByRole("link", { name: "Quitter le mode écran" })).toHaveAttribute("href", "#/");
  });

  it("garde les derniers chiffres et le dit quand la connexion tombe", async () => {
    renderApp();
    await screen.findByRole("region", { name: /^Minto : 94/ });
    expect(screen.getByRole("status")).toHaveTextContent("Mis à jour à l'instant");

    failing = true;
    await act(async () => {
      vi.advanceTimersByTime(30_000);
    });
    expect(await screen.findByText("Connexion perdue, nouvel essai automatique…")).toBeInTheDocument();
    expect(screen.getByRole("region", { name: /^Minto : 94/ })).toBeInTheDocument();
  });

  it("alterne le français et l'anglais sans toucher aux chiffres", async () => {
    renderApp();
    await screen.findByRole("region", { name: /^Minto : 94 personnes · Bondé/ });
    expect(screen.getByTestId("kiosk")).toHaveAttribute("lang", "fr");

    await act(async () => {
      vi.advanceTimersByTime(12_000);
    });
    expect(screen.getByRole("region", { name: /^Minto: 94 people · Packed/ })).toBeInTheDocument();
    expect(screen.getByText("Gym occupancy in your pocket")).toBeInTheDocument();
    expect(screen.getByTestId("kiosk")).toHaveAttribute("lang", "en");

    await act(async () => {
      vi.advanceTimersByTime(12_000);
    });
    expect(screen.getByRole("region", { name: /^Minto : 94 personnes/ })).toBeInTheDocument();
  });

  it("est accessible depuis le pied de page de l'écran d'affluence", async () => {
    window.location.hash = "";
    renderApp();
    expect(await screen.findByRole("link", { name: "Mode écran (télé à l'entrée)" })).toHaveAttribute(
      "href",
      "#/ecran",
    );
  });
});

describe("salle la plus calme", () => {
  const crowd = (level: 1 | 2 | 3 | 4): Occupancy => ({
    facility: "x",
    level,
    label: "",
    reports: 3,
    last_report_ts: nowSec,
  });

  it("compare les taux d'occupation quand les deux salles ont un compteur, avec une marge de 5 points", () => {
    expect(quieterIndex([official("a", 60, 3), official("b", 40, 2)], [true, true])).toBe(1);
    expect(quieterIndex([official("a", 60, 3), official("b", 57, 3)], [true, true])).toBeNull();
  });

  it("compare les niveaux sinon, et ignore une salle fermée", () => {
    expect(quieterIndex([crowd(2), crowd(4)], [true, true])).toBe(0);
    expect(quieterIndex([crowd(3), crowd(3)], [true, true])).toBeNull();
    expect(quieterIndex([crowd(1), crowd(4)], [false, true])).toBeNull();
  });
});
