import qrcode from "qrcode-generator";
import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchHealth, fetchOccupancy, fetchProfile, type Occupancy, type Profile } from "../api";
import { isOpenNow } from "../components/GymColumn";
import { FACILITIES, KIOSK_REFRESH_MS, LEVELS, PROFILE_REFRESH_MS, PUBLIC_APP_URL, TIMEZONE, type FacilityId } from "../config";
import { useT } from "../i18n";
import { quieterIndex } from "../levels";
import { ROUTES } from "../router";
import { localTime, minutesSince, toMinutes } from "../time";

type ByGym<T> = Partial<Record<FacilityId, T>>;

/**
 * Screen mode: the scoreboard for a TV at the gym entrance, read from across the room.
 * No header, no tabs, no report buttons; it refreshes itself and keeps the screen awake.
 */
export function KioskScreen() {
  const t = useT();
  const [occupancy, setOccupancy] = useState<ByGym<Occupancy>>({});
  const [profiles, setProfiles] = useState<ByGym<Profile>>({});
  const [lastSuccess, setLastSuccess] = useState<number | null>(null);
  const [failing, setFailing] = useState(false);
  const [demo, setDemo] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  const refresh = useCallback(async () => {
    const results = await Promise.allSettled(FACILITIES.map((f) => fetchOccupancy(f.id)));
    setOccupancy((prev) => {
      const next = { ...prev };
      results.forEach((r, i) => {
        if (r.status === "fulfilled") next[FACILITIES[i].id] = r.value;
      });
      return next;
    });
    const ok = results.some((r) => r.status === "fulfilled");
    setFailing(!ok);
    if (ok) setLastSuccess(Date.now());
    setNow(Date.now());
  }, []);

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
    fetchHealth()
      .then((h) => setDemo(h.demo === true))
      .catch(() => setDemo(false));
    void refresh();
    void refreshProfiles();
    const timer = setInterval(() => void refresh(), KIOSK_REFRESH_MS);
    const profileTimer = setInterval(() => void refreshProfiles(), PROFILE_REFRESH_MS);
    const clock = setInterval(() => setNow(Date.now()), 15_000);
    return () => {
      clearInterval(timer);
      clearInterval(profileTimer);
      clearInterval(clock);
    };
  }, [refresh, refreshProfiles]);

  useWakeLock();

  const open = FACILITIES.map((f) => isOpenNow(profiles[f.id], now));
  const quieter = quieterIndex(
    FACILITIES.map((f) => occupancy[f.id]),
    open,
  );
  const clock = localTime(now, TIMEZONE);
  const clockText = t.time(`${clock.hour}:${String(clock.minute).padStart(2, "0")}`);

  let freshness = "";
  if (lastSuccess !== null) {
    const m = minutesSince(lastSuccess / 1000, now);
    freshness = t.kioskUpdated(m === 0 ? t.justNow : t.minutesAgo(m));
  }

  return (
    <div className="kiosk" data-testid="kiosk">
      <header className="kiosk-head">
        <h1>
          {t.appTitle} <span className="kiosk-subtitle">· {t.kioskTitle}</span>
        </h1>
        <time className="clock">{clockText}</time>
      </header>

      {demo && (
        <p className="banner kiosk-banner" data-testid="demo-banner">
          {t.demoData}
        </p>
      )}

      <div className="board kiosk-board" role="group" aria-label={t.boardLabel}>
        {FACILITIES.map((f, i) => (
          <KioskGym
            key={f.id}
            name={f.name}
            data={occupancy[f.id]}
            profile={profiles[f.id]}
            open={open[i]}
            quieter={quieter === i}
            now={now}
          />
        ))}
      </div>

      <footer className="kiosk-foot">
        <div className="kiosk-scan">
          <QrCode value={PUBLIC_APP_URL || `${window.location.origin}${window.location.pathname}`} label={t.kioskQrLabel} />
          <p>
            <strong className="kiosk-scan-title">{t.kioskScan}</strong>
            <span className="kiosk-scan-hint">{t.kioskScanHint}</span>
          </p>
        </div>
        <p className="kiosk-status" role="status" aria-live="polite">
          {failing ? t.kioskOffline : freshness}
        </p>
        <a className="kiosk-exit" href={`#${ROUTES.occupancy}`}>
          {t.kioskExit}
        </a>
      </footer>
    </div>
  );
}

