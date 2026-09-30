import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { UsernameSetup } from "@/components/UsernameSetup";
import { accountsOpen } from "@/lib/accounts";
import { loadProfile } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Choose your username — Kodigo", robots: { index: false } };

// Choosing (or changing) a username, and with it the one-time notice that a
// profile is public, with the private switch beside it. Nothing of an
// account shows publicly until this is done.
export default async function ProfileSetup() {
  let current: string | null = null;
  let isPrivate = false;
  if (accountsOpen) {
    const { data: { user } } = await (await createClient()).auth.getUser();
    if (!user) redirect("/login?next=/profile/setup");
    const profile = await loadProfile();
    current = profile.username;
    isPrivate = profile.is_private;
  } else {
    redirect("/");
  }
  return (
    <div className="min-h-screen flex flex-col">
      <SiteNav />
      <main className="w-full px-[clamp(16px,3.2vw,64px)] pt-8 pb-20 flex-1">
        <UsernameSetup current={current} initialPrivate={isPrivate} />
      </main>
      <SiteFooter />
    </div>
  );
}
