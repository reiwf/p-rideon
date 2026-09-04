/* Translation helpers for admin-entered catalog content (insurances, rate plans,
   vehicles, FAQ). The row's base columns hold whatever language staff wrote in
   — Japanese, for this operator — and the `i18n` jsonb column holds every
   translation, English included. A locale with no translation falls back to the
   base text, so switching language never yields a blank.

   Rows written before English stopped being the authoring language have no
   `i18n.en`, so English still falls back to their base text unchanged. */

import type { Locale } from "./i18n";

/** Non-English locales we store translations for. */
export type TLocale = Exclude<Locale, "en">;
export const T_LOCALES: TLocale[] = ["ja", "zh", "ko"];

/** Per-locale string / string[] translations. Any locale may be present,
    including English — the base column is no longer assumed to be English. */
export type Translations = Partial<Record<Locale, string>>;
export type ListTranslations = Partial<Record<Locale, string[]>>;

/** The shape stored in each table's `i18n` jsonb column. Fields are optional;
    vehicles use tags/fuel, insurances use name/description/features, etc. */
export type ContentI18n = {
  name?: Translations;
  description?: Translations;
  features?: ListTranslations;
  tags?: ListTranslations;
  fuel?: Translations;
  topic?: Translations;
  question?: Translations;
  answer?: Translations;
  address?: Translations;
  subject?: Translations;
  intro?: Translations;
  notice?: Translations;
  closing?: Translations;
  videoLabel?: Translations;
};

/** Localize a single string, falling back to the base text. Every locale is
    looked up the same way — English has no special case any more. */
export function tText(base: string, tr: Translations | undefined, locale: Locale): string {
  const v = tr?.[locale];
  return v && v.trim() ? v : base;
}

/** Localize a string list. Falls back to base unless a complete, same-length
    translated list exists (a partial translation would misalign items). */
export function tList(base: string[], tr: ListTranslations | undefined, locale: Locale): string[] {
  const arr = tr?.[locale];
  if (arr && arr.length === base.length && arr.every((s) => s && s.trim())) return arr;
  return base;
}

/** Every locale, including the English base — admin content can be written in
    any of them and translated into the rest. */
export const ALL_LOCALES: Locale[] = ["en", "ja", "zh", "ko"];

/** Best guess at which language a piece of admin-entered text is written in,
    used to preselect the authoring language. Kana before ideographs, since
    Japanese text contains Chinese characters but not the reverse. */
export function detectLocale(text: string): Locale | null {
  if (!text.trim()) return null;
  if (/[぀-ヿ]/.test(text)) return "ja";
  if (/[가-힯]/.test(text)) return "ko";
  if (/[㐀-鿿]/.test(text)) return "zh";
  if (/[a-z]/i.test(text)) return "en";
  return null;
}

/** DeepL source-language codes. */
export const DEEPL_SOURCE: Record<Locale, string> = { en: "EN", ja: "JA", zh: "ZH", ko: "KO" };

/** DeepL target-language codes. English must be regional ("EN" is deprecated
    as a target); the site's copy is British-leaning ("licence"). */
export const DEEPL_TARGET: Record<Locale, string> = { en: "EN-GB", ja: "JA", zh: "ZH", ko: "KO" };
