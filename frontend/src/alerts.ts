// One-shot "tell me when it gets quiet" alerts: browser side.
// The push subscription goes to the server only for the time the alert is armed.
import { createAlert, deleteAlert, type CreatedAlert } from "./api";
import type { FacilityId } from "./config";

const KEY = "affluence-gym.alerts";

export type StoredAlerts = Partial<Record<FacilityId, CreatedAlert>>;

export function pushSupported(): boolean {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

export function loadAlerts(nowMs = Date.now()): StoredAlerts {
  try {
    const all = JSON.parse(localStorage.getItem(KEY) ?? "{}") as StoredAlerts;
    // Expired alerts are already gone server-side.
    return Object.fromEntries(Object.entries(all).filter(([, a]) => a && a.expires_ts * 1000 > nowMs));
  } catch {
    return {};
  }
}

function saveAlerts(alerts: StoredAlerts): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(alerts));
  } catch {
    // Storage blocked: the alert still works, the app just won't show it as active.
  }
}

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padded = (base64 + "=".repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(padded);
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

export type ArmResult = CreatedAlert | "denied" | "closed";

/** Asks permission, subscribes this browser to push, and arms the alert on the server. */
export async function armAlert(facility: FacilityId, publicKey: string, lang: "fr" | "en" = "fr"): Promise<ArmResult> {
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return "denied";
  const registration = await navigator.serviceWorker.ready;
  const subscription =
    (await registration.pushManager.getSubscription()) ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
    }));
  const result = await createAlert(facility, subscription.toJSON(), lang);
  if (result !== "closed") saveAlerts({ ...loadAlerts(), [facility]: result });
  return result;
}

export async function disarmAlert(facility: FacilityId): Promise<void> {
  const alerts = loadAlerts();
  const alert = alerts[facility];
  if (alert) await deleteAlert(alert.id, alert.token).catch(() => undefined);
  delete alerts[facility];
  saveAlerts(alerts);
}
