"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useI18n } from "./LanguageProvider";
import { useSearch } from "./SearchContext";
import { formatYen, type Vehicle, type VehicleClass } from "@/lib/data";
import { tText } from "@/lib/i18nContent";
import { groupVehicleTypes } from "@/lib/vehicleTypes";
import { combineDateTime } from "@/lib/booking";
import { typeStock, useFleetAvailability } from "@/lib/availability";
import { CarMark } from "./icons";

export function SectionHead({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="max-w-2xl">
      <span className="eyebrow text-accent">{eyebrow}</span>
      <h2 className="mt-4 font-display text-[clamp(1.5rem,3.4vw,1.875rem)] leading-snug text-ink">{title}</h2>
    </div>
  );
}

export function Fleet({ vehicles }: { vehicles: Vehicle[] }) {
  const { t, locale } = useI18n();
  const { bookingHref, pickupDate, pickupTime, returnDate, returnTime } = useSearch();
  const [category, setCategory] = useState<VehicleClass | "all">("all");

  // Cars sharing a model name and transmission are one bookable type: the
  // fleet lists the type once, and how many of its cars are still free.
  const groups = useMemo(() => groupVehicleTypes(vehicles), [vehicles]);

  const availability = useFleetAvailability(
    combineDateTime(pickupDate, pickupTime),
    combineDateTime(returnDate, returnTime),
  );

  const categories = useMemo(
    () => [...new Set(groups.map((g) => g.lead.cls))],
    [groups],
  );
  const shown = category === "all" ? groups : groups.filter((g) => g.lead.cls === category);

  const chip = (active: boolean) =>
    `shrink-0 rounded-full border px-[18px] py-[9px] text-[0.78rem] uppercase tracking-[0.14em] transition-colors ${
      active ? "border-accent bg-accent text-accent-ink" : "border-hairline bg-transparent text-muted hover:text-ink"
    }`;

  return (
    <section id="fleet" className="mx-auto max-w-6xl scroll-mt-20 px-6 py-24">
      <SectionHead eyebrow={t.fleet.eyebrow} title={t.fleet.title} />

      {/* category chips — filter the fleet live */}
      <div className="no-scrollbar -mx-6 mt-8 flex gap-2.5 overflow-x-auto px-6">
        <button type="button" onClick={() => setCategory("all")} aria-pressed={category === "all"} className={chip(category === "all")}>
          {t.fleet.filterAll}
        </button>
        {categories.map((c) => (
          <button key={c} type="button" onClick={() => setCategory(c)} aria-pressed={category === c} className={chip(category === c)}>
            {t.classes[c]}
          </button>
        ))}
      </div>

      {/* mobile: edge-peeking swipe carousel · md+: two generous columns */}
      <div className="no-scrollbar mt-8 -mx-6 flex snap-x snap-mandatory gap-5 overflow-x-auto scroll-px-6 px-6 pb-2 md:mx-0 md:grid md:snap-none md:grid-cols-2 md:gap-6 md:overflow-visible md:px-0 md:pb-0">
        {shown.map((g) => {
          const v = g.lead;
          // until the lookup lands, say nothing about stock rather than
          // guessing — an unanswered query must not read as scarcity
          const { known, available: free } = typeStock(g, availability);
          const soldOut = known && free === 0;
          const spec = [`${v.seats} ${t.fleet.seats}`, v.transmission, tText(v.fuel, v.i18n?.fuel, locale)].join(" · ");
          return (
            <article
              key={g.key}
              className="group flex shrink-0 basis-[85%] snap-start flex-col overflow-hidden rounded-[18px] border border-hairline bg-surface transition-all duration-300 hover:-translate-y-1 hover:border-accent/40 hover:shadow-[var(--shadow-card)] md:basis-auto md:shrink"
            >
              {/* photo (or silhouette placeholder) with a slow zoom on hover */}
              <div className="relative overflow-hidden bg-raised">
                {v.images?.[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={v.images[0]}
                    alt={v.name}
                    className="aspect-[16/10] w-full object-cover transition-transform duration-[1100ms] ease-out group-hover:scale-[1.05]"
                  />
                ) : (
                  <div className="grid aspect-[16/10] place-items-center">
                    <CarMark cls={v.cls} hue={v.hue} className="h-24 w-52 opacity-80" />
                  </div>
                )}
                {/* soft top scrim keeps the class tag legible on any photo */}
                <div aria-hidden className="absolute inset-x-0 top-0 h-20 bg-[linear-gradient(180deg,rgba(10,9,6,0.35),transparent)]" />
                <span className="absolute left-4 top-4 rounded-full border border-white/25 bg-black/30 px-3 py-1 text-[0.62rem] uppercase tracking-[0.24em] text-white backdrop-blur-sm">
                  {t.classes[v.cls]}
                </span>
                {/* live stock for the chosen dates — a courtesy; the database
                    is what actually refuses an overbooking */}
                {soldOut ? (
                  <span className="absolute right-4 top-4 rounded-full bg-black/55 px-3 py-1 text-[0.62rem] uppercase tracking-[0.2em] text-white backdrop-blur-sm">
                    {t.fleet.fullyBooked}
                  </span>
                ) : known && free <= 2 ? (
                  <span className="absolute right-4 top-4 rounded-full border border-accent/50 bg-black/40 px-3 py-1 text-[0.62rem] uppercase tracking-[0.2em] text-accent backdrop-blur-sm">
                    {free === 1 ? t.fleet.lastOne : t.fleet.available.replace("{n}", String(free))}
                  </span>
                ) : null}
              </div>

              <div className="flex flex-1 flex-col p-6">
                <div className=" items-baseline justify-between gap-3">
                  <h3 className="font-display text-[1.3rem] leading-tight text-ink">{v.name}</h3>
                  {/* {v.jp && <span className="shrink-0 text-[0.72rem] font-light tracking-wide text-muted">{v.jp}</span>} */}
                </div>
                <p className="mt-2 text-[0.8rem] font-light tracking-wide text-muted">{spec}</p>

                <div className="mt-6 flex items-end justify-between gap-4 border-t border-hairline pt-5">
                  <div className="leading-none">
                    <span className="text-[0.6rem] font-medium uppercase tracking-[0.24em] text-muted">{t.fleet.from}</span>
                    <div className="tnum mt-1.5">
                      <span className="font-display text-[1.625rem] text-ink">{formatYen(v.pricePerDay)}</span>
                      <span className="ml-1.5 text-[0.78rem] font-light text-muted">{t.fleet.perDay}</span>
                    </div>
                  </div>
                  {soldOut ? (
                    <span
                      aria-disabled="true"
                      title={t.fleet.fullyBookedHint}
                      className="flex min-h-[46px] shrink-0 cursor-not-allowed items-center rounded-[12px] border border-hairline px-6 text-[0.72rem] font-medium uppercase tracking-[0.22em] text-muted"
                    >
                      {t.fleet.fullyBooked}
                    </span>
                  ) : (
                    <Link
                      href={bookingHref(v.id)}
                      className="group/btn flex min-h-[46px] shrink-0 items-center gap-2 rounded-[12px] border border-accent px-6 text-[0.72rem] font-medium uppercase tracking-[0.22em] text-accent transition-colors hover:bg-accent hover:text-accent-ink"
                    >
                      {t.fleet.reserve}
                      <span aria-hidden className="transition-transform duration-300 group-hover/btn:translate-x-0.5">→</span>
                    </Link>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
