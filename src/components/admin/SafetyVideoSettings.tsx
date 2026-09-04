"use client";

/* The precaution video shown at the last step of the booking flow. Subtitles are
   burned into the picture, so there is one MP4 per customer language. Files are
   uploaded through /api/media into the Cloudflare R2 bucket (free egress) and
   referenced from the `safety_video` row of car_settings; a URL can also be
   pasted, so the videos can live anywhere. Clearing every language switches the
   booking-flow requirement off. */

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAdminT } from "@/lib/adminI18n";
import { locales, type Locale } from "@/lib/i18n";
import type { SafetyVideo } from "@/lib/booking";
import { Button, inputCls } from "./ui";

const MAX_BYTES = 100 * 1024 * 1024;
const EMPTY: SafetyVideo = { poster: "", videos: {}, requireFullPlay: true };

export function SafetyVideoSettings() {
  const { t } = useAdminT();
  const v = t.bookings.video;
  const [cfg, setCfg] = useState<SafetyVideo>(EMPTY);
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [storageReady, setStorageReady] = useState(true);
  const fileInput = useRef<HTMLInputElement>(null);
  const target = useRef<Locale>("en");

  useEffect(() => {
    let alive = true;
    supabase
      .from("car_settings")
      .select("value")
      .eq("key", "safety_video")
      .maybeSingle()
      .then(({ data }) => {
        if (!alive) return;
        const raw = (data?.value ?? {}) as Partial<SafetyVideo>;
        setCfg({ poster: raw.poster ?? "", videos: raw.videos ?? {}, requireFullPlay: raw.requireFullPlay !== false });
      });
    // tells "R2 isn't set up yet" apart from "the upload failed"
    fetch("/api/media")
      .then((r) => r.json())
      .then((j: { configured?: boolean }) => { if (alive) setStorageReady(Boolean(j.configured)); })
      .catch(() => { if (alive) setStorageReady(false); });
    return () => { alive = false; };
  }, []);

  function setVideo(code: Locale, url: string) {
    setCfg((c) => {
      const videos = { ...c.videos };
      if (url) videos[code] = url;
      else delete videos[code];
      return { ...c, videos };
    });
    setMsg(null);
  }

  async function onFile(files: FileList | null) {
    const file = files?.[0];
    const code = target.current;
    if (!file) return;
    setMsg(null);
    if (file.size > MAX_BYTES) { setMsg({ ok: false, text: v.tooBig }); return; }

    setBusy(code);
    try {
      const { data: session } = await supabase.auth.getSession();
      const ext = (file.name.split(".").pop() || "mp4").toLowerCase();
      const res = await fetch(`/api/media?folder=safety/${code}&ext=${encodeURIComponent(ext)}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.session?.access_token ?? ""}`,
          "Content-Type": file.type || "video/mp4",
        },
        body: file,
      });
      const json = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !json.url) {
        setStorageReady(json.error !== "not_configured");
        throw new Error(json.error === "not_configured" ? v.notConfigured : json.error === "too_big" ? v.tooBig : json.error || `HTTP ${res.status}`);
      }
      setVideo(code, json.url);
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message });
    } finally {
      setBusy("");
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  function pick(code: Locale) {
    target.current = code;
    fileInput.current?.click();
  }

  async function save() {
    setBusy("save");
    setMsg(null);
    const { error } = await supabase.from("car_settings").upsert({ key: "safety_video", value: cfg });
    setBusy("");
    setMsg(error ? { ok: false, text: error.message } : { ok: true, text: v.saved });
  }

  return (
    <div className="mb-6 rounded-xl border border-mist bg-white p-4 shadow-[var(--shadow-card)]">
      <p className="text-[0.9rem] font-semibold text-ink">{v.title}</p>
      <p className="mt-0.5 text-[0.78rem] text-stone">{v.hint}</p>
      {!storageReady && <p className="mt-1.5 text-[0.78rem] text-signal"></p>}

      <input ref={fileInput} type="file" accept="video/mp4,video/webm" className="hidden" onChange={(e) => onFile(e.target.files)} />

      <ul className="mt-3 divide-y divide-mist rounded-lg border border-mist">
        {locales.map(({ code, native }) => {
          const url = cfg.videos[code] ?? "";
          return (
            <li key={code} className="flex flex-wrap items-center gap-2 px-3 py-2.5">
              <span className="w-20 shrink-0 text-[0.8rem] font-semibold text-ink">{native}</span>
              <input
                className={`${inputCls} min-w-[12rem] flex-1`}
                value={url}
                placeholder={v.urlPh}
                onChange={(e) => setVideo(code, e.target.value.trim())}
              />
              <button
                type="button"
                disabled={Boolean(busy)}
                onClick={() => pick(code)}
                className="shrink-0 text-[0.75rem] font-semibold text-ink hover:underline disabled:opacity-50"
              >
                {busy === code ? v.uploading : url ? v.replace : v.upload}
              </button>
              {url && (
                <>
                  <a href={url} target="_blank" rel="noreferrer" className="shrink-0 text-[0.75rem] font-semibold text-ink hover:underline">
                    {v.preview}
                  </a>
                  <button type="button" onClick={() => setVideo(code, "")} className="shrink-0 text-[0.75rem] font-semibold text-signal hover:underline">
                    {v.remove}
                  </button>
                </>
              )}
            </li>
          );
        })}
      </ul>
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
        <Button onClick={save} disabled={Boolean(busy)}>{v.save}</Button>
        {msg && <p className={`text-[0.78rem] ${msg.ok ? "text-expressway" : "text-signal"}`}>{msg.text}</p>}
      </div>
    </div>
  );
}
