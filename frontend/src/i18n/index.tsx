import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { en } from "./en";
import { fr, type Messages } from "./fr";

export const dictionaries = { fr, en } satisfies Record<string, Messages>;
export type Locale = keyof typeof dictionaries;

const STORAGE_KEY = "affluence-gym.locale";

/** The language chosen in the app, else the browser's first French or English preference, else French. */
export function detectLocale(): Locale {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "fr" || saved === "en") return saved;
  } catch {
    // Storage blocked (private mode): fall back to the browser language.
  }
  const preferred = navigator.languages?.length ? navigator.languages : [navigator.language];
  for (const lang of preferred) {
    const code = lang?.slice(0, 2).toLowerCase();
    if (code === "fr" || code === "en") return code;
  }
  return "fr";
}

interface LocaleState {
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

const I18nContext = createContext<Messages>(fr);
const LocaleContext = createContext<LocaleState>({ locale: "fr", setLocale: () => {} });

export function I18nProvider({ locale: initial = "fr", children }: { locale?: Locale; children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(initial);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Not remembered, but the switch still applies to this visit.
    }
  }, []);

  // Screen readers and the browser's own translation offer follow the page language.
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const state = useMemo(() => ({ locale, setLocale }), [locale, setLocale]);
  return (
    <LocaleContext.Provider value={state}>
      <I18nContext.Provider value={dictionaries[locale]}>{children}</I18nContext.Provider>
    </LocaleContext.Provider>
  );
}

export function useT(): Messages {
  return useContext(I18nContext);
}

export function useLocale(): LocaleState {
  return useContext(LocaleContext);
}
