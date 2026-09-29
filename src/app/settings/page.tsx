import type { Metadata } from "next";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { SettingsPage } from "@/components/SettingsPage";
import { visitorRegion } from "@/lib/region";
import { regionServices, watchRegions } from "@/lib/tmdb";
import { accountsOpen } from "@/lib/accounts";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Settings — Kodigo" };

// Settings. Drawn for the preview profile until accounts exist; the country
// starts as the visitor's own, with its streaming services.
export default async function Settings() {
  const region = await visitorRegion();
  const [regions, services] = await Promise.all([watchRegions(), regionServices(region)]);
  // Signed in, Delete removes the real account; otherwise it clears this
  // browser's preview.
  const signedIn = accountsOpen ? !!(await (await createClient()).auth.getUser()).data.user : false;
  return (
    <div className="min-h-screen flex flex-col">
      <SiteNav />
      <main className="w-full px-[clamp(16px,3.2vw,64px)] pt-8 pb-20 flex-1">
        <SettingsPage username="preview" detected={region} regions={regions} initialServices={services} signedIn={signedIn} />
      </main>
      <SiteFooter />
    </div>
  );
}
