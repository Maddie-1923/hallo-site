import Link from "next/link";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { CinemaHero } from "@/components/CinemaHero";
import { asMovies, asShows, billboard, interleave, Row } from "@/components/TitleRows";
import { movieRails, showRails } from "@/lib/tmdb";
import { optionalLibrary } from "@/lib/library";
import { markLookup } from "@/lib/marks";
import { accountsOpen } from "@/lib/accounts";
import { regionName, visitorRegion } from "@/lib/region";
import { AdSlot } from "@/components/AdSlot";

// Explore, the app's name for the same idea: where you go to find something
// rather than to work through what you have. The home page's layout, with an
// All/Shows/Movies switch under the billboard: All mixes the two catalogues
// (where Explore opens), Shows and Movies keep to one each.
//
// Nothing personal draws here. The library only decides whether the
// billboard's watchlist chip reads "added", so the page works signed out.
type Kind = "all" | "show" | "movie";

export async function ExplorePage({ kind }: { kind: Kind }) {
  const lib = accountsOpen ? await optionalLibrary() : { archive: null };
  const region = await visitorRegion();
  const marks = markLookup(lib.archive);
  const place = regionName(region);

  if (kind === "all") {
    const [trendingShows, trendingMovies, inCinemas, airing, comingFilms, comingShows, topFilms, topShows, soonShows, soonFilms] = await Promise.all([
      showRails.trending(),
      movieRails.trending(),
      movieRails.nowPlaying(region),
      showRails.airingNow(),
      movieRails.upcoming(region),
      showRails.upcoming(),
      movieRails.topRated(),
      showRails.topRated(),
      showRails.anticipated(),
      movieRails.anticipated(region),
    ]);
    const slides = await billboard(trendingShows, trendingMovies, lib.archive, region, { shows: soonShows, movies: soonFilms });
    const shown = new Set(slides.map((s) => s.key));
    return (
      <Layout slides={slides} kind={kind}>
        <Row title="Trending this week" href="/shows" items={interleave(asMovies(trendingMovies), asShows(trendingShows)).filter((x) => !shown.has(x.key))} marks={marks} />
        <Row title={`In cinemas · ${place}`} href="/movies" items={asMovies(inCinemas)} marks={marks} />
        <Row title="New episodes this week" href="/shows" items={asShows(airing)} marks={marks} />
        <AdSlot place="rows" className="mt-8" />
        <Row title="Coming soon" href="/movies" items={interleave(asMovies(comingFilms), asShows(comingShows))} marks={marks} />
        <Row title="Top rated" href="/browse/films/sort/rated" items={interleave(asMovies(topFilms), asShows(topShows))} marks={marks} />
      </Layout>
    );
  }

  if (kind === "show") {
    const [trending, airing, upcoming, popular, topRated, soon] = await Promise.all([
      showRails.trending(),
      showRails.airingNow(),
      showRails.upcoming(),
      showRails.popular(),
      showRails.topRated(),
      showRails.anticipated(),
    ]);
    const slides = await billboard(trending, [], lib.archive, region, { shows: soon });
    const shown = new Set(slides.map((s) => s.key));
    return (
      <Layout slides={slides} kind={kind}>
        <Row title="Trending this week" href="/shows" items={asShows(trending).filter((x) => !shown.has(x.key))} marks={marks} />
        <Row title="New episodes this week" href="/shows" items={asShows(airing)} marks={marks} />
        <AdSlot place="rows" className="mt-8" />
        <Row title="New series coming" href="/shows" items={asShows(upcoming)} marks={marks} />
        <Row title="Popular now" href="/browse/series" items={asShows(popular)} marks={marks} />
        <Row title="Top rated" href="/browse/series/sort/rated" items={asShows(topRated)} marks={marks} />
      </Layout>
    );
  }

  const [trending, inCinemas, upcoming, popular, topRated, soon] = await Promise.all([
    movieRails.trending(),
    movieRails.nowPlaying(region),
    movieRails.upcoming(region),
    movieRails.popular(),
    movieRails.topRated(),
    movieRails.anticipated(region),
  ]);
  const slides = await billboard([], trending, lib.archive, region, { movies: soon });
  const shown = new Set(slides.map((s) => s.key));
  return (
    <Layout slides={slides} kind={kind}>
      <Row title="Trending this week" href="/movies" items={asMovies(trending).filter((x) => !shown.has(x.key))} marks={marks} />
      <Row title={`In cinemas · ${place}`} href="/movies" items={asMovies(inCinemas)} marks={marks} />
      <AdSlot place="rows" className="mt-8" />
      <Row title={`Coming soon · ${place}`} href="/movies" items={asMovies(upcoming)} marks={marks} />
      <Row title="Popular now" href="/browse/films" items={asMovies(popular)} marks={marks} />
      <Row title="Top rated" href="/browse/films/sort/rated" items={asMovies(topRated)} marks={marks} />
    </Layout>
  );
}

function Layout({ slides, kind, children }: { slides: Awaited<ReturnType<typeof billboard>>; kind: Kind; children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <SiteNav />
      <header>
        <CinemaHero slides={slides} />
      </header>
      <main className="flex-1 w-full px-[clamp(16px,3.2vw,64px)] pb-16 [&>section:first-of-type]:!mt-5">
        <div className="mt-5">
          <KindSwitch kind={kind} />
        </div>
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}

/** All, Shows or Movies, as links rather than state — the choice is the
    URL, so it can be shared, bookmarked and rendered on the server. On the
    page under the billboard, in the page's own colours. */
function KindSwitch({ kind }: { kind: Kind }) {
  const tabs: [string, string, boolean][] = [
    ["/explore", "All", kind === "all"],
    ["/shows", "Shows", kind === "show"],
    ["/movies", "Movies", kind === "movie"],
  ];
  return (
    <nav aria-label="Explore" className="inline-flex gap-1 p-[3px] rounded-full bg-card border border-hair">
      {tabs.map(([href, label, on]) => (
        <Link
          key={label}
          href={href}
          aria-current={on ? "page" : undefined}
          className={`px-4 py-1.5 rounded-full text-[13px] font-bold no-underline transition-colors ${
            on ? "bg-accent-fill text-on-accent" : "text-dim hover:text-ink"
          }`}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}
