"use client";

/* Read/write helpers for one car_settings row.

   Each settings card owns a whole jsonb row, so a plain upsert from a tab that
   loaded before someone else's change silently overwrites every field it never
   saw — including fields the person never touched. The save below is therefore
   conditional on the `updated_at` the page loaded: Postgres applies it only if
   the row hasn't moved, and a mismatch comes back as a conflict instead of
   destroying the other change. */

import { supabase } from "./supabaseClient";

export type SettingsRow<T> = { value: T | null; updatedAt: string | null };

export async function loadSetting<T>(key: string): Promise<SettingsRow<T>> {
  const { data } = await supabase
    .from("car_settings")
    .select("value,updated_at")
    .eq("key", key)
    .maybeSingle();
  return { value: (data?.value ?? null) as T | null, updatedAt: data?.updated_at ?? null };
}

export type SaveResult =
  | { ok: true; updatedAt: string | null }
  /** someone else wrote to this row since it was loaded */
  | { ok: false; conflict: true }
  | { ok: false; conflict?: false; error: string };

export async function saveSetting(key: string, value: unknown, expectedUpdatedAt: string | null): Promise<SaveResult> {
  // No version to check against — either the row genuinely doesn't exist yet, or
  // the load failed and the form is showing defaults. INSERT (not upsert) keeps
  // those apart: if a row is already there this fails on the primary key rather
  // than silently overwriting real settings with blank defaults.
  if (expectedUpdatedAt === null) {
    const { data, error } = await supabase
      .from("car_settings")
      .insert({ key, value })
      .select("updated_at");
    if (error) return { ok: false, conflict: true };
    return { ok: true, updatedAt: data?.[0]?.updated_at ?? null };
  }

  const { data, error } = await supabase
    .from("car_settings")
    .update({ value })
    .eq("key", key)
    .eq("updated_at", expectedUpdatedAt)
    .select("updated_at");

  if (error) return { ok: false, error: error.message };
  // zero rows matched => updated_at moved => someone else saved first
  if (!data || data.length === 0) return { ok: false, conflict: true };
  return { ok: true, updatedAt: data[0].updated_at ?? null };
}
