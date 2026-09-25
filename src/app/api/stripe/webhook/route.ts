/* Stripe webhook — the ONLY thing that may confirm a paid booking.

   The browser is never trusted to say a payment succeeded; it can only be
   redirected back to a "thank you" page. Confirmation happens here, after the
   Stripe signature is verified, and the database call runs with the service
   role.

   Signature verification uses constructEventAsync with a Web Crypto provider:
   the synchronous constructEvent relies on Node crypto and throws on
   Cloudflare Workers, which is where this deploys. */

import type Stripe from "stripe";
import { stripeClient, adminClient, cryptoProvider, isBookingId, isReference } from "@/lib/stripe";

export const dynamic = "force-dynamic";

async function confirm(session: Stripe.Checkout.Session): Promise<string> {
  const bookingId = session.metadata?.booking_id;
  const reference = session.metadata?.reference;
  if (!isBookingId(bookingId) || !isReference(reference)) return "bad_metadata";

  const admin = adminClient();
  if (!admin) return "not_configured";

  const { data, error } = await admin.rpc("car_mark_paid", {
    p_booking_id: bookingId,
    p_reference: reference,
    p_session_id: session.id,
    p_payment_intent:
      typeof session.payment_intent === "string"
        ? session.payment_intent
        : (session.payment_intent?.id ?? null),
    // yen is zero-decimal, so amount_total is already whole yen
    p_amount_paid: session.amount_total ?? null,
  });

  if (error) throw new Error(error.message);
  return (data as string) ?? "unknown";
}

export async function POST(request: Request) {
  const stripe = stripeClient();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !secret) {
    return Response.json({ error: "not_configured" }, { status: 503 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) return Response.json({ error: "unsigned" }, { status: 400 });

  // the RAW body is what the signature covers — do not parse it first
  const payload = await request.text();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(payload, signature, secret, undefined, cryptoProvider);
  } catch {
    // an unverified payload is an attacker, not a customer
    return Response.json({ error: "bad_signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded": {
        const session = event.data.object as Stripe.Checkout.Session;
        // a session can complete while a slow method is still pending; wait for
        // the async_payment_succeeded event in that case
        if (session.payment_status !== "paid") return Response.json({ received: true, skipped: "unpaid" });
        const outcome = await confirm(session);
        return Response.json({ received: true, outcome });
      }

      case "checkout.session.expired":
      case "checkout.session.async_payment_failed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const bookingId = session.metadata?.booking_id;
        const admin = adminClient();
        if (admin && isBookingId(bookingId)) {
          // leave the sweep to cancel it; just record that payment did not land
          await admin
            .from("car_bookings")
            .update({ payment_status: "failed" })
            .eq("id", bookingId)
            .eq("payment_status", "awaiting");
        }
        return Response.json({ received: true });
      }

      default:
        return Response.json({ received: true, ignored: event.type });
    }
  } catch {
    // 500 makes Stripe retry, which is what we want for a transient DB failure
    return Response.json({ error: "handler_failed" }, { status: 500 });
  }
}
