import { useId, useRef, type KeyboardEvent } from "react";
import type { Forecast, Profile } from "../api";
import { FACILITIES, type FacilityId } from "../config";
import { useT } from "../i18n";
import { TypicalDay } from "./TypicalDay";

interface Props {
  selected: FacilityId;
  onSelect: (id: FacilityId) => void;
  profiles: Partial<Record<FacilityId, Profile>>;
  forecasts: Partial<Record<FacilityId, Forecast>>;
  /** True once the first history request has finished (successfully or not). */
  settled: boolean;
  now: number;
}

/** "When to go today", one gym at a time behind standard tabs. */
export function DayPanel({ selected, onSelect, profiles, forecasts, settled, now }: Props) {
  const t = useT();
  const titleId = useId();
  const baseId = useId();
  const tabs = useRef<Record<string, HTMLButtonElement | null>>({});
  const profile = profiles[selected];

  function onKeyDown(event: KeyboardEvent) {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    const i = FACILITIES.findIndex((f) => f.id === selected);
    const next = FACILITIES[(i + (event.key === "ArrowRight" ? 1 : -1) + FACILITIES.length) % FACILITIES.length];
    onSelect(next.id);
    tabs.current[next.id]?.focus();
  }

  return (
    <section className="day" aria-labelledby={titleId}>
      <h2 id={titleId} className="day-title">
        {t.dayTitle}
      </h2>
      <div className="tabs" role="tablist" aria-labelledby={titleId} onKeyDown={onKeyDown}>
        {FACILITIES.map((f) => (
          <button
            key={f.id}
            ref={(el) => {
              tabs.current[f.id] = el;
            }}
            id={`${baseId}-tab-${f.id}`}
            type="button"
            role="tab"
            className="tab"
            aria-selected={f.id === selected}
            aria-controls={`${baseId}-panel`}
            tabIndex={f.id === selected ? 0 : -1}
            onClick={() => onSelect(f.id)}
          >
            {f.name}
          </button>
        ))}
      </div>
      <div
        id={`${baseId}-panel`}
        role="tabpanel"
        aria-labelledby={`${baseId}-tab-${selected}`}
        className="day-panel"
        data-testid={`day-${selected}`}
        aria-busy={!profile && !settled}
      >
        {profile ? (
          <TypicalDay key={selected} profile={profile} forecast={forecasts[selected]} now={now} />
        ) : settled ? (
          <p className="day-basis">{t.historyUnavailable}</p>
        ) : (
          <div className="day-skeleton">
            <span className="skeleton-line wide" />
            <span className="skeleton-chart" />
            <span className="sr-only">{t.loadingHistory}</span>
          </div>
        )}
      </div>
    </section>
  );
}
