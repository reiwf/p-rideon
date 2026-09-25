"use client";

/* What the guest sees coming back from Stripe Checkout.

   `state` is what the database says, not what the URL claims: a guest who
   edits the query string still sees the real outcome. The webhook is the only
   thing that can move a booking to paid. */

import { useState } from "react";
import Link from "next/link";
import { useI18n } from "../LanguageProvider";
import { Check } from "../icons";

export function BookingComplete({
  state, cancelled, reference, bookingId,
}: {
  state: "paid" | "pending" | "unknown";
  cancelled: boolean;
  reference: string;
  bookingId: string;
}) {
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const paid = state === "paid";
  // an unknown booking reads as "not finished" rather than as a failure: the
  // guest still has a reference and an email on the way if it did go through
  const stalled = !paid && (cancelled || state === "unknown");

  async function retry() {
    setBusy(true);
    setFailed(false);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId, reference }),
      });
      const json = (await res.json()) as { url?: string; paid?: boolean };
      if (json.url) { window.location.href = json.url; return; }
      if (json.paid) { window.location.reload(); return; }
    } catch {
      // handled below
    }
    setBusy(false);
    setFailed(true);
  }

  const heading = paid
    ? t.booking.payment.paidHeading
    : stalled
      ? t.booking.payment.cancelledHeading
      : t.booking.payment.pendingHeading;

  const body = paid
    ? t.booking.payment.paidBody
    : stalled
      ? t.booking.payment.cancelledBody
      : t.booking.payment.pendingBody;

  return (
    <section className="mx-auto max-w-xl px-6 py-20">
      <div className="rounded-[18px] border border-hairline bg-surface p-8 text-center">
        <span
          className={`mx-auto grid h-14 w-14 place-items-center rounded-full border ${
            paid ? "border-accent bg-accent text-accent-ink" : "border-hairline text-muted"
          }`}
        >
          {paid ? <Check className="h-7 w-7" /> : <span className="font-display text-[1.4rem]">!</span>}
        </span>

        <h1 className="mt-6 font-display text-[clamp(1.35rem,3.6vw,1.75rem)] leading-snug text-ink">{heading}</h1>
        <p className="mt-3 text-[0.9rem] font-light leading-[1.65] text-muted">{body}</p>

        {reference && (
          <div className="mt-7 rounded-[12px] border border-hairline bg-raised px-5 py-4">
            <span className="text-[0.6rem] font-medium uppercase tracking-[0.24em] text-muted">
              {t.booking.payment.refLabel}
            </span>
            <p className="tnum mt-1.5 font-display text-[1.4rem] text-ink">{reference}</p>
          </div>
        )}

        {failed && (
          <p className="mt-5 rounded-[12px] border border-signal/40 bg-signal/10 px-3.5 py-2.5 text-sm text-signal">
            {t.booking.payment.startFailed}
          </p>
        )}

        <div className="mt-8 flex flex-col items-center gap-3">
          {stalled && bookingId && reference && (
            <button
              type="button"
              onClick={retry}
              disabled={busy}
              className="flex min-h-[48px] w-full items-center justify-center rounded-[14px] bg-accent px-8 text-[0.8rem] font-medium uppercase tracking-[0.2em] text-accent-ink transition-[filter] hover:brightness-[1.08] disabled:opacity-60"
            >
              {busy ? t.booking.payment.redirecting : t.booking.payment.retry}
            </button>
          )}
          <Link
            href="/"
            className="text-[0.78rem] font-medium uppercase tracking-[0.16em] text-muted transition-colors hover:text-ink"
          >
            {t.booking.payment.home}
          </Link>
        </div>
      </div>
    </section>
  );
}
