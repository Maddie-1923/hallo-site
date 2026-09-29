import type { Metadata } from "next";
import Link from "next/link";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { TrackerBoard } from "@/components/TrackerBoard";
import { CinemaHero } from "@/components/CinemaHero";
import { billboard } from "@/components/TitleRows";
import { visitorRegion } from "@/lib/region";
import { previewArchive } from "@/lib/profile-previews";
import { trackerFromArchive } from "@/lib/tracker";

export const metadata: Metadata = { title: "Tracker — Kodigo" };

// The tracker, the app's main screen on the web (Pro). Until accounts and
// the database exist it is drawn from the preview library in development
// and says what it will be everywhere else.
export default async function TrackerPage() {
  const archive = await previewArchive();
  const data = archive ? await trackerFromArchive(archive) : null;
  // The billboard, as Home and Explore have: what's just out from what they
  // track, a new episode by its show's own picture (never the episode's
  // still), and films now showing.
  const fresh = data?.fresh ?? [];
  const slides = fresh.length
    ? await billboard(
        fresh.flatMap((f) => (f.show ? [f.show] : [])),
        fresh.flatMap((f) => (f.movie ? [f.movie] : [])),
        archive,
        await visitorRegion(),
        {},
        Object.fromEntries(fresh.map((f) => [f.t.key, { eyebrow: f.label, note: `${f.show ? "Aired" : "Out"} ${longDate(f.date)}` }])),
      )
    : [];
  return (
    <div className="min-h-screen flex flex-col">
      <SiteNav />
      {slides.length > 0 && (
        <header>
          <CinemaHero slides={slides} banner />
        </header>
      )}
      {/* Above the carousel's glow, which spills down behind it: the shells
          stay their own colour rather than washing out in the light. */}
      <main className={`relative z-[1] w-full px-[clamp(16px,3.2vw,64px)] ${slides.length ? "pt-8" : "pt-[clamp(12px,2.2vw,32px)]"} pb-20 flex-1`}>
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

function longDate(d: string) {
  const [y, m, day] = d.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, day)).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}
