import { LanguageProvider } from "@/components/LanguageProvider";
import { LanguageGate } from "@/components/LanguageGate";
import { SearchProvider } from "@/components/SearchContext";
import { SiteHeader } from "@/components/SiteHeader";
import { Hero } from "@/components/Hero";
import { Fleet } from "@/components/Fleet";
import { Steps } from "@/components/Steps";
import { Destinations } from "@/components/Destinations";
import { SiteFooter } from "@/components/SiteFooter";
import { fetchPublicVehicles, fetchPublicBranches } from "@/lib/publicData";
import { defaultTripDates } from "@/lib/booking";
import { cookies } from "next/headers";
import { asLocale } from "@/lib/i18n";

// Always reflect the latest admin-managed fleet & branches.
export const dynamic = "force-dynamic";

export default async function Home() {
  const [vehicles, branches] = await Promise.all([fetchPublicVehicles(), fetchPublicBranches()]);
  const initialLocale = asLocale((await cookies()).get("kd-locale")?.value);

  return (
    <LanguageProvider initialLocale={initialLocale}>
      <SearchProvider
        branches={branches}
        initial={{ location: branches[0] ?? "", ...defaultTripDates(), pickupTime: "10:00", returnTime: "10:00" }}
      >
        <LanguageGate />
        <SiteHeader />
        <main className="flex-1">
          <Hero />
          <Fleet vehicles={vehicles} />
          <Destinations />
          <Steps />
        </main>
        <SiteFooter />
      </SearchProvider>
    </LanguageProvider>
  );
}
