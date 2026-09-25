/* Vehicle types.

   A `car_vehicles` row is ONE PHYSICAL CAR, identified by its plate number.
   Every car that shares a model name and a transmission forms a **vehicle
   type** — that is what the public site lists and sells. The type is derived,
   not stored: adding a second Toyota Voxy AT grows the Voxy AT type to two
   cars without any extra admin step. */

export type TypeIdentity = { name: string; transmission: string };

/** Stable key for a vehicle type. Name matching ignores case and stray space
    so "Toyota Voxy " and "toyota voxy" are the same type. */
export function vehicleTypeKey(v: TypeIdentity): string {
  return `${v.name.trim().toLowerCase()}|${v.transmission}`;
}

export type VehicleTypeGroup<T> = {
  key: string;
  name: string;
  transmission: string;
  /** the car whose photos, price and tags represent the whole type */
  lead: T;
  /** every physical car of the type, in input order */
  members: T[];
};

/** Group cars into types, preserving the order they arrive in — callers pass
    them sorted by `sort`, so the first car of a type fixes the type's place. */
export function groupVehicleTypes<T extends TypeIdentity>(vehicles: T[]): VehicleTypeGroup<T>[] {
  const out: VehicleTypeGroup<T>[] = [];
  const byKey = new Map<string, VehicleTypeGroup<T>>();

  for (const v of vehicles) {
    const key = vehicleTypeKey(v);
    const existing = byKey.get(key);
    if (existing) {
      existing.members.push(v);
      continue;
    }
    const group: VehicleTypeGroup<T> = {
      key,
      name: v.name,
      transmission: v.transmission,
      lead: v,
      members: [v],
    };
    byKey.set(key, group);
    out.push(group);
  }
  return out;
}

/** What staff see as a car's title: its plate, falling back to the model name
    while the plate is still blank. */
export function vehicleTitle(v: { plateNumber: string; name: string }, untitled: string): string {
  return v.plateNumber.trim() || v.name.trim() || untitled;
}
