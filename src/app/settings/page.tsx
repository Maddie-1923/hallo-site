import type { Metadata } from "next";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { SettingsPage } from "@/components/SettingsPage";
import { visitorRegion } from "@/lib/region";
import { regionServices, watchRegions } from "@/lib/tmdb";
import { signedInSubscription } from "@/lib/entitlement";
import { loadProfile } from "@/lib/profile";

export const metadata: Metadata = { title: "Settings — Kodigo" };

// Settings. Drawn for the preview profile until accounts exist; the country
// starts as the visitor's own, with its streaming services.
export default async function Settings() {
  const region = await visitorRegion();
  const [regions, services] = await Promise.all([watchRegions(), regionServices(region)]);
  // Signed in, Delete removes the real account; otherwise it clears this
  // browser's preview.
  // It also brings their Pro, for Account → Subscription.
  const { signedIn, subscription, email } = await signedInSubscription();
  // Their username, when signed in.
  const profile = signedIn ? await loadProfile() : null;
  return (
    <div className="min-h-screen flex flex-col">
      <SiteNav />
      <main className="w-full px-[clamp(16px,3.2vw,64px)] pt-8 pb-20 flex-1">
        <SettingsPage username={profile?.username ?? null} detected={region} regions={regions} initialServices={services} signedIn={signedIn} subscription={subscription} email={email} />
      </main>
      <SiteFooter />
    </div>
  );
}
