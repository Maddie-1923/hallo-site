import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { UsernameSetup } from "@/components/UsernameSetup";
import { accountsOpen } from "@/lib/accounts";
import { optionalLibrary } from "@/lib/library";
import { loadProfile } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Choose your username — Kodigo", robots: { index: false } };

// Choosing (or changing) a username, and with it the one-time notice that a
// profile is public, with the private switch beside it. Nothing of an
// account shows publicly until this is done. Before accounts open, the form
// can be tried in development and saves nothing.
export default async function ProfileSetup() {
  let current: string | null = null;
  let isPrivate = false;
  let suggestion = "";
  let hasLibrary = false;
  if (accountsOpen) {
    const { data: { user } } = await (await createClient()).auth.getUser();
    if (!user) redirect("/login?next=/profile/setup");
    const [profile, lib] = await Promise.all([loadProfile(), optionalLibrary()]);
    current = profile.username;
    isPrivate = profile.is_private;
    hasLibrary = !!lib.archive;
    suggestion = suggest(profile.display_name || user.email?.split("@")[0] || "");
  } else if (process.env.NODE_ENV !== "development") {
    redirect("/");
  }
  return (
    <div className="min-h-screen flex flex-col">
      <SiteNav />
      <main className="w-full px-[clamp(16px,3.2vw,64px)] pt-8 pb-20 flex-1">
        <UsernameSetup current={current} initialPrivate={isPrivate} suggestion={suggestion} hasLibrary={hasLibrary} preview={!accountsOpen} />
      </main>
      <SiteFooter />
    </div>
  );
}

/** A starting point from their name or email: "Laura Dunlap" → "lauradunlap". */
function suggest(from: string): string {
  const s = from
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9._]/g, "")
    .replace(/[._]{2,}/g, ".")
    .replace(/^[._]+|[._]+$/g, "")
    .slice(0, 20);
  return s.length >= 3 ? s : "";
}
