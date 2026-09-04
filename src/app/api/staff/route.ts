/* Staff account management for the admin console.

   Creating a login needs the Supabase **service role** key, which bypasses RLS
   entirely — so it lives only as a server-side secret and this route is the only
   thing that touches it. Every request is gated on the caller already being
   staff (car_is_staff, evaluated in Postgres as the caller, so it can't be
   spoofed), and the route accepts nothing but an email, a name and a password.

   Listing is deliberately NOT here: car_staff already has a staff-only SELECT
   policy, so the admin page reads it directly with the signed-in session. */

import { createClient } from "@supabase/supabase-js";
import { bearerToken, staffUserId } from "@/lib/staffAuth";

export const dynamic = "force-dynamic";

const MIN_PASSWORD = 8;

/** Admin client — full RLS bypass. Never construct this outside this route. */
function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

/** POST — create (or promote) an account and grant it admin access. */
export async function POST(request: Request) {
  const caller = await staffUserId(bearerToken(request));
  if (!caller) return Response.json({ error: "Not authorized" }, { status: 401 });

  const admin = adminClient();
  if (!admin) return Response.json({ error: "not_configured" }, { status: 503 });

  let body: { email?: string; password?: string; fullName?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const email = (body.email ?? "").trim().toLowerCase();
  const password = body.password ?? "";
  const fullName = (body.fullName ?? "").trim();

  if (!/^\S+@\S+\.\S+$/.test(email)) return Response.json({ error: "bad_email" }, { status: 400 });
  if (password.length < MIN_PASSWORD) return Response.json({ error: "weak_password" }, { status: 400 });

  // email_confirm: the account is created by a colleague, not self-signed-up,
  // so there is no address to verify and no invite mail to depend on
  const created = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: fullName ? { full_name: fullName } : undefined,
  });

  let userId = created.data.user?.id ?? null;

  if (created.error) {
    // Someone may already have an account here — this project's auth is shared
    // with another app. Promote them rather than failing.
    const existing = await admin.auth.admin.listUsers({ perPage: 1000 });
    userId = existing.data?.users.find((u) => u.email?.toLowerCase() === email)?.id ?? null;
    if (!userId) return Response.json({ error: created.error.message }, { status: 400 });
  }

  // `role` is left to the column default ('manager') so new rows match the
  // existing account. car_is_staff() ignores it — it exists for a future
  // owner/staff split, and hardcoding a different value here would seed
  // inconsistent data for that.
  const { error } = await admin
    .from("car_staff")
    .upsert({ user_id: userId, email, full_name: fullName }, { onConflict: "user_id" });
  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ ok: true, userId, promoted: Boolean(created.error) });
}

/** DELETE ?user_id=… — revoke admin access. The login itself is left alone:
    the account may belong to the other app sharing this Supabase project. */
export async function DELETE(request: Request) {
  const caller = await staffUserId(bearerToken(request));
  if (!caller) return Response.json({ error: "Not authorized" }, { status: 401 });

  const admin = adminClient();
  if (!admin) return Response.json({ error: "not_configured" }, { status: 503 });

  const userId = new URL(request.url).searchParams.get("user_id") ?? "";
  if (!userId) return Response.json({ error: "Missing user_id" }, { status: 400 });

  // Two lockout guards: you can't remove yourself, and you can't remove the
  // last account — either would leave the console unreachable without the
  // Supabase dashboard.
  if (userId === caller) return Response.json({ error: "self_remove" }, { status: 400 });

  const { count } = await admin.from("car_staff").select("user_id", { count: "exact", head: true });
  if ((count ?? 0) <= 1) return Response.json({ error: "last_staff" }, { status: 400 });

  const { error } = await admin.from("car_staff").delete().eq("user_id", userId);
  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ ok: true });
}

/** GET — whether the service role key is configured, so the admin UI can say
    "not set up" instead of failing on the first attempt. */
export async function GET() {
  return Response.json({ configured: Boolean(adminClient()) });
}
