"use client";

/* Operating hours and footer contact details. Both live in the `operation` row
   of car_settings and are read by the public site anonymously, so a change here
   reaches the time pickers and the footer without a deploy. */

import { useEffect, useMemo, useState } from "react";
import { useAdminT } from "@/lib/adminI18n";
import { Button, Field, PageHeader, inputCls } from "@/components/admin/ui";
import { TranslationsPanel } from "@/components/admin/Translatable";
import { BookingEmailSettings } from "@/components/admin/BookingEmailSettings";
import { PaymentSettings } from "@/components/admin/PaymentSettings";
import { DEFAULT_SETTINGS, buildRentalTimes, parseSettings, type SiteSettings } from "@/lib/siteSettings";
import { loadSetting, saveSetting } from "@/lib/settingsRow";

const STEPS = [15, 20, 30, 60];

export default function SettingsPage() {
  const { t } = useAdminT();
  const s = t.settings;
  const [cfg, setCfg] = useState<SiteSettings>(DEFAULT_SETTINGS);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [loadedAt, setLoadedAt] = useState<string | null>(null);

  const set = <K extends keyof SiteSettings>(k: K, v: SiteSettings[K]) => {
    setCfg((c) => ({ ...c, [k]: v }));
    setMsg(null);
  };

  useEffect(() => {
    let alive = true;
    loadSetting("operation").then(({ value, updatedAt }) => {
      if (!alive) return;
      setLoadedAt(updatedAt);
      setCfg(parseSettings(value));
    });
    return () => { alive = false; };
  }, []);

  // exactly what the customer will be offered, so staff can see the effect
  const times = useMemo(
    () => buildRentalTimes(cfg.openTime, cfg.closeTime, cfg.stepMinutes),
    [cfg.openTime, cfg.closeTime, cfg.stepMinutes],
  );
  const invalid = cfg.closeTime < cfg.openTime;

  async function save() {
    setBusy(true);
    setMsg(null);
    const res = await saveSetting("operation", cfg, loadedAt);
    setBusy(false);
    if (res.ok) { setLoadedAt(res.updatedAt); setMsg({ ok: true, text: s.saved }); }
    else setMsg({ ok: false, text: res.conflict ? t.common.conflict : res.error });
  }

  return (
    <>
      <PageHeader title={s.title} sub={s.sub} />

      <PaymentSettings />

      <div className="mb-6 rounded-xl border border-mist bg-white p-5 shadow-[var(--shadow-card)]">
        <p className="text-[0.95rem] font-semibold text-ink">{s.hoursTitle}</p>
        <p className="mt-0.5 text-[0.78rem] text-stone">{s.hoursHint}</p>

        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <Field label={s.openTime}>
            <input type="time" className={inputCls} value={cfg.openTime} onChange={(e) => set("openTime", e.target.value)} />
          </Field>
          <Field label={s.closeTime}>
            <input type="time" className={inputCls} value={cfg.closeTime} onChange={(e) => set("closeTime", e.target.value)} />
          </Field>
          <Field label={s.step} hint={s.stepHint}>
            <select className={inputCls} value={cfg.stepMinutes} onChange={(e) => set("stepMinutes", Number(e.target.value))}>
              {STEPS.map((m) => <option key={m} value={m}>{s.stepMinutes.replace("{n}", String(m))}</option>)}
            </select>
          </Field>
        </div>

        {invalid ? (
          <p className="mt-2 text-[0.78rem] text-signal">{s.hoursInvalid}</p>
        ) : (
          <p className="mt-2 text-[0.78rem] text-stone">
            {s.preview.replace("{n}", String(times.length)).replace("{first}", times[0] ?? "—").replace("{last}", times[times.length - 1] ?? "—")}
          </p>
        )}
      </div>

      <div className="mb-6 rounded-xl border border-mist bg-white p-5 shadow-[var(--shadow-card)]">
        <p className="text-[0.95rem] font-semibold text-ink">{s.contactTitle}</p>
        <p className="mt-0.5 text-[0.78rem] text-stone">{s.contactHint}</p>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Field label={s.phone} hint={s.phoneHint}>
            <input className={inputCls} value={cfg.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+81 6-0000-0000" />
          </Field>
          <Field label={s.email} hint={s.emailHint}>
            <input className={inputCls} inputMode="email" value={cfg.email} onChange={(e) => set("email", e.target.value)} placeholder="info@p-rideon.com" />
          </Field>
        </div>

        <div className="mt-3">
          <Field label={s.address} hint={s.addressHint}>
            <input className={inputCls} value={cfg.address} onChange={(e) => set("address", e.target.value)} placeholder={s.addressPh} />
          </Field>
        </div>

        <div className="mt-3">
          <TranslationsPanel
            i18n={cfg.i18n}
            onChange={(v) => set("i18n", v)}
            fields={[{ key: "address", label: s.address, base: cfg.address }]}
          />
        </div>
      </div>

      <div className="mb-6 flex items-center gap-3">
        <Button onClick={save} disabled={busy || invalid}>{busy ? t.common.loading : s.save}</Button>
        {msg && <p className={`text-[0.8rem] ${msg.ok ? "text-expressway" : "text-signal"}`}>{msg.text}</p>}
      </div>

      <BookingEmailSettings />
    </>
  );
}
