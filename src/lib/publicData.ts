import { createClient } from "@supabase/supabase-js";
import { vehicles as fallbackVehicles, pickupPoints as fallbackBranches, type Vehicle, type VehicleClass } from "./data";
import type { BookingBranch, BookingExtra, BookingInsurance, BookingRatePlan, SafetyVideo } from "./booking";
import type { ContentI18n } from "./i18nContent";
import { parseSettings, DEFAULT_SETTINGS, type SiteSettings } from "./siteSettings";

function serverClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

const VEHICLE_COLUMNS = "id,name,jp,cls,seats,bags,transmission,fuel,price_per_day,extension_per_hour,tags,hue,i18n,images";

type VehicleRow = {
  id: string; name: string; jp: string; cls: string; seats: number; bags: number;
  transmission: string; fuel: string; price_per_day: number; extension_per_hour: number | null; tags: string[] | null;
  hue: string; i18n: ContentI18n | null; images: string[] | null;
};

const mapVehicle = (r: VehicleRow): Vehicle => ({
  id: r.id,
  cls: r.cls as VehicleClass,
  name: r.name,
  jp: r.jp,
  seats: r.seats,
  bags: r.bags,
  transmission: r.transmission as "AT" | "MT",
  fuel: r.fuel,
pricePerDay: r.price_per_day,
  extensionPerHour: r.extension_per_hour ?? 0,
  tags: r.tags ?? [],
  hue: r.hue,
  i18n: (r.i18n ?? undefined) as ContentI18n | undefined,
  images: (r.images ?? []) as string[],
});

/** Server-side fetch of published vehicles for the public booking page.
   The static seed is used ONLY when Supabase is unconfigured (local dev):
   seed ids aren't uuids, so seed vehicles can never be booked against a
   configured database — showing them would dead-end every Reserve link. */
export async function fetchPublicVehicles(): Promise<Vehicle[]> {
  const client = serverClient();
  if (!client) return fallbackVehicles;

  try {
    const { data, error } = await client
      .from("car_vehicles")
      .select(VEHICLE_COLUMNS)
      .eq("active", true)
      // the tie-break matters: cars sharing a model and transmission are one
      // type, and the first of them supplies the photos, price and reserve
      // link, so that choice must not wobble between requests
      .order("sort", { ascending: true })
      .order("created_at", { ascending: true });

    if (error || !data) return [];
    return (data as VehicleRow[]).map(mapVehicle);
  } catch {
    return [];
  }
}

/** Active branch names for the booking search & flow. Branch names are plain
   text on bookings, so the seed list stays usable as a fallback. */
export async function fetchPublicBranches(): Promise<string[]> {
  const client = serverClient();
  if (!client) return fallbackBranches;
  try {
    const { data, error } = await client.from("car_branches").select("name").eq("active", true).order("sort", { ascending: true });
    if (error || !data || data.length === 0) return fallbackBranches;
    return data.map((b) => b.name);
  } catch {
    return fallbackBranches;
  }
}

/** Opening hours + footer contact details (car_settings → `operation`).
   Falls back to the built-in defaults so the site still renders a usable time
   list when the row is missing or Supabase is unconfigured. */
export async function fetchSiteSettings(): Promise<SiteSettings> {
  const client = serverClient();
  if (!client) return DEFAULT_SETTINGS;
  try {
    const { data, error } = await client.from("car_settings").select("value").eq("key", "operation").maybeSingle();
    if (error || !data) return DEFAULT_SETTINGS;
    return parseSettings(data.value);
  } catch {
    return DEFAULT_SETTINGS;
  }
}

/** The precaution video config (car_settings → `safety_video`). Returns null
   when nothing is uploaded yet, which leaves the booking flow ungated —
   an unconfigured video must never block real reservations. */
export async function fetchSafetyVideo(): Promise<SafetyVideo | null> {
  const client = serverClient();
  if (!client) return null;
  try {
    const { data, error } = await client.from("car_settings").select("value").eq("key", "safety_video").maybeSingle();
    if (error || !data) return null;
    const v = (data.value ?? {}) as Partial<SafetyVideo>;
    const videos = Object.fromEntries(Object.entries(v.videos ?? {}).filter(([, url]) => Boolean(url)));
    if (Object.keys(videos).length === 0) return null;
    // strict unless explicitly relaxed, so an older settings row keeps gating
    return { poster: v.poster ?? "", videos, requireFullPlay: v.requireFullPlay !== false };
  } catch {
    return null;
  }
}

/** Whether a reservation must be paid before it is confirmed
    (`car_settings` → `payments`). Defaults to OFF: a misread setting must
    never silently start demanding money, nor silently stop. */
