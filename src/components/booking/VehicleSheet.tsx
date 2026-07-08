"use client";

/* Vehicle detail surfaces for the booking flow: a compact card that lives
   beside the booking summary, and a detail sheet the guest can open at any
   step — a slide-up bottom sheet on mobile, a right-hand drawer on desktop. */

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useI18n } from "../LanguageProvider";
import type { Locale } from "@/lib/i18n";
import type { Vehicle } from "@/lib/data";
import { tText, tList } from "@/lib/i18nContent";
import { yen } from "@/lib/booking";
import { BottomSheet, useIsMobile, useMounted } from "../BottomSheet";
import { CarMark } from "../icons";

/** Compact card: thumbnail, name, spec line, and the "Details" affordance. */
export function CompactVehicleCard({
  vehicle, onDetails,
}: {
  vehicle: Vehicle;
  onDetails: () => void;
}) {
  const { t } = useI18n();
  const spec = [t.classes[vehicle.cls], `${vehicle.seats} ${t.fleet.seats}`, vehicle.transmission].join(" · ");
  return (
    <button
      type="button"
      onClick={onDetails}
      className="group flex w-full items-center gap-4 rounded-[18px] border border-hairline bg-surface p-4 text-left transition-colors hover:border-accent/50"
    >
      {vehicle.images?.[0] ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={vehicle.images[0]} alt={vehicle.name} className="h-16 w-24 shrink-0 rounded-[10px] object-cover" />
      ) : (
        <span className="grid h-16 w-24 shrink-0 place-items-center rounded-[10px] bg-raised">
          <CarMark cls={vehicle.cls} hue={vehicle.hue} className="h-12 w-20" />
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block truncate font-display text-[1.05rem] leading-tight text-ink">{vehicle.name}</span>
        <span className="mt-1 block truncate text-[0.78rem] font-light text-muted">{spec}</span>
        <span className="mt-1.5 block text-[0.68rem] font-medium uppercase tracking-[0.2em] text-accent transition-colors group-hover:text-accent-deep">
          {t.booking.viewVehicle} →
        </span>
      </span>
    </button>
  );
}

function SheetContent({ vehicle, t, locale }: { vehicle: Vehicle; t: ReturnType<typeof useI18n>["t"]; locale: Locale }) {
  const [idx, setIdx] = useState(0);
  const images = vehicle.images ?? [];
  const tags = tList(vehicle.tags, vehicle.i18n?.tags, locale);

  const stats: { value: string | number; label: string }[] = [
    { value: vehicle.seats, label: t.fleet.seats },
    { value: vehicle.bags, label: t.fleet.bags },
    { value: vehicle.transmission, label: t.fleet.transmission },
    { value: tText(vehicle.fuel, vehicle.i18n?.fuel, locale), label: t.fleet.fuelLabel },
  ];

  return (
    <div className="space-y-5 pb-2">
      {/* gallery */}
      <div>
        {images[idx] ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={images[idx]} alt={vehicle.name} className="aspect-[5/3] w-full rounded-[14px] object-cover" />
        ) : (
          <div className="grid aspect-[5/3] w-full place-items-center rounded-[14px] bg-raised">
            <CarMark cls={vehicle.cls} hue={vehicle.hue} className="h-24 w-48 opacity-80" />
          </div>
        )}
        {images.length > 1 && (
          <div className="no-scrollbar mt-2.5 flex gap-2 overflow-x-auto">
            {images.map((src, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={src}
                src={src}
                alt=""
                onClick={() => setIdx(i)}
                className={`h-14 w-20 shrink-0 cursor-pointer rounded-[8px] object-cover transition-opacity ${
                  i === idx ? "ring-1 ring-accent" : "opacity-60 hover:opacity-100"
                }`}
              />
            ))}
          </div>
        )}
      </div>

      {/* identity + price */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <span className="rounded-full border border-hairline px-2.5 py-0.5 text-[0.62rem] uppercase tracking-[0.2em] text-muted">
            {t.classes[vehicle.cls]}
          </span>
          <h3 className="mt-2 font-display text-[1.25rem] leading-tight text-ink">{vehicle.name}</h3>
          {vehicle.jp && <p className="mt-0.5 text-[0.8rem] font-light text-muted">{vehicle.jp}</p>}
        </div>
        <div className="tnum shrink-0 text-right leading-none">
          <span className="text-[1.25rem] text-ink">{yen(vehicle.pricePerDay)}</span>
          <span className="ml-1 text-[0.78rem] font-light text-muted">{t.fleet.perDay}</span>
        </div>
      </div>

      {/* spec tiles */}
      <div className="grid grid-cols-2 gap-2.5">
        {stats.map((s) => (
          <div key={s.label} className="rounded-[12px] border border-hairline px-3.5 py-3">
            <p className="tnum text-[0.95rem] text-ink">{s.value}</p>
            <p className="mt-0.5 text-[0.62rem] font-medium uppercase tracking-[0.18em] text-muted">{s.label}</p>
          </div>
        ))}
      </div>

      {/* highlights */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {tags.map((tag, i) => (
            <span key={i} className="rounded-full bg-accent/10 px-3 py-1 text-[0.72rem] text-accent">
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/** Detail sheet: BottomSheet on mobile, right-hand slide-in drawer on desktop. */
export function VehicleSheet({ vehicle, onClose }: { vehicle: Vehicle; onClose: () => void }) {
  const { t, locale } = useI18n();
  const isMobile = useIsMobile();
  const [entered, setEntered] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const mounted = useMounted();

  const requestClose = useCallback(() => {
    setLeaving(true);
    window.setTimeout(onClose, 220);
  }, [onClose]);

  useEffect(() => {
    const id = requestAnimationFrame(() => setEntered(true));
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && requestClose();
    document.addEventListener("keydown", onKey);
    return () => {
      cancelAnimationFrame(id);
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKey);
    };
  }, [requestClose]);

  if (isMobile) {
    return (
      <BottomSheet title={t.booking.vehicleInfo} onClose={onClose}>
        <SheetContent vehicle={vehicle} t={t} locale={locale} />
      </BottomSheet>
    );
  }

  if (!mounted) return null;
  const shown = entered && !leaving;

  return createPortal(
    <div className="fixed inset-0 z-[80]" role="dialog" aria-modal="true" aria-label={t.booking.vehicleInfo}>
      <div
        className={`absolute inset-0 bg-black/50 transition-opacity duration-200 ${shown ? "opacity-100" : "opacity-0"}`}
        onClick={requestClose}
      />
      <div
        className={`absolute inset-y-0 right-0 flex w-[26rem] max-w-[92vw] flex-col border-l border-hairline bg-surface shadow-[var(--shadow-card)] transition-transform duration-200 ease-out ${
          shown ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-hairline px-5 py-4">
          <span className="text-[0.7rem] font-medium uppercase tracking-[0.2em] text-muted">{t.booking.vehicleInfo}</span>
          <button onClick={requestClose} aria-label="Close" className="grid h-8 w-8 place-items-center rounded-md text-muted hover:bg-raised hover:text-ink">
            <svg viewBox="0 0 24 24" className="h-5 w-5" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round"><path d="M6 6l12 12M18 6 6 18" /></svg>
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-5">
          <SheetContent vehicle={vehicle} t={t} locale={locale} />
        </div>
      </div>
    </div>,
    document.body,
  );
}
