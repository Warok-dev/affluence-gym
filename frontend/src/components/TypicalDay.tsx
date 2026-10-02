import { useId, useState } from "react";
import type { HourProfile, Profile } from "../api";
import type { Level } from "../config";
import { useT } from "../i18n";

/** Hour and minutes of `nowMs` in the gym's time zone (the phone may be elsewhere). */
export function localTime(nowMs: number, timeZone: string): { hour: number; minutes: number } {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "numeric",
    minute: "numeric",
    hourCycle: "h23",
  }).formatToParts(nowMs);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  return { hour: get("hour"), minutes: get("hour") * 60 + get("minute") };
}

const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

interface Props {
  profile: Profile;
  now: number;
}

export function TypicalDay({ profile, now }: Props) {
  const t = useT();
  const titleId = useId();
  const { hour: currentHour, minutes } = localTime(now, profile.timezone);
  const hours = profile.hours;
  const inRange = hours.some((h) => h.hour === currentHour);
  const [selected, setSelected] = useState<number | null>(null);

  if (!profile.opening_hours) {
    return <p className="hours-line">{t.closedToday}</p>;
  }
  const { open, close } = profile.opening_hours;
  const isOpen = minutes >= toMinutes(open) && minutes < toMinutes(close);
  const levelLabel = (avg: number) => t.levels[Math.min(4, Math.max(1, Math.round(avg))) as Level];
  const detail = (h: HourProfile) =>
    h.level === null ? t.hourNoData(t.hour(h.hour)) : t.hourDetail(t.hour(h.hour), levelLabel(h.level), h.samples);

  const hasHistory = hours.some((h) => h.level !== null);
  const calmLater = hours.filter((h) => h.calm && h.hour > currentHour).slice(0, 3);
  const shown = hours.find((h) => h.hour === (selected ?? (inRange ? currentHour : hours[0]?.hour)));

  return (
    <section className="typical" aria-labelledby={titleId}>
      <p className="hours-line">
        {t.openToday(t.time(open), t.time(close))}
        {!isOpen && <strong> · {t.closedNow}</strong>}
      </p>
      <h3 id={titleId}>{t.typicalDay}</h3>

      {!hasHistory ? (
        <p className="muted">{t.notEnoughHistory}</p>
      ) : (
        <>
          <div className="chart" data-testid="chart">
            {hours.map((h) => (
              <button
                key={h.hour}
                type="button"
                className={[
                  "bar",
                  h.level === null ? "empty" : h.calm ? "calm" : "",
                  h.hour === currentHour ? "current" : "",
                  shown?.hour === h.hour ? "selected" : "",
                ].join(" ")}
                style={{ height: h.level === null ? undefined : `${(h.level / 4) * 100}%` }}
                aria-label={detail(h)}
                aria-pressed={shown?.hour === h.hour}
                onClick={() => setSelected(h.hour)}
                onMouseEnter={() => setSelected(h.hour)}
              />
            ))}
          </div>
          <div className="axis" aria-hidden="true">
            {hours.map((h) => (
              <span key={h.hour} className={h.hour === currentHour ? "now" : ""}>
                {h.hour === currentHour
                  ? h.hour
                  : (h.hour - hours[0].hour) % 3 === 0 && Math.abs(h.hour - currentHour) > 1
                    ? h.hour
                    : ""}
              </span>
            ))}
          </div>
          <p className="chart-detail" aria-live="polite">
            {shown && detail(shown)}
          </p>
          <p className="legend">
            <span className="swatch" aria-hidden="true" /> {t.calmLegend}
            {inRange && (
              <>
                <span className="now-key" aria-hidden="true">
                  {currentHour}
                </span>{" "}
                {t.now}
              </>
            )}
          </p>
          <p className="calm-later">
            {calmLater.length ? t.calmLater(t.list(calmLater.map((h) => t.hour(h.hour)))) : t.noCalmLater}
          </p>
          <table className="sr-only">
            <caption>{t.chartTableCaption}</caption>
            <thead>
              <tr>
                <th scope="col">{t.colHour}</th>
                <th scope="col">{t.colLevel}</th>
              </tr>
            </thead>
            <tbody>
              {hours.map((h) => (
                <tr key={h.hour}>
                  <td>{t.hour(h.hour)}</td>
                  <td>{h.level === null ? t.noData : `${levelLabel(h.level)} (${h.level})`}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </section>
  );
}
