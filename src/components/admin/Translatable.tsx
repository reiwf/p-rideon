"use client";

/* Translations panel for admin forms. Renders JA/ZH/KO inputs for the given
   fields and a DeepL "Auto-translate" button.

   Staff write in the form's own fields, in whatever language they work in —
   Japanese here. The "written in" selector just says which language that is, so
   DeepL is told the right source; it is preselected by detecting the script of
   what's already typed. Every OTHER language, English included, is a translated
   slot in the i18n blob. English is no longer special: it is filled by
   auto-translate like 中文 and 한국어, and the base text is the fallback. */

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAdminT } from "@/lib/adminI18n";
import { ALL_LOCALES, detectLocale, type ContentI18n } from "@/lib/i18nContent";
import { type Locale } from "@/lib/i18n";
import { Button, inputCls } from "./ui";
import { Globe } from "@/components/icons";

export type TransField =
  | { key: "name" | "description" | "fuel" | "topic" | "question" | "answer" | "address" | "subject" | "intro" | "notice" | "closing" | "videoLabel"; label: string; base: string; list?: false }
  | { key: "features" | "tags"; label: string; base: string[]; list: true };

const LANG_LABEL: Record<Locale, string> = { en: "English", ja: "日本語", zh: "中文", ko: "한국어" };

type Cells = Record<string, Partial<Record<Locale, string | string[]>>>;
const getCell = (i18n: ContentI18n, key: string, loc: Locale) => (i18n as Cells)[key]?.[loc];
const withCell = (i18n: ContentI18n, key: string, loc: Locale, val: string | string[]): ContentI18n => ({
  ...i18n,
  [key]: { ...((i18n as Cells)[key] ?? {}), [loc]: val },
});

export function TranslationsPanel({
  i18n,
  fields,
  onChange,
}: {
  i18n: ContentI18n;
  fields: TransField[];
  onChange: (next: ContentI18n) => void;
}) {
  const { t, lang } = useAdminT();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  // The form's own fields are the source, whatever language they hold.
  const hasBase = fields.some((f) => (f.list ? f.base.length > 0 : f.base.trim().length > 0));

  // Follow what's actually being typed until staff override it — detecting only
  // once on mount would leave a new entry stuck on the console language while
  // they type in another. Falls back to the language the console is set to.
  const [picked, setPicked] = useState<Locale | null>(null);
  const detected = fields.reduce<Locale | null>(
    (found, f) => found ?? detectLocale(f.list ? f.base.join(" ") : f.base),
    null,
  );
  const source = picked ?? detected ?? (lang as Locale);

  const targetLocales = ALL_LOCALES.filter((l) => l !== source);

  async function autoTranslate() {
    setErr("");
    setBusy(true);
    try {
      // flatten English base values, remembering each field's slice
      const segs: { key: TransField["key"]; list: boolean; start: number; len: number }[] = [];
      const payload: string[] = [];
      for (const f of fields) {
        const start = payload.length;
        if (f.list) {
          f.base.forEach((s) => payload.push(s));
          segs.push({ key: f.key, list: true, start, len: f.base.length });
        } else {
          payload.push(f.base);
          segs.push({ key: f.key, list: false, start, len: 1 });
        }
      }

      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token ?? "";
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ text: payload, source, targets: targetLocales }),
      });
      const json = (await res.json()) as { translations?: Record<string, string[]>; error?: string };
      if (!res.ok) throw new Error(json.error || t.tr.failed);

      let next: ContentI18n = { ...i18n };
      for (const loc of targetLocales) {
        const arr = json.translations?.[loc];
        if (!arr) continue;
        for (const seg of segs) {
          const slice = arr.slice(seg.start, seg.start + seg.len);
          next = withCell(next, seg.key, loc, seg.list ? slice : slice[0] ?? "");
        }
      }
      onChange(next);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-lg border border-mist bg-paper-dim/30 p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 text-[0.8rem] font-semibold text-ink">
          <Globe className="h-4 w-4 text-expressway" />
          {t.tr.heading}
        </span>
        <Button type="button" variant="ghost" className="px-3 py-1.5 text-[0.78rem]" disabled={busy || !hasBase} onClick={autoTranslate}>
          {busy ? t.tr.translating : `${t.tr.auto} → ${targetLocales.map((l) => LANG_LABEL[l]).join(" / ")}`}
        </Button>
      </div>
      <p className="mt-1 text-[0.72rem] text-stone">{t.tr.hint}</p>

      <label className="mt-2 flex flex-wrap items-center gap-2">
        <span className="text-[0.72rem] font-semibold text-stone">{t.tr.source}</span>
        <select
          className="rounded-md border border-mist bg-white px-2 py-1 text-[0.78rem] text-ink"
          value={source}
          onChange={(e) => { setPicked(e.target.value as Locale); setErr(""); }}
        >
          {ALL_LOCALES.map((l) => (
            <option key={l} value={l}>{LANG_LABEL[l]}</option>
          ))}
        </select>
        <span className="text-[0.7rem] text-stone">{t.tr.sourceHint.replace("{lang}", LANG_LABEL[source])}</span>
      </label>
      {!hasBase && <p className="mt-1.5 text-[0.72rem] text-signal">{t.tr.sourceEmpty}</p>}
      {err && <p className="mt-1.5 text-[0.72rem] text-signal">{err}</p>}

      <div className="mt-3 space-y-2.5">
        {targetLocales.map((loc) => (
          <div key={loc} className="rounded-md border border-mist bg-white p-2.5">
            <span className="mb-1.5 block text-[0.72rem] font-semibold text-stone">{LANG_LABEL[loc]}</span>
            <div className="space-y-2">
              {fields.map((f) =>
                f.list ? (
                  <label key={f.key} className="block">
                    <span className="mb-0.5 block text-[0.68rem] text-stone">{f.label}</span>
                    <textarea
                      className={`${inputCls} h-16 resize-none`}
                      value={((getCell(i18n, f.key, loc) as string[] | undefined) ?? []).join("\n")}
                      onChange={(e) => onChange(withCell(i18n, f.key, loc, e.target.value.split("\n").map((s) => s.trim()).filter(Boolean)))}
                    />
                    {/* tList() only uses a translated list whose length matches
                        the base list — warn instead of silently falling back */}
                    {(() => {
                      const n = ((getCell(i18n, f.key, loc) as string[] | undefined) ?? []).length;
                      return n > 0 && n !== f.base.length ? (
                        <span className="mt-0.5 block text-[0.68rem] text-signal">
                          {t.tr.listMismatch.replace("{n}", String(f.base.length))}
                        </span>
                      ) : null;
                    })()}
                  </label>
                ) : (
                  <label key={f.key} className="block">
                    <span className="mb-0.5 block text-[0.68rem] text-stone">{f.label}</span>
                    <input
                      className={inputCls}
                      value={(getCell(i18n, f.key, loc) as string | undefined) ?? ""}
                      onChange={(e) => onChange(withCell(i18n, f.key, loc, e.target.value))}
                    />
                  </label>
                ),
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
