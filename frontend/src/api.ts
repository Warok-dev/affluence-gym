import { API_BASE, type FacilityId, type Level } from "./config";

export interface Occupancy {
  facility: string;
  level: Level | null;
  label: string;
  reports: number;
  /** Epoch seconds of the most recent report in the window, or null. */
  last_report_ts: number | null;
  /** "official" when the gym's turnstile counters feed the API, else "crowd" (reports). */
  source?: "official" | "crowd";
  /** People present (official source only). */
  people?: number | null;
  capacity?: number | null;
  /** True when estimated from entries alone (no exit counter). */
  estimated?: boolean;
  /** Epoch seconds of the counter reading. */
  updated_ts?: number | null;
}

export type ReportResult = "ok" | "cooldown" | "error";

export async function fetchOccupancy(facility: FacilityId): Promise<Occupancy> {
  const res = await fetch(`${API_BASE}/occupancy/${facility}`);
  if (!res.ok) throw new Error(`GET /occupancy/${facility} failed: ${res.status}`);
  return (await res.json()) as Occupancy;
}

export async function postReport(facility: FacilityId, level: Level, clientId: string): Promise<ReportResult> {
  try {
    const res = await fetch(`${API_BASE}/reports`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ facility, level, client_id: clientId }),
    });
    if (res.status === 201) return "ok";
    if (res.status === 429) return "cooldown";
    return "error";
  } catch {
    return "error";
  }
}

export interface HourProfile {
  hour: number;
  /** Average level (1–4) for this hour over past weeks, or null without history. */
  level: number | null;
  samples: number;
  calm: boolean;
}

export interface Profile {
  facility: string;
  weekday: number;
  weeks: number;
  timezone: string;
  opening_hours: { open: string; close: string } | null;
  hours: HourProfile[];
}

export async function fetchProfile(facility: FacilityId): Promise<Profile> {
  const res = await fetch(`${API_BASE}/profile/${facility}`);
  if (!res.ok) throw new Error(`GET /profile/${facility} failed: ${res.status}`);
  return (await res.json()) as Profile;
}

export interface HourForecast {
  ts: number;
  hour: number;
  level: number;
  calm: boolean;
}

export interface Forecast {
  facility: string;
  /** False until the API has some history to learn from. */
  available: boolean;
  model: "baseline" | "gbm" | null;
  trained_at: number | null;
  training_samples: number;
  validation_mae: Record<string, number>;
  timezone: string;
  hours: HourForecast[];
  next_calm: { ts: number; hour: number } | null;
}

export async function fetchForecast(facility: FacilityId): Promise<Forecast> {
  const res = await fetch(`${API_BASE}/forecast/${facility}`);
  if (!res.ok) throw new Error(`GET /forecast/${facility} failed: ${res.status}`);
  return (await res.json()) as Forecast;
}

export interface Health {
  status: string;
  /** True when the API serves the synthetic demo database. */
  demo?: boolean;
}

export async function fetchHealth(): Promise<Health> {
  const res = await fetch(`${API_BASE}/health`);
  if (!res.ok) throw new Error(`GET /health failed: ${res.status}`);
  return (await res.json()) as Health;
}

export type MachineStatus = "broken" | "ok" | "unknown";

export interface Machine {
  id: string;
  name: string;
  category: "cardio" | "free-weights" | "machines";
  status: MachineStatus;
  /** Epoch seconds of the report that set the status. */
  since_ts: number | null;
  reports: number;
}

export interface EquipmentList {
  facility: string;
  window_days: number;
  machines: Machine[];
}

export async function fetchEquipment(facility: FacilityId): Promise<EquipmentList> {
  const res = await fetch(`${API_BASE}/equipment/${facility}`);
  if (!res.ok) throw new Error(`GET /equipment/${facility} failed: ${res.status}`);
  return (await res.json()) as EquipmentList;
}

export async function postEquipmentReport(
  facility: FacilityId,
  machineId: string,
  status: "broken" | "ok",
  clientId: string,
): Promise<ReportResult> {
  try {
    const res = await fetch(`${API_BASE}/equipment/${facility}/${encodeURIComponent(machineId)}/reports`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, client_id: clientId }),
    });
    if (res.status === 201) return "ok";
    if (res.status === 429) return "cooldown";
    return "error";
  } catch {
    return "error";
  }
}

export interface NotificationsConfig {
  enabled: boolean;
  public_key: string | null;
}

export async function fetchNotificationsConfig(): Promise<NotificationsConfig> {
  const res = await fetch(`${API_BASE}/notifications/config`);
  if (!res.ok) throw new Error(`GET /notifications/config failed: ${res.status}`);
  return (await res.json()) as NotificationsConfig;
}

export interface CreatedAlert {
  id: string;
  token: string;
  expires_ts: number;
}

/** POST /alerts; returns "closed" when the gym is closed right now. */
export async function createAlert(
  facility: FacilityId,
  subscription: PushSubscriptionJSON,
  lang: "fr" | "en" = "fr",
): Promise<CreatedAlert | "closed"> {
  const res = await fetch(`${API_BASE}/alerts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ facility, subscription, lang }),
  });
  if (res.status === 409) return "closed";
  if (!res.ok) throw new Error(`POST /alerts failed: ${res.status}`);
  return (await res.json()) as CreatedAlert;
}

export async function deleteAlert(id: string, token: string): Promise<void> {
  await fetch(`${API_BASE}/alerts/${encodeURIComponent(id)}`, { method: "DELETE", headers: { "X-Alert-Token": token } });
}
