export const API_BASE: string = import.meta.env.VITE_API_URL ?? "/api";

/** Refresh period of the occupancy cards (spec: every 30–60 s). */
export const REFRESH_MS = 45_000;

export const FACILITIES = [
  { id: "minto", name: "Minto" },
  { id: "montpetit", name: "Montpetit" },
] as const;

export type FacilityId = (typeof FACILITIES)[number]["id"];
export type Level = 1 | 2 | 3 | 4;
export const LEVELS: readonly Level[] = [1, 2, 3, 4];