export async function fetchPayBeforeBook(): Promise<boolean> {
  const client = serverClient();
  if (!client) return false;
  try {
    const { data, error } = await client.from("car_settings").select("value").eq("key", "payments").maybeSingle();
    if (error || !data) return false;
    return (data.value as { payBeforeBook?: boolean } | null)?.payBeforeBook === true;
  } catch {
    return false;
  }
}

/** Has this reservation been paid? Needs BOTH the booking id and its
    reference, so only the guest who just booked can ask. Returns "unknown"
    rather than throwing: the page must still render something useful. */
export async function fetchPaymentState(
  bookingId: string,
  reference: string,
): Promise<"paid" | "pending" | "unknown"> {
  const client = serverClient();
  if (!client) return "unknown";
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(bookingId)) return "unknown";
  if (!/^KD-[0-9]{6}-[A-Z0-9]{4}$/.test(reference)) return "unknown";
  try {
    const { data, error } = await client.rpc("car_begin_payment", {
      p_booking_id: bookingId,
      p_reference: reference,
    });
    if (error || !data) return "unknown";
    const row = (data as { already_paid: boolean }[])[0];
    if (!row) return "unknown";
    return row.already_paid ? "paid" : "pending";
  } catch {
    return "unknown";
  }
}

/** Data needed for the booking flow: the chosen (active) vehicle plus the
   current insurance options, rate plans, branches and extras. vehicle=null
   means "not found"; query failures THROW so the route errors instead of
   telling the customer a real car doesn't exist. */
export async function fetchBookingData(vehicleId: string): Promise<{
  vehicle: Vehicle | null;
  insurances: BookingInsurance[];
  ratePlans: BookingRatePlan[];
  branches: string[];
  branchInfo: BookingBranch[];
  extras: BookingExtra[];
  safetyVideo: SafetyVideo | null;
  settings: SiteSettings;
  payBeforeBook: boolean;
}> {
  const client = serverClient();
  if (!client || !vehicleId) {
    return {
      vehicle: fallbackVehicles.find((v) => v.id === vehicleId) ?? null,
      insurances: [], ratePlans: [], branches: fallbackBranches,
      branchInfo: fallbackBranches.map((name) => ({ name, address: "" })), extras: [],
      safetyVideo: null, settings: DEFAULT_SETTINGS, payBeforeBook: false,
    };
  }

  // a non-uuid id (e.g. an old seed-id bookmark) can never match — treat as
  // "not found" rather than letting the uuid cast error the whole query
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(vehicleId);

  const [vRes, iRes, pRes, bRes, xRes, safetyVideo, settings, payBeforeBook] = await Promise.all([
    isUuid
      ? client.from("car_vehicles").select(VEHICLE_COLUMNS).eq("id", vehicleId).eq("active", true).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    client.from("car_insurances").select("id,name,description,price_per_day,features,featured,i18n").eq("active", true).order("sort", { ascending: true }),
    client.from("car_rate_plans").select("id,name,min_days,discount_pct,i18n").eq("active", true),
    client.from("car_branches").select("name,address").eq("active", true).order("sort", { ascending: true }),
    client.from("car_extras").select("id,name,description,price_per_day,max_qty,i18n").eq("active", true).order("sort", { ascending: true }),
    fetchSafetyVideo(),
    fetchSiteSettings(),
    fetchPayBeforeBook(),
  ]);

  const firstErr = vRes.error || iRes.error || pRes.error || bRes.error || xRes.error;
  if (firstErr) throw new Error(`Booking data query failed: ${firstErr.message}`);

  const vehicle: Vehicle | null = vRes.data ? mapVehicle(vRes.data as VehicleRow) : null;

  const insurances: BookingInsurance[] = (iRes.data ?? []).map((x) => ({
    id: x.id, name: x.name, description: x.description, pricePerDay: x.price_per_day, features: x.features ?? [], featured: x.featured,
    i18n: (x.i18n ?? undefined) as ContentI18n | undefined,
  }));
  const ratePlans: BookingRatePlan[] = (pRes.data ?? []).map((x) => ({
    id: x.id, name: x.name, minDays: x.min_days, discountPct: x.discount_pct,
    i18n: (x.i18n ?? undefined) as ContentI18n | undefined,
  }));
  const branchInfo: BookingBranch[] = (bRes.data ?? []).map((b) => ({ name: b.name, address: b.address ?? "" }));
  const branches = branchInfo.map((b) => b.name);
  const extras: BookingExtra[] = (xRes.data ?? []).map((x) => ({
    id: x.id, name: x.name, description: x.description, pricePerDay: x.price_per_day, maxQty: x.max_qty,
    i18n: (x.i18n ?? undefined) as ContentI18n | undefined,
  }));

  return {
    vehicle, insurances, ratePlans,
    branches: branches.length ? branches : fallbackBranches,
    branchInfo: branchInfo.length ? branchInfo : fallbackBranches.map((name) => ({ name, address: "" })),
    extras,
    safetyVideo,
    settings,
    payBeforeBook,
  };
}
