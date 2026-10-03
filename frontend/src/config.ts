// Empty or unset -> same-origin "/api" (Vite proxy in dev, nginx in Docker).
// In production on Render: the public URL of the API (trailing slash removed).
export const API_BASE: string = (import.meta.env.VITE_API_URL || "/api").replace(/\/+$/, "");

/** Refresh period of the occupancy cards (spec: every 30–60 s). */
export const REFRESH_MS = 45_000;

/** Screen mode (entrance TV): nobody can pull to refresh, so it polls a bit faster. */
export const KIOSK_REFRESH_MS = 30_000;

/** Screen mode alternates French and English, like the campus's bilingual signage. */
export const KIOSK_LANGUAGE_MS = 12_000;

/**
 * Address the screen-mode QR code points to. Empty -> the address the screen itself uses,
 * which is only right when the TV opens the public URL (not "localhost").
 */
export const PUBLIC_APP_URL: string = import.meta.env.VITE_PUBLIC_URL || "";

/** The typical-day profile changes slowly (one snapshot per 15 min). */
export const PROFILE_REFRESH_MS = 15 * 60_000;

/** Time zone of the gyms; the header clock and "closed now" use it. */
export const TIMEZONE = "America/Toronto";

/** After this long without a first answer, the server is probably waking up (free host). */
export const WAKING_AFTER_MS = 4_000;

export const FACILITIES = [
  { id: "minto", name: "Minto" },
  { id: "montpetit", name: "Montpetit" },
] as const;

export type FacilityId = (typeof FACILITIES)[number]["id"];
export type Level = 1 | 2 | 3 | 4;
export const LEVELS: readonly Level[] = [1, 2, 3, 4];
