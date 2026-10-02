import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "../App";
import type { Forecast, Occupancy, Profile } from "../api";
import { REFRESH_MS } from "../config";
import { I18nProvider } from "../i18n";

const NOW = new Date("2026-10-01T18:00:00Z").getTime();
const nowSec = NOW / 1000;

const occupancy: Record<string, Occupancy> = {
  minto: { facility: "minto", level: 3, label: "Modéré", reports: 4, last_report_ts: nowSec - 5 * 60 },
  montpetit: { facility: "montpetit", level: null, label: "Pas de données", reports: 0, last_report_ts: null },
};

// Typical Thursday at Minto (NOW is 14:00 in Toronto): calm at 16 h and 21 h.
const profile = (facility: string): Profile => ({
  facility,
  weekday: 3,
  weeks: 8,
  timezone: "America/Toronto",
  opening_hours: { open: "06:30", close: "23:00" },
  hours: Array.from({ length: 17 }, (_, i) => {
    const hour = 6 + i;
    if (facility === "montpetit") return { hour, level: null, samples: 0, calm: false };
    const calm = hour === 16 || hour === 21 || hour === 8;
    return { hour, level: calm ? 1.5 : 3, samples: 4, calm };
  }),
});

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

const unavailableForecast = (facility: string): Forecast => ({
  facility,
  available: false,
  model: null,
  trained_at: null,
  training_samples: 0,
  validation_mae: {},
  timezone: "America/Toronto",
  hours: [],
  next_calm: null,
});
let forecastFor: (facility: string) => Forecast = unavailableForecast;

let reportStatus = 201;
let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date", "setInterval", "clearInterval"] });
  vi.setSystemTime(NOW);
  reportStatus = 201;
  forecastFor = unavailableForecast;
  fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    if (init?.method === "POST") return json({ status: "ok" }, reportStatus);
    const facility = url.split("/").pop()!;
    if (url.includes("/profile/")) return json(profile(facility));
    if (url.includes("/forecast/")) return json(forecastFor(facility));
    return json(occupancy[facility]);
  });
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

function renderApp() {
  return render(
    <I18nProvider>
      <App />
    </I18nProvider>,
  );
}

const occupancyCalls = () => fetchMock.mock.calls.filter(([url]) => String(url).includes("/occupancy/")).length;

describe("affichage", () => {
  it("affiche une carte par salle avec niveau, signalements et « il y a X min »", async () => {
    renderApp();
    const minto = screen.getByTestId("card-minto");
    expect(await within(minto).findByText("Modéré")).toBeInTheDocument();
    expect(within(minto).getByRole("heading", { name: "Minto" })).toBeInTheDocument();
    expect(within(minto).getByText(/4 signalements récents/)).toBeInTheDocument();
    expect(within(minto).getByText(/Dernier signalement il y a 5 min/)).toBeInTheDocument();
    expect(screen.getByTestId("level-minto")).toHaveClass("level-3");
  });

  it("affiche « Pas de données » quand une salle n'a aucun signalement", async () => {
    renderApp();
    const montpetit = screen.getByTestId("card-montpetit");
    expect(await within(montpetit).findByText("Pas de données")).toBeInTheDocument();
    expect(within(montpetit).getByText("0 signalement récent")).toBeInTheDocument();
    expect(within(montpetit).queryByText(/Dernier signalement/)).not.toBeInTheDocument();
    expect(screen.getByTestId("level-montpetit")).toHaveClass("level-none");
  });

  it("affiche une erreur si l'API est injoignable", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));
    renderApp();
    expect(await screen.findAllByText("Impossible de charger l'affluence")).toHaveLength(2);
  });

  it("se rafraîchit automatiquement", async () => {
    renderApp();
    await screen.findByText("Modéré");
    expect(occupancyCalls()).toBe(2);
    await act(async () => {
      vi.advanceTimersByTime(REFRESH_MS);
    });
    expect(occupancyCalls()).toBe(4);
  });
});

describe("signalement", () => {
  it("envoie le niveau choisi en un tap avec un client_id anonyme et affiche un succès", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderApp();
    const minto = screen.getByTestId("card-minto");
    await within(minto).findByText("Modéré");

    await user.click(within(minto).getByRole("button", { name: "Signaler l'affluence" }));
    await user.click(within(minto).getByRole("button", { name: "Signaler : Bondé" }));

    expect(await within(minto).findByRole("status")).toHaveTextContent("Merci ! Ton signalement est enregistré.");
    const post = fetchMock.mock.calls.find(([, init]) => init?.method === "POST")!;
    expect(post[0]).toBe("/api/reports");
    const body = JSON.parse(post[1].body as string);
    expect(body).toMatchObject({ facility: "minto", level: 4 });
    expect(body.client_id).toMatch(/^[0-9a-f-]{36}$/);
    // The occupancy is refreshed right after a successful report.
    expect(occupancyCalls()).toBe(4);
  });

  it("affiche un message d'attente sur un second signalement (429)", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderApp();
    const minto = screen.getByTestId("card-minto");
    await within(minto).findByText("Modéré");

    await user.click(within(minto).getByRole("button", { name: "Signaler l'affluence" }));
    await user.click(within(minto).getByRole("button", { name: "Signaler : Calme" }));
    await within(minto).findByText(/Merci/);

    reportStatus = 429;
    await user.click(within(minto).getByRole("button", { name: "Signaler l'affluence" }));
    await user.click(within(minto).getByRole("button", { name: "Signaler : Calme" }));
    expect(await within(minto).findByRole("status")).toHaveTextContent(/déjà signalé cette salle/);

    const ids = fetchMock.mock.calls
      .filter(([, init]) => init?.method === "POST")
      .map(([, init]) => JSON.parse(init.body as string).client_id);
    expect(ids[0]).toBe(ids[1]);
  });

  it("affiche une erreur si l'envoi échoue", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    reportStatus = 500;
    renderApp();
    const minto = screen.getByTestId("card-minto");
    await within(minto).findByText("Modéré");
    await user.click(within(minto).getByRole("button", { name: "Signaler l'affluence" }));
    await user.click(within(minto).getByRole("button", { name: "Signaler : Vide" }));
    expect(await within(minto).findByRole("status")).toHaveTextContent(/Échec de l'envoi/);
  });

  it("permet d'annuler sans rien envoyer", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderApp();
    const minto = screen.getByTestId("card-minto");
    await user.click(within(minto).getByRole("button", { name: "Signaler l'affluence" }));
    await user.click(within(minto).getByRole("button", { name: "Annuler" }));
    expect(within(minto).queryByRole("button", { name: /Signaler :/ })).not.toBeInTheDocument();
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === "POST")).toBe(false);
  });
});

