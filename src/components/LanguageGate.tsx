"use client";

import { useEffect } from "react";
import { useI18n } from "./LanguageProvider";
import { useIsMobile, useMounted } from "./BottomSheet";
import { locales, type Locale } from "@/lib/i18n";
import { Arrow, Globe } from "./icons";
import { FullLockup } from "./Logo";

/** English gloss shown under each native language name, so any visitor can orient. */
const gloss: Record<Locale, string> = {
  en: "English",
  ja: "Japanese",
  zh: "Chinese",
  ko: "Korean",
};

/**
 * First-visit language chooser for phones. Renders only on mobile and only
 * until the visitor picks a language (persisted via LanguageProvider).
 * Opens on the full 2c emblem — the brand's front door.
 */
export function LanguageGate() {
  const { chosen, choose, locale } = useI18n();
  const isMobile = useIsMobile();
  const mounted = useMounted();

  // Lock scroll while the gate is up.
  const showing = mounted && isMobile && !chosen;
  useEffect(() => {
    if (!showing) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [showing]);

  if (!showing) return null;

  return (
    <div
      className="fixed inset-0 z-[90] flex flex-col overflow-y-auto bg-bg px-6 pb-[max(2rem,env(safe-area-inset-bottom))] pt-[max(2.5rem,env(safe-area-inset-top))]"
      role="dialog"
      aria-modal="true"
      aria-label="Select language"
    >
      <div className="mx-auto flex w-full max-w-sm flex-1 flex-col">
        <div className="flex justify-center">
          <FullLockup markSize={56} />
        </div>

        <p className="mt-10 text-center text-[0.7rem] font-medium uppercase tracking-[0.3em] text-accent">
          選択 · 选择 · 선택 · Select
        </p>

        <div className="mt-6 overflow-hidden rounded-[18px] border border-hairline bg-surface">
          {locales.map((l, i) => (
            <button
              key={l.code}
              onClick={() => choose(l.code)}
              aria-pressed={locale === l.code}
              className={`group flex w-full items-center justify-between gap-3 px-5 py-4 text-left transition-colors active:bg-raised ${
                i > 0 ? "border-t border-hairline" : ""
              }`}
            >
              <span className="leading-tight">
                <span className="block font-display text-[1.125rem] text-ink">{l.native}</span>
                <span className="mt-0.5 block text-[0.6rem] font-light uppercase tracking-[0.24em] text-muted">{gloss[l.code]}</span>
              </span>
              <Arrow className="h-4 w-4 text-accent transition-transform group-active:translate-x-1" />
            </button>
          ))}
        </div>

        <p className="mt-auto flex items-center justify-center gap-2 pt-8 text-[0.75rem] font-light text-muted">
          <Globe className="h-4 w-4 shrink-0" />
          <span dir="auto">変更可 · 可更改 · 변경 가능 · Changeable</span>
        </p>
      </div>
    </div>
  );
}
