import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { DiscoverHero } from "@/components/DiscoverHero";
import { MovieCard, Rail, ShowCard } from "@/components/TitleCard";
import { movieRails, showRails } from "@/lib/tmdb";
import { optionalLibrary } from "@/lib/library";
import { markLookup } from "@/lib/marks";

// One catalogue at a time — a Discover for shows and a Discover for films.
// Nothing personal draws here; the library only decides which "+" is a tick.
// What the person tracks lives under My Lists.
export async function BrowsePage({ kind }: { kind: "show" | "movie" }) {
  const lib = await optionalLibrary();
  const marks = markLookup(lib.archive);

  if (kind === "show") {
    const [trending, airing, popular, upcoming, top] = await Promise.all([
      showRails.trending(),
      showRails.airingNow(),
      showRails.popular(),
      showRails.upcoming(),
      showRails.topRated(),
    ]);
    const rails: [string, typeof trending][] = [
      ["Trending this week", trending],
      ["Airing now", airing],
      ["Popular", popular],
      ["Coming soon", upcoming],
      ["Top rated", top],
    ];
    return (
      <>
        <SiteNav />
        <DiscoverHero featured={trending.map((show) => ({ kind: "show" as const, show }))} label="Trending shows" marks={marks} />
        <main className="wrap flex-1 pb-12 [&>section:first-child]:mt-8">
          {rails.map(([title, shows]) => (
            <Rail key={title} title={title}>
              {shows.map((s) => (
                <ShowCard key={s.id} show={s} marks={marks.show(s.id)} lists={marks.lists} />
              ))}
            </Rail>
          ))}
        </main>
        <SiteFooter />
      </>
    );
  }

  const [trending, playing, popular, upcoming, top] = await Promise.all([
    movieRails.trending(),
    movieRails.nowPlaying(),
    movieRails.popular(),
    movieRails.upcoming(),
    movieRails.topRated(),
  ]);
  const rails: [string, typeof trending][] = [
    ["Trending this week", trending],
    ["In cinemas", playing],
    ["Popular", popular],
    ["Coming soon", upcoming],
    ["Top rated", top],
  ];
  return (
    <>
      <SiteNav />
      <DiscoverHero featured={trending.map((movie) => ({ kind: "movie" as const, movie }))} label="Trending films" marks={marks} />
      <main className="wrap flex-1 pb-12 [&>section:first-child]:mt-8">
        {rails.map(([title, movies]) => (
          <Rail key={title} title={title}>
            {movies.map((m) => (
              <MovieCard key={m.id} movie={m} marks={marks.movie(m.id)} lists={marks.lists} />
            ))}
          </Rail>
        ))}
      </main>
      <SiteFooter />
    </>
  );
}
