import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "../App";
import { detectLocale, I18nProvider } from "../i18n";
import { contentFor } from "../workouts/content";
import { EXERCISE_NAMES_EN, GUIDES_EN, PROGRAMS_EN } from "../workouts/content-en";
import { EXERCISES } from "../workouts/exercises";
import { summarizeSets } from "../workouts/format";
import { GUIDES } from "../workouts/guide";
import { PROGRAMS } from "../workouts/programs";
import { formatWeight } from "../workouts/stats";

beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response("{}", { status: 503 })),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  window.location.hash = "";
  document.documentElement.lang = "fr";
});

const renderApp = () =>
  render(
    <I18nProvider>
      <App />
    </I18nProvider>,
  );

describe("version anglaise", () => {
  it("bascule toute l'appli en anglais et s'en souvient", async () => {
    const user = userEvent.setup();
    renderApp();
    const toggle = screen.getByRole("button", { name: "English version" });
    expect(toggle).toHaveAttribute("lang", "en");

    await user.click(toggle);
    expect(screen.getByText(/Unofficial student app/)).toBeInTheDocument();
    expect(document.documentElement.lang).toBe("en");
    expect(localStorage.getItem("affluence-gym.locale")).toBe("en");
    expect(screen.getByRole("button", { name: "Version française" })).toHaveAttribute("lang", "fr");
  });

  it("traduit les contenus : programmes, exercices et guides", async () => {
    const user = userEvent.setup();
    window.location.hash = "#/exercices";
    renderApp();
    await user.click(screen.getByRole("button", { name: "English version" }));
    expect(screen.getByRole("link", { name: /Beginner: full body/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Bench press/ })).toBeInTheDocument();

    await user.type(screen.getByRole("searchbox"), "deadlift");
    expect(screen.getByRole("link", { name: /^Romanian deadlift/ })).toBeInTheDocument();

    window.location.hash = "#/exercices/bench-press";
    expect(await screen.findByRole("heading", { name: "Bench press" })).toBeInTheDocument();
    expect(screen.getByText(/Lie down with your eyes under the bar/)).toBeInTheDocument();
  });

  it("choisit la langue du navigateur, sauf si l'utilisateur en a choisi une", () => {
    const languages = vi.spyOn(navigator, "languages", "get");
    languages.mockReturnValue(["en-US", "fr-CA"]);
    expect(detectLocale()).toBe("en");
    languages.mockReturnValue(["es-ES", "fr-CA"]);
    expect(detectLocale()).toBe("fr");
    languages.mockReturnValue(["de-DE"]);
    expect(detectLocale()).toBe("fr");

    languages.mockReturnValue(["en-US"]);
    localStorage.setItem("affluence-gym.locale", "fr");
    expect(detectLocale()).toBe("fr");
  });
});

describe("contenus anglais complets", () => {
  it("chaque exercice a un nom et un guide en anglais", () => {
    for (const e of EXERCISES) {
      expect(EXERCISE_NAMES_EN[e.id], e.id).toBeTruthy();
      expect(GUIDES_EN[e.id], e.id).toBeTruthy();
    }
    for (const [id, guide] of Object.entries(GUIDES)) {
      expect(GUIDES_EN[id].steps.length, id).toBe(guide.steps.length);
    }
  });

  it("chaque programme et chaque jour ont un texte anglais", () => {
    for (const p of PROGRAMS) {
      const text = PROGRAMS_EN[p.id];
      expect(text, p.id).toBeTruthy();
      for (const d of p.days) expect(text.days[d.id], `${p.id}/${d.id}`).toBeTruthy();
    }
  });

  it("nomme les machines en anglais à partir de leur identifiant", () => {
    const en = contentFor("en");
    expect(en.machineName("treadmill-2", "Tapis de course 2")).toBe("Treadmill 2");
    expect(en.machineName("leg-press-1", "Presse à cuisses")).toBe("Leg press");
    expect(en.machineName("squat-rack-3", "Rack à squat 3")).toBe("Squat rack 3");
    expect(en.machineName("mystery-1", "Machine mystère")).toBe("Machine mystère");
    expect(contentFor("fr").machineName("treadmill-2", "Tapis de course 2")).toBe("Tapis de course 2");
  });

  it("formate les charges selon la langue", () => {
    expect(formatWeight(62.5, "kg", "en-CA")).toBe("62.5 kg");
    expect(formatWeight(62.5, "kg", "fr-CA")).toBe("62,5 kg");
    const sets = [{ reps: 8, weightKg: 62.5, done: true }];
    expect(summarizeSets(sets, "kg", "en-CA")).toBe("1 × 8 · 62.5 kg");
  });
});
