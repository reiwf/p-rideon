"use client";

import { useI18n } from "./LanguageProvider";
import { locales } from "@/lib/i18n";
import { Pin, Clock } from "./icons";
import { HeaderLockup } from "./Logo";

export function SiteFooter() {
  const { t, locale, setLocale } = useI18n();
  return (
    <footer className="border-t border-hairline">
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-16 md:grid-cols-[1.5fr_1fr_1fr]">
        <div>
          <HeaderLockup compact />
          <p className="mt-5 max-w-xs text-[0.875rem] font-light leading-[1.6] text-muted">{t.footer.tagline}</p>
        </div>

        <div className="text-[0.875rem]">
          <p className="text-[0.66rem] font-medium uppercase tracking-[0.24em] text-muted">{t.nav.support}</p>
          <ul className="mt-4 space-y-2.5 font-light text-ink/90">
            <li className="flex items-center gap-2.5"><Pin className="h-4 w-4 text-accent" />{t.footer.addr}</li>
            <li className="flex items-center gap-2.5"><Clock className="h-4 w-4 text-accent" />{t.footer.hours}</li>
            <li className="tnum pl-[26px]">+81 6-0000-0000</li>
          </ul>
        </div>

        <div className="text-[0.875rem]">
          <p className="text-[0.66rem] font-medium uppercase tracking-[0.24em] text-muted">Language</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {locales.map((l) => (
              <button
                key={l.code}
                onClick={() => setLocale(l.code)}
                className={`rounded-full px-3.5 py-1.5 text-xs transition-colors ${
                  locale === l.code ? "bg-ink text-bg" : "border border-hairline font-light text-muted hover:text-ink"
                }`}
              >
                {l.native}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="border-t border-hairline">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-6 py-6 text-[0.75rem] font-light text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 {t.brand} · {t.footer.rights}</p>
          <p className="uppercase tracking-[0.24em]">Osaka · Kansai · Japan</p>
        </div>
      </div>
    </footer>
  );
}
