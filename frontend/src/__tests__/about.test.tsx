import { render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "../App";
import { I18nProvider } from "../i18n";

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response("{}", { status: 503 })),
  );
});
afterEach(() => {
  vi.unstubAllGlobals();
  window.location.hash = "";
});

const renderApp = () =>
  render(
    <I18nProvider>
      <App />
    </I18nProvider>,
  );

describe("à propos et confidentialité", () => {
  it("est accessible depuis le pied de page de chaque écran", () => {
    window.location.hash = "#/exercices";
    renderApp();
    expect(screen.getByRole("link", { name: "À propos et confidentialité" })).toHaveAttribute("href", "#/a-propos");
  });

  it("dit où vit chaque donnée et combien de temps", () => {
    window.location.hash = "#/a-propos";
    renderApp();
    const data = screen.getByRole("region", { name: "Tes données" });
    expect(within(data).getByText("Séances, records, réglages")).toBeInTheDocument();
    expect(within(data).getByText(/Uniquement sur ce téléphone/)).toBeInTheDocument();
    expect(within(data).getByText(/effacés du serveur après 24 h/)).toBeInTheDocument();
    expect(screen.getByText(/Aucun compte, aucun cookie/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Voir le code sur GitHub" })).toHaveAttribute(
      "href",
      "https://github.com/Warok-dev/affluence-gym",
    );
  });
});