interface GymProps {
  name: string;
  data?: Occupancy;
  profile?: Profile;
  open: boolean;
  quieter: boolean;
  now: number;
}

function KioskGym({ name, data, profile, open, quieter, now }: GymProps) {
  const t = useT();
  const level = open ? (data?.level ?? null) : null;
  const official = open && data?.source === "official" && data.people != null;

  let digit: string | number = "–";
  if (official) digit = data!.people!;
  else if (level) digit = level;

  let label: string;
  if (!data && open) label = t.loading;
  else if (!open) label = t.closed;
  else if (official) label = `${t.people} · ${t.levels[level!]}`;
  else label = level ? t.levels[level] : t.noData;

  const lines: string[] = [];
  if (official && data!.capacity) lines.push(t.kioskPlaces(data!.capacity));
  const hours = profile?.opening_hours;
  if (hours) {
    const { minutes } = localTime(now, profile!.timezone || TIMEZONE);
    if (open) lines.push(t.kioskOpenUntil(t.time(hours.close)));
    else if (minutes < toMinutes(hours.open)) lines.push(t.kioskOpensAt(t.time(hours.open)));
  }

  return (
    <section className={`gym kiosk-gym${quieter ? " is-quieter" : ""}`} aria-label={`${name}${t.colon}${digit} ${label}`}>
      <header className="kiosk-gym-head">
        <h2>{name}</h2>
        {quieter && <span className="quieter-tag">{t.quieter}</span>}
      </header>
      <div className={`score level-${level ?? "none"}`} aria-hidden="true">
        <span className="score-digit">{digit}</span>
        <span className="score-label">{label}</span>
      </div>
      <div className="lamps" aria-hidden="true">
        {LEVELS.map((l) => (
          <span key={l} className={level && l <= level ? "lit" : undefined} />
        ))}
      </div>
      <p className="evidence" aria-hidden="true">
        {lines.map((line) => (
          <span key={line} className="evidence-line">
            {line}
          </span>
        ))}
      </p>
    </section>
  );
}

/** QR code drawn as one SVG path, in the page's own colours (no image, no third-party service). */
function QrCode({ value, label }: { value: string; label: string }) {
  const { path, size } = useMemo(() => {
    const qr = qrcode(0, "M");
    qr.addData(value);
    qr.make();
    const count = qr.getModuleCount();
    let d = "";
    for (let row = 0; row < count; row++) {
      for (let col = 0; col < count; col++) {
        if (qr.isDark(row, col)) d += `M${col + 2} ${row + 2}h1v1h-1z`;
      }
    }
    return { path: d, size: count + 4 };
  }, [value]);

  return (
    <svg className="kiosk-qr" viewBox={`0 0 ${size} ${size}`} role="img" aria-label={label} data-url={value}>
      <rect width={size} height={size} className="kiosk-qr-ground" />
      <path d={path} className="kiosk-qr-ink" shapeRendering="crispEdges" />
    </svg>
  );
}

/** Keeps the TV from going to sleep while the page is shown (where the browser allows it). */
function useWakeLock() {
  useEffect(() => {
    type Sentinel = { release: () => Promise<void> };
    const wakeLock = (navigator as Navigator & { wakeLock?: { request: (type: "screen") => Promise<Sentinel> } })
      .wakeLock;
    if (!wakeLock) return;
    let sentinel: Sentinel | null = null;
    let cancelled = false;
    const acquire = () => {
      wakeLock
        .request("screen")
        .then((s) => {
          if (cancelled) void s.release();
          else sentinel = s;
        })
        .catch(() => {
          // Refused (battery saver, unsupported context): the screen simply follows its own settings.
        });
    };
    // The lock is dropped whenever the page is hidden; take it again when it comes back.
    const onVisible = () => {
      if (document.visibilityState === "visible") acquire();
    };
    acquire();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      void sentinel?.release();
    };
  }, []);
}
