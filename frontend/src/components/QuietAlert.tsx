import { useState } from "react";
import { armAlert, disarmAlert, loadAlerts, pushSupported } from "../alerts";
import type { NotificationsConfig } from "../api";
import { TIMEZONE, type FacilityId } from "../config";
import { useLocale, useT } from "../i18n";
import { localTime } from "../time";
import { BellIcon } from "./icons";

interface Props {
  facility: FacilityId;
  name: string;
  /** Current level of the gym (null when unknown). */
  level: number | null;
  config: NotificationsConfig | null;
}

type Status = "idle" | "pending" | "denied" | "closed" | "error";

/** "Tell me when it gets quiet": one push notification, then the subscription is erased. */
export function QuietAlert({ facility, name, level, config }: Props) {
  const t = useT();
  const { locale } = useLocale();
  const [alert, setAlert] = useState(() => loadAlerts()[facility] ?? null);
  const [status, setStatus] = useState<Status>("idle");

  if (!config?.enabled || !config.public_key) return null;
  if (!pushSupported()) return <p className="muted-text alert-note">{t.alertUnsupported}</p>;

  if (alert) {
    const until = localTime(alert.expires_ts * 1000, TIMEZONE);
    const untilText = t.time(`${until.hour}:${String(until.minute).padStart(2, "0")}`);
    return (
      <div className="alert-box" role="status">
        <p>{t.alertActive(name, untilText)}</p>
        <button
          type="button"
          className="text-button"
          onClick={async () => {
            await disarmAlert(facility);
            setAlert(null);
          }}
        >
          {t.alertCancel}
        </button>
      </div>
    );
  }

  if (level !== null && level <= 2) return <p className="muted-text alert-note">{t.alertAlreadyQuiet}</p>;

  const message =
    status === "denied" ? t.alertDenied : status === "closed" ? t.alertClosed : status === "error" ? t.alertError : null;

  return (
    <div className="alert-arm">
      <button
        type="button"
        className="secondary-button"
        disabled={status === "pending"}
        onClick={async () => {
          setStatus("pending");
          try {
            const result = await armAlert(facility, config.public_key!, locale);
            if (result === "denied" || result === "closed") setStatus(result);
            else {
              setAlert(result);
              setStatus("idle");
            }
          } catch {
            setStatus("error");
          }
        }}
      >
        <BellIcon /> {status === "pending" ? t.alertPending : t.alertArm(name)}
      </button>
      <p className="muted-text">{t.alertPrivacy}</p>
      {message && (
        <p className="muted-text" role="alert">
          {message}
        </p>
      )}
    </div>
  );
}
