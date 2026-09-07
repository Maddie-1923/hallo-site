import Link from "next/link";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { DiscoverHero } from "@/components/DiscoverHero";
import { MovieCard, Rail, ShowCard } from "@/components/TitleCard";
import { movieRails, showRails } from "@/lib/tmdb";
import { optionalLibrary } from "@/lib/library";
import { markLookup } from "@/lib/marks";

// Explore, the app's name for the same idea: where you go to find something
// rather than to work through what you have. One catalogue at a time behind a
// toggle, the way the phone does it, because a mixed page made "trending"
// mean two different leaderboards at once.
//
// Nothing personal draws here. The library only decides which marks are lit,
// so the page is the same for everybody and works signed out.
export async function ExplorePage({ kind }: { kind: "show" | "movie" }) {
  const lib = await optionalLibrary();
  const marks = markLookup(lib.archive);

  const [trending, second, third, fourth, fifth] = await Promise.all(
    kind === "show"
      ? [showRails.trending(), showRails.airingNow(), showRails.upcoming(), showRails.popular(), showRails.topRated()]
      : [movieRails.trending(), movieRails.nowPlaying(), movieRails.upcoming(), movieRails.popular(), movieRails.topRated()],
  );

  const titles =
    kind === "show"
      ? ["Trending", "Airing now", "New series coming", "Popular now", "Top rated"]
      : ["Trending", "In cinemas", "Coming soon", "Popular now", "Top rated"];
  const rails = [trending, second, third, fourth, fifth];

  return (
    <>
      <SiteNav />
      <DiscoverHero
        featured={
          kind === "show"
            ? trending.map((show) => ({ kind: "show" as const, show: show as never }))
            : trending.map((movie) => ({ kind: "movie" as const, movie: movie as never }))
        }
        label="Trending this week"
        marks={marks}
      />
      <main className="wrap flex-1 pb-12">
        <KindSwitch kind={kind} />
        {rails.map((items, i) => (
          <Rail key={titles[i]} title={titles[i]}>
            {items.map((item) =>
              kind === "show" ? (
                <ShowCard key={item.id} show={item as never} marks={marks.show(item.id)} lists={marks.lists} />
              ) : (
                <MovieCard key={item.id} movie={item as never} marks={marks.movie(item.id)} lists={marks.lists} />
              ),
            )}
          </Rail>
        ))}
      </main>
      <SiteFooter />
    </>
  );
}

/** Shows or Films, as links rather than state — the choice is the URL, so it
    can be shared, bookmarked and rendered on the server. */
function KindSwitch({ kind }: { kind: "show" | "movie" }) {
  const tabs: [string, string, boolean][] = [
    ["/explore", "Shows", kind === "show"],
    ["/explore?kind=movie", "Movies", kind === "movie"],
  ];
  return (
    <div className="inline-flex gap-1 p-1 rounded-full bg-card border border-hair mt-8">
      {tabs.map(([href, label, on]) => (
        <Link
          key={label}
          href={href}
          aria-current={on ? "page" : undefined}
          className={`px-5 py-2 rounded-full text-sm font-bold no-underline transition-colors ${
            on ? "bg-card-hi text-ink" : "text-dim hover:text-ink"
          }`}
        >
          {label}
        </Link>
      ))}
    </div>
  );
}
