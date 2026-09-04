# Security notes

Findings from an audit of what the **public anon key** can reach. Nothing here
is urgent-breaking; all of it is parked for a future pass.

Audited 2026-09-03 by querying every table and function **as the `anon` role**,
which is exactly what someone holding the key can do. `NEXT_PUBLIC_SUPABASE_ANON_KEY`
ships in the browser bundle by design — it identifies the project and authorises
nothing on its own, so RLS is the entire security boundary.

## Open findings

### 1. `get_user_id_by_email` allows account enumeration — **highest priority**

```sql
get_user_id_by_email(p_email text)   -- SECURITY DEFINER, EXECUTE granted to anon
  select id from auth.users where lower(email) = lower(p_email) limit 1;
```

Confirmed callable as `anon`. Anyone with the public key can test whether **any**
email address has an account and get back its user id — enumeration against the
whole `auth.users` table.

This function belongs to the **other application sharing this Supabase project**
(the `profiles` / `bookings` / `messages` tables), not to the car-rental site.

Fix, once it's confirmed that app doesn't rely on calling it anonymously:

```sql
revoke execute on function public.get_user_id_by_email(text) from anon;
```

Check the other app's sign-in flow first — revoking may break it. The durable fix
there is to move the lookup behind an authenticated route or an edge function.

### 2. Booking creation is unauthenticated and unrated

`car_create_booking` is `SECURITY DEFINER` and executable by `anon` — this is
intentional, it is how a guest books. But there is no captcha and no rate limit,
and **every insert fires two Resend emails** (guest confirmation + staff
notification) through the `car_bookings_send_email` trigger. A script could burn
the Resend quota and flood staff.

Worth a per-IP limit at the Cloudflare edge, or a captcha on the confirm step, if
it is ever actually abused. Cheap to add later; no evidence of abuse so far.

### 3. `car_faq_queries` accepts unlimited anonymous inserts

The help-desk question log is `for insert to anon with check (true)`. Same shape
as above but with no email side effect, so the worst case is table bloat. The
table is deliberately append-only — anonymous visitors cannot read or update it,
so nobody can read anyone else's questions.

### 4. Storage object names are enumerable

7 objects are listable by `anon` across the public buckets. Fine for car photos
and safety videos — it just means filenames are not secret. Do not put anything
private in `car-vehicles`, `raito-media`, or the R2 media bucket.

### 5. The service role key is now in play

`/api/staff` (admin account creation) uses `SUPABASE_SERVICE_ROLE_KEY`, which
**bypasses RLS entirely**. Rules that must hold:

- Runtime secret only. Never `NEXT_PUBLIC_*`, and never added to Cloudflare's
  **Build** variables — build-time values are inlined into the browser bundle.
- `/api/staff` is the only place it is read. Every handler there gates on
  `staffUserId()` first, and the route accepts nothing but an email, a name and
  a password.
- Lockout guards: a caller cannot revoke their own access, and the last
  remaining admin cannot be removed.
- Revoking deletes the `car_staff` row only, never the `auth.users` account —
  that account may belong to the other app sharing this project.

If this key ever leaks, rotate it in the Supabase dashboard immediately
(Project Settings → API → service_role → Reset); it grants full read/write to
every table including `car_bookings`.

## Verified safe (so this need not be re-checked)

- **All 23 tables have RLS enabled**; none is forced-off.
- **Not readable by the anon key — zero rows:** `car_bookings` (all customer
  names, emails, phones, licence countries), `car_faq_queries`, `car_staff`, and
  all 12 tables belonging to the other app (`profiles`, `bookings`,
  `booking_status_history`, `messages`, `message_translations`,
  `booking_message_reads`, `drivers`, `services`, `vehicles`, `notifications`,
  `push_subscriptions`, `booking_push_subscriptions`).
- **Readable, and correctly so** — all of it is already rendered on the public
  site: `car_vehicles`, `car_branches`, `car_extras`, `car_rate_plans`,
  `car_faqs`. `car_insurances` exposes only active rows (2 of 3);
  `car_settings` exposes only the `safety_video` and `operation` keys (2 of 3),
  keeping `booking_notify_emails` — staff addresses — private.
- **The only anon writes are** the two intentional ones above. The `profiles`
  UPDATE policy is scoped to `auth.uid() = id`, which is null for anon and so
  can never match.

## Open items (not security)

Carried over from recent work, so they are not lost:

- **Help-desk launcher may overlap the Confirm button on mobile.** Both are
  bottom-right; on a phone the floating button can sit on top of the booking
  CTA. Fix would be moving it bottom-left on `/book`, or hiding it on step 3.
  Needs a look on a real device first.
- **Two near-duplicate FAQ topics** — "Booking and Payment" and
  "Booking & payment" render as two separate chips for guests.
- **ETC content conflict.** The FAQ answer (from the `trust` copy) reads as
  though the ETC card is included; the How-it-works section says "ETC card
  available for a fee." A guest could reasonably dispute this at the counter.
- **Safety video: `ja` points at `precaution-en.mp4`** — same file as English.
  Deliberate placeholder or a paste slip?
- **Dead infra:** the Supabase `car-videos` bucket and its four RLS policies are
  unused since the move to Cloudflare R2, and still hold a 19.5 MB test upload.
- **The domain cannot receive email.** `p-rideon.com` has no MX record — only
  `send.p-rideon.com` (SPF/DKIM for Resend outbound). Handled for now by sending
  as `noreply@p-rideon.com` with no Reply-To, and a footer that says the message
  is send-only. If you ever want replies to work, that needs real inbound mail:
  MX to a mailbox provider, or Resend inbound + a webhook. Until then, the
  confirmation must not invite a reply — check the `closing` slot after editing.
- **Two save buttons on /admin/settings.** Hours/contact and the confirmation
  email save independently. Editing the email fields and then pressing the
  hours "Save settings" writes only the hours row — the email edits are lost
  without warning. Worth merging into one save, or moving the email card to its
  own page.
- **Rows authored in Japanese must be auto-translated.** With the base column
  now holding the authoring language, an entry with no `i18n.en` shows Japanese
  to English visitors.
