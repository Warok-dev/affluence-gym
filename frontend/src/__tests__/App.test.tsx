import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "../App";
import type { Occupancy } from "../api";
import { REFRESH_MS } from "../config";
import { I18nProvider } from "../i18n";

const NOW = new Date("2026-10-01T18:00:00Z").getTime();
const nowSec = NOW / 1000;

const occupancy: Record<string, Occupancy> = {
  minto: { facility: "minto", level: 3, label: "Modéré", reports: 4, last_report_ts: nowSec - 5 * 60 },
  montpetit: { facility: "montpetit", level: null, label: "Pas de données", reports: 0, last_report_ts: null },
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

let reportStatus = 201;
let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date", "setInterval", "clearInterval"] });
  vi.setSystemTime(NOW);
  reportStatus = 201;
  fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    if (init?.method === "POST") return json({ status: "ok" }, reportStatus);
    const facility = url.split("/").pop()!;
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

const occupancyCalls = () => fetchMock.mock.calls.filter(([, init]) => init?.method !== "POST").length;

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
