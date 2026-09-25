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

## Change log

### 2026-09-18 — `car_vehicles.plate_number` is staff-only by column grant

Plate numbers identify a physical car and must not reach the public site. RLS
cannot filter columns, so `anon` lost its table-wide `SELECT` on
`public.car_vehicles` and was re-granted an explicit column list instead
(everything except `plate_number`).

**Consequence to remember:** a column added to `car_vehicles` later is *not*
readable by `anon` until it is added to that grant. A public query that asks
for it fails with `42501 permission denied for table car_vehicles` — the whole
row, not just the column. `select *` as `anon` on this table now always fails,
which is why `fetchPublicVehicles` lists its columns explicitly.

**Correction (same day).** An earlier version of this note claimed the
availability functions leak "no dates". That was wrong, and the mistake is worth
remembering: `car_vehicle_availability` answered free/busy *per physical car*
for any window, so probing one-hour slots reconstructed the exact pick-up and
return instant of every rental. Verified by doing it with only the public key.
It has been dropped — see the next entry.

### 2026-09-18 — hardening pass

Fixes applied after auditing the public surface with the anon key. Each was
verified by attempting the attack before and after.

**1. Booking creation no longer trusts the browser.** `car_create_booking` was
accepting the price, the extras (names *and* prices), the pick-up location and
the customer fields verbatim. It now recomputes the total from
`car_vehicles` / `car_rate_plans` / `car_insurances` / `car_extras`, rebuilds
the extras list from the database by id, requires `pickup_location` to match a
published branch, and validates the name, email, phone and licence country. The
browser's figure is kept in `car_bookings.client_quote` purely so staff can spot
tampering; nothing customer-facing renders it.

*Why it mattered:* anyone could book the most expensive car for ¥1 and receive a
company-signed confirmation quoting that price. This is now a prerequisite for
taking online payment, not just a reporting problem.

**2. The booking emails are HTML escaped.** Both `car_send_booking_email` and
`car_booking_email` interpolated pick-up location, extras, email, phone and
country straight into HTML; only `customer_name` and `notes` were escaped. With
an attacker-chosen recipient this was a phishing mailer running on the company's
own SPF/DKIM. Every dynamic value in both functions now goes through
`car_html_escape`. Combined with fix 1 the injection is closed twice over.

**3. Junk bookings can no longer block the fleet.** Bookings now hold inventory
(the overlap constraint), so unauthenticated creation became a denial-of-service
lever. `car_create_booking` is rate limited to 5 per IP per hour with a global
circuit breaker of 20 per 5 minutes, and refuses backdated bookings, pick-ups
more than 400 days out, and rentals longer than 90 days. The client IP comes
from `request.headers` and is stored in `car_bookings.client_ip`.

**Correction (2026-09-24).** The first version of this rate limit was
bypassable. It read the FIRST value of `x-forwarded-for`, but the edge
*preserves* whatever the client sent and appends the real address — sending
`X-Forwarded-For: 9.9.9.9, 8.8.8.8` came back as `9.9.9.9, 8.8.8.8,<real ip>`.
Any attacker could rotate that header and never be counted.

`car_client_ip()` now prefers `cf-connecting-ip`, then `sb-forwarded-for`
(both set by the edge and verified to OVERWRITE anything the client sends),
falling back to the LAST `x-forwarded-for` entry, which is the one the trusted
proxy appended. **Never trust the first entry of that header.**

Rate alone also does not bound *inventory*: one booking can hold a car for 90
days, so a few requests could still take the fleet off sale. One IP, and one
email address, may now hold at most **3** live future bookings
(`CAR_TOO_MANY_HELD`). That number is a tunable and is sized for a three-car
fleet; raise it as the fleet grows, or legitimate repeat customers and travel
agents booking several cars on one address will be turned away.

*Still open, and worth being honest about:* these are mitigations, not a cure.
An attacker with many IPs and disposable email addresses can still place junk
bookings, and a pending booking holds its car indefinitely. The durable fixes
are a captcha (Cloudflare Turnstile) in front of `car_create_booking`, and
requiring payment to hold a car — the planned **pay-before-book** toggle is
itself the strongest answer here, because it makes holding inventory cost
money.

**4. Availability is type-level only.** `car_vehicle_availability` is dropped.
`car_fleet_availability(from, to)` returns `(type_key, total, available)` where
`type_key` is `lower(trim(name)) || '|' || transmission` — the same string
`vehicleTypeKey()` builds in `src/lib/vehicleTypes.ts`, so **the two must stay
in step**. Both availability functions now call `car_check_window`, which
refuses windows in the past, beyond 400 days, or longer than 95 days. That kills
occupancy-history mining. The UI caps trips at 90 days to match.

**5. Stray grants withdrawn.** Supabase's default blanket grants gave `anon`
INSERT/UPDATE/REFERENCES on every `car_` table including `car_staff`, plus
SELECT on `car_bookings` and `car_staff`. All inert under RLS, but one careless
policy would have made them live. The public role now keeps exactly one write —
inserting into `car_faq_queries`, which has a deliberate public INSERT policy
and no public read.

