import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "../App";
import type { Occupancy, Profile } from "../api";
import { I18nProvider } from "../i18n";

const NOW = new Date("2026-10-01T18:00:00Z").getTime(); // 14:00 in Toronto
const nowSec = NOW / 1000;
const CLOSING = nowSec + 9 * 3600; // 23:00 in Toronto

let mintoLevel: 1 | 2 | 3 | 4;
let notificationsEnabled: boolean;
let fetchMock: ReturnType<typeof vi.fn>;
let permission: NotificationPermission;
const subscribe = vi.fn();

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

const occupancy = (facility: string, level: 1 | 2 | 3 | 4): Occupancy => ({
  facility,
  level,
  label: "",
  reports: 3,
  last_report_ts: nowSec - 60,
});

const profile = (facility: string): Profile => ({
  facility,
  weekday: 3,
  weeks: 8,
  timezone: "America/Toronto",
  opening_hours: { open: "06:30", close: "23:00" },
  hours: [],
});

function installPush(supported = true) {
  if (!supported) {
    vi.stubGlobal("PushManager", undefined);
    // @ts-expect-error simulate a browser without push
    delete window.PushManager;
    return;
  }
  vi.stubGlobal("PushManager", function PushManager() {});
  vi.stubGlobal("Notification", { requestPermission: vi.fn(async () => permission) });
  subscribe.mockResolvedValue({
    toJSON: () => ({ endpoint: "https://push.example/device", keys: { p256dh: "p256dh-key-value", auth: "auth-secret" } }),
  });
  Object.defineProperty(navigator, "serviceWorker", {
    configurable: true,
    value: { ready: Promise.resolve({ pushManager: { getSubscription: async () => null, subscribe } }) },
  });
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date", "setInterval", "clearInterval"] });
  vi.setSystemTime(NOW);
  mintoLevel = 4;
  notificationsEnabled = true;
  permission = "granted";
  subscribe.mockReset();
  fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    if (url.endsWith("/notifications/config"))
      return json({ enabled: notificationsEnabled, public_key: notificationsEnabled ? "BAbc-def_ghi" : null });
    if (url.endsWith("/alerts") && init?.method === "POST") return json({ id: "alert-1", token: "tok-1", expires_ts: CLOSING }, 201);
    if (url.includes("/alerts/") && init?.method === "DELETE") return new Response(null, { status: 204 });
    if (url.endsWith("/health")) return json({ status: "ok", demo: false });
    const facility = url.split("/").pop()!;
    if (url.includes("/profile/")) return json(profile(facility));
    if (url.includes("/forecast/")) return json({ available: false, hours: [], next_calm: null });
    if (url.includes("/occupancy/")) return json(occupancy(facility, facility === "minto" ? mintoLevel : 4));
    return json({}, 404);
  });
  vi.stubGlobal("fetch", fetchMock);
  installPush();
  window.location.hash = "";
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

const setup = () => userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
const renderApp = () =>
  render(
    <I18nProvider>
      <App />
    </I18nProvider>,
  );

describe("alerte « salle calme »", () => {
  it("s'arme en un tap : permission, abonnement push, alerte côté serveur", async () => {
    const user = setup();
    renderApp();
    await user.click(await screen.findByRole("button", { name: "M'avertir quand Minto sera calme" }));
    expect(await screen.findByText("Alerte active : on te prévient quand Minto sera calme (jusqu'à 23 h).")).toBeInTheDocument();
    expect(subscribe).toHaveBeenCalledWith(expect.objectContaining({ userVisibleOnly: true }));
    const post = fetchMock.mock.calls.find(([url, init]) => String(url).endsWith("/alerts") && init?.method === "POST")!;
    expect(JSON.parse(post[1].body as string)).toEqual({
      facility: "minto",
      subscription: { endpoint: "https://push.example/device", keys: { p256dh: "p256dh-key-value", auth: "auth-secret" } },
      lang: "fr",
    });
    expect(JSON.parse(localStorage.getItem("affluence-gym.alerts")!).minto.id).toBe("alert-1");
  });

  it("s'annule avec le jeton de l'appareil", async () => {
    const user = setup();
    localStorage.setItem("affluence-gym.alerts", JSON.stringify({ minto: { id: "alert-1", token: "tok-1", expires_ts: CLOSING } }));
    renderApp();
    await user.click(await screen.findByRole("button", { name: "Annuler l'alerte" }));
    const del = fetchMock.mock.calls.find(([, init]) => init?.method === "DELETE")!;
    expect(del[0]).toBe("/api/alerts/alert-1");
    expect((del[1].headers as Record<string, string>)["X-Alert-Token"]).toBe("tok-1");
    expect(await screen.findByRole("button", { name: "M'avertir quand Minto sera calme" })).toBeInTheDocument();
  });

  it("explique quoi faire si les notifications sont refusées", async () => {
    const user = setup();
    permission = "denied";
    renderApp();
    await user.click(await screen.findByRole("button", { name: "M'avertir quand Minto sera calme" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/Notifications refusées/);
    expect(subscribe).not.toHaveBeenCalled();
  });

  it("ne propose pas d'alerte quand c'est déjà calme", async () => {
    mintoLevel = 2;
    renderApp();
    expect(await screen.findByText("C'est déjà calme : pas besoin d'alerte.")).toBeInTheDocument();
  });

  it("reste invisible quand le serveur n'a pas les notifications", async () => {
    notificationsEnabled = false;
    renderApp();
    await screen.findByTestId("day-minto");
    await within(screen.getByTestId("card-minto")).findByText("Bondé");
    expect(screen.queryByRole("button", { name: /M'avertir/ })).not.toBeInTheDocument();
  });

  it("explique la limite iPhone quand le navigateur ne gère pas le push", async () => {
    installPush(false);
    renderApp();
    expect(await screen.findByText(/Sur iPhone, installe d'abord l'appli/)).toBeInTheDocument();
  });
});
