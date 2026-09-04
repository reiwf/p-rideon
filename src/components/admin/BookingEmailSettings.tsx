"use client";

/* The guest booking-confirmation email. Only the wording is editable — the
   layout, the booking-details table and the styling stay fixed, so a typo can't
   break the email. Text lives in the `booking_email` row of car_settings and is
   rendered by the Postgres trigger that actually sends it, so confirmations
   still go out if the site is down.

   The video linked here is the email's OWN video, uploaded separately from the
   safety video shown during booking — the two serve different purposes.

   The test send goes through the same `car_booking_email` builder as a real
   booking, so what lands in the inbox is what a guest would receive. */

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAdminT } from "@/lib/adminI18n";
import { locales, type Locale } from "@/lib/i18n";
import type { ContentI18n } from "@/lib/i18nContent";
import { Button, Field, inputCls } from "./ui";
import { TranslationsPanel } from "./Translatable";
import { LocaleVideoRows, useMediaStorageReady, type LocaleVideos } from "./VideoUploader";
import { loadSetting, saveSetting } from "@/lib/settingsRow";

type BookingEmail = {
  showVideo: boolean;
  subject: string;
  intro: string;
  notice: string;
  closing: string;
  videoLabel: string;
  /** the email's own video per language — not the booking-step safety video */
  videos: LocaleVideos;
  i18n: ContentI18n;
};

const EMPTY: BookingEmail = {
  showVideo: true, subject: "", intro: "", notice: "", closing: "", videoLabel: "", videos: {}, i18n: {},
};

/** Placeholders the trigger substitutes. Kept in sync with car_booking_email. */
const VARIABLES = [
  "reference", "customer_name", "vehicle", "pickup_location", "branch_address",
  "pickup_at", "return_at", "total", "insurance", "extras", "video_url",
];

