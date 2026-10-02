import { useState } from "react";
import type { Forecast, HourProfile, Profile } from "../api";
import { useT } from "../i18n";
import { levelFromAverage } from "../levels";
import { localDate, localTime, toMinutes } from "../time";

interface Props {
  profile: Profile;
  forecast?: Forecast;
  now: number;
}

export function TypicalDay({ profile, forecast, now }: Props) {
  const t = useT();
  const { hour: currentHour, minute, minutes } = localTime(now, profile.timezone);
  const hours = profile.hours;
  const currentIndex = hours.findIndex((h) => h.hour === currentHour);
  const [selected, setSelected] = useState<number | null>(null);

  if (!profile.opening_hours) {
    return <p className="day-answer">{t.closedToday}</p>;
  }
  const { open, close } = profile.opening_hours;
  const isOpen = minutes >= toMinutes(open) && minutes < toMinutes(close);
  const levelLabel = (avg: number) => t.levels[levelFromAverage(avg)];
  const detail = (h: HourProfile) =>
    h.level === null ? t.hourNoData(t.hour(h.hour)) : t.hourDetail(t.hour(h.hour), levelLabel(h.level), h.samples);

  const hasHistory = hours.some((h) => h.level !== null);
  const shown = hours.find((h) => h.hour === (selected ?? (currentIndex >= 0 ? currentHour : hours[0]?.hour)));

  // The answer comes first: the model's forecast when there is one, else the historical average.
  const upcoming = forecast?.available ? forecast.hours : [];
  const nextCalm = forecast?.next_calm ?? null;
  // The forecast can point at tomorrow morning; only today's slot is marked on today's chart.
  const calmIsToday = nextCalm !== null && localDate(nextCalm.ts * 1000, profile.timezone) === localDate(now, profile.timezone);
  const forecastHour = nextCalm !== null && calmIsToday ? nextCalm.hour : null;
  let answer: string;
  let basis: string | null = null;
  let calmFound = false;
  if (nextCalm !== null) {
    answer = calmIsToday ? t.forecastCalm(t.hour(nextCalm.hour)) : t.forecastCalmTomorrow(t.hour(nextCalm.hour));
    basis = t.forecastBasis(forecast!.training_samples);
    calmFound = true;
  } else if (upcoming.length) {
    const quietest = upcoming.reduce((a, b) => (b.level < a.level ? b : a));
    answer = t.forecastNoCalm(t.hour(quietest.hour), levelLabel(quietest.level));
    basis = t.forecastBasis(forecast!.training_samples);
  } else if (hasHistory) {
    const calmLater = hours.filter((h) => h.calm && h.hour > currentHour).slice(0, 3);
    calmFound = calmLater.length > 0;
    answer = calmFound ? t.calmLater(t.list(calmLater.map((h) => t.hour(h.hour)))) : t.noCalmLater;
    basis = t.historyBasis(profile.weeks);
  } else {
    answer = t.notEnoughHistory;
  }

  return (
    <>
      <p className={`day-answer${calmFound ? " is-calm" : ""}`} data-testid={upcoming.length ? "forecast" : undefined}>
        {calmFound && <span className="calm-mark" aria-hidden="true" />}
        {answer}
      </p>
      {basis && <p className="day-basis">{basis}</p>}

      {hasHistory && (
        <figure className="day-chart">
          <figcaption className="day-caption">{t.typicalDay}</figcaption>
          <div className="chart" data-testid="chart">
            {hours.map((h) => (
              <button
                key={h.hour}
                type="button"
                className={[
                  "bar",
                  h.level === null ? "empty" : h.hour === forecastHour ? "forecast" : h.calm ? "calm" : "",
                  shown?.hour === h.hour ? "selected" : "",
                ].join(" ")}
                style={{ height: h.level === null ? undefined : `${(h.level / 4) * 100}%` }}
                aria-label={detail(h)}
                aria-pressed={shown?.hour === h.hour}
                onClick={() => setSelected(h.hour)}
                onMouseEnter={() => setSelected(h.hour)}
              />
            ))}
            {currentIndex >= 0 && (
              <span
                className="now-line"
                aria-hidden="true"
                style={{ left: `${((currentIndex + minute / 60) / hours.length) * 100}%` }}
              />
            )}
          </div>
          <div className="axis" aria-hidden="true">
            {hours.map((h) => (
              <span key={h.hour}>{(h.hour - hours[0].hour) % 3 === 0 ? h.hour : ""}</span>
            ))}
          </div>
          <p className="chart-detail" aria-live="polite">
            {shown && detail(shown)}
          </p>
          <ul className="legend" aria-hidden="true">
            <li>
              <span className="key key-calm" /> {t.calmLegend}
            </li>
            {forecastHour !== null && (
              <li>
                <span className="key key-forecast" /> {t.forecastLegend}
              </li>
            )}
            {currentIndex >= 0 && (
              <li>
                <span className="key key-now" /> {t.nowLegend}
              </li>
            )}
          </ul>
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
        </figure>
      )}

      <p className="day-hours">
        {t.openToday(t.time(open), t.time(close))}
        {!isOpen && <strong> · {t.closedNow}</strong>}
      </p>
    </>
  );
}
