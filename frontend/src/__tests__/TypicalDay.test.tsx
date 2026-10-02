import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { Profile } from "../api";
import { TypicalDay } from "../components/TypicalDay";
import { localTime } from "../time";
import { I18nProvider } from "../i18n";

const base: Profile = {
  facility: "minto",
  weekday: 5,
  weeks: 8,
  timezone: "America/Toronto",
  opening_hours: { open: "08:00", close: "20:00" },
  hours: [],
};

const at = (iso: string) => new Date(iso).getTime();

describe("localTime", () => {
  it("utilise le fuseau de la salle, pas celui du téléphone", () => {
    // 01:30 UTC = 21:30 the previous evening in Toronto (EDT, UTC-4)
    expect(localTime(at("2026-10-03T01:30:00Z"), "America/Toronto")).toEqual({ hour: 21, minute: 30, minutes: 21 * 60 + 30 });
  });
});

describe("TypicalDay", () => {
  it("affiche « Fermé aujourd'hui » un jour de fermeture", () => {
    render(<TypicalDay profile={{ ...base, opening_hours: null }} now={at("2026-10-03T16:00:00Z")} />);
    expect(screen.getByText("Fermé aujourd'hui")).toBeInTheDocument();
  });

  it("signale que la salle est fermée en ce moment et aucun créneau calme restant", () => {
    const hours = Array.from({ length: 12 }, (_, i) => ({ hour: 8 + i, level: 3, samples: 3, calm: false }));
    render(
      <I18nProvider>
        {/* 22:00 in Toronto, after closing time */}
        <TypicalDay profile={{ ...base, hours }} now={at("2026-10-04T02:00:00Z")} />
      </I18nProvider>,
    );
    expect(screen.getByText(/Fermé en ce moment/)).toBeInTheDocument();
    expect(screen.getByText("Aucun créneau calme connu pour le reste de la journée.")).toBeInTheDocument();
  });

  it("fournit un tableau accessible des valeurs", () => {
    const hours = [
      { hour: 8, level: 1.25, samples: 4, calm: true },
      { hour: 9, level: null, samples: 0, calm: false },
    ];
    render(<TypicalDay profile={{ ...base, hours }} now={at("2026-10-03T12:00:00Z")} />);
    expect(screen.getByRole("table", { name: "Affluence moyenne par heure" })).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "Vide (1.25)" })).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "Pas de données" })).toBeInTheDocument();
  });
});
