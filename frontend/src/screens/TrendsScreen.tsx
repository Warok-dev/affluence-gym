import { useCallback, useEffect, useId, useState } from "react";
import { fetchTrends, type Trends } from "../api";
import { BackIcon, DownloadIcon, RetryIcon } from "../components/icons";
import { FACILITIES, TIMEZONE, type FacilityId } from "../config";
import { useT } from "../i18n";
import { levelFromAverage } from "../levels";
import { navigate, ROUTES } from "../router";
import { localTime, localWeekday } from "../time";
import { trendsCsv, weekExtremes, weekHours, type Slot } from "../trends";

// 2026-09-28 is a Monday: weekday names come from Intl, in the app's language.
const MONDAY_UTC = Date.UTC(2026, 8, 28, 12);
const weekdayName = (locale: string, weekday: number, style: "short" | "long") =>
  new Intl.DateTimeFormat(locale, { weekday: style, timeZone: "UTC" }).format(MONDAY_UTC + weekday * 86_400_000);

/** The typical week of one gym: average occupancy per day and hour, quietest and busiest slots. */
export function TrendsScreen({ gym }: { gym: FacilityId }) {
  const t = useT();
  const titleId = useId();
  const [trends, setTrends] = useState<Partial<Record<FacilityId, Trends>>>({});
  const [failed, setFailed] = useState(false);
  const [now] = useState(() => Date.now());

  const load = useCallback(async (facility: FacilityId) => {
    setFailed(false);
    try {
      const data = await fetchTrends(facility);
      setTrends((prev) => ({ ...prev, [facility]: data }));
    } catch {
      setFailed(true);
    }
  }, []);

  useEffect(() => {
    void load(gym);
  }, [gym, load]);

  const data = trends[gym];
  const name = FACILITIES.find((f) => f.id === gym)!.name;

  return (
    <div className="workouts trends">
      <a className="text-button back-link" href={`#${ROUTES.occupancy}`}>
        <BackIcon /> {t.tabOccupancy}
      </a>
      <h2 id={titleId} className="section-title">
        {t.trendsTitle}
      </h2>
      <div className="tabs" role="tablist" aria-labelledby={titleId}>
        {FACILITIES.map((f) => (
          <button
            key={f.id}
            type="button"
            role="tab"
            className="tab"
            aria-selected={gym === f.id}
            onClick={() => navigate(ROUTES.trends(f.id))}
          >
            {f.name}
          </button>
        ))}
      </div>

      {failed && !data ? (
        <div className="banner is-error" role="alert">
          <p>{t.trendsUnavailable}</p>
          <button type="button" className="text-button" onClick={() => void load(gym)}>
            <RetryIcon /> {t.retry}
          </button>
        </div>
      ) : !data ? (
        <div className="day-skeleton" aria-busy="true">
          <span className="skeleton-line wide" />
          <span className="skeleton-chart" />
          <span className="sr-only">{t.loadingHistory}</span>
        </div>
      ) : (
        <WeekGrid key={gym} trends={data} name={name} now={now} />
      )}
    </div>
  );
}

function WeekGrid({ trends, name, now }: { trends: Trends; name: string; now: number }) {
  const t = useT();
  const hours = weekHours(trends);
  const hasData = trends.days.some((d) => d.hours.some((h) => h.level !== null));
  const { quietest, busiest } = weekExtremes(trends);
  const today = localWeekday(now, trends.timezone || TIMEZONE);
  const nowHour = localTime(now, trends.timezone || TIMEZONE).hour;

  if (!hasData) return <p className="day-basis trends-empty">{t.trendsEmpty}</p>;

  const slotText = (s: Slot) => {
    const at = t.trendsSlot(weekdayName(t.intl, s.weekday, "long"), t.hour(s.hour));
    return s.people != null ? `${at} (${t.trendsPeople(Math.round(s.people))})` : at;
  };
  const isSlot = (s: Slot | null, weekday: number, hour: number) => s?.weekday === weekday && s.hour === hour;

  // A file the Sports Services can open in a spreadsheet (nothing leaves the phone otherwise).
  function download() {
    const csv = trendsCsv(
      trends,
      name,
      t.trendsCsvHeader,
      (d) => weekdayName(t.intl, d, "long"),
      (n) => n.toLocaleString(t.intl, { maximumFractionDigits: 2, useGrouping: false }),
    );
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `affluence-${trends.facility}-semaine-type-${trends.weeks}sem.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <div className="trends-summary">
        {quietest && (
          <p className="day-answer is-calm">
            <span className="calm-mark" aria-hidden="true" />
            {t.trendsQuietest(slotText(quietest))}
          </p>
        )}
        {busiest && <p className="trends-busiest">{t.trendsBusiest(slotText(busiest))}</p>}
        <p className="day-basis">{t.historyBasis(trends.weeks)}</p>
      </div>

      <table className="week-grid">
        <caption className="sr-only">{t.trendsCaption(name)}</caption>
        <thead>
          <tr>
            <td />
            {trends.days.map((d) => (
              <th key={d.weekday} scope="col" className={d.weekday === today ? "is-today" : undefined}>
                <abbr title={weekdayName(t.intl, d.weekday, "long")}>{weekdayName(t.intl, d.weekday, "short")}</abbr>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {hours.map((hour) => (
            <tr key={hour}>
              <th scope="row">{t.hour(hour)}</th>
              {trends.days.map((d) => {
                const h = d.hours.find((x) => x.hour === hour);
                const level = h?.level != null ? levelFromAverage(h.level) : null;
                const classes = [
                  !h ? "is-closed" : level ? `lvl-${level}` : "is-empty",
                  isSlot(quietest, d.weekday, hour) ? "is-best" : "",
                  d.weekday === today && hour === nowHour ? "is-now" : "",
                ]
                  .filter(Boolean)
                  .join(" ");
                let text: string = t.closed;
                if (h && level) text = h.people != null ? `${t.levels[level]}, ${t.trendsPeople(Math.round(h.people))}` : t.levels[level];
                else if (h) text = t.noData;
                return (
                  <td key={d.weekday} className={classes}>
                    <span className="sr-only">{text}</span>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>

      <ul className="legend trends-legend">
        {([1, 2, 3, 4] as const).map((l) => (
          <li key={l}>
            <span className={`key lvl-${l}`} aria-hidden="true" /> {t.levels[l]}
          </li>
        ))}
        {quietest && (
          <li>
            <span className="key key-best" aria-hidden="true" /> {t.trendsQuietestKey}
          </li>
        )}
        <li>
          <span className="key key-now-cell" aria-hidden="true" /> {t.nowLegend}
        </li>
      </ul>

      <button type="button" className="secondary-button trends-download" onClick={download}>
        <DownloadIcon /> {t.trendsDownload}
      </button>
    </>
  );
}
