import { afterEach, describe, expect, it, vi } from "vitest";
import { generateUuid, getClientId } from "../clientId";
import { en } from "../i18n/en";
import { fr } from "../i18n/fr";
import { minutesSince } from "../time";

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
    expect(fr.reportsCount(1)).toBe("1 signalement récent");
    expect(fr.reportsCount(3)).toBe("3 signalements récents");
    expect(en.reportsCount(1)).toBe("1 recent report");
  });
});
