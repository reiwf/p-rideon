import { formatYen, type Vehicle } from "./data";
import type { ContentI18n } from "./i18nContent";

/** Bookable pick-up/return times: 07:00 → 22:00 in 30-minute steps. */
export const rentalTimes = Array.from({ length: 31 }, (_, i) => {
  const m = 7 * 60 + i * 30;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
});

/** dateISO (YYYY-MM-DD) shifted by n days, in local time. */
export function addDaysISO(dateISO: string, n: number): string {
  const [y, m, d] = dateISO.split("-").map(Number);
  const dt = new Date(y || 2026, (m || 1) - 1, (d || 1) + n);
  const pad = (x: number) => String(x).padStart(2, "0");
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
}

/** Default search dates: tomorrow → +3 days, in the company's timezone (JST). */
export function defaultTripDates(): { pickupDate: string; returnDate: string } {
  const fmt = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit", day: "2-digit" });
  const day = (offset: number) => fmt.format(new Date(Date.now() + offset * 86_400_000));
  return { pickupDate: day(1), returnDate: day(4) };
}

export type BookingInsurance = {
  id: string;
  name: string;
  description: string;
  pricePerDay: number;
  features: string[];
  featured: boolean;
  i18n?: ContentI18n;
};

export type BookingRatePlan = { id: string; name: string; minDays: number; discountPct: number; i18n?: ContentI18n };

export type BookingExtra = {
  id: string;
  name: string;
  description: string;
  pricePerDay: number;
  maxQty: number;
  i18n?: ContentI18n;
};

/** A branch as shown in the booking flow (name is the stored identifier). */
export type BookingBranch = { name: string; address: string };

/** Chosen quantity of one extra (qty ≥ 1 only in a selection). */
export type ExtraSelection = { extra: BookingExtra; qty: number };

/** A rental broken into full 24h days plus a started-hours remainder,
    matching the price sheet: 基本料金 per 24h + 延長料金 per hour/day. */
export type RentalDuration = {
  /** full 24h blocks from pick-up time (min 1 — the 24h rate is the minimum charge) */
  days: number;
  /** started hours beyond the last full day (0–23), billed at the hourly extension rate */
  extraHours: number;
  /** started 24h periods — what per-day items (CDW, extras) are billed on */
  chargeDays: number;
};

export function rentalDuration(fromISO: string, toISO: string): RentalDuration {
  const a = new Date(fromISO).getTime();
  const b = new Date(toISO).getTime();
  if (Number.isNaN(a) || Number.isNaN(b) || b <= a) return { days: 1, extraHours: 0, chargeDays: 1 };
  const ms = b - a;
  let days = Math.floor(ms / 86_400_000);
  let extraHours = Math.ceil((ms - days * 86_400_000) / 3_600_000);
  if (extraHours >= 24) { days += 1; extraHours = 0; }
  if (days === 0) { days = 1; extraHours = 0; } // anything under 24h costs the 24h rate
  return { days, extraHours, chargeDays: days + (extraHours > 0 ? 1 : 0) };
}

/** Best (largest) qualifying discount for the rental length. */
export function bestPlan(plans: BookingRatePlan[], days: number): BookingRatePlan | null {
  return plans.filter((p) => days >= p.minDays).sort((x, y) => y.discountPct - x.discountPct)[0] ?? null;
}

export type Quote = {
  duration: RentalDuration;
  /** full days × daily rate */
  base: number;
  /** started-hours extension: hours × the vehicle's hourly rate, capped at
      the daily rate (falls back to a full extra day when no hourly rate is set) */
  extension: number;
  plan: BookingRatePlan | null;
  discount: number;
  insurance: number;
  extras: (ExtraSelection & { cost: number })[];
  extrasTotal: number;
  total: number;
};

export function quote(
  vehicle: Vehicle,
  duration: RentalDuration,
  plans: BookingRatePlan[],
  ins: BookingInsurance | null,
  extraSel: ExtraSelection[] = [],
): Quote {
  const base = vehicle.pricePerDay * duration.days;
  const hourly = vehicle.extensionPerHour ?? 0;
  const extension =
    duration.extraHours === 0
      ? 0
      : hourly > 0
        ? Math.min(duration.extraHours * hourly, vehicle.pricePerDay)
        : vehicle.pricePerDay;
  const plan = bestPlan(plans, duration.chargeDays);
  const discount = plan ? Math.round(((base + extension) * plan.discountPct) / 100) : 0;
  const insurance = (ins?.pricePerDay ?? 0) * duration.chargeDays;
  const extras = extraSel.map((s) => ({ ...s, cost: s.extra.pricePerDay * s.qty * duration.chargeDays }));
  const extrasTotal = extras.reduce((sum, x) => sum + x.cost, 0);
  return { duration, base, extension, plan, discount, insurance, extras, extrasTotal, total: base + extension - discount + insurance + extrasTotal };
}

/** Build a JST timestamp string for the DB (the company is in Japan). */
export function combineDateTime(dateISO: string, time: string): string {
  return `${dateISO}T${time}:00+09:00`;
}

export const yen = formatYen;

/** Split "2026-07-04T10:00" into date + time, with sensible fallbacks. */
export function splitDateTime(value: string, fallbackDate: string, fallbackTime: string) {
  const [d, t] = (value || "").split("T");
  return { date: d || fallbackDate, time: (t || fallbackTime).slice(0, 5) };
}
