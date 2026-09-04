import { createClient } from "@supabase/supabase-js";

/** Bearer token from an incoming request's Authorization header ("" if none). */
export function bearerToken(request: Request): string {
  const auth = request.headers.get("authorization") ?? "";
  return auth.toLowerCase().startsWith("bearer ") ? auth.slice(7) : "";
}

/** True when the token belongs to a signed-in staff account (car_is_staff).
    The check runs as the caller in Postgres, so it can't be spoofed here. */
export async function isStaff(token: string): Promise<boolean> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!token || !url || !key) return false;
  try {
    const client = createClient(url, key, {
      auth: { persistSession: false },
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data, error } = await client.rpc("car_is_staff");
    return !error && data === true;
  } catch {
    return false;
  }
}
