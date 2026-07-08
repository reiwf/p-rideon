"use client";

import { useI18n } from "./LanguageProvider";
import { useSearch } from "./SearchContext";
import { Pin, Calendar } from "./icons";
import { DateTimeField, SelectField } from "./SearchFields";
import { rentalTimes as times } from "@/lib/booking";

export function Hero() {
  const { t, locale } = useI18n();
  const { location, pickupDate, pickupTime, returnDate, returnTime, branches, set } = useSearch();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    document.getElementById("fleet")?.scrollIntoView({ behavior: "smooth" });
  }

  return (
    <section id="top" className="relative">
      {/* hero band — follows the page theme; gentle tonal wash + ghost emblem */}
      <div className="relative overflow-hidden bg-[linear-gradient(180deg,var(--color-raised),var(--color-bg))]">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(90%_120%_at_15%_115%,rgba(178,154,99,0.12),transparent_55%)]" />
          <div className="absolute -right-24 top-8 h-[420px] w-[420px] rotate-45 border border-hairline sm:right-[8%]" />
          <div className="absolute -right-24 top-8 h-[420px] w-[420px] rotate-45 border border-accent/25 sm:right-[8%]" style={{ scale: "0.82" }} />
        </div>

        <div className="relative mx-auto max-w-6xl px-6 pb-36 pt-20 sm:pb-40 sm:pt-24">
          <p className="eyebrow rise tracking-[0.38em] text-accent">{t.hero.eyebrow}</p>
          <h1 className="rise rise-2 mt-5 max-w-2xl font-display text-[clamp(2.375rem,6vw,3.625rem)] leading-[1.12] text-ink">
            {t.hero.title1} {t.hero.title2}
          </h1>
          <p className="rise rise-3 mt-5 max-w-[42ch] text-[1.0625rem] font-light leading-[1.6] text-muted">
            {t.hero.subtitle}
          </p>
        </div>
      </div>

      {/* search card — overlaps the hero bottom */}
      <div className="relative z-10 mx-auto -mt-24 max-w-[52rem] px-6">
        <form
          id="search"
          onSubmit={submit}
          className="rise rise-4 scroll-mt-24 rounded-[18px] border border-hairline bg-surface shadow-[var(--shadow-card)]"
        >
          <div className="grid grid-cols-1 divide-y divide-hairline lg:grid-cols-[1.3fr_1.1fr_1.1fr_auto] lg:divide-x lg:divide-y-0">
            <SelectField icon={<Pin className="h-[18px] w-[18px]" />} label={t.search.location} value={location} onChange={(v) => set({ location: v })} options={branches} />

            <DateTimeField
              icon={<Calendar className="h-[18px] w-[18px]" />}
              label={t.search.pickup}
              date={pickupDate}
              time={pickupTime}
              onDate={(v) => set({ pickupDate: v })}
              onTime={(v) => set({ pickupTime: v })}
              locale={locale}
              options={times}
              disablePast
            />

            <DateTimeField
              icon={<Calendar className="h-[18px] w-[18px]" />}
              label={t.search.return}
              date={returnDate}
              time={returnTime}
              onDate={(v) => set({ returnDate: v })}
              onTime={(v) => set({ returnTime: v })}
              locale={locale}
              options={times}
              min={pickupDate}
              align="right"
            />

            <div className="flex p-3">
              <button
                type="submit"
                className="flex min-h-[52px] flex-1 items-center justify-center rounded-[12px] bg-accent px-7 text-[0.875rem] font-medium uppercase tracking-[0.22em] text-accent-ink transition-[filter] hover:brightness-[1.08]"
              >
                {t.search.find}
              </button>
            </div>
          </div>
        </form>
      </div>
    </section>
  );
}
