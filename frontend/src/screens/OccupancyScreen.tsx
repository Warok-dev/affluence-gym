import { useCallback, useEffect, useState } from "react";
import {
  type Forecast,
  fetchForecast,
  fetchHealth,
  fetchNotificationsConfig,
  fetchOccupancy,
  fetchProfile,
  type NotificationsConfig,
  type Occupancy,
  type Profile,
} from "../api";
import { DayPanel } from "../components/DayPanel";
import { GymColumn, isOpenNow } from "../components/GymColumn";
import { RetryIcon } from "../components/icons";
import { InstallHint } from "../components/InstallHint";
import { FACILITIES, PROFILE_REFRESH_MS, REFRESH_MS, WAKING_AFTER_MS, type FacilityId } from "../config";
import { useT } from "../i18n";
import { quieterIndex } from "../levels";
import { minutesSince } from "../time";

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

/** Home screen: both gyms on the scoreboard, then "when to go today". */
export function OccupancyScreen() {
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
  const [notifications, setNotifications] = useState<NotificationsConfig | null>(null);
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
    fetchNotificationsConfig()
      .then(setNotifications)
      .catch(() => setNotifications(null));
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

  // The quieter gym gets the one reserved colour, only when the comparison is meaningful.
  const open = FACILITIES.map((f) => isOpenNow(profiles[f.id], now));
  const levels = FACILITIES.map((f, i) => (open[i] ? (occupancy[f.id]?.level ?? null) : null));
  const quieter = quieterIndex(
    FACILITIES.map((f) => occupancy[f.id]),
    open,
  );
  const quieterId = quieter === null ? null : FACILITIES[quieter].id;
  const shownGym = selected ?? quieterId ?? FACILITIES[0].id;

  return (
    <>
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
        levels={Object.fromEntries(FACILITIES.map((f, i) => [f.id, levels[i]]))}
        notifications={notifications}
      />

      <InstallHint />
    </>
  );
}
