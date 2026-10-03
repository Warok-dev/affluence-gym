/** Whole minutes elapsed since an epoch-seconds timestamp (never negative). */
export function minutesSince(epochSeconds: number, nowMs: number): number {
  return Math.max(0, Math.floor((nowMs - epochSeconds * 1000) / 60_000));
}

/** Hour and minutes of `nowMs` in the gym's time zone (the phone may be elsewhere). */
export function localTime(nowMs: number, timeZone: string): { hour: number; minute: number; minutes: number } {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "numeric",
    minute: "numeric",
    hourCycle: "h23",
  }).formatToParts(nowMs);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  return { hour: get("hour"), minute: get("minute"), minutes: get("hour") * 60 + get("minute") };
}

/** Day of the week of `nowMs` in the gym's time zone, 0 = Monday (the API's convention). */
export function localWeekday(nowMs: number, timeZone: string): number {
  const day = new Intl.DateTimeFormat("en-US", { timeZone, weekday: "short" }).format(nowMs);
  return ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(day);
}

/** "06:30" -> 390 */
export function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

/** 754_000 -> "12:34" (minutes:seconds, for the wait clock). */
export function formatClock(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

/** Calendar day ("2026-10-01") of an instant in the gym's time zone. */
export function localDate(ms: number, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(ms);
}
