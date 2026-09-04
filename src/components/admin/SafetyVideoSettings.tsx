"use client";

/* The precaution video shown at the last step of the booking flow. Subtitles are
   burned into the picture, so there is one MP4 per customer language. Files are
   uploaded through /api/media into the Cloudflare R2 bucket (free egress) and
   referenced from the `safety_video` row of car_settings; a URL can also be
   pasted, so the videos can live anywhere. Clearing every language switches the
   booking-flow requirement off. */

import { useEffect, useState } from "react";
import { useAdminT } from "@/lib/adminI18n";
import type { SafetyVideo } from "@/lib/booking";
import { Button } from "./ui";
import { LocaleVideoRows, useMediaStorageReady } from "./VideoUploader";
import { loadSetting, saveSetting } from "@/lib/settingsRow";

const EMPTY: SafetyVideo = { poster: "", videos: {}, requireFullPlay: true };

export function SafetyVideoSettings() {
  const { t } = useAdminT();
  const v = t.bookings.video;
  const [cfg, setCfg] = useState<SafetyVideo>(EMPTY);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const storageReady = useMediaStorageReady();
  const [loadedAt, setLoadedAt] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    loadSetting<Partial<SafetyVideo>>("safety_video")
      .then(({ value, updatedAt }) => {
        if (!alive) return;
        const raw = value ?? {};
        setLoadedAt(updatedAt);
        setCfg({
          poster: raw.poster ?? "",
          videos: raw.videos ?? {},
          requireFullPlay: raw.requireFullPlay !== false,
        });
      });
    return () => { alive = false; };
  }, []);

  async function save() {
    setBusy(true);
    setMsg(null);
    const res = await saveSetting("safety_video", cfg, loadedAt);
    setBusy(false);
    if (res.ok) { setLoadedAt(res.updatedAt); setMsg({ ok: true, text: v.saved }); }
    else setMsg({ ok: false, text: res.conflict ? t.common.conflict : res.error });
  }

  return (
    <div className="mb-6 rounded-xl border border-mist bg-white p-4 shadow-[var(--shadow-card)]">
      <p className="text-[0.9rem] font-semibold text-ink">{v.title}</p>
      <p className="mt-0.5 text-[0.78rem] text-stone">{v.hint}</p>
      {!storageReady && <p className="mt-1.5 text-[0.78rem] text-signal">{v.notConfigured}</p>}

      <div className="mt-3">
        <LocaleVideoRows
          videos={cfg.videos}
          onChange={(videos) => { setCfg((c) => ({ ...c, videos })); setMsg(null); }}
          folder="safety"
          onError={(text) => setMsg({ ok: false, text })}
        />
      </div>
      <p className="mt-1.5 text-[0.72rem] text-stone">{v.fallbackNote}</p>

      <label className="mt-3 flex cursor-pointer items-start gap-2.5">
        <input
          type="checkbox"
          className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--color-expressway)]"
          checked={cfg.requireFullPlay}
          onChange={(e) => { setCfg((c) => ({ ...c, requireFullPlay: e.target.checked })); setMsg(null); }}
        />
        <span>
          <span className="block text-[0.8rem] font-semibold text-ink">{v.strictTitle}</span>
          <span className="block text-[0.72rem] text-stone">{cfg.requireFullPlay ? v.strictOn : v.strictOff}</span>
        </span>
      </label>

      <div className="mt-3 flex items-center gap-3">
        <Button onClick={save} disabled={busy}>{v.save}</Button>
        {msg && <p className={`text-[0.78rem] ${msg.ok ? "text-expressway" : "text-signal"}`}>{msg.text}</p>}
      </div>
    </div>
  );
}
