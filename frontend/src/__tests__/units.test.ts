import { afterEach, describe, expect, it, vi } from "vitest";
import { generateUuid, getClientId } from "../clientId";
import { en } from "../i18n/en";
import { fr } from "../i18n/fr";
import { COOLDOWN_MS, cooldownRemaining, markReported } from "../cooldown";
import { levelFromAverage } from "../levels";
import { formatClock, minutesSince } from "../time";

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe("client_id", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("est généré au premier lancement puis réutilisé", () => {
    const first = getClientId();
    expect(first).toMatch(UUID_V4);
    expect(localStorage.getItem("affluence-gym.client_id")).toBe(first);
    expect(getClientId()).toBe(first);
  });

  it("fonctionne sans crypto.randomUUID (HTTP sur le réseau local)", () => {
    vi.stubGlobal("crypto", { getRandomValues: crypto.getRandomValues.bind(crypto) });
    expect(generateUuid()).toMatch(UUID_V4);
  });

  it("reste stable si le localStorage est bloqué", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(getClientId()).toBe(getClientId());
  });
});

describe("minutesSince", () => {
  it("compte les minutes entières, jamais négatives", () => {
    expect(minutesSince(1000, 1000 * 1000 + 59_000)).toBe(0);
    expect(minutesSince(1000, 1000 * 1000 + 61_000)).toBe(1);
    expect(minutesSince(1000, 0)).toBe(0);
  });
});

describe("i18n", () => {
  it("l'anglais couvre toutes les clés du français", () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(fr).sort());
  });

  it("gère le pluriel des signalements", () => {
    expect(fr.reportsCount(1)).toBe("1 signalement");
    expect(fr.reportsCount(3)).toBe("3 signalements");
    expect(en.reportsCount(1)).toBe("1 report");
  });
});

describe("attente entre deux signalements", () => {
  it("formate l'horloge en minutes:secondes", () => {
    expect(formatClock(15 * 60_000)).toBe("15:00");
    expect(formatClock(61_500)).toBe("1:02");
    expect(formatClock(-5)).toBe("0:00");
  });

  it("mémorise l'heure du signalement par salle, sur cet appareil seulement", () => {
    markReported("minto", 1_000_000);
    expect(cooldownRemaining("minto", 1_000_000 + 60_000)).toBe(COOLDOWN_MS - 60_000);
    expect(cooldownRemaining("minto", 1_000_000 + COOLDOWN_MS + 1)).toBe(0);
    expect(cooldownRemaining("montpetit", 1_000_000)).toBe(0);
  });
});

describe("niveau d'une moyenne", () => {
  it("n'appelle « Calme » que ce que le backend marque calme (moyenne <= 2)", () => {
    expect(levelFromAverage(1.2)).toBe(1);
    expect(levelFromAverage(2)).toBe(2);
    expect(levelFromAverage(2.4)).toBe(3); // was "Calme" by rounding, while the bar was not calm
    expect(levelFromAverage(3.6)).toBe(4);
  });
});
