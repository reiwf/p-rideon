"use client";

import { useI18n } from "./LanguageProvider";
import { locales } from "@/lib/i18n";
import { Pin, Clock } from "./icons";
import { HeaderLockup } from "./Logo";
import { tText } from "@/lib/i18nContent";
import { DEFAULT_SETTINGS, buildRentalTimes, type SiteSettings } from "@/lib/siteSettings";

export function SiteFooter({ settings = DEFAULT_SETTINGS }: { settings?: SiteSettings }) {
  const { t, locale, setLocale } = useI18n();
  // the opening-hours line is derived, so it can never disagree with the times
  // a guest is actually offered
  const times = buildRentalTimes(settings.openTime, settings.closeTime, settings.stepMinutes);
  const hours = t.footer.hours
    .replace("{from}", times[0] ?? settings.openTime)
    .replace("{to}", times[times.length - 1] ?? settings.closeTime);
  // fall back to the built-in copy until staff fill the address in
  const address = settings.address.trim()
    ? tText(settings.address, settings.i18n?.address, locale)
    : t.footer.addr;
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
            <li className="flex items-center gap-2.5"><Pin className="h-4 w-4 text-accent" />{address}</li>
            <li className="flex items-center gap-2.5"><Clock className="h-4 w-4 text-accent" />{hours}</li>
            {settings.phone && (
              <li className="tnum pl-[26px]">
                <a href={`tel:${settings.phone.replace(/[^+\d]/g, "")}`} className="transition-colors hover:text-accent">{settings.phone}</a>
              </li>
            )}
            {settings.email && (
              <li className="pl-[26px]">
                <a href={`mailto:${settings.email}`} className="transition-colors hover:text-accent">{settings.email}</a>
              </li>
            )}
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
