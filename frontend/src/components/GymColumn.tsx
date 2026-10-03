import { useEffect, useId, useState } from "react";
import { postReport, type Occupancy, type Profile, type ReportResult } from "../api";
import { getClientId } from "../clientId";
import { LEVELS, TIMEZONE, type FacilityId, type Level } from "../config";
import { cooldownRemaining, markReported } from "../cooldown";
import { useT } from "../i18n";
import { formatClock, localTime, minutesSince, toMinutes } from "../time";
import { CheckIcon } from "./icons";

type Status = "idle" | "picking" | "sending" | ReportResult;

interface Props {
  id: FacilityId;
  name: string;
  data?: Occupancy;
  profile?: Profile;
  loadError: boolean;
  quieter: boolean;
  now: number;
  onReported: () => void;
}

/** Is the gym open at `now`, given today's opening hours? Unknown hours count as open. */
export function isOpenNow(profile: Profile | undefined, now: number): boolean {
  if (!profile) return true;
  if (!profile.opening_hours) return false;
  const { minutes } = localTime(now, profile.timezone || TIMEZONE);
  return minutes >= toMinutes(profile.opening_hours.open) && minutes < toMinutes(profile.opening_hours.close);
}

export function GymColumn({ id, name, data, profile, loadError, quieter, now, onReported }: Props) {
  const t = useT();
  const nameId = useId();
  const promptId = useId();
  const [status, setStatus] = useState<Status>("idle");
  const [, tick] = useState(0);
  const waitMs = cooldownRemaining(id);
  const hasWait = waitMs > 0;

  // The wait clock ticks every second, only while a wait is running.
  useEffect(() => {
    if (!hasWait) return;
    const timer = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(timer);
  }, [hasWait]);

  async function report(value: Level) {
    setStatus("sending");
    const result = await postReport(id, value, getClientId());
    if (result === "ok") markReported(id);
    setStatus(result);
    if (result === "ok") onReported();
  }

  const loading = !data && !loadError;
  const open = isOpenNow(profile, now);
  const level = open ? (data?.level ?? null) : null;
  // Exact count from the turnstiles (or an estimate from entries) when the counter feeds the API.
  const official = open && data?.source === "official" && data.people != null;
  const ago = (ts: number) => {
    const m = minutesSince(ts, now);
    return m === 0 ? t.justNow : t.minutesAgo(m);
  };

  let label: string;
  if (loading) label = t.loading;
  else if (!open) label = t.closed;
  else if (!data) label = t.unavailable; // the banner above explains why
  else if (official) label = `${t.people} · ${t.levels[level!]}`;
  else label = level ? t.levels[level] : t.noData;

  // Evidence reads as two deliberate lines: how many reports, then how fresh.
  let evidence: string[] = [];
  if (!open && profile?.opening_hours) {
    evidence = [t.todayHours(t.time(profile.opening_hours.open), t.time(profile.opening_hours.close))];
  } else if (official) {
    const when = data!.updated_ts != null ? ago(data!.updated_ts) : t.justNow;
    evidence = [
      t.ofCapacity(data!.capacity ?? 0),
      data!.estimated ? t.estimatedCounter(when) : t.officialCounter(when),
    ];
  } else if (data && data.reports > 0) {
    evidence = [t.reportsCount(data.reports)];
    if (data.last_report_ts != null) evidence.push(t.lastReport(ago(data.last_report_ts)));
  } else if (data) {
    evidence = open ? [t.noReports, t.beFirst] : [t.noReports];
  }

  const picking = status === "picking" || status === "sending";
  const waiting = hasWait && !picking;

  return (
    <section
      className={`gym${quieter ? " is-quieter" : ""}`}
      aria-labelledby={nameId}
      aria-busy={loading}
      data-testid={`card-${id}`}
    >
      <header className="gym-head">
        <h2 id={nameId}>{name}</h2>
        {quieter && <span className="quieter-tag">{t.quieter}</span>}
      </header>

      <div
        className={`score level-${level ?? "none"}${official ? " is-count" : ""}`}
        data-testid={`level-${id}`}
      >
        <span className="score-digit" aria-hidden="true">
          {loading ? "" : official ? data!.people : (level ?? "–")}
        </span>
        <span className="score-label">{label}</span>
      </div>

      <div className="lamps" aria-hidden="true">
        {LEVELS.map((l) => (
          <span key={l} className={level && l <= level ? "lit" : undefined} />
        ))}
      </div>

      <p className="evidence">
        {loading ? (
          <span className="skeleton-line" />
        ) : (
          evidence.map((line) => (
            <span key={line} className="evidence-line">
              {line}
            </span>
          ))
        )}
      </p>

      <div className="gym-action" hidden={official}>
        {official ? null : picking ? (
          <div className="picker" role="group" aria-labelledby={promptId}>
            <p id={promptId} className="picker-prompt">
              {t.reportPrompt}
            </p>
            {LEVELS.map((l) => (
              <button
                key={l}
                type="button"
                className="picker-option"
                aria-label={t.reportLevel(t.levels[l])}
                disabled={status === "sending"}
                onClick={() => report(l)}
              >
                <span className="picker-digit">{l}</span>
                {t.levels[l]}
              </button>
            ))}
            <button type="button" className="text-button" onClick={() => setStatus("idle")}>
              {t.cancel}
            </button>
          </div>
        ) : waiting ? (
          <div className="stamp" title={t.nextReportInLong(formatClock(waitMs))}>
            <CheckIcon />
            <span>
              <strong className="stamp-title">{t.reported}</strong>
              <span className="stamp-clock">{t.nextReportIn(formatClock(waitMs))}</span>
            </span>
          </div>
        ) : (
          <button
            type="button"
            className="report-button"
            aria-label={t.reportButtonFor(name)}
            onClick={() => setStatus("picking")}
          >
            {t.reportButton}
          </button>
        )}
      </div>

      <p className={`gym-status status-${status}`} role="status" aria-live="polite">
        {status === "sending" && t.sending}
        {status === "ok" && t.success}
        {status === "cooldown" && t.cooldown}
        {status === "error" && t.sendError}
      </p>
    </section>
  );
}
