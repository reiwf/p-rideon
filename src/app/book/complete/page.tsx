import type { Metadata } from "next";
import { cookies } from "next/headers";
import { asLocale } from "@/lib/i18n";
import { LanguageProvider } from "@/components/LanguageProvider";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { BookingComplete } from "@/components/booking/BookingComplete";
import { fetchPaymentState, fetchSiteSettings } from "@/lib/publicData";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Reservation — P-rideon",
  robots: { index: false, follow: false },
};

/** Where Stripe Checkout returns the guest. The browser never decides whether
    a payment succeeded — this asks the database, which only the webhook can
    have updated. */
export default async function BookingCompletePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const reference = sp.ref ?? "";
  const bookingId = sp.b ?? "";
  const cancelled = sp.cancelled === "1";

  const [state, settings] = await Promise.all([
    fetchPaymentState(bookingId, reference),
    fetchSiteSettings(),
  ]);
  const initialLocale = asLocale((await cookies()).get("kd-locale")?.value);

  return (
    <LanguageProvider initialLocale={initialLocale}>
      <SiteHeader />
      <main className="flex-1">
        <BookingComplete
          state={state}
          cancelled={cancelled}
          reference={reference}
          bookingId={bookingId}
        />
      </main>
      <SiteFooter settings={settings} />
    </LanguageProvider>
  );
}
