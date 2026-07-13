"use client";

import { useState } from "react";
import Link from "next/link";
import { useI18n } from "./LanguageProvider";
import { locales } from "@/lib/i18n";
import { Arrow, Globe } from "./icons";
import { BottomSheet } from "./BottomSheet";
import { HeaderLockup } from "./Logo";

export function SiteHeader() {
  const { locale, setLocale, t } = useI18n();
  const [open, setOpen] = useState(false);

  const links = [
    { href: "/#fleet", label: t.nav.fleet },
    { href: "/#destinations", label: t.nav.destinations },
    { href: "/#how", label: t.nav.how },
  ];

  const activeLocale = locales.find((l) => l.code === locale);

  return (
    <header className="sticky top-0 z-50 border-b border-hairline bg-bg/85 backdrop-blur-md">
      <div className="mx-auto flex h-[68px] max-w-6xl items-center gap-2 px-6 sm:gap-4">
        <Link href="/" className="min-w-0 shrink-0">
          <HeaderLockup compact />
        </Link>

        <nav className="ml-8 hidden items-center gap-7 md:flex">
          {links.map((l) => (
            <Link key={l.href}
              href={l.href}
              className="text-[0.8rem] uppercase tracking-[0.16em] text-muted transition-colors hover:text-ink"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-2.5">
          {/* language switcher (desktop) */}
          <div className="hidden items-center rounded-full border border-hairline p-0.5 sm:flex">
            {locales.map((l) => (
              <button
                key={l.code}
                onClick={() => setLocale(l.code)}
                aria-pressed={locale === l.code}
                className={`rounded-full px-2.5 py-1 text-xs transition-colors ${
                  locale === l.code ? "bg-ink text-bg" : "text-muted hover:text-ink"
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>

          {/* reserve — outlined pill that fills on hover (handoff nav CTA) */}
          <Link href="/#search"
            className="hidden items-center gap-1.5 rounded-full border border-hairline px-5 py-2 text-[0.75rem] font-medium uppercase tracking-[0.18em] text-ink transition-colors hover:border-accent hover:bg-accent hover:text-accent-ink sm:inline-flex"
          >
            {t.nav.reserve}
          </Link>

          {/* mobile: compact accent CTA, always visible */}
          <Link href="/#search"
            className="inline-flex items-center rounded-full bg-accent px-4 py-2 text-[0.72rem] font-medium uppercase tracking-[0.16em] text-accent-ink transition-[filter] active:brightness-110 sm:hidden"
          >
            {t.nav.reserve}
          </Link>

          {/* mobile: 2-line hamburger (22px + shorter right-aligned bar) */}
          <button
            className="grid h-10 w-10 place-items-center text-ink md:hidden"
            onClick={() => setOpen(true)}
            aria-label="Menu"
            aria-expanded={open}
          >
            <span className="flex w-[22px] flex-col items-end gap-[7px]">
              <span className="h-[1.5px] w-[22px] bg-current" />
              <span className="h-[1.5px] w-[14px] bg-current" />
            </span>
          </button>
        </div>
      </div>

      {open && (
        <BottomSheet title="" onClose={() => setOpen(false)}>
          <nav className="-mt-1 flex flex-col">
            {links.map((l) => (
              <Link key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="flex items-center justify-between border-b border-hairline py-4 font-display text-[1.1rem] text-ink transition-colors active:text-accent"
              >
                {l.label}
                <Arrow className="h-5 w-5 text-muted" />
              </Link>
            ))}
          </nav>

          {/* language selector — native names, thumb-sized */}
          <div className="mt-5">
            <span className="eyebrow flex items-center gap-1.5 text-[0.62rem] text-muted">
              <Globe className="h-3.5 w-3.5" />
              {activeLocale?.native ?? "Language"}
            </span>
            <div className="mt-2.5 grid grid-cols-2 gap-2">
              {locales.map((l) => (
                <button
                  key={l.code}
                  onClick={() => setLocale(l.code)}
                  aria-pressed={locale === l.code}
                  className={`rounded-[12px] border px-3 py-2.5 text-center text-sm transition-colors ${
                    locale === l.code
                      ? "border-accent bg-accent font-medium text-accent-ink"
                      : "border-hairline text-ink active:bg-raised"
                  }`}
                >
                  {l.native}
                </button>
              ))}
            </div>
          </div>

          <Link href="/#search"
            onClick={() => setOpen(false)}
            className="mt-6 flex min-h-[52px] items-center justify-center rounded-[14px] bg-accent px-4 text-[0.85rem] font-medium uppercase tracking-[0.22em] text-accent-ink transition-[filter] active:brightness-110"
          >
            {t.nav.reserve}
          </Link>
        </BottomSheet>
      )}
    </header>
  );
}
