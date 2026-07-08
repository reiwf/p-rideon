"use client";

import Link from "next/link";
import { useI18n } from "../LanguageProvider";

export function BookingNotFound() {
  const { t } = useI18n();
  return (
    <section className="mx-auto grid min-h-[60vh] max-w-md place-items-center px-6 text-center">
      <div>
        <h1 className="font-display text-[1.5rem] leading-snug text-ink">{t.booking.notFound.heading}</h1>
        <p className="mt-2 font-light text-muted">{t.booking.notFound.body}</p>
        <Link
          href="/#fleet"
          className="mt-7 inline-flex min-h-[46px] items-center rounded-[14px] border border-accent px-7 text-[0.78rem] font-medium uppercase tracking-[0.2em] text-accent transition-colors hover:bg-accent hover:text-accent-ink"
        >
          {t.booking.notFound.back}
        </Link>
      </div>
    </section>
  );
}
