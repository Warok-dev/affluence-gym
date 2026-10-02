import { useId, useState } from "react";
import { postReport, type Occupancy, type Profile, type ReportResult } from "../api";
import { getClientId } from "../clientId";
import { LEVELS, type FacilityId, type Level } from "../config";
import { useT } from "../i18n";
import { minutesSince } from "../time";
import { TypicalDay } from "./TypicalDay";

type Status = "idle" | "sending" | ReportResult;

interface Props {
  id: FacilityId;
  name: string;
  data?: Occupancy;
  profile?: Profile;
  loadError: boolean;
  now: number;
  onReported: () => void;
}

export function FacilityCard({ id, name, data, profile, loadError, now, onReported }: Props) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const titleId = useId();
  const promptId = useId();

  const level = data?.level ?? null;
  const label = level ? t.levels[level] : data ? t.noData : loadError ? t.loadError : t.loading;

  async function report(value: Level) {
    setStatus("sending");
    const result = await postReport(id, value, getClientId());
    setStatus(result);
    setOpen(false);
    if (result === "ok") onReported();
  }

  let ago: string | null = null;
  if (data?.last_report_ts != null) {
    const m = minutesSince(data.last_report_ts, now);
    ago = m === 0 ? t.justNow : t.minutesAgo(m);
  }

  return (
    <article className="card" aria-labelledby={titleId} data-testid={`card-${id}`}>
      <header className="card-head">
        <h2 id={titleId}>{name}</h2>
        <span className={`badge level-${level ?? "none"}`} data-testid={`level-${id}`}>
          <span className="dot" aria-hidden="true" />
          {label}
        </span>
      </header>

      <div className="meter" aria-hidden="true">
        {LEVELS.map((l) => (
          <span key={l} className={level && l <= level ? `level-${level}` : undefined} />
        ))}
      </div>

      {data && (
        <p className="meta">
          {t.reportsCount(data.reports)}
          {ago && <> · {t.lastReport(ago)}</>}
        </p>
      )}

      {open ? (
        <div className="report-panel" role="group" aria-labelledby={promptId}>
          <p id={promptId} className="prompt">
            {t.reportPrompt}
          </p>
          <div className="level-buttons">
            {LEVELS.map((l) => (
              <button
                key={l}
                type="button"
                className={`level-btn level-${l}`}
                aria-label={t.reportLevel(t.levels[l])}
                disabled={status === "sending"}
                onClick={() => report(l)}
              >
                {t.levels[l]}
              </button>
            ))}
          </div>
          <button type="button" className="link-btn" onClick={() => setOpen(false)}>
            {t.cancel}
          </button>
        </div>
      ) : (
        <button
          type="button"
          className="primary-btn"
          onClick={() => {
            setStatus("idle");
            setOpen(true);
          }}
        >
          {t.reportButton}
        </button>
      )}

      <p className={`status status-${status}`} role="status" aria-live="polite">
        {status === "sending" && t.sending}
        {status === "ok" && t.success}
        {status === "cooldown" && t.cooldown}
        {status === "error" && t.sendError}
      </p>

      {profile && <TypicalDay profile={profile} now={now} />}
    </article>
  );
}
