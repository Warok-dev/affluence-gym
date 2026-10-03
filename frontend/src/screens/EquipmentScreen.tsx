import { useCallback, useEffect, useState } from "react";
import { fetchEquipment, postEquipmentReport, type EquipmentList, type Machine } from "../api";
import { getClientId } from "../clientId";
import { FACILITIES, type FacilityId } from "../config";
import { useT } from "../i18n";
import { useContent } from "../workouts/content";
import { minutesSince } from "../time";

const CATEGORIES: Machine["category"][] = ["cardio", "free-weights", "machines"];
type Feedback = "ok" | "cooldown" | "error";

export function EquipmentScreen() {
  const t = useT();
  const content = useContent();
  const [gym, setGym] = useState<FacilityId>(FACILITIES[0].id);
  const [lists, setLists] = useState<Partial<Record<FacilityId, EquipmentList>>>({});
  const [failed, setFailed] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Record<string, Feedback>>({});
  const [now, setNow] = useState(() => Date.now());

  const load = useCallback(async (facility: FacilityId) => {
    try {
      const list = await fetchEquipment(facility);
      setLists((prev) => ({ ...prev, [facility]: list }));
      setFailed(false);
    } catch {
      setFailed(true);
    }
    setNow(Date.now());
  }, []);

  useEffect(() => {
    void load(gym);
  }, [gym, load]);

  async function send(machine: Machine, status: "broken" | "ok") {
    const result = await postEquipmentReport(gym, machine.id, status, getClientId());
    setFeedback((f) => ({ ...f, [`${gym}/${machine.id}`]: result }));
    if (result === "ok") {
      setOpen(null);
      void load(gym);
    }
  }

  const list = lists[gym];
  const broken = list?.machines.filter((m) => m.status === "broken").length ?? 0;
  const ago = (ts: number) => {
    const m = minutesSince(ts, now);
    if (m === 0) return t.justNow;
    if (m < 120) return t.minutesAgo(m);
    const h = Math.round(m / 60);
    return h < 48 ? t.hoursAgo(h) : t.daysAgo(Math.round(h / 24));
  };

  return (
    <div className="workouts">
      <h2 className="section-title">{t.equipmentTitle}</h2>
      <div className="tabs" role="tablist" aria-label={t.equipmentTitle}>
        {FACILITIES.map((f) => (
          <button
            key={f.id}
            type="button"
            role="tab"
            className="tab"
            aria-selected={gym === f.id}
            onClick={() => {
              setGym(f.id);
              setOpen(null);
            }}
          >
            {f.name}
          </button>
        ))}
      </div>

      {failed && !list ? (
        <p className="banner is-error" role="alert">
          {t.equipmentUnavailable}
        </p>
      ) : !list ? (
        <div className="day-skeleton" aria-busy="true">
          <span className="skeleton-line wide" />
          <span className="skeleton-chart" />
          <span className="sr-only">{t.loading}</span>
        </div>
      ) : (
        <>
          <p className={broken ? "equipment-summary has-broken" : "equipment-summary"} role="status">
            {t.brokenCount(broken)}
          </p>
          <p className="muted-text">{t.equipmentIntro(list.window_days)}</p>
          {CATEGORIES.map((category) => {
            const machines = list.machines.filter((m) => m.category === category);
            if (!machines.length) return null;
            return (
              <section key={category} className="block" aria-labelledby={`cat-${category}`}>
                <h3 id={`cat-${category}`} className="block-title">
                  {t.categories[category]}
                </h3>
                <ul className="rows">
                  {machines.map((m) => {
                    const key = `${gym}/${m.id}`;
                    const name = content.machineName(m.id, m.name);
                    const label =
                      m.status === "broken" ? t.statusBroken : m.status === "ok" ? t.statusOk : t.statusUnknown;
                    return (
                      <li key={m.id} className="machine">
                        <button
                          type="button"
                          className="row machine-row"
                          aria-expanded={open === m.id}
                          aria-label={`${name}${t.colon}${label}`}
                          onClick={() => setOpen(open === m.id ? null : m.id)}
                        >
                          <span className="row-title">{name}</span>
                          <span className={`machine-status is-${m.status}`}>
                            {m.since_ts ? t.statusSince(label, ago(m.since_ts)) : label}
                          </span>
                        </button>
                        {open === m.id && (
                          <div className="button-row machine-actions" role="group" aria-label={t.machineActions(name)}>
                            <button type="button" className="secondary-button" onClick={() => send(m, "broken")}>
                              {t.reportBroken}
                            </button>
                            <button type="button" className="secondary-button" onClick={() => send(m, "ok")}>
                              {t.reportFixed}
                            </button>
                          </div>
                        )}
                        {feedback[key] && (
                          <p className="muted-text" role="status">
                            {feedback[key] === "ok"
                              ? t.reportThanks
                              : feedback[key] === "cooldown"
                                ? t.equipmentCooldown
                                : t.sendError}
                          </p>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </>
      )}
    </div>
  );
}
