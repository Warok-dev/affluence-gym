import { useEffect, useState } from "react";
import { useT } from "../i18n";

const DISMISSED_KEY = "affluence-gym.install-dismissed";

/** Chrome/Edge/Android's install event (not in the TypeScript DOM types). */
interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isStandalone(): boolean {
  return (
    window.matchMedia?.("(display-mode: standalone)").matches === true ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isIos(): boolean {
  // iPadOS reports itself as a Mac, but with touch.
  return /iPhone|iPad|iPod/.test(navigator.userAgent) || (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1);
}

function wasDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISSED_KEY) === "1";
  } catch {
    return false;
  }
}

/**
 * "Add the app to your home screen": a quiet block, never a modal. A real button where the
 * browser offers installation (Android, Chrome, Edge); the two steps on iPhone, where it is
 * also what makes notifications possible. Hidden once installed or dismissed.
 */
export function InstallHint() {
  const t = useT();
  const [prompt, setPrompt] = useState<InstallPromptEvent | null>(null);
  const [hidden, setHidden] = useState(() => isStandalone() || wasDismissed());

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault(); // keep the browser's own mini-bar away; our button offers the same thing
      setPrompt(e as InstallPromptEvent);
    };
    const onInstalled = () => setHidden(true);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const ios = isIos();
  if (hidden || (!prompt && !ios)) return null;

  const dismiss = () => {
    setHidden(true);
    try {
      localStorage.setItem(DISMISSED_KEY, "1");
    } catch {
      // Not remembered: it will show again next time, nothing worse.
    }
  };

  return (
    <section className="install" aria-labelledby="install-title">
      <h2 id="install-title" className="install-title">
        {t.installTitle}
      </h2>
      {prompt ? (
        <p>{t.installWhy}</p>
      ) : (
        <ol className="install-steps">
          <li>{t.installIosShare}</li>
          <li>{t.installIosAdd}</li>
        </ol>
      )}
      <div className="button-row">
        {prompt && (
          <button
            type="button"
            className="primary-button"
            onClick={async () => {
              await prompt.prompt();
              const { outcome } = await prompt.userChoice;
              setPrompt(null);
              if (outcome === "accepted") setHidden(true);
            }}
          >
            {t.installButton}
          </button>
        )}
        <button type="button" className="text-button" onClick={dismiss}>
          {t.installLater}
        </button>
      </div>
    </section>
  );
}
