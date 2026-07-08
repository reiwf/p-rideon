"use client";

/* Translations panel for admin forms. Renders JA/ZH/KO inputs for the given
   fields and a DeepL "Auto-translate" button. English lives in the form's main
   inputs (the fallback); this panel only edits the `i18n` blob. */

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAdminT } from "@/lib/adminI18n";
import { T_LOCALES, type TLocale, type ContentI18n } from "@/lib/i18nContent";
import { Button, inputCls } from "./ui";
import { Globe } from "@/components/icons";

export type TransField =
  | { key: "name" | "description" | "fuel"; label: string; base: string; list?: false }
  | { key: "features" | "tags"; label: string; base: string[]; list: true };

const LANG_LABEL: Record<TLocale, string> = { ja: "日本語", zh: "中文", ko: "한국어" };

type Cells = Record<string, Partial<Record<TLocale, string | string[]>>>;
const getCell = (i18n: ContentI18n, key: string, loc: TLocale) => (i18n as Cells)[key]?.[loc];
const withCell = (i18n: ContentI18n, key: string, loc: TLocale, val: string | string[]): ContentI18n => ({
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
  const { t } = useAdminT();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const hasBase = fields.some((f) => (f.list ? f.base.length > 0 : f.base.trim().length > 0));

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
        body: JSON.stringify({ text: payload, targets: T_LOCALES }),
      });
      const json = (await res.json()) as { translations?: Record<string, string[]>; error?: string };
      if (!res.ok) throw new Error(json.error || t.tr.failed);

      let next: ContentI18n = { ...i18n };
      for (const loc of T_LOCALES) {
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
          {busy ? t.tr.translating : `${t.tr.auto} · 日中韓`}
        </Button>
      </div>
      <p className="mt-1 text-[0.72rem] text-stone">{t.tr.hint}</p>
      {err && <p className="mt-1.5 text-[0.72rem] text-signal">{err}</p>}

      <div className="mt-3 space-y-2.5">
        {T_LOCALES.map((loc) => (
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
                    {/* tList() only uses a translated list whose length matches the
                        English base — warn instead of silently falling back */}
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
