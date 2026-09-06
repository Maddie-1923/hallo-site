import type { Metadata } from "next";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { DiscoverHero } from "@/components/DiscoverHero";
import { MovieCard, Rail, ShowCard } from "@/components/TitleCard";
import { movieRails, showRails } from "@/lib/tmdb";
import { optionalLibrary } from "@/lib/library";
import { markLookup } from "@/lib/marks";

export const metadata: Metadata = { title: "Discover — Kodigo" };

// The home: a short mix of both catalogues, shows and films taking turns.
// The full run of each lives on its own page (/shows, /movies); this is the
// summary. The hero is the week's top trending show.
export default async function Discover() {
  const [lib, trending, airing, upcoming, mTrending, playing, mUpcoming] = await Promise.all([
    optionalLibrary(),
    showRails.trending(),
    showRails.airingNow(),
    showRails.upcoming(),
    movieRails.trending(),
    movieRails.nowPlaying(),
    movieRails.upcoming(),
  ]);

  // The billboard rotates through the week's trending, shows and films
  // interleaved so both catalogues get the top of the page.
  const featured: ({ kind: "show"; show: (typeof trending)[number] } | { kind: "movie"; movie: (typeof mTrending)[number] })[] = [];
  for (let i = 0; i < 4; i++) {
    if (trending[i]) featured.push({ kind: "show", show: trending[i] });
    if (mTrending[i]) featured.push({ kind: "movie", movie: mTrending[i] });
  }
  // Discover is for finding things. The person's own runs live on the Shows
  // and Movies pages; here the library only decides which "+" shows a tick.

  const marks = markLookup(lib.archive);

  // Alternating so neither catalogue reads as the main one.
  const rails: ({ kind: "show"; title: string; items: typeof trending } | { kind: "movie"; title: string; items: typeof mTrending })[] = [
    { kind: "show", title: "Trending shows", items: trending },
    { kind: "movie", title: "Trending films", items: mTrending },
    { kind: "show", title: "Airing now", items: airing },
    { kind: "movie", title: "In cinemas", items: playing },
    { kind: "show", title: "Shows coming soon", items: upcoming },
    { kind: "movie", title: "Films coming soon", items: mUpcoming },
  ];

  return (
    <>
      <SiteNav />
      <DiscoverHero featured={featured} label="Trending this week" marks={marks} />
      <main className="wrap flex-1 pb-12 [&>section:first-child]:mt-8">
        {rails.map((r) => (
          <Rail key={r.title} title={r.title}>
            {r.kind === "show"
              ? r.items.map((s) => <ShowCard key={s.id} show={s} marks={marks.show(s.id)} lists={marks.lists} />)
              : r.items.map((m) => <MovieCard key={m.id} movie={m} marks={marks.movie(m.id)} lists={marks.lists} />)}
          </Rail>
        ))}
      </main>
      <SiteFooter />
    </>
  );
}
