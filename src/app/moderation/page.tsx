import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { ModerationPage } from "@/components/ModerationPage";
import { loadReports, moderatorAccess } from "@/lib/safety-actions";

export const metadata: Metadata = { title: "Moderation — Kodigo", robots: { index: false, follow: false } };

// The owner's moderation queue. Only moderators (MODERATOR_EMAILS) see it;
// for anyone else it doesn't exist. In development it runs on the reports
// made in this browser, plus a few samples.
export default async function Moderation() {
  const access = await moderatorAccess();
  if (!access) notFound();
  const initial = access === "live" ? await loadReports() : null;
  return (
    <div className="min-h-screen flex flex-col">
      <SiteNav />
      <main className="w-full px-[clamp(16px,3.2vw,64px)] pt-8 pb-20 flex-1">
        <ModerationPage live={access === "live"} initial={initial ?? []} />
      </main>
      <SiteFooter />
    </div>
  );
}
