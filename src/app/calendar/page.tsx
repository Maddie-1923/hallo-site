import type { Metadata } from "next";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { TrackerBoard } from "@/components/TrackerBoard";
import { CinemaHero } from "@/components/CinemaHero";
import { billboard } from "@/components/TitleRows";
import { visitorRegion } from "@/lib/region";
import { previewArchive } from "@/lib/profile-previews";
import { trackerFromArchive } from "@/lib/tracker";
import { ProGate } from "@/components/ProGate";
import { accountsOpen } from "@/lib/accounts";
import { optionalLibrary } from "@/lib/library";
import { hasPro } from "@/lib/pro";
import type { LibraryArchive } from "@/lib/archive";

export const metadata: Metadata = { title: "Calendar — Kodigo" };

// Calendar: the tracker, the app's main screen, on the web (Pro), named for
// the calendar at its head. Signed in with Pro, it's their own library and
// every key saves to it (TrackerBoard `live`). Signed out, or without Pro,
// it says what it is and how to get it. Before accounts open, development
// draws it from the preview library, where the keys only change the page.
export default async function TrackerPage() {
  let archive: LibraryArchive | null = null;
  let live = false;
  let gate: "signin" | "pro" | "empty" | "closed" | null = null;
  if (accountsOpen) {
    const { signedIn, archive: own } = await optionalLibrary();
    if (!signedIn) gate = "signin";
    else if (!(await hasPro())) gate = "pro";
    else if (!own || (own.shows.length === 0 && own.movies.length === 0)) gate = "empty";
    else {
      archive = own;
      live = true;
    }
  } else {
    archive = await previewArchive();
    if (!archive) gate = "closed";
  }
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
        Object.fromEntries(fresh.map((f) => [f.t.key, { eyebrow: f.label, note: f.show ? "Aired" : "Out", noteDate: f.date }])),
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
        {data ? <TrackerBoard data={data} live={live} /> : <ProGate why={gate ?? "closed"} />}
      </main>
      <SiteFooter />
    </div>
  );
}
