import { createClient } from "@supabase/supabase-js";
import type { ContentI18n } from "./i18nContent";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** True when env is configured. Lets the UI degrade gracefully if not. */
export const supabaseConfigured = Boolean(url && key);

/** Browser Supabase client (singleton). Auth session persists in localStorage. */
export const supabase = createClient(url ?? "http://localhost", key ?? "anon", {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

// ---- DB row shapes (snake_case, matching the car_ tables) ----
export type DbVehicle = {
  id: string;
  name: string;
  jp: string;
  cls: string;
  seats: number;
  bags: number;
  transmission: "AT" | "MT";
  fuel: string;
price_per_day: number;
  extension_per_hour: number;
  tags: string[];
  hue: string;
  active: boolean;
  sort: number;
  i18n: ContentI18n | null;
  images: string[] | null;
};

export type DbRatePlan = {
  id: string;
  name: string;
  description: string;
  min_days: number;
  discount_pct: number;
  active: boolean;
  i18n: ContentI18n | null;
};

export type DbInsurance = {
  id: string;
  name: string;
  description: string;
  price_per_day: number;
  features: string[];
  featured: boolean;
  active: boolean;
  sort: number;
  i18n: ContentI18n | null;
};

export type DbBranch = {
  id: string;
  name: string;
  address: string;
  sort: number;
  active: boolean;
};

export type DbExtra = {
  id: string;
  name: string;
  description: string;
  price_per_day: number;
  max_qty: number;
  sort: number;
  active: boolean;
  i18n: ContentI18n | null;
};

/** One line of a booking's `extras` jsonb column. */
export type DbBookingExtra = { id: string; name: string; qty: number; price_per_day: number };

export type DbBooking = {
  id: string;
  reference: string;
  vehicle_id: string | null;
  insurance_id: string | null;
  pickup_location: string | null;
  pickup_at: string | null;
  return_at: string | null;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  locale: string;
  estimated_total: number;
  status: string;
  notes: string;
  extras: DbBookingExtra[];
  license_country: string;
  created_at: string;
};
