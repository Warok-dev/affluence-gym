import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { InstallHint } from "../components/InstallHint";
import { I18nProvider } from "../i18n";

const renderHint = () =>
  render(
    <I18nProvider>
      <InstallHint />
    </I18nProvider>,
  );

beforeEach(() => localStorage.clear());
afterEach(() => vi.restoreAllMocks());

function fireInstallPrompt(outcome: "accepted" | "dismissed") {
  const event = Object.assign(new Event("beforeinstallprompt", { cancelable: true }), {
    prompt: vi.fn(async () => {}),
    userChoice: Promise.resolve({ outcome }),
  });
  act(() => {
    window.dispatchEvent(event);
  });
  return event;
}

describe("installer l'appli", () => {
  it("ne montre rien sur un navigateur qui ne propose pas l'installation", () => {
    renderHint();
    expect(screen.queryByRole("region")).not.toBeInTheDocument();
  });

  it("propose le bouton du navigateur quand il permet l'installation", async () => {
    const user = userEvent.setup();
    renderHint();
    const event = fireInstallPrompt("accepted");
    expect(event.defaultPrevented).toBe(true);
    expect(screen.getByRole("region", { name: "Ajoute l'appli à ton écran d'accueil" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Installer" }));
    expect(event.prompt).toHaveBeenCalledOnce();
    expect(screen.queryByRole("region")).not.toBeInTheDocument();
  });

  it("donne les deux étapes sur iPhone, et se fait oublier après « Plus tard »", async () => {
    vi.spyOn(navigator, "userAgent", "get").mockReturnValue(
      "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile Safari/604.1",
    );
    const user = userEvent.setup();
    const { unmount } = renderHint();
    expect(screen.getByText(/bouton Partager de Safari/)).toBeInTheDocument();
    expect(screen.getByText(/Sur l'écran d'accueil/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Plus tard" }));
    expect(screen.queryByRole("region")).not.toBeInTheDocument();
    unmount();
    renderHint();
    expect(screen.queryByRole("region")).not.toBeInTheDocument();
  });

  it("disparaît une fois l'appli installée", () => {
    vi.spyOn(navigator, "userAgent", "get").mockReturnValue("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)");
    Object.defineProperty(navigator, "standalone", { value: true, configurable: true });
    try {
      renderHint();
      expect(screen.queryByRole("region")).not.toBeInTheDocument();
    } finally {
      delete (navigator as Navigator & { standalone?: boolean }).standalone;
    }
  });
});
