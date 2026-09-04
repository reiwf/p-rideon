import type { Metadata } from "next";
import { cookies } from "next/headers";
import { asLocale } from "@/lib/i18n";
import { LanguageProvider } from "@/components/LanguageProvider";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { FaqChat } from "@/components/FaqChat";
import { BookingFlow } from "@/components/booking/BookingFlow";
import { BookingNotFound } from "@/components/booking/BookingNotFound";
import { fetchBookingData } from "@/lib/publicData";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Reserve — P-rideon",
};

export default async function BookPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const initialLocale = asLocale((await cookies()).get("kd-locale")?.value);
  const { vehicle, insurances, ratePlans, branches, branchInfo, extras, safetyVideo, settings } = await fetchBookingData(sp.vehicle ?? "");

  return (
    <LanguageProvider initialLocale={initialLocale}>
      <SiteHeader />
      <main className="flex-1">
        {vehicle ? (
          <BookingFlow
            vehicle={vehicle}
            insurances={insurances}
            ratePlans={ratePlans}
            branches={branches}
            branchInfo={branchInfo}
            extras={extras}
            safetyVideo={safetyVideo}
            settings={settings}
            initial={{ location: sp.pickup ?? "", from: sp.from ?? "", to: sp.to ?? "" }}
          />
        ) : (
          <BookingNotFound />
        )}
      </main>
      <SiteFooter settings={settings} />
      <FaqChat settings={settings} />
    </LanguageProvider>
  );
}
