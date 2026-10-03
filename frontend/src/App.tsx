import { useCallback, useEffect, useState } from "react";
import {
  type Forecast,
  fetchForecast,
  fetchHealth,
  fetchOccupancy,
  fetchProfile,
  type Occupancy,
  type Profile,
} from "./api";
import { DayPanel } from "./components/DayPanel";
import { GymColumn, isOpenNow } from "./components/GymColumn";
import { RetryIcon } from "./components/icons";
import {
  FACILITIES,
  PROFILE_REFRESH_MS,
  REFRESH_MS,
  TIMEZONE,
  WAKING_AFTER_MS,
  type FacilityId,
} from "./config";
import { useT } from "./i18n";
import { localTime, minutesSince } from "./time";

type ByGym<T> = Partial<Record<FacilityId, T>>;

const merge =
  <T,>(results: PromiseSettledResult<T>[]) =>
  (prev: ByGym<T>) => {
    // Keep the last known value of a gym if its refresh fails.
    const next = { ...prev };
    results.forEach((r, i) => {
      if (r.status === "fulfilled") next[FACILITIES[i].id] = r.value;
    });
    return next;
  };

export function App() {
  const t = useT();
  const [occupancy, setOccupancy] = useState<ByGym<Occupancy>>({});
  const [errors, setErrors] = useState<ByGym<boolean>>({});
  const [profiles, setProfiles] = useState<ByGym<Profile>>({});
  const [forecasts, setForecasts] = useState<ByGym<Forecast>>({});
  const [profilesSettled, setProfilesSettled] = useState(false);
  const [lastSuccess, setLastSuccess] = useState<number | null>(null);
  const [slowStart, setSlowStart] = useState(false);
  const [selected, setSelected] = useState<FacilityId | null>(null);
  const [demo, setDemo] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  const refresh = useCallback(async () => {
    const results = await Promise.allSettled(FACILITIES.map((f) => fetchOccupancy(f.id)));
    setOccupancy(merge(results));
    setErrors(Object.fromEntries(FACILITIES.map((f, i) => [f.id, results[i].status === "rejected"])));
    if (results.some((r) => r.status === "fulfilled")) setLastSuccess(Date.now());
    setNow(Date.now());
  }, []);

  // Typical day and forecast are optional: if one fails, its part of the screen is simply omitted.
  const refreshProfiles = useCallback(async () => {
    const [profileResults, forecastResults] = await Promise.all([
      Promise.allSettled(FACILITIES.map((f) => fetchProfile(f.id))),
      Promise.allSettled(FACILITIES.map((f) => fetchForecast(f.id))),
    ]);
    setProfiles(merge(profileResults));
    setForecasts(merge(forecastResults));
    setProfilesSettled(true);
  }, []);

  // Synthetic demo data must never pass for real figures (PRODUCT.md, Evidence on Hand).
  useEffect(() => {
    fetchHealth()
      .then((h) => setDemo(h.demo === true))
      .catch(() => setDemo(false));
  }, []);

  useEffect(() => {
    void refreshProfiles();
    const timer = setInterval(() => void refreshProfiles(), PROFILE_REFRESH_MS);
    return () => clearInterval(timer);
  }, [refreshProfiles]);

  useEffect(() => {
    void refresh();
    const timer = setInterval(() => void refresh(), REFRESH_MS);
    const clock = setInterval(() => setNow(Date.now()), 15_000);
    const slow = setTimeout(() => setSlowStart(true), WAKING_AFTER_MS);
    // Refresh as soon as the app is brought back to the foreground.
    const onVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(timer);
      clearInterval(clock);
      clearTimeout(slow);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refresh]);

  const allFailed = FACILITIES.every((f) => errors[f.id]);
  const waking = slowStart && lastSuccess === null && !allFailed;

  // The quieter gym gets the one reserved colour, only when the comparison is meaningful:
  // occupancy ratios when both gyms have a counter (5-point margin against noise), else levels.
  const open = FACILITIES.map((f) => isOpenNow(profiles[f.id], now));
  const levels = FACILITIES.map((f, i) => (open[i] ? (occupancy[f.id]?.level ?? null) : null));
  const ratios = FACILITIES.map((f, i) => {
    const o = occupancy[f.id];
    return open[i] && o?.source === "official" && o.people != null && o.capacity ? o.people / o.capacity : null;
  });
  let quieterIndex: number | null = null;
  if (ratios[0] !== null && ratios[1] !== null) {
    if (Math.abs(ratios[0] - ratios[1]) >= 0.05) quieterIndex = ratios[0] < ratios[1] ? 0 : 1;
  } else if (levels[0] !== null && levels[1] !== null && levels[0] !== levels[1]) {
    quieterIndex = levels[0] < levels[1] ? 0 : 1;
  }
  const quieterId = quieterIndex === null ? null : FACILITIES[quieterIndex].id;
  const shownGym = selected ?? quieterId ?? FACILITIES[0].id;

  const clock = localTime(now, TIMEZONE);
  const clockText = t.time(`${clock.hour}:${String(clock.minute).padStart(2, "0")}`);

  return (
    <>
      <header className="app-header">
        <h1>{t.appTitle}</h1>
        <time className="clock" aria-label={t.clockLabel(clockText)}>
          {clockText}
        </time>
      </header>

      {demo && (
        <p className="banner" data-testid="demo-banner">
          {t.demoData}
        </p>
      )}
      {waking && (
        <p className="banner" role="status">
          {t.waking}
        </p>
      )}
      {allFailed && (
        <div className="banner is-error" role="alert">
          <p>
            {t.offline}{" "}
            {lastSuccess !== null &&
              t.offlineSince(
                minutesSince(lastSuccess / 1000, now) === 0
                  ? t.justNow
                  : t.minutesAgo(minutesSince(lastSuccess / 1000, now)),
              )}
          </p>
          <button
            type="button"
            className="text-button"
            onClick={() => {
              void refresh();
              void refreshProfiles();
            }}
          >
            <RetryIcon /> {t.retry}
          </button>
        </div>
      )}

      <main>
        <div className="board" role="group" aria-label={t.boardLabel}>
          {FACILITIES.map((f) => (
            <GymColumn
              key={f.id}
              id={f.id}
              name={f.name}
              data={occupancy[f.id]}
              profile={profiles[f.id]}
              loadError={!!errors[f.id]}
              quieter={f.id === quieterId}
              now={now}
              onReported={() => void refresh()}
            />
          ))}
        </div>

        <DayPanel
          selected={shownGym}
          onSelect={setSelected}
          profiles={profiles}
          forecasts={forecasts}
          settled={profilesSettled}
          now={now}
        />
      </main>

      <footer className="app-footer">{t.footer}</footer>
    </>
  );
}
