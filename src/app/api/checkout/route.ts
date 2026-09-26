/* Opens a Stripe Checkout session for a booking that is holding a car.

   The amount is read from the DATABASE, never from the request body: the
   caller supplies only a booking id and its reference, and car_begin_payment
   returns what that booking actually costs. Both values are unguessable and
   both must match, so knowing one is not enough to open a session for someone
   else's reservation. */

import {
  stripeClient, publicClient, siteOrigin, stripeLocale,
  CURRENCY, isBookingId, isReference,
} from "@/lib/stripe";
import { bearerToken, staffUserId } from "@/lib/staffAuth";

export const dynamic = "force-dynamic";

type Body = { bookingId?: string; reference?: string; locale?: string };

type BeginPaymentRow = {
  amount: number;
  reference: string;
  already_paid: boolean;
  expires_at: string | null;
};

export async function POST(request: Request) {
  const stripe = stripeClient();
  const supabase = publicClient();
  if (!stripe || !supabase) {
    return Response.json({ error: "not_configured" }, { status: 503 });
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return Response.json({ error: "invalid_body" }, { status: 400 });
  }

  if (!isBookingId(body.bookingId) || !isReference(body.reference)) {
    return Response.json({ error: "invalid_body" }, { status: 400 });
  }

  const { data, error } = await supabase.rpc("car_begin_payment", {
    p_booking_id: body.bookingId,
    p_reference: body.reference,
  });
  if (error) return Response.json({ error: "lookup_failed" }, { status: 502 });

  const booking = (data as BeginPaymentRow[] | null)?.[0];
  if (!booking) return Response.json({ error: "not_found" }, { status: 404 });
  if (booking.already_paid) return Response.json({ paid: true });

  // A session always runs 30 minutes. car_begin_payment stretches a short hold
  // to cover it, up to a cap; past the cap, a payment could land after the car
  // is gone (paid_no_car), so refuse rather than take money for no car.
  if (booking.expires_at && Date.parse(booking.expires_at) < Date.now() + 31 * 60 * 1000) {
    return Response.json({ error: "hold_expiring" }, { status: 409 });
  }

  const amount = Number(booking.amount);
  if (!Number.isInteger(amount) || amount <= 0) {
    return Response.json({ error: "nothing_to_pay" }, { status: 409 });
  }

  const origin = siteOrigin(request);
  const back = `ref=${encodeURIComponent(booking.reference)}&b=${encodeURIComponent(body.bookingId)}`;

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      // Stripe's minimum; the hold checked above always outlasts it
      expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
      locale: stripeLocale(body.locale ?? "en"),
      // Stripe collects the address itself: car_begin_payment deliberately does
      // not hand the customer's email to this public endpoint
      client_reference_id: booking.reference,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: CURRENCY,
            // yen is zero-decimal: this is already the whole-yen figure
            unit_amount: amount,
            product_data: { name: `P-rideon ${booking.reference}` },
          },
        },
      ],
      // carried on both objects so the webhook can match whichever it receives
      metadata: { booking_id: body.bookingId, reference: booking.reference },
      payment_intent_data: {
        metadata: { booking_id: body.bookingId, reference: booking.reference },
      },
      success_url: `${origin}/book/complete?${back}`,
      cancel_url: `${origin}/book/complete?${back}&cancelled=1`,
    });

    if (!session.url) return Response.json({ error: "no_session_url" }, { status: 502 });
    return Response.json({ url: session.url });
  } catch {
    // never surface Stripe's message to the browser
    return Response.json({ error: "stripe_failed" }, { status: 502 });
  }
}

/** Staff-only readiness check, so the admin console can refuse to switch
    Pay-before-book on while the server has no Stripe keys — doing that would
    break every reservation. Reports only booleans, never a key. */
export async function GET(request: Request) {
  const caller = await staffUserId(bearerToken(request));
  if (!caller) return Response.json({ error: "Not authorized" }, { status: 401 });

  return Response.json({
    secretKey: Boolean(process.env.STRIPE_SECRET_KEY),
    webhookSecret: Boolean(process.env.STRIPE_WEBHOOK_SECRET),
    serviceRoleKey: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
  });
}
