"use client";

/* Admin data store — backed by Supabase (car_ tables in the Raito project).
   App-facing types are camelCase; mappers translate to/from the snake_case DB. */

import { createContext, useContext, useCallback, useState } from "react";
import {
  supabase,
  type DbVehicle,
  type DbRatePlan,
  type DbInsurance,
  type DbBranch,
  type DbExtra,
  type DbBookingExtra,
} from "./supabaseClient";
import { type VehicleClass } from "./data";
import { type ContentI18n } from "./i18nContent";

export type AdminVehicle = {
  id: string; // "" = new (DB generates the uuid)
  name: string;
  jp: string;
  cls: VehicleClass;
  seats: number;
  bags: number;
  transmission: "AT" | "MT";
  fuel: string;
  pricePerDay: number;
  tags: string[];
  hue: string;
  active: boolean;
  i18n: ContentI18n;
  images: string[];
};

export type RatePlan = {
  id: string;
  name: string;
  description: string;
  minDays: number;
  discountPct: number;
  active: boolean;
  i18n: ContentI18n;
};

export type Insurance = {
  id: string;
  name: string;
  description: string;
  pricePerDay: number;
  features: string[];
  featured: boolean;
  active: boolean;
  i18n: ContentI18n;
};

export type Branch = {
  id: string;
  name: string;
  address: string;
  sort: number;
  active: boolean;
};

export type Extra = {
  id: string;
  name: string;
  description: string;
  pricePerDay: number;
  maxQty: number;
  sort: number;
  active: boolean;
  i18n: ContentI18n;
};

export type Booking = {
  id: string;
  reference: string;
  vehicleName: string;
  pickupLocation: string;
  pickupAt: string | null;
  returnAt: string | null;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  estimatedTotal: number;
  status: string;
  extras: DbBookingExtra[];
  licenseCountry: string;
  createdAt: string;
};

export type AdminData = {
  vehicles: AdminVehicle[];
  ratePlans: RatePlan[];
  insurances: Insurance[];
  branches: Branch[];
  extras: Extra[];
  bookings: Booking[];
};

export const vehicleClasses: VehicleClass[] = ["kei", "compact", "hybrid", "suv", "minivan", "premium"];
export const classHue: Record<VehicleClass, string> = {
  kei: "#d8492f",
  compact: "#11704a",
  hybrid: "#169360",
  suv: "#16293c",
  minivan: "#11704a",
  premium: "#c79a3e",
};

// ---- mappers ----
const vFromDb = (r: DbVehicle): AdminVehicle => ({
  id: r.id, name: r.name, jp: r.jp, cls: r.cls as VehicleClass, seats: r.seats, bags: r.bags,
  transmission: r.transmission, fuel: r.fuel, pricePerDay: r.price_per_day, tags: r.tags ?? [],
  hue: r.hue, active: r.active, i18n: r.i18n ?? {}, images: r.images ?? [],
});
const vToDb = (v: AdminVehicle) => ({
  name: v.name, jp: v.jp, cls: v.cls, seats: v.seats, bags: v.bags, transmission: v.transmission,
  fuel: v.fuel, price_per_day: v.pricePerDay, tags: v.tags, hue: v.hue, active: v.active, i18n: v.i18n ?? {}, images: v.images ?? [],
});
const pFromDb = (r: DbRatePlan): RatePlan => ({
  id: r.id, name: r.name, description: r.description, minDays: r.min_days, discountPct: r.discount_pct, active: r.active, i18n: r.i18n ?? {},
});
const pToDb = (p: RatePlan) => ({
  name: p.name, description: p.description, min_days: p.minDays, discount_pct: p.discountPct, active: p.active, i18n: p.i18n ?? {},
});
const iFromDb = (r: DbInsurance): Insurance => ({
  id: r.id, name: r.name, description: r.description, pricePerDay: r.price_per_day, features: r.features ?? [],
  featured: r.featured, active: r.active, i18n: r.i18n ?? {},
});
const iToDb = (i: Insurance) => ({
  name: i.name, description: i.description, price_per_day: i.pricePerDay, features: i.features, featured: i.featured, active: i.active, i18n: i.i18n ?? {},
});
const exFromDb = (r: DbExtra): Extra => ({
  id: r.id, name: r.name, description: r.description, pricePerDay: r.price_per_day, maxQty: r.max_qty,
  sort: r.sort, active: r.active, i18n: r.i18n ?? {},
});
const exToDb = (x: Extra) => ({
  name: x.name, description: x.description, price_per_day: x.pricePerDay, max_qty: x.maxQty,
  sort: x.sort, active: x.active, i18n: x.i18n ?? {},
});
const brFromDb =(r: DbBranch): Branch => ({ id: r.id, name: r.name, address: r.address, sort: r.sort, active: r.active });
const brToDb = (b: Branch) => ({ name: b.name, address: b.address, sort: b.sort, active: b.active });

type Ctx = {
  ready: boolean;
  error: string | null;
  data: AdminData;
  refresh: () => Promise<void>;
  saveVehicle: (v: AdminVehicle) => Promise<boolean>;
  removeVehicle: (id: string) => Promise<boolean>;
  savePlan: (p: RatePlan) => Promise<boolean>;
  removePlan: (id: string) => Promise<boolean>;
  saveInsurance: (i: Insurance) => Promise<boolean>;
  removeInsurance: (id: string) => Promise<boolean>;
  saveBranch: (b: Branch) => Promise<boolean>;
  removeBranch: (id: string) => Promise<boolean>;
  saveExtra: (x: Extra) => Promise<boolean>;
  removeExtra: (id: string) => Promise<boolean>;
};

export const AdminContext = createContext<Ctx | null>(null);

