/* Operator-configurable site settings — opening hours and the footer contact
   details — held in the `operation` row of car_settings and edited at
   /admin/settings.

   Opening hours drive the pick-up / return time lists on both the homepage
   search and the booking flow, so changing them in admin changes what a guest
   can pick, with no deploy. The address follows the same base-plus-i18n
   convention as the rest of the admin content: the base column holds whatever
   language staff wrote in, `i18n` holds the translations. */

import type { ContentI18n } from "./i18nContent";

export type SiteSettings = {
  /** first bookable time, "HH:MM" */
  openTime: string;
  /** last bookable time, "HH:MM" — inclusive */
  closeTime: string;
  /** minutes between offered times */
  stepMinutes: number;
  phone: string;
  email: string;
  /** postal address in the authoring language; translations live in i18n */
  address: string;
  i18n: ContentI18n;
};

export const DEFAULT_SETTINGS: SiteSettings = {
  openTime: "07:00",
  closeTime: "22:00",
  stepMinutes: 30,
  phone: "+81 6-0000-0000",
  email: "",
  address: "",
  i18n: {},
};

/** "HH:MM" → minutes since midnight, or null if unparseable. */
function toMinutes(hhmm: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

const fromMinutes = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

/** Bookable times from open to close inclusive. Falls back to the defaults on
    nonsense input so a bad setting can never leave a guest with no times. */
export function buildRentalTimes(openTime: string, closeTime: string, stepMinutes: number): string[] {
  const open = toMinutes(openTime);
  const close = toMinutes(closeTime);
  const step = Math.round(stepMinutes);
  if (open === null || close === null || close < open || step < 5 || step > 240) {
    if (openTime !== DEFAULT_SETTINGS.openTime || closeTime !== DEFAULT_SETTINGS.closeTime) {
      return buildRentalTimes(DEFAULT_SETTINGS.openTime, DEFAULT_SETTINGS.closeTime, DEFAULT_SETTINGS.stepMinutes);
    }
    return ["10:00"];
  }
  const out: string[] = [];
  for (let m = open; m <= close; m += step) out.push(fromMinutes(m));
  return out;
}

export const DEFAULT_TIMES = buildRentalTimes(
  DEFAULT_SETTINGS.openTime,
  DEFAULT_SETTINGS.closeTime,
  DEFAULT_SETTINGS.stepMinutes,
);

/** Nearest offered time to `time`. A default or URL-supplied time outside the
    opening hours would otherwise show a value the guest cannot re-select. */
export function clampToTimes(time: string, times: string[]): string {
  if (times.length === 0) return time;
  if (times.includes(time)) return time;
  const target = toMinutes(time);
  if (target === null) return times[0];
  let best = times[0];
  let bestGap = Infinity;
  for (const t of times) {
    const m = toMinutes(t);
    if (m === null) continue;
    const gap = Math.abs(m - target);
    if (gap < bestGap) { bestGap = gap; best = t; }
  }
  return best;
}

/** Coerce a car_settings row into a usable settings object. */
export function parseSettings(value: unknown): SiteSettings {
  const v = (value ?? {}) as Partial<SiteSettings>;
  return {
    openTime: v.openTime || DEFAULT_SETTINGS.openTime,
    closeTime: v.closeTime || DEFAULT_SETTINGS.closeTime,
    stepMinutes: Number(v.stepMinutes) > 0 ? Number(v.stepMinutes) : DEFAULT_SETTINGS.stepMinutes,
    phone: v.phone ?? DEFAULT_SETTINGS.phone,
    email: v.email ?? "",
    address: v.address ?? "",
    i18n: v.i18n ?? {},
  };
}
