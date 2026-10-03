import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "../App";
import type { EquipmentList } from "../api";
import { I18nProvider } from "../i18n";

const NOW = new Date("2026-10-01T18:00:00Z").getTime();
const nowSec = NOW / 1000;

let postStatus: number;
let fetchMock: ReturnType<typeof vi.fn>;

const minto: EquipmentList = {
  facility: "minto",
  window_days: 7,
  machines: [
    { id: "treadmill-1", name: "Tapis de course 1", category: "cardio", status: "broken", since_ts: nowSec - 3 * 3600, reports: 2 },
    { id: "treadmill-2", name: "Tapis de course 2", category: "cardio", status: "unknown", since_ts: null, reports: 0 },
    { id: "bench-1", name: "Banc 1", category: "free-weights", status: "ok", since_ts: nowSec - 120, reports: 1 },
  ],
};
const montpetit: EquipmentList = { facility: "montpetit", window_days: 7, machines: [] };

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date", "setInterval", "clearInterval"] });
  vi.setSystemTime(NOW);
  postStatus = 201;
  fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    if (init?.method === "POST") return new Response("{}", { status: postStatus });
    if (url.endsWith("/equipment/minto")) return new Response(JSON.stringify(minto));
    if (url.endsWith("/equipment/montpetit")) return new Response(JSON.stringify(montpetit));
    return new Response("{}", { status: 503 });
  });
  vi.stubGlobal("fetch", fetchMock);
  window.location.hash = "#/equipements";
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  window.location.hash = "";
});

const setup = () => userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
const renderApp = () =>
  render(
    <I18nProvider>
      <App />
    </I18nProvider>,
  );

describe("équipements", () => {
  it("résume les pannes et montre l'état de chaque machine, par catégorie", async () => {
    renderApp();
    expect(await screen.findByText("1 machine signalée en panne")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Matériel/ })).toHaveAttribute("aria-current", "page");
    const cardio = screen.getByRole("region", { name: "Cardio" });
    expect(within(cardio).getByText("En panne · signalé il y a 3 h")).toBeInTheDocument();
    expect(within(cardio).getByText("Non signalé")).toBeInTheDocument();
    expect(within(screen.getByRole("region", { name: "Poids libres" })).getByText("Fonctionne · signalé il y a 2 min")).toBeInTheDocument();
  });

  it("signale une panne en un tap avec l'identifiant anonyme, puis recharge l'état", async () => {
    const user = setup();
    renderApp();
    await user.click(await screen.findByRole("button", { name: "Tapis de course 2 : Non signalé" }));
    await user.click(screen.getByRole("button", { name: "Signaler en panne" }));
    expect(await screen.findByText("Merci, c'est noté.")).toBeInTheDocument();
    const post = fetchMock.mock.calls.find(([, init]) => init?.method === "POST")!;
    expect(post[0]).toBe("/api/equipment/minto/treadmill-2/reports");
    const body = JSON.parse(post[1].body as string);
    expect(body.status).toBe("broken");
    expect(body.client_id).toMatch(/^[0-9a-f-]{36}$/);
    expect(fetchMock.mock.calls.filter(([url]) => String(url).endsWith("/equipment/minto"))).toHaveLength(2);
  });

  it("explique le délai quand la machine vient d'être signalée (429)", async () => {
    const user = setup();
    postStatus = 429;
    renderApp();
    await user.click(await screen.findByRole("button", { name: "Banc 1 : Fonctionne" }));
    await user.click(screen.getByRole("button", { name: "Signaler réparée" }));
    expect(await screen.findByText("Tu as déjà signalé cette machine il y a moins de 30 min.")).toBeInTheDocument();
  });

  it("passe d'une salle à l'autre et dit quand rien n'est signalé", async () => {
    const user = setup();
    renderApp();
    await screen.findByText("1 machine signalée en panne");
    await user.click(screen.getByRole("tab", { name: "Montpetit" }));
    expect(await screen.findByText("Aucune machine signalée en panne.")).toBeInTheDocument();
  });

  it("affiche une erreur claire si l'état ne se charge pas", async () => {
    fetchMock.mockImplementation(async () => new Response("{}", { status: 500 }));
    renderApp();
    expect(await screen.findByRole("alert")).toHaveTextContent("Impossible de charger l'état des machines");
  });
});
