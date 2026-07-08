/* Translation helpers for admin-entered catalog content (insurances, rate plans,
   vehicles). English lives in the row's base columns and is the fallback; the
   `i18n` jsonb column holds only the non-English locales. Switching language
   therefore never yields a blank — at worst it shows the English base. */

import type { Locale } from "./i18n";

/** Non-English locales we store translations for. */
export type TLocale = Exclude<Locale, "en">;
export const T_LOCALES: TLocale[] = ["ja", "zh", "ko"];

/** Per-locale string / string[] translations (English omitted — it's the base). */
export type Translations = Partial<Record<TLocale, string>>;
export type ListTranslations = Partial<Record<TLocale, string[]>>;

/** The shape stored in each table's `i18n` jsonb column. Fields are optional;
    vehicles use tags/fuel, insurances use name/description/features, etc. */
export type ContentI18n = {
  name?: Translations;
  description?: Translations;
  features?: ListTranslations;
  tags?: ListTranslations;
  fuel?: Translations;
};

/** Localize a single string, falling back to the English base. */
export function tText(base: string, tr: Translations | undefined, locale: Locale): string {
  if (locale === "en") return base;
  const v = tr?.[locale];
  return v && v.trim() ? v : base;
}

/** Localize a string list. Falls back to base unless a complete, same-length
    translated list exists (a partial translation would misalign items). */
export function tList(base: string[], tr: ListTranslations | undefined, locale: Locale): string[] {
  if (locale === "en") return base;
  const arr = tr?.[locale];
  if (arr && arr.length === base.length && arr.every((s) => s && s.trim())) return arr;
  return base;
}

/** DeepL target-language codes for our locales. */
export const DEEPL_TARGET: Record<TLocale, string> = {
  ja: "JA",
  zh: "ZH",
  ko: "KO",
};
