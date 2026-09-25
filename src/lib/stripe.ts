/* Server-only Stripe helpers.

   NEVER import this from a client component: it reads STRIPE_SECRET_KEY.

   The site deploys to Cloudflare Workers through OpenNext, so the SDK is built
   with the fetch HTTP client and webhook signatures are verified with Web
   Crypto (`constructEventAsync`). The synchronous `constructEvent` uses Node's
   crypto and throws on Workers. */

import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

/** Yen is a zero-decimal currency: Stripe wants 62700 for ¥62,700, NOT
    6270000. Every amount in this codebase is already whole yen, so amounts
    must be passed through untouched. */
export const CURRENCY = "jpy";

export function stripeClient(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return new Stripe(key, {
    httpClient: Stripe.createFetchHttpClient(),
  });
}

/** Web Crypto signature verification, required on Workers. */
export const cryptoProvider = Stripe.createSubtleCryptoProvider();

/** Stripe Checkout's own locale codes, for the four languages the site speaks. */
export function stripeLocale(locale: string): Stripe.Checkout.SessionCreateParams.Locale {
  switch (locale) {
    case "ja": return "ja";
    case "zh": return "zh";
    case "ko": return "ko";
    default: return "en";
  }
}

/** Public (anon) server client. Used for car_begin_payment, which is guarded
    by needing both the booking id and its reference. */
export function publicClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

/** Full RLS bypass. Only the Stripe webhook uses this, and only after the
    signature has been verified. */
export function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const REFERENCE = /^KD-[0-9]{6}-[A-Z0-9]{4}$/;

export const isBookingId = (s: unknown): s is string => typeof s === "string" && UUID.test(s);
export const isReference = (s: unknown): s is string => typeof s === "string" && REFERENCE.test(s);

/** Where Stripe should send the guest back to. Prefers the configured site URL
    so a forged Host header cannot steer the return trip. */
export function siteOrigin(request: Request): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (configured) return configured.replace(/\/+$/, "");
  return new URL(request.url).origin;
}
