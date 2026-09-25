"use client";

/* The Pay-before-book switch.

   Turning this on changes a reservation from a promise into a transaction, so
   the card refuses to arm the switch until the server actually has its Stripe
   keys — switching it on without them would break every reservation, and the
   guest would find out, not the operator. */

import { useEffect, useState } from "react";
import { useAdminT } from "@/lib/adminI18n";
import { supabase } from "@/lib/supabaseClient";
import { loadSetting, saveSetting } from "@/lib/settingsRow";

type Payments = { payBeforeBook: boolean };
type Readiness = { secretKey: boolean; webhookSecret: boolean; serviceRoleKey: boolean };

const KEY_LABEL: Record<keyof Readiness, string> = {
  secretKey: "STRIPE_SECRET_KEY",
  webhookSecret: "STRIPE_WEBHOOK_SECRET",
  serviceRoleKey: "SUPABASE_SERVICE_ROLE_KEY",
};

export function PaymentSettings() {
  const { t } = useAdminT();
  const s = t.payments;

  const [on, setOn] = useState(false);
  const [loadedAt, setLoadedAt] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [ready, setReady] = useState<Readiness | null>(null);

  useEffect(() => {
    let alive = true;

    loadSetting<Payments>("payments").then(({ value, updatedAt }) => {
      if (!alive) return;
      setLoadedAt(updatedAt);
      setOn(value?.payBeforeBook === true);
    });

    // ask the server whether its Stripe keys are present (booleans only)
    supabase.auth.getSession().then(async ({ data }) => {
      const token = data.session?.access_token ?? "";
      if (!token) return;
      try {
        const res = await fetch("/api/checkout", { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) return;
        const json = (await res.json()) as Readiness;
        if (alive) setReady(json);
      } catch {
        // leave it unknown; the card then just shows the checking state
      }
    });

    return () => { alive = false; };
  }, []);

  const missing = ready
    ? (Object.keys(KEY_LABEL) as (keyof Readiness)[]).filter((k) => !ready[k])
    : [];
  const configured = ready !== null && missing.length === 0;

  async function save(next: boolean) {
    setBusy(true);
    setMsg(null);
    const res = await saveSetting("payments", { payBeforeBook: next }, loadedAt);
    setBusy(false);
    if (res.ok) {
      setLoadedAt(res.updatedAt);
      setOn(next);
      setMsg({ ok: true, text: s.saved });
    } else {
      setMsg({ ok: false, text: res.conflict ? t.common.conflict : res.error });
    }
  }

  return (
    <div className="mb-6 rounded-xl border border-mist bg-white p-5 shadow-[var(--shadow-card)]">
      <p className="text-[0.95rem] font-semibold text-ink">{s.title}</p>
      <p className="mt-0.5 text-[0.78rem] leading-[1.5] text-stone">{s.hint}</p>

      {/* server readiness */}
      <p
        className={`mt-3 rounded-lg px-3 py-2 text-[0.78rem] ${
          ready === null
            ? "bg-paper-dim text-stone"
            : configured
              ? "bg-expressway/10 text-expressway"
              : "bg-signal/10 text-signal"
        }`}
      >
        {ready === null
          ? s.checking
          : configured
            ? s.ready
            : `${s.notReady} ${s.missing.replace("{keys}", missing.map((k) => KEY_LABEL[k]).join(", "))}`}
      </p>

      <label
        className={`mt-3 flex items-start gap-2.5 rounded-lg border border-mist bg-paper-dim/30 px-3 py-2.5 ${
          configured || on ? "" : "opacity-60"
        }`}
      >
        <input
          type="checkbox"
          checked={on}
          // allow switching OFF even when unconfigured, never ON
          disabled={busy || (!configured && !on)}
          onChange={(e) => save(e.target.checked)}
          className="mt-0.5 h-4 w-4 accent-[var(--color-expressway)]"
        />
        <span>
          <span className="block text-sm text-ink">{s.toggleLabel}</span>
          <span className="block text-[0.75rem] text-stone">{s.toggleHint}</span>
        </span>
      </label>

      {on && <p className="mt-2 text-[0.78rem] text-signal">{s.onWarning}</p>}
      {msg && (
        <p className={`mt-2 text-[0.78rem] ${msg.ok ? "text-expressway" : "text-signal"}`}>{msg.text}</p>
      )}
      {busy && <p className="mt-2 text-[0.78rem] text-stone">…</p>}
    </div>
  );
}
