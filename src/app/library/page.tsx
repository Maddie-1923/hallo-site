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

export const metadata: Metadata = { title: "Library — Kodigo" };

// The Library: everything someone tracks, series and films, with the app's
// tools for it (docs/social-plan.md, step 2.3): status tabs, search, genre,
// sort (the app's four and My order, dragged by hand), Hide watched, Only my
// services, grid or list. Pro, like the Calendar.
export default async function Library({ searchParams }: PageProps<"/library">) {
  const { kind } = await searchParams;
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
            items={libraryItems(archive)}
            order={{ show: archive.showOrder ?? [], movie: archive.movieOrder ?? [] }}
            live={live}
            region={await visitorRegion()}
            initialKind={kind === "movies" || kind === "movie" ? "movie" : "show"}
          />
        ) : (
          <ProGate why={gate ?? "closed"} page="library" />
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