describe("affluence typique (phase 3)", () => {
  it("affiche les horaires, le graphique et les prochains créneaux calmes", async () => {
    renderApp();
    const minto = screen.getByTestId("card-minto");
    expect(await within(minto).findByText("Affluence typique aujourd'hui")).toBeInTheDocument();
    expect(within(minto).getByText("Ouvert aujourd'hui de 6 h 30 à 23 h")).toBeInTheDocument();
    // 8 h is calm but already past: only later slots are suggested.
    expect(within(minto).getByText("Plutôt calme plus tard vers 16 h et 21 h")).toBeInTheDocument();
    const bars = within(within(minto).getByTestId("chart")).getAllByRole("button");
    expect(bars).toHaveLength(17);
    // The current hour (14 h) is selected by default and described.
    expect(within(minto).getByRole("button", { name: /^14 h : Modéré en moyenne/ })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("détaille l'heure touchée", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderApp();
    const minto = screen.getByTestId("card-minto");
    const bar = await within(minto).findByRole("button", { name: /^16 h : Calme en moyenne \(4 relevés\)/ });
    await user.click(bar);
    expect(bar).toHaveAttribute("aria-pressed", "true");
    expect(bar).toHaveClass("calm");
  });

  it("indique quand il n'y a pas encore d'historique", async () => {
    renderApp();
    const montpetit = screen.getByTestId("card-montpetit");
    expect(
      await within(montpetit).findByText("Pas encore assez d'historique pour ce jour de la semaine."),
    ).toBeInTheDocument();
    expect(within(montpetit).queryByTestId("chart")).not.toBeInTheDocument();
  });

  it("n'affiche rien si le profil est indisponible, sans casser la carte", async () => {
    fetchMock.mockImplementation(async (url: string) =>
      url.includes("/profile/") ? json({}, 500) : json(occupancy[url.split("/").pop()!]),
    );
    renderApp();
    const minto = screen.getByTestId("card-minto");
    expect(await within(minto).findByText("Modéré")).toBeInTheDocument();
    expect(within(minto).queryByText("Affluence typique aujourd'hui")).not.toBeInTheDocument();
  });
});

describe("prévision (phase 5)", () => {
  const hour = (h: number, level: number) => ({ ts: nowSec + (h - 14) * 3600, hour: h, level, calm: level <= 2 });
  const available = (facility: string, hours: Forecast["hours"]): Forecast => {
    const calm = hours.find((h) => h.calm);
    return {
      ...unavailableForecast(facility),
      available: true,
      model: "gbm",
      trained_at: nowSec,
      training_samples: 13952,
      validation_mae: { baseline: 0.41, gbm: 0.4 },
      hours,
      next_calm: calm ? { ts: calm.ts, hour: calm.hour } : null,
    };
  };

  it("annonce le prochain créneau calme prévu, à la place de la moyenne historique", async () => {
    forecastFor = (f) => available(f, [hour(15, 3.4), hour(16, 2.6), hour(18, 1.8), hour(21, 1.5)]);
    renderApp();
    const minto = screen.getByTestId("card-minto");
    expect(await within(minto).findByTestId("forecast")).toHaveTextContent("Prévision : probablement calme vers 18 h");
    expect(within(minto).getByText(/Estimation à partir de 13\s952 relevés/)).toBeInTheDocument();
    expect(within(minto).queryByText(/Plutôt calme plus tard/)).not.toBeInTheDocument();
  });

  it("indique l'heure la moins chargée quand aucun créneau calme n'est prévu", async () => {
    forecastFor = (f) => available(f, [hour(15, 3.6), hour(16, 3.9), hour(21, 2.7)]);
    renderApp();
    const minto = screen.getByTestId("card-minto");
    expect(await within(minto).findByTestId("forecast")).toHaveTextContent(
      "Prévision : pas de créneau calme dans les prochaines heures (le moins chargé : 21 h, modéré)",
    );
  });

  it("revient aux créneaux calmes de l'historique si la prévision est indisponible", async () => {
    renderApp();
    const minto = screen.getByTestId("card-minto");
    expect(await within(minto).findByText("Plutôt calme plus tard vers 16 h et 21 h")).toBeInTheDocument();
    expect(within(minto).queryByTestId("forecast")).not.toBeInTheDocument();
  });
});
