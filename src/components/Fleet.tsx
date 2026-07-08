"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useI18n } from "./LanguageProvider";
import { useSearch } from "./SearchContext";
import { formatYen, type Vehicle, type VehicleClass } from "@/lib/data";
import { tText } from "@/lib/i18nContent";
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
  const { bookingHref } = useSearch();
  const [category, setCategory] = useState<VehicleClass | "all">("all");

  const categories = useMemo(
    () => [...new Set(vehicles.map((v) => v.cls))],
    [vehicles],
  );
  const shown = category === "all" ? vehicles : vehicles.filter((v) => v.cls === category);

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

      {/* mobile: edge-peeking swipe carousel · sm+: grid */}
      <div className="no-scrollbar mt-8 -mx-6 flex snap-x snap-mandatory gap-5 overflow-x-auto scroll-px-6 px-6 pb-2 sm:mx-0 sm:grid sm:snap-none sm:grid-cols-2 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-3">
        {shown.map((v) => {
          const spec = [`${v.seats} ${t.fleet.seats}`, v.transmission, tText(v.fuel, v.i18n?.fuel, locale)].join(" · ");
          return (
            <article
              key={v.id}
              className="group flex shrink-0 basis-[80%] snap-start flex-col overflow-hidden rounded-[18px] border border-hairline bg-surface transition-transform duration-300 hover:-translate-y-0.5 sm:basis-auto sm:shrink"
            >
              {/* photo (or silhouette placeholder) with category tag pill */}
              <div className="relative bg-raised">
                {v.images?.[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={v.images[0]} alt={v.name} className="h-[150px] w-full object-cover" />
                ) : (
                  <div className="grid h-[150px] place-items-center">
                    <CarMark cls={v.cls} hue={v.hue} className="h-20 w-44 opacity-80" />
                  </div>
                )}
                <span className="absolute left-3 top-3 rounded-full border border-hairline bg-bg/85 px-3 py-1 text-[0.66rem] uppercase tracking-[0.2em] text-muted backdrop-blur-sm">
                  {t.classes[v.cls]}
                </span>
              </div>

              <div className="flex flex-1 flex-col p-5">
                <h3 className="font-display text-[1.0625rem] leading-tight text-ink">{v.name}</h3>
                <p className="mt-1.5 text-[0.78rem] font-light text-muted">{spec}</p>

                <div className="mt-5 border-t border-hairline pt-4">
                  <div className="tnum leading-none">
                    <span className="text-[1.1875rem] text-ink">{formatYen(v.pricePerDay)}</span>
                    <span className="ml-1 text-[0.78rem] font-light text-muted">{t.fleet.perDay}</span>
                  </div>
                  {/* handoff car-card CTA: full-width outlined button that fills on hover */}
                  <Link
                    href={bookingHref(v.id)}
                    className="mt-4 flex min-h-[46px] items-center justify-center rounded-[12px] border border-accent text-[0.75rem] font-medium uppercase tracking-[0.22em] text-accent transition-colors hover:bg-accent hover:text-accent-ink"
                  >
                    {t.fleet.reserve}
                  </Link>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
