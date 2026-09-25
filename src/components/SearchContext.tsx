"use client";

import { createContext, useContext, useState } from "react";
import { addDaysISO } from "@/lib/booking";
import { DEFAULT_TIMES } from "@/lib/siteSettings";

/** Kept in step with the CAR_TOO_LONG guard in car_create_booking. */
const MAX_RENTAL_DAYS = 90;

export type SearchState = {
  location: string;
  pickupDate: string;
  pickupTime: string;
  returnDate: string;
  returnTime: string;
};

type Ctx = SearchState & {
  branches: string[];
  /** bookable times, derived from the operator's configured opening hours */
  times: string[];
  set: (patch: Partial<SearchState>) => void;
  bookingHref: (vehicleId: string) => string;
};

const SearchCtx = createContext<Ctx | null>(null);

export function SearchProvider({
  children, initial, branches = [], times = DEFAULT_TIMES,
}: {
  children: React.ReactNode;
  initial: SearchState;
  branches?: string[];
  times?: string[];
}) {
  const [s, setS] = useState<SearchState>(initial);

  const set = (patch: Partial<SearchState>) =>
    setS((prev) => {
      const next = { ...prev, ...patch };
      if (next.returnDate < next.pickupDate) next.returnDate = next.pickupDate;
      // return must be after pick-up; if the times invert on the same day, roll to the next day
      if (`${next.returnDate}T${next.returnTime}` <= `${next.pickupDate}T${next.pickupTime}`) {
        next.returnDate = addDaysISO(next.pickupDate, 1);
      }
      // longest rental the booking function accepts — keep the search inside
      // it so the availability lookup and the reservation agree
      const latestReturn = addDaysISO(next.pickupDate, MAX_RENTAL_DAYS);
      if (next.returnDate > latestReturn) next.returnDate = latestReturn;
      return next;
    });

  const bookingHref = (vehicleId: string) => {
    const p = new URLSearchParams({
      vehicle: vehicleId,
      pickup: s.location,
      from: `${s.pickupDate}T${s.pickupTime}`,
      to: `${s.returnDate}T${s.returnTime}`,
    });
    return `/book?${p.toString()}`;
  };

  return <SearchCtx.Provider value={{ ...s, branches, times, set, bookingHref }}>{children}</SearchCtx.Provider>;
}

export function useSearch(): Ctx {
  const c = useContext(SearchCtx);
  if (!c) throw new Error("useSearch must be used within SearchProvider");
  return c;
}
