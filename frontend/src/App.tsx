import { useCallback, useEffect, useState } from "react";
import { fetchOccupancy, fetchProfile, type Occupancy, type Profile } from "./api";
import { FacilityCard } from "./components/FacilityCard";
import { FACILITIES, PROFILE_REFRESH_MS, REFRESH_MS, type FacilityId } from "./config";
import { useT } from "./i18n";

type OccupancyMap = Partial<Record<FacilityId, Occupancy>>;

export function App() {
  const t = useT();
  const [occupancy, setOccupancy] = useState<OccupancyMap>({});
  const [errors, setErrors] = useState<Partial<Record<FacilityId, boolean>>>({});
  const [profiles, setProfiles] = useState<Partial<Record<FacilityId, Profile>>>({});
  const [now, setNow] = useState(() => Date.now());

  const refresh = useCallback(async () => {
    const results = await Promise.allSettled(FACILITIES.map((f) => fetchOccupancy(f.id)));
    // Keep the last known value of a facility if its refresh fails.
    setOccupancy((prev) => {
      const next = { ...prev };
      results.forEach((r, i) => {
        if (r.status === "fulfilled") next[FACILITIES[i].id] = r.value;
      });
      return next;
    });
    setErrors(Object.fromEntries(FACILITIES.map((f, i) => [f.id, results[i].status === "rejected"])));
    setNow(Date.now());
  }, []);

  // The typical-day profile is optional: if it fails, the card simply omits it.
  const refreshProfiles = useCallback(async () => {
    const results = await Promise.allSettled(FACILITIES.map((f) => fetchProfile(f.id)));
    setProfiles((prev) => {
      const next = { ...prev };
      results.forEach((r, i) => {
        if (r.status === "fulfilled") next[FACILITIES[i].id] = r.value;
      });
      return next;
    });
  }, []);

  useEffect(() => {
    void refreshProfiles();
    const timer = setInterval(() => void refreshProfiles(), PROFILE_REFRESH_MS);
    return () => clearInterval(timer);
  }, [refreshProfiles]);

  useEffect(() => {
    void refresh();
    const timer = setInterval(() => void refresh(), REFRESH_MS);
    // Refresh as soon as the app is brought back to the foreground.
    const onVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refresh]);

  return (
    <>
      <header className="app-header">
        <h1>{t.appTitle}</h1>
        <p>{t.appTagline}</p>
      </header>
      <main className="cards">
        {FACILITIES.map((f) => (
          <FacilityCard
            key={f.id}
            id={f.id}
            name={f.name}
            data={occupancy[f.id]}
            profile={profiles[f.id]}
            loadError={!!errors[f.id]}
            now={now}
            onReported={() => void refresh()}
          />
        ))}
      </main>
      <footer className="app-footer">{t.footer}</footer>
    </>
  );
}
