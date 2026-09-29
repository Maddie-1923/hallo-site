import type { Metadata } from "next";
import Link from "next/link";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { TrackerBoard } from "@/components/TrackerBoard";
import { previewArchive } from "@/lib/profile-previews";
import { trackerFromArchive } from "@/lib/tracker";

export const metadata: Metadata = { title: "Tracker — Kodigo" };

// The tracker, the app's main screen on the web (Pro). Until accounts and
// the database exist it is drawn from the preview library in development
// and says what it will be everywhere else.
export default async function TrackerPage() {
  const archive = await previewArchive();
  const data = archive ? await trackerFromArchive(archive) : null;
  return (
    <div className="min-h-screen flex flex-col">
      <SiteNav />
      <main className="w-full px-[clamp(16px,3.2vw,64px)] pt-[clamp(12px,2.2vw,32px)] pb-20 flex-1">
        {data ? (
          <TrackerBoard data={data} />
        ) : (
          <div className="max-w-[640px] rounded-shell bg-card p-2">
            <div className="rounded-shell bg-piece p-3 text-[12.5px] leading-[1.6] text-mid-tone">
              The tracker on the web opens with accounts: everything you&apos;re watching, what&apos;s up next and what&apos;s coming, checked off on a computer and in step with the app. It comes with{" "}
              <Link href="/pro" className="text-accent no-underline hover:underline">
                Kodigo Pro
              </Link>
              .
            </div>
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