export function BookingEmailSettings() {
  const { t } = useAdminT();
  const e = t.email;
  const [cfg, setCfg] = useState<BookingEmail>(EMPTY);
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [testTo, setTestTo] = useState("");
  const [testLocale, setTestLocale] = useState<Locale>("ja");
  const storageReady = useMediaStorageReady();
  // the row version this page loaded — guards against overwriting a newer save
  const [loadedAt, setLoadedAt] = useState<string | null>(null);

  const set = <K extends keyof BookingEmail>(k: K, v: BookingEmail[K]) => {
    setCfg((c) => ({ ...c, [k]: v }));
    setMsg(null);
  };

  useEffect(() => {
    let alive = true;
    loadSetting<Partial<BookingEmail>>("booking_email")
      .then(({ value, updatedAt }) => {
        if (!alive) return;
        const raw = value ?? {};
        setLoadedAt(updatedAt);
        setCfg({
          showVideo: raw.showVideo !== false,
          subject: raw.subject ?? "", intro: raw.intro ?? "", notice: raw.notice ?? "",
          closing: raw.closing ?? "", videoLabel: raw.videoLabel ?? "",
          videos: raw.videos ?? {}, i18n: raw.i18n ?? {},
        });
      });
    supabase.auth.getUser().then(({ data }) => {
      if (alive && data.user?.email) setTestTo(data.user.email);
    });
    return () => { alive = false; };
  }, []);

  /** Returns true when the row was written. */
  async function persist(): Promise<boolean> {
    const res = await saveSetting("booking_email", cfg, loadedAt);
    if (res.ok) { setLoadedAt(res.updatedAt); return true; }
    setMsg({ ok: false, text: res.conflict ? t.common.conflict : res.error });
    return false;
  }

  async function save() {
    setBusy("save");
    setMsg(null);
    const ok = await persist();
    setBusy("");
    if (ok) setMsg({ ok: true, text: e.saved });
  }

  /** Sends through the same builder the trigger uses — save first, or the test
      shows the previously saved wording rather than what's on screen. */
  async function sendTest() {
    setBusy("test");
    setMsg(null);
    if (!(await persist())) { setBusy(""); return; }
    const { error } = await supabase.rpc("car_send_test_booking_email", { p_to: testTo, p_locale: testLocale });
    setBusy("");
    setMsg(error ? { ok: false, text: error.message } : { ok: true, text: e.testSent.replace("{email}", testTo) });
  }

  return (
    <div className="mb-6 rounded-xl border border-mist bg-white p-5 shadow-[var(--shadow-card)]">
      <p className="text-[0.95rem] font-semibold text-ink">{e.title}</p>
      <p className="mt-0.5 text-[0.78rem] text-stone">{e.hint}</p>

      <div className="mt-3 space-y-3">
        <Field label={e.subject} hint={e.subjectHint}>
          <input className={inputCls} value={cfg.subject} onChange={(ev) => set("subject", ev.target.value)} placeholder={e.subjectPh} />
        </Field>
        <Field label={e.intro} hint={e.introHint}>
          <textarea rows={2} className={inputCls} value={cfg.intro} onChange={(ev) => set("intro", ev.target.value)} placeholder={e.introPh} />
        </Field>
        <Field label={e.notice} hint={e.noticeHint}>
          <textarea rows={3} className={inputCls} value={cfg.notice} onChange={(ev) => set("notice", ev.target.value)} placeholder={e.noticePh} />
        </Field>
        <Field label={e.closing} hint={e.closingHint}>
          <input className={inputCls} value={cfg.closing} onChange={(ev) => set("closing", ev.target.value)} placeholder={e.closingPh} />
        </Field>
      </div>

      <div className="mt-3 rounded-lg border border-mist bg-paper-dim/30 p-3">
        <p className="text-[0.72rem] font-semibold text-stone">{e.varsTitle}</p>
        <p className="mt-0.5 text-[0.7rem] text-stone">{e.varsHint}</p>
        <div className="mt-1.5 flex flex-wrap gap-1">
          {VARIABLES.map((v) => (
            <code key={v} className="rounded border border-mist bg-white px-1.5 py-0.5 text-[0.7rem] text-ink">{`{{${v}}}`}</code>
          ))}
        </div>
      </div>

      <label className="mt-3 flex cursor-pointer items-start gap-2.5">
        <input
          type="checkbox"
          className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--color-expressway)]"
          checked={cfg.showVideo}
          onChange={(ev) => set("showVideo", ev.target.checked)}
        />
        <span>
          <span className="block text-[0.8rem] font-semibold text-ink">{e.videoTitle}</span>
          <span className="block text-[0.72rem] text-stone">{e.videoHint}</span>
        </span>
      </label>
      {cfg.showVideo && (
        <div className="mt-2 space-y-2">
          <Field label={e.videoLabel} hint={e.videoLabelHint}>
            <input className={inputCls} value={cfg.videoLabel} onChange={(ev) => set("videoLabel", ev.target.value)} placeholder={e.videoLabelPh} />
          </Field>
          {!storageReady && <p className="text-[0.75rem] text-signal">{t.bookings.video.notConfigured}</p>}
          <LocaleVideoRows
            videos={cfg.videos}
            onChange={(videos) => set("videos", videos)}
            folder="email"
            onError={(text) => setMsg({ ok: false, text })}
          />
          <p className="text-[0.72rem] text-stone">{e.videosHint}</p>
        </div>
      )}

      <div className="mt-3">
        <TranslationsPanel
          i18n={cfg.i18n}
          onChange={(v) => set("i18n", v)}
          fields={[
            { key: "subject", label: e.subject, base: cfg.subject },
            { key: "intro", label: e.intro, base: cfg.intro },
            { key: "notice", label: e.notice, base: cfg.notice },
            { key: "closing", label: e.closing, base: cfg.closing },
            ...(cfg.showVideo ? [{ key: "videoLabel" as const, label: e.videoLabel, base: cfg.videoLabel }] : []),
          ]}
        />
      </div>

      <div className="mt-4 rounded-lg border border-mist bg-paper-dim/30 p-3">
        <p className="text-[0.8rem] font-semibold text-ink">{e.testTitle}</p>
        <p className="mt-0.5 text-[0.72rem] text-stone">{e.testHint}</p>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <input className={inputCls} inputMode="email" value={testTo} onChange={(ev) => setTestTo(ev.target.value)} />
          <select className={`${inputCls} sm:w-40`} value={testLocale} onChange={(ev) => setTestLocale(ev.target.value as Locale)}>
            {locales.map((l) => <option key={l.code} value={l.code}>{l.native}</option>)}
          </select>
          <Button
            variant="ghost"
            className="shrink-0"
            disabled={Boolean(busy) || !/^\S+@\S+\.\S+$/.test(testTo)}
            onClick={sendTest}
          >
            {busy === "test" ? t.common.loading : e.testSend}
          </Button>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <Button onClick={save} disabled={Boolean(busy)}>{busy === "save" ? t.common.loading : e.save}</Button>
        {msg && <p className={`text-[0.8rem] ${msg.ok ? "text-expressway" : "text-signal"}`}>{msg.text}</p>}
      </div>
    </div>
  );
}