export function useAdminData(): Ctx {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error("useAdminData must be used within AdminShell");
  return ctx;
}

const EMPTY: AdminData = { vehicles: [], ratePlans: [], insurances: [], branches: [], extras: [], bookings: [] };

/** Powers the AdminContext provider in AdminShell. */
export function useAdminStore(): Ctx {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<AdminData>(EMPTY);

  const refresh = useCallback(async () => {
    const [veh, plans, ins, branches, extras, books] = await Promise.all([
      supabase.from("car_vehicles").select("*").order("sort", { ascending: true }),
      supabase.from("car_rate_plans").select("*").order("created_at", { ascending: true }),
      supabase.from("car_insurances").select("*").order("sort", { ascending: true }),
supabase.from("car_branches").select("*").order("sort", { ascending: true }),
      supabase.from("car_extras").select("*").order("sort", { ascending: true }),
      supabase.from("car_bookings").select("*, car_vehicles(name)").order("created_at", { ascending: false }),
    ]);

    const firstErr = veh.error || plans.error || ins.error || branches.error || extras.error || books.error;
    if (firstErr) {
      setError(firstErr.message);
      setReady(true);
      return;
    }

    setError(null);
    setData({
      vehicles: (veh.data as DbVehicle[]).map(vFromDb),
      ratePlans: (plans.data as DbRatePlan[]).map(pFromDb),
      insurances: (ins.data as DbInsurance[]).map(iFromDb),
branches: (branches.data as DbBranch[]).map(brFromDb),
      extras: (extras.data as DbExtra[]).map(exFromDb),
      bookings: (books.data as unknown as RawBooking[]).map(bFromDb),
    });
    setReady(true);
  }, []);

  const saveVehicle = useCallback(async (v: AdminVehicle) => {
    const res = v.id
      ? await supabase.from("car_vehicles").update(vToDb(v)).eq("id", v.id)
      : await supabase.from("car_vehicles").insert(vToDb(v));
    if (res.error) { setError(res.error.message); return false; }
    await refresh();
    return true;
  }, [refresh]);

  const removeVehicle = useCallback(async (id: string) => {
    const res = await supabase.from("car_vehicles").delete().eq("id", id);
    if (res.error) { setError(res.error.message); return false; }
    await refresh();
    return true;
  }, [refresh]);

  const savePlan = useCallback(async (p: RatePlan) => {
    const res = p.id
      ? await supabase.from("car_rate_plans").update(pToDb(p)).eq("id", p.id)
      : await supabase.from("car_rate_plans").insert(pToDb(p));
    if (res.error) { setError(res.error.message); return false; }
    await refresh();
    return true;
  }, [refresh]);

  const removePlan = useCallback(async (id: string) => {
    const res = await supabase.from("car_rate_plans").delete().eq("id", id);
    if (res.error) { setError(res.error.message); return false; }
    await refresh();
    return true;
  }, [refresh]);

  const saveInsurance = useCallback(async (i: Insurance) => {
    const res = i.id
      ? await supabase.from("car_insurances").update(iToDb(i)).eq("id", i.id)
      : await supabase.from("car_insurances").insert(iToDb(i));
    if (res.error) { setError(res.error.message); return false; }
    await refresh();
    return true;
  }, [refresh]);

  const removeInsurance = useCallback(async (id: string) => {
    const res = await supabase.from("car_insurances").delete().eq("id", id);
    if (res.error) { setError(res.error.message); return false; }
    await refresh();
    return true;
  }, [refresh]);

  const saveBranch = useCallback(async (b: Branch) => {
    const res = b.id
      ? await supabase.from("car_branches").update(brToDb(b)).eq("id", b.id)
      : await supabase.from("car_branches").insert(brToDb(b));
    if (res.error) { setError(res.error.message); return false; }
    await refresh();
    return true;
  }, [refresh]);

  const removeBranch = useCallback(async (id: string) => {
    const res = await supabase.from("car_branches").delete().eq("id", id);
    if (res.error) { setError(res.error.message); return false; }
    await refresh();
    return true;
  }, [refresh]);

  const saveExtra = useCallback(async (x: Extra) => {
    const res = x.id
      ? await supabase.from("car_extras").update(exToDb(x)).eq("id", x.id)
      : await supabase.from("car_extras").insert(exToDb(x));
    if (res.error) { setError(res.error.message); return false; }
    await refresh();
    return true;
  }, [refresh]);

  const removeExtra = useCallback(async (id: string) => {
    const res = await supabase.from("car_extras").delete().eq("id", id);
    if (res.error) { setError(res.error.message); return false; }
    await refresh();
    return true;
  }, [refresh]);

  return { ready, error, data, refresh, saveVehicle, removeVehicle, savePlan, removePlan, saveInsurance, removeInsurance, saveBranch, removeBranch, saveExtra, removeExtra };
}

// booking row from the joined select
type RawBooking = {
  id: string; reference: string; pickup_location: string | null; pickup_at: string | null;
  return_at: string | null; customer_name: string | null; customer_email: string | null;
  customer_phone: string | null; estimated_total: number; status: string; created_at: string; extras: DbBookingExtra[] | null; license_country: string | null;
  car_vehicles: { name: string } | null;
};
const bFromDb = (r: RawBooking): Booking => ({
  id: r.id, reference: r.reference, vehicleName: r.car_vehicles?.name ?? "—",
  pickupLocation: r.pickup_location ?? "", pickupAt: r.pickup_at, returnAt: r.return_at,
customerName: r.customer_name ?? "", customerEmail: r.customer_email ?? "", customerPhone: r.customer_phone ?? "",
  estimatedTotal: r.estimated_total, status: r.status, extras: r.extras ?? [], licenseCountry: r.license_country ?? "", createdAt: r.created_at,
});
