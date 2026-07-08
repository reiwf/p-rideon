"use client";

import { useEffect, useState } from "react";
import { useAdminData } from "@/lib/adminStore";
import { useAdminT } from "@/lib/adminI18n";
import { supabase } from "@/lib/supabaseClient";
import { Badge, Button, PageHeader, inputCls, yen } from "@/components/admin/ui";

function fmt(d: string | null) {
  if (!d) return "—";
  const t = new Date(d);
  return t.toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

const statusTone: Record<string, "ok" | "off" | "neutral" | "star"> = {
  pending: "star", confirmed: "ok", cancelled: "off", completed: "neutral",
};

/** Staff addresses that get an email on every new booking (car_settings). */
function NotifySettings() {
  const { t } = useAdminT();
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    let alive = true;
    supabase
      .from("car_settings")
      .select("value")
      .eq("key", "booking_notify_emails")
      .maybeSingle()
      .then(({ data }) => {
        if (!alive) return;
        const arr = (data?.value as string[] | null) ?? [];
        setValue(arr.join(", "));
      });
    return () => { alive = false; };
  }, []);

  async function save() {
    setBusy(true);
    setMsg(null);
    const emails = value.split(/[,;\s]+/).map((s) => s.trim()).filter((s) => /\S+@\S+\.\S+/.test(s));
    const { error } = await supabase.from("car_settings").upsert({ key: "booking_notify_emails", value: emails });
    setBusy(false);
    if (error) { setMsg({ ok: false, text: error.message }); return; }
    setValue(emails.join(", "));
    setMsg({ ok: true, text: t.bookings.notifySaved });
  }

  return (
    <div className="mb-6 rounded-xl border border-mist bg-white p-4 shadow-[var(--shadow-card)]">
      <p className="text-[0.9rem] font-semibold text-ink">{t.bookings.notifyTitle}</p>
      <p className="mt-0.5 text-[0.78rem] text-stone">{t.bookings.notifyHint}</p>
      <div className="mt-2.5 flex flex-col gap-2 sm:flex-row">
        <input
          className={inputCls}
          value={value}
          onChange={(e) => { setValue(e.target.value); setMsg(null); }}
          placeholder={t.bookings.notifyPh}
          inputMode="email"
        />
        <Button onClick={save} disabled={busy} className="shrink-0">{t.bookings.notifySave}</Button>
      </div>
      {msg && <p className={`mt-1.5 text-[0.78rem] ${msg.ok ? "text-expressway" : "text-signal"}`}>{msg.text}</p>}
    </div>
  );
}

export default function BookingsPage() {
  const { data } = useAdminData();
  const { t, lang } = useAdminT();
  const bookings = data.bookings;

  const statusLabel = (s: string) => (t.bookings.status as Record<string, string>)[s] ?? s;
  // bookings store the licence country as an ISO code — show staff the name
  const regionName = (code: string) => {
    try {
      return new Intl.DisplayNames([lang], { type: "region" }).of(code) ?? code;
    } catch {
      return code;
    }
  };

  return (
    <>
      <PageHeader title={t.bookings.title} sub={t.bookings.sub} />

      <NotifySettings />

      {bookings.length === 0 ? (
        <div className="grid place-items-center rounded-xl border border-dashed border-mist bg-white px-6 py-16 text-center">
          <svg viewBox="0 0 24 24" className="h-10 w-10 text-mist" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M7 4v3M17 4v3M4 9h16M5 6h14v14H5zM9 14h2M13 14h2M9 17h2" />
          </svg>
          <h2 className="mt-4 font-display text-[1.15rem] font-bold text-ink">{t.bookings.empty}</h2>
          <p className="mt-1 max-w-sm text-sm text-stone">{t.bookings.emptyBody}</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-mist bg-white shadow-[var(--shadow-card)]">
          <table className="w-full min-w-[48rem] text-sm">
            <thead className="border-b border-mist bg-paper-dim/40 text-left text-[0.72rem] uppercase tracking-wide text-stone">
              <tr>
                <th className="px-4 py-3 font-semibold">{t.bookings.thRef}</th>
                <th className="px-4 py-3 font-semibold">{t.bookings.thCustomer}</th>
                <th className="hidden px-4 py-3 font-semibold md:table-cell">{t.bookings.thVehicle}</th>
                <th className="hidden px-4 py-3 font-semibold xl:table-cell">{t.bookings.extras}</th>
                <th className="hidden px-4 py-3 font-semibold lg:table-cell">{t.bookings.thPickup}</th>
                <th className="px-4 py-3 text-right font-semibold">{t.bookings.thTotal}</th>
                <th className="px-4 py-3 font-semibold">{t.common.status}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-mist">
              {bookings.map((b) => (
                <tr key={b.id} className="hover:bg-paper-dim/30">
                  <td className="px-4 py-3 font-mono text-[0.8rem] font-semibold text-ink">{b.reference}</td>
                  <td className="px-4 py-3">
                    <span className="block text-ink">{b.customerName || "—"}</span>
                    <span className="block text-[0.75rem] text-stone">{b.customerEmail}</span>
                    {b.licenseCountry && (
                      <span className="block text-[0.75rem] text-stone">{t.bookings.license}: {regionName(b.licenseCountry)}</span>
                    )}
                  </td>
                  <td className="hidden px-4 py-3 text-stone md:table-cell">{b.vehicleName}</td>
                  <td className="hidden px-4 py-3 text-stone xl:table-cell">
                    {b.extras.length === 0 ? "—" : b.extras.map((x) => `${x.name} ×${x.qty}`).join(", ")}
                  </td>
                  <td className="hidden px-4 py-3 text-stone lg:table-cell">{fmt(b.pickupAt)}</td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums text-ink">{yen(b.estimatedTotal)}</td>
                  <td className="px-4 py-3"><Badge tone={statusTone[b.status] ?? "neutral"}>{statusLabel(b.status)}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
