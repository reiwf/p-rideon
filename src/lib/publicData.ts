import { createClient } from "@supabase/supabase-js";
import { vehicles as fallbackVehicles, pickupPoints as fallbackBranches, type Vehicle, type VehicleClass } from "./data";
import type { BookingBranch, BookingExtra, BookingInsurance, BookingRatePlan } from "./booking";
import type { ContentI18n } from "./i18nContent";

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
      .order("sort", { ascending: true });

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
}> {
  const client = serverClient();
  if (!client || !vehicleId) {
    return {
      vehicle: fallbackVehicles.find((v) => v.id === vehicleId) ?? null,
      insurances: [], ratePlans: [], branches: fallbackBranches,
      branchInfo: fallbackBranches.map((name) => ({ name, address: "" })), extras: [],
    };
  }

  // a non-uuid id (e.g. an old seed-id bookmark) can never match — treat as
  // "not found" rather than letting the uuid cast error the whole query
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(vehicleId);

  const [vRes, iRes, pRes, bRes, xRes] = await Promise.all([
    isUuid
      ? client.from("car_vehicles").select(VEHICLE_COLUMNS).eq("id", vehicleId).eq("active", true).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    client.from("car_insurances").select("id,name,description,price_per_day,features,featured,i18n").eq("active", true).order("sort", { ascending: true }),
    client.from("car_rate_plans").select("id,name,min_days,discount_pct,i18n").eq("active", true),
    client.from("car_branches").select("name,address").eq("active", true).order("sort", { ascending: true }),
    client.from("car_extras").select("id,name,description,price_per_day,max_qty,i18n").eq("active", true).order("sort", { ascending: true }),
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
  };
}
