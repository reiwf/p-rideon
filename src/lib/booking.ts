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

/** Grace period before an overrun starts a new chargeable day. */
const GRACE_MS = 60 * 60 * 1000; // 1 hour

/** Rental days between two datetimes (min 1), using the industry-standard
    24-hour rental day counted from pick-up time: every started 24h block
    is a full day, with a 1-hour grace period (48h59m → 2 days, 50h → 3). */
export function daysBetween(fromISO: string, toISO: string): number {
  const a = new Date(fromISO).getTime();
  const b = new Date(toISO).getTime();
  if (Number.isNaN(a) || Number.isNaN(b) || b <= a) return 1;
  return Math.max(1, Math.ceil((b - a - GRACE_MS) / 86_400_000));
}

/** Best (largest) qualifying discount for the rental length. */
export function bestPlan(plans: BookingRatePlan[], days: number): BookingRatePlan | null {
  return plans.filter((p) => days >= p.minDays).sort((x, y) => y.discountPct - x.discountPct)[0] ?? null;
}

export type Quote = {
  days: number;
  base: number;
  plan: BookingRatePlan | null;
  discount: number;
  insurance: number;
  extras: (ExtraSelection & { cost: number })[];
  extrasTotal: number;
  total: number;
};

export function quote(
  vehicle: Vehicle,
  days: number,
  plans: BookingRatePlan[],
  ins: BookingInsurance | null,
  extraSel: ExtraSelection[] = [],
): Quote {
  const base = vehicle.pricePerDay * days;
  const plan = bestPlan(plans, days);
  const discount = plan ? Math.round((base * plan.discountPct) / 100) : 0;
  const insurance = (ins?.pricePerDay ?? 0) * days;
  const extras = extraSel.map((s) => ({ ...s, cost: s.extra.pricePerDay * s.qty * days }));
  const extrasTotal = extras.reduce((sum, x) => sum + x.cost, 0);
  return { days, base, plan, discount, insurance, extras, extrasTotal, total: base - discount + insurance + extrasTotal };
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
