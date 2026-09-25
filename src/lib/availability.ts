"use client";

/* Live availability for the public site.

   The booking tables are staff-only under RLS, so these go through two
   SECURITY DEFINER functions. Both answer at VEHICLE TYPE level only, and both
   refuse windows in the past, more than ~13 months ahead, or longer than 95
   days. That is deliberate: an earlier per-car version let anyone holding the
   public key probe one-hour slots and reconstruct the exact pick-up and return
   time of every rental in the fleet.

   A failed or pending lookup always reads as AVAILABLE. Availability shown
   here is a courtesy; the real guard is the exclusion constraint on
   car_bookings, which rejects a double booking even if this UI got it wrong. */

import { useEffect, useState } from "react";
import { supabase, supabaseConfigured } from "./supabaseClient";
import { vehicleTypeKey, type TypeIdentity } from "./vehicleTypes";

export type TypeAvailability = { total: number; available: number };

/** vehicle type key → stock. A missing key means "not known". */
export type FleetAvailability = Map<string, TypeAvailability>;

type FleetRow = { type_key: string; total: number; available: number };

export async function fetchFleetAvailability(fromTs: string, toTs: string): Promise<FleetAvailability | null> {
  if (!supabaseConfigured) return null;
  const { data, error } = await supabase.rpc("car_fleet_availability", { p_from: fromTs, p_to: toTs });
  if (error || !data) return null;
  return new Map(
    (data as FleetRow[]).map((r) => [r.type_key, { total: Number(r.total), available: Number(r.available) }]),
  );
}

export async function fetchTypeAvailability(
  vehicleId: string,
  fromTs: string,
  toTs: string,
): Promise<TypeAvailability | null> {
  if (!supabaseConfigured || !vehicleId) return null;
  const { data, error } = await supabase.rpc("car_type_availability", {
    p_vehicle_id: vehicleId,
    p_from: fromTs,
    p_to: toTs,
  });
  if (error || !data) return null;
  const row = (data as TypeAvailability[])[0];
  return row ? { total: Number(row.total), available: Number(row.available) } : null;
}

/** Fleet-wide stock for a trip window, refreshed as the guest edits the dates.
    Debounced, and late responses for a superseded window are dropped. */
export function useFleetAvailability(fromTs: string, toTs: string): FleetAvailability | null {
  const [map, setMap] = useState<FleetAvailability | null>(null);

  useEffect(() => {
    let alive = true;
    const timer = setTimeout(() => {
      fetchFleetAvailability(fromTs, toTs).then((result) => {
        if (alive) setMap(result);
      });
    }, 250);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [fromTs, toTs]);

  return map;
}

/** How many cars of one type are free for the window. */
export function useTypeAvailability(vehicleId: string, fromTs: string, toTs: string): TypeAvailability | null {
  const [state, setState] = useState<TypeAvailability | null>(null);

  useEffect(() => {
    let alive = true;
    const timer = setTimeout(() => {
      fetchTypeAvailability(vehicleId, fromTs, toTs).then((result) => {
        if (alive) setState(result);
      });
    }, 250);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [vehicleId, fromTs, toTs]);

  return state;
}

/** Stock for one vehicle type. `known` is false until a lookup lands, and the
    car count is used as the optimistic fallback so a failed query never hides
    a bookable car.

    The lookup key is built by vehicleTypeKey(); car_fleet_availability builds
    the same string in SQL, so the two must stay in step. */
export function typeStock(
  type: { key: string; members: TypeIdentity[] },
  availability: FleetAvailability | null,
): { known: boolean; total: number; available: number } {
  const row = availability?.get(type.key);
  if (!row) return { known: false, total: type.members.length, available: type.members.length };
  return { known: true, total: row.total, available: row.available };
}

export { vehicleTypeKey };