**6. Account enumeration closed.** `revoke execute on function
public.get_user_id_by_email(text) from anon` — finding #1 above. `authenticated`
keeps it. This function belongs to the **other app** sharing the project and
this repo never calls it, so if that app's *logged-out* sign-in flow breaks,
revert with `grant execute on function public.get_user_id_by_email(text) to
anon;` and solve it behind an authenticated route instead.

Overbooking itself is refused by the `car_bookings_no_overlap` exclusion
constraint, not by any of these functions.

### 2026-09-24 — re-audit, including Supabase's own advisors

**Fixed:** the rate-limit IP bug above, plus a cap on held inventory. Internal
helpers (`car_client_ip`, `car_check_window`, `car_booking_email`) were left
callable over the REST API by Supabase's default grants and are now revoked
from `anon` and `authenticated`. Safe to revoke because `postgres` owns both
them and the SECURITY DEFINER functions that call them.

**Checked, deliberately NOT changed:**

- **`pg_net` is registered in the `public` schema** (advisor `extension_in_public`),
  and `net.http_post` / `http_get` / `http_delete` carry EXECUTE for `anon`.
  **Not reachable:** its functions live in schema `net`, which PostgREST does
  not expose — calling `/rest/v1/rpc/http_post` returns `PGRST202`, verified.
  Left alone on purpose: `postgres` is not a superuser here, the email trigger
  calls `net.http_post` through it, and that trigger ends with
  `exception when others then return new`, so if a revoke removed the wrong
  grant **every booking email would stop silently**. Not worth it for a
  latent-only finding. Revisit only with a way to verify mail still sends.

- **`car_send_test_booking_email` is callable by any signed-in user** (advisor
  `authenticated_security_definer_function_executable`). Its first statement is
  `if not public.car_is_staff() then raise exception 'not authorized'`, so a
  non-staff account gets nothing. Safe as written. Note the project shares auth
  with another app, so "authenticated" is a much wider group than staff.

- **11 tables with RLS enabled and no policies** (advisor `rls_enabled_no_policy`,
  INFO): `bookings`, `drivers`, `messages`, `services`, `vehicles` and friends.
  These belong to the **other app**. No policies means deny-all, which fails
  closed — safe, not a hole.

- **Leaked-password protection is off** in Supabase Auth. Worth enabling, since
  admin accounts are created with a set password at `/admin/staff` and nothing
  currently checks them against known breaches.

### 2026-09-25 — re-audit after the payment work

Five defects found in the payment code, all fixed and each reproduced before and
after.

**1. A late webhook could strand a paid guest and spin Stripe forever.** If a
guest finished paying just as their hold lapsed, and the car had already gone to
someone else, `car_mark_paid` hit `car_bookings_no_overlap` and threw. The
webhook returned 500, Stripe retried indefinitely, and a guest who had paid had
no booking and nobody was told. Reproduced exactly.

`car_mark_paid` now always records the money. It tries the original car, then any
other car of the same type, and only if the whole type is gone leaves the
reservation cancelled with `[PAID BUT NO CAR FREE - refund or re-book]` prepended
to `notes`, returning `paid_no_car` so Stripe gets a 200 and stops retrying.
**Watch for the combination `status = cancelled` with `payment_status = paid`:
that is money held against no reservation and needs a human.**

**2. A recovered booking would never have been emailed.** The trigger fired on
"was awaiting_payment, is now confirmed". A booking rescued from a lapsed hold
goes cancelled → confirmed, so it would have been paid and confirmed in silence.
It now keys on the PAYMENT transition (`payment_status` becoming `paid` on a
confirmed booking), which covers both routes, still fires exactly once, and stays
silent for a staff pending → confirmed that already emailed at insert.

**3. The hold was exactly as long as the Stripe session.** Both 30 minutes, so a
payment completing at 29:59 could land after the car was gone. The hold is now 45
minutes against a 30-minute session.

**4. An abandoned checkout took a car off sale for hours.** Expired holds were
only released when the *next* person tried to book, because the sweep lives
inside `car_create_booking`. Measured a lapsed hold still reporting
`toyota voxy|AT 0/1` **15.7 hours** later. Both availability functions now treat a
hold past its deadline as not occupying, so the car returns to sale at once. This
stays consistent with booking, which still sweeps before assigning.

**5. `car_begin_payment` handed the customer's email to a public endpoint.** It is
guarded by needing the booking uuid *and* its reference, but the reference is only
4 hex characters — 65k guesses for anyone who obtained a booking id. It no longer
returns the email; Stripe Checkout collects the address itself.

**Accepted, not fixed:**

- `/api/checkout` has no rate limit. Someone holding a valid booking id and
  reference can open unlimited Checkout sessions. Stripe API noise only, no money
  at risk.
- `car_bookings.client_ip` is personal data with no retention policy. Worth a
  periodic purge if this ever matters for privacy compliance.
- **Dev and production share one Supabase project.** The Pay-before-book toggle
  and every booking are therefore global: switching the toggle on locally switches
  it on for real customers, and a local test booking occupies a real car. This
  already caused a live incident — see the deploy notes. A separate project for
  development is the real fix.
