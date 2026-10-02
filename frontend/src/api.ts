import { API_BASE, type FacilityId, type Level } from "./config";

export interface Occupancy {
  facility: string;
  level: Level | null;
  label: string;
  reports: number;
  /** Epoch seconds of the most recent report in the window, or null. */
  last_report_ts: number | null;
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
