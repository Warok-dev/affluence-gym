import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "../App";
import type { Forecast, Occupancy, Profile } from "../api";
import { REFRESH_MS, WAKING_AFTER_MS } from "../config";
import { I18nProvider } from "../i18n";

// Thursday 2026-10-01, 14:00 in Toronto.
const NOW = new Date("2026-10-01T18:00:00Z").getTime();
const nowSec = NOW / 1000;

let occupancy: Record<string, Occupancy>;

// Typical Thursday at Minto: calm at 8 h, 16 h and 21 h; no history yet at Montpetit.
let openingHours: Profile["opening_hours"];
const profile = (facility: string): Profile => ({
  facility,
  weekday: 3,
  weeks: 8,
  timezone: "America/Toronto",
  opening_hours: openingHours,
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
let forecastFor: (facility: string) => Forecast;

let reportStatus: number;
let demo: boolean;
let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date", "setInterval", "clearInterval"] });
  vi.setSystemTime(NOW);
  reportStatus = 201;
  demo = false;
  forecastFor = unavailableForecast;
  openingHours = { open: "06:30", close: "23:00" };
  occupancy = {
    minto: { facility: "minto", level: 3, label: "Modéré", reports: 4, last_report_ts: nowSec - 5 * 60 },
    montpetit: { facility: "montpetit", level: null, label: "Pas de données", reports: 0, last_report_ts: null },
  };
  fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    if (init?.method === "POST") return json({ status: "ok" }, reportStatus);
    if (url.endsWith("/health")) return json({ status: "ok", demo });
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
const posts = () => fetchMock.mock.calls.filter(([, init]) => init?.method === "POST");
const setup = () => userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

describe("tableau", () => {
  it("affiche le niveau de chaque salle avec sa preuve", async () => {
    renderApp();
    const minto = screen.getByTestId("card-minto");
    expect(await within(minto).findByText("Modéré")).toBeInTheDocument();
    expect(within(minto).getByRole("heading", { name: "Minto" })).toBeInTheDocument();
    expect(within(minto).getByText("4 signalements")).toBeInTheDocument();
    expect(within(minto).getByText("dernier il y a 5 min")).toBeInTheDocument();
    expect(screen.getByTestId("level-minto")).toHaveClass("level-3");
    expect(screen.getByTestId("level-minto")).toHaveTextContent("3");
  });

  it("invite à signaler quand une salle n'a aucune donnée", async () => {
    renderApp();
    const montpetit = screen.getByTestId("card-montpetit");
    expect(await within(montpetit).findByText("Pas de données")).toBeInTheDocument();
    expect(within(montpetit).getByText(/Aucun signalement depuis 30 min/)).toBeInTheDocument();
    expect(within(montpetit).getByText(/Sois le premier à signaler/)).toBeInTheDocument();
    expect(screen.getByTestId("level-montpetit")).toHaveClass("level-none");
  });

  it("met en avant la salle la plus calme, et seulement quand la comparaison a un sens", async () => {
    occupancy.montpetit = { ...occupancy.minto, facility: "montpetit", level: 2, label: "Calme" };
    renderApp();
    const montpetit = screen.getByTestId("card-montpetit");
    expect(await within(montpetit).findByText("Plus calme")).toBeInTheDocument();
    expect(within(screen.getByTestId("card-minto")).queryByText("Plus calme")).not.toBeInTheDocument();
    // The day panel opens on the quieter gym.
    expect(screen.getByRole("tab", { name: "Montpetit" })).toHaveAttribute("aria-selected", "true");
  });

  it("affiche « Fermé » et les horaires quand la salle est fermée", async () => {
    openingHours = { open: "18:00", close: "23:00" };
    renderApp();
    const minto = screen.getByTestId("card-minto");
    expect(await within(minto).findByText("Fermé")).toBeInTheDocument();
    expect(within(minto).getByText("Aujourd'hui 18 h – 23 h")).toBeInTheDocument();
    expect(screen.getByTestId("level-minto")).toHaveClass("level-none");
  });

  it("signale un serveur injoignable et permet de réessayer", async () => {
    const user = setup();
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));
    renderApp();
    expect(await screen.findAllByText("Indisponible")).toHaveLength(2);
    expect(screen.getByRole("alert")).toHaveTextContent("Impossible de joindre le serveur.");
    const before = occupancyCalls();
    await user.click(screen.getByRole("button", { name: "Réessayer" }));
    expect(occupancyCalls()).toBe(before + 2);
  });

  it("explique l'attente quand le serveur se réveille", async () => {
    vi.useFakeTimers({ toFake: ["Date", "setInterval", "clearInterval", "setTimeout", "clearTimeout"] });
    vi.setSystemTime(NOW);
    fetchMock.mockImplementation(() => new Promise(() => {}));
    renderApp();
    expect(screen.queryByText(/Le serveur se réveille/)).not.toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(WAKING_AFTER_MS);
    });
    expect(screen.getByText(/Le serveur se réveille/)).toBeInTheDocument();
    expect(screen.getByTestId("card-minto")).toHaveAttribute("aria-busy", "true");
  });

  it("signale clairement les données de démonstration", async () => {
    demo = true;
    renderApp();
    expect(await screen.findByTestId("demo-banner")).toHaveTextContent(/Données de démonstration/);
  });

  it("n'affiche pas de bandeau démo sur les vraies données", async () => {
    renderApp();
    await screen.findByText("Modéré");
    expect(screen.queryByTestId("demo-banner")).not.toBeInTheDocument();
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
  it("envoie le niveau en un tap, tamponne la colonne et affiche l'attente", async () => {
    const user = setup();
    renderApp();
    const minto = screen.getByTestId("card-minto");
    await within(minto).findByText("Modéré");

    await user.click(within(minto).getByRole("button", { name: "Signaler l'affluence à Minto" }));
    await user.click(within(minto).getByRole("button", { name: "Signaler : Bondé" }));

    expect(await within(minto).findByRole("status")).toHaveTextContent("Merci ! Ton signalement est enregistré.");
    expect(within(minto).getByText("Signalé")).toBeInTheDocument();
    expect(within(minto).getByText("Prochain dans 15:00")).toBeInTheDocument();
    expect(within(minto).queryByRole("button", { name: /Signaler l'affluence/ })).not.toBeInTheDocument();

    const [url, init] = posts()[0];
    expect(url).toBe("/api/reports");
    const body = JSON.parse(init.body as string);
    expect(body).toMatchObject({ facility: "minto", level: 4 });
    expect(body.client_id).toMatch(/^[0-9a-f-]{36}$/);
    expect(occupancyCalls()).toBe(4); // refreshed right after the report

    await act(async () => {
      vi.advanceTimersByTime(61_000);
    });
    expect(within(minto).getByText("Prochain dans 13:59")).toBeInTheDocument();
  });

  it("garde l'attente après un rechargement de la page", async () => {
    localStorage.setItem("affluence-gym.reported.minto", String(NOW - 5 * 60_000));
    renderApp();
    const minto = screen.getByTestId("card-minto");
    expect(await within(minto).findByText("Prochain dans 10:00")).toBeInTheDocument();
  });

  it("affiche le message du serveur si la salle a déjà été signalée (429)", async () => {
    const user = setup();
    reportStatus = 429;
    renderApp();
    const minto = screen.getByTestId("card-minto");
    await within(minto).findByText("Modéré");
    await user.click(within(minto).getByRole("button", { name: "Signaler l'affluence à Minto" }));
    await user.click(within(minto).getByRole("button", { name: "Signaler : Calme" }));
    expect(await within(minto).findByRole("status")).toHaveTextContent(/déjà signalé cette salle/);
  });

  it("utilise le même identifiant anonyme pour toutes les salles", async () => {
    const user = setup();
    renderApp();
    for (const [id, name] of [
      ["card-minto", "Minto"],
      ["card-montpetit", "Montpetit"],
    ]) {
      const column = screen.getByTestId(id);
      await user.click(within(column).getByRole("button", { name: `Signaler l'affluence à ${name}` }));
      await user.click(within(column).getByRole("button", { name: "Signaler : Vide" }));
      await within(column).findByText(/Merci/);
    }
    const ids = posts().map(([, init]) => JSON.parse(init.body as string).client_id);
    expect(ids).toHaveLength(2);
    expect(ids[0]).toBe(ids[1]);
  });

  it("affiche une erreur si l'envoi échoue", async () => {
    const user = setup();
    reportStatus = 500;
    renderApp();
    const minto = screen.getByTestId("card-minto");
    await within(minto).findByText("Modéré");
    await user.click(within(minto).getByRole("button", { name: "Signaler l'affluence à Minto" }));
    await user.click(within(minto).getByRole("button", { name: "Signaler : Vide" }));
    expect(await within(minto).findByRole("status")).toHaveTextContent(/Échec de l'envoi/);
    expect(within(minto).getByRole("button", { name: "Signaler l'affluence à Minto" })).toBeInTheDocument();
  });

  it("permet d'annuler sans rien envoyer", async () => {
    const user = setup();
    renderApp();
    const minto = screen.getByTestId("card-minto");
    await user.click(within(minto).getByRole("button", { name: "Signaler l'affluence à Minto" }));
    await user.click(within(minto).getByRole("button", { name: "Annuler" }));
    expect(within(minto).queryByRole("button", { name: /Signaler :/ })).not.toBeInTheDocument();
    expect(posts()).toHaveLength(0);
  });
});

describe("quand y aller aujourd'hui", () => {
  it("donne la réponse d'abord, puis le graphique, l'heure actuelle et les horaires", async () => {
    renderApp();
    const day = await screen.findByTestId("day-minto");
    expect(await within(day).findByText("Plutôt calme plus tard vers 16 h et 21 h")).toBeInTheDocument();
    expect(within(day).getByText("Moyenne des 8 dernières semaines")).toBeInTheDocument();
    expect(within(day).getByText("Affluence typique aujourd'hui")).toBeInTheDocument();
    expect(within(day).getByText("Ouvert aujourd'hui de 6 h 30 à 23 h")).toBeInTheDocument();
    expect(within(within(day).getByTestId("chart")).getAllByRole("button")).toHaveLength(17);
    expect(within(day).getByRole("button", { name: /^14 h : Modéré en moyenne/ })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(day.querySelector(".now-line")).not.toBeNull();
  });

  it("détaille l'heure touchée", async () => {
    const user = setup();
    renderApp();
    const bar = await screen.findByRole("button", { name: /^16 h : Vide en moyenne \(4 relevés\)/ });
    await user.click(bar);
    expect(bar).toHaveAttribute("aria-pressed", "true");
    expect(bar).toHaveClass("calm");
  });

  it("passe d'une salle à l'autre avec les onglets, au clic ou au clavier", async () => {
    const user = setup();
    renderApp();
    await screen.findByTestId("chart");
    await user.click(screen.getByRole("tab", { name: "Montpetit" }));
    expect(
      await screen.findByText("Pas encore assez d'historique pour ce jour de la semaine."),
    ).toBeInTheDocument();
    expect(screen.queryByTestId("chart")).not.toBeInTheDocument();

    await user.keyboard("{ArrowLeft}");
    expect(screen.getByRole("tab", { name: "Minto" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "Minto" })).toHaveFocus();
  });

  it("dit clairement quand l'historique est indisponible", async () => {
    fetchMock.mockImplementation(async (url: string) =>
      url.includes("/occupancy/") ? json(occupancy[url.split("/").pop()!]) : json({}, 500),
    );
    renderApp();
    expect(await screen.findByText(/Historique indisponible pour le moment/)).toBeInTheDocument();
    expect(await within(screen.getByTestId("card-minto")).findByText("Modéré")).toBeInTheDocument();
  });
});

describe("prévision", () => {
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

  it("annonce le prochain créneau calme prévu et le marque sur le graphique", async () => {
    forecastFor = (f) => available(f, [hour(15, 3.4), hour(16, 2.6), hour(18, 1.8), hour(21, 1.5)]);
    renderApp();
    const day = await screen.findByTestId("day-minto");
    expect(await within(day).findByTestId("forecast")).toHaveTextContent("Calme prévu vers 18 h");
    expect(within(day).getByText(/Prévision établie sur 13\s952 relevés/)).toBeInTheDocument();
    expect(within(day).queryByText(/Plutôt calme plus tard/)).not.toBeInTheDocument();
    expect(within(day).getByRole("button", { name: /^18 h :/ })).toHaveClass("forecast");
  });

  it("précise « demain » quand le prochain calme est le lendemain, sans le marquer sur le graphique d'aujourd'hui", async () => {
    // 6 h tomorrow morning in Toronto (NOW is 14:00 today).
    forecastFor = (f) => available(f, [{ ts: nowSec + 16 * 3600, hour: 6, level: 1.2, calm: true }]);
    renderApp();
    const day = await screen.findByTestId("day-minto");
    expect(await within(day).findByTestId("forecast")).toHaveTextContent("Calme prévu demain vers 6 h");
    expect(within(day).getByRole("button", { name: /^6 h :/ })).not.toHaveClass("forecast");
  });

  it("indique l'heure la moins chargée quand aucun créneau calme n'est prévu", async () => {
    forecastFor = (f) => available(f, [hour(15, 3.6), hour(16, 3.9), hour(21, 2.7)]);
    renderApp();
    expect(await screen.findByTestId("forecast")).toHaveTextContent(
      "Pas de créneau calme prévu ; le moins chargé : 21 h (modéré)",
    );
  });
});
