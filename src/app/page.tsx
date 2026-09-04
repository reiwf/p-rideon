import { LanguageProvider } from "@/components/LanguageProvider";
import { LanguageGate } from "@/components/LanguageGate";
import { SearchProvider } from "@/components/SearchContext";
import { SiteHeader } from "@/components/SiteHeader";
import { Hero } from "@/components/Hero";
import { Fleet } from "@/components/Fleet";
import { Steps } from "@/components/Steps";
import { Destinations } from "@/components/Destinations";
import { SiteFooter } from "@/components/SiteFooter";
import { FaqChat } from "@/components/FaqChat";
import { fetchPublicVehicles, fetchPublicBranches, fetchSiteSettings } from "@/lib/publicData";
import { defaultTripDates } from "@/lib/booking";
import { buildRentalTimes, clampToTimes } from "@/lib/siteSettings";
import { cookies } from "next/headers";
import { asLocale } from "@/lib/i18n";

// Always reflect the latest admin-managed fleet & branches.
export const dynamic = "force-dynamic";

export default async function Home() {
  const [vehicles, branches, settings] = await Promise.all([
    fetchPublicVehicles(),
    fetchPublicBranches(),
    fetchSiteSettings(),
  ]);
  const times = buildRentalTimes(settings.openTime, settings.closeTime, settings.stepMinutes);
  const initialLocale = asLocale((await cookies()).get("kd-locale")?.value);

  return (
    <LanguageProvider initialLocale={initialLocale}>
      <SearchProvider
        branches={branches}
        times={times}
        initial={{
          location: branches[0] ?? "",
          ...defaultTripDates(),
          pickupTime: clampToTimes("10:00", times),
          returnTime: clampToTimes("10:00", times),
        }}
      >
        <LanguageGate />
        <SiteHeader />
        <main className="flex-1">
          <Hero />
          <Fleet vehicles={vehicles} />
          <Destinations />
          <Steps />
        </main>
        <SiteFooter settings={settings} />
        <FaqChat settings={settings} />
      </SearchProvider>
    </LanguageProvider>
  );
}
