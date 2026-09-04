"use client";

/* One video per customer language — used by both the booking-step safety video
   and the confirmation-email video, which are separate files serving different
   purposes. Uploads go through /api/media into Cloudflare R2; a URL can also be
   pasted, so the files can live anywhere. */

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAdminT } from "@/lib/adminI18n";
import { locales, type Locale } from "@/lib/i18n";
import { inputCls } from "./ui";

export type LocaleVideos = Partial<Record<Locale, string>>;

const MAX_BYTES = 100 * 1024 * 1024;

/** True when R2 is wired up, so callers can explain an upload button that
    would otherwise just fail. */
export function useMediaStorageReady() {
  const [ready, setReady] = useState(true);
  useEffect(() => {
    let alive = true;
    fetch("/api/media")
      .then((r) => r.json())
      .then((j: { configured?: boolean }) => { if (alive) setReady(Boolean(j.configured)); })
      .catch(() => { if (alive) setReady(false); });
    return () => { alive = false; };
  }, []);
  return ready;
}

export function LocaleVideoRows({
  videos,
  onChange,
  folder,
  onError,
}: {
  videos: LocaleVideos;
  onChange: (next: LocaleVideos) => void;
  /** storage path prefix, e.g. "safety" or "email" — keeps the two sets apart */
  folder: string;
  onError: (message: string) => void;
}) {
  const { t } = useAdminT();
  const v = t.bookings.video;
  const [busy, setBusy] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);
  const target = useRef<Locale>("en");

  function setVideo(code: Locale, url: string) {
    const next = { ...videos };
    if (url) next[code] = url;
    else delete next[code];
    onChange(next);
  }

  async function onFile(files: FileList | null) {
    const file = files?.[0];
    const code = target.current;
    if (!file) return;
    if (file.size > MAX_BYTES) { onError(v.tooBig); return; }

    setBusy(code);
    try {
      const { data: session } = await supabase.auth.getSession();
      const ext = (file.name.split(".").pop() || "mp4").toLowerCase();
      const res = await fetch(`/api/media?folder=${encodeURIComponent(folder)}/${code}&ext=${encodeURIComponent(ext)}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.session?.access_token ?? ""}`,
          "Content-Type": file.type || "video/mp4",
        },
        body: file,
      });
      const json = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !json.url) {
        throw new Error(
          json.error === "not_configured" ? v.notConfigured
          : json.error === "too_big" ? v.tooBig
          : json.error || `HTTP ${res.status}`,
        );
      }
      setVideo(code, json.url);
    } catch (e) {
      onError((e as Error).message);
    } finally {
      setBusy("");
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  return (
    <>
      <input ref={fileInput} type="file" accept="video/mp4,video/webm" className="hidden" onChange={(e) => onFile(e.target.files)} />
      <ul className="divide-y divide-mist rounded-lg border border-mist">
        {locales.map(({ code, native }) => {
          const url = videos[code] ?? "";
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
                onClick={() => { target.current = code; fileInput.current?.click(); }}
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
    </>
  );
}
