import type { Metadata } from "next";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { LibraryPage } from "@/components/LibraryPage";
import { ProGate } from "@/components/ProGate";
import { accountsOpen } from "@/lib/accounts";
import type { LibraryArchive } from "@/lib/archive";
import { optionalLibrary } from "@/lib/library";
import { libraryItems } from "@/lib/library-view";
import { hasPro } from "@/lib/pro";
import { visitorRegion } from "@/lib/region";

export const metadata: Metadata = { title: "Watchlist — Kodigo" };

// The Watchlist: what someone means to watch, on its own page (Pro, like the
// Library): series they're tracking with nothing watched yet (the app's
// Ready to start) and films To Watch, the same list as the profile's
// Watchlist tab. The Library's tools, with Pick one for me.
export default async function Watchlist() {
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
    gate = "closed";
  }
  return (
    <div className="min-h-screen flex flex-col">
      <SiteNav />
      <main className="w-full px-[clamp(16px,3.2vw,64px)] pt-8 pb-20 flex-1">
        {archive ? (
          <LibraryPage
            items={waiting(archive)}
            order={{ show: archive.showOrder ?? [], movie: archive.movieOrder ?? [] }}
            live={live}
            region={await visitorRegion()}
            initialKind="all"
            mode="watchlist"
          />
        ) : (
          <ProGate why={gate ?? "closed"} page="watchlist" />
        )}
      </main>
      <SiteFooter />
    </div>
  );
}

/** The library's titles that are waiting: series with nothing watched (bar
    specials) and films To Watch. */
function waiting(a: LibraryArchive) {
  const started = new Set(a.watched.filter((k) => !/-0-\d+$/.test(k)).map((k) => Number(k.split("-")[0])));
  return libraryItems(a).filter((i) => (i.kind === "movie" ? i.status === "To Watch" : i.status === "Watching" && !started.has(i.id)));
}
