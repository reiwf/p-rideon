"use client";

import { createContext, useContext, useEffect, useState, useSyncExternalStore } from "react";
import { dict, type Dict, type Locale } from "@/lib/i18n";

const emptySubscribe = () => () => {};

type Ctx = {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: Dict;
  /** True once the visitor has explicitly picked a language (vs. the "en" default). */
  chosen: boolean;
  /** Pick a language and mark the choice as made (dismisses the first-visit gate). */
  choose: (l: Locale) => void;
};
const LanguageContext = createContext<Ctx | null>(null);

const CHOSEN_KEY = "kd-locale-set";

export function LanguageProvider({
  children,
  initialLocale = "en",
}: {
  children: React.ReactNode;
  /** Locale resolved from the request cookie on the server, so SSR renders in
      the right language (no English flash when navigating to /book). */
  initialLocale?: Locale;
}) {
  const [locale, setLocale] = useState<Locale>(initialLocale);
  // Whether the visitor ever explicitly picked a language. Persisted flag is
  // read hydration-safely (false during SSR, real value after); the cookie
  // already carries the locale itself, so no localStorage→state sync needed.
  const [justChose, setJustChose] = useState(false);
  const chosenSaved = useSyncExternalStore(
    emptySubscribe,
    () => window.localStorage.getItem(CHOSEN_KEY) === "1",
    () => false,
  );
  const chosen = justChose || chosenSaved;

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = locale;
      window.localStorage.setItem("kd-locale", locale);
      // mirror to a cookie so server components (/, /book) render this locale
      document.cookie = `kd-locale=${locale}; path=/; max-age=31536000; samesite=lax`;
    }
  }, [locale]);

  const choose = (l: Locale) => {
    setLocale(l);
    setJustChose(true);
    if (typeof window !== "undefined") window.localStorage.setItem(CHOSEN_KEY, "1");
  };

  return (
    <LanguageContext.Provider value={{ locale, setLocale, t: dict[locale], chosen, choose }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useI18n(): Ctx {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useI18n must be used within LanguageProvider");
  return ctx;
}
