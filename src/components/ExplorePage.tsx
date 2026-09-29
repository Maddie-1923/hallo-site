import Link from "next/link";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { CinemaHero } from "@/components/CinemaHero";
import { asMovies, asShows, billboard, Row } from "@/components/TitleRows";
import { movieRails, showRails } from "@/lib/tmdb";
import { optionalLibrary } from "@/lib/library";
import { markLookup } from "@/lib/marks";
import { accountsOpen } from "@/lib/accounts";
import { regionName, visitorRegion } from "@/lib/region";

// Explore, the app's name for the same idea: where you go to find something
// rather than to work through what you have. The home page's layout, one
// catalogue at a time behind a Shows/Movies switch the way the phone does it,
// because a mixed page made "trending" mean two different leaderboards at
// once. The switch sits in the billboard's corner so the billboard and the
// first row still fit one screen.
//
// Nothing personal draws here. The library only decides whether the
// billboard's watchlist chip reads "added", so the page works signed out.
export async function ExplorePage({ kind }: { kind: "show" | "movie" }) {
  const lib = accountsOpen ? await optionalLibrary() : { archive: null };
  const region = await visitorRegion();
  const marks = markLookup(lib.archive);
  const place = regionName(region);

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
      <Row title={`Coming soon · ${place}`} href="/movies" items={asMovies(upcoming)} marks={marks} />
      <Row title="Popular now" href="/browse/films" items={asMovies(popular)} marks={marks} />
      <Row title="Top rated" href="/browse/films/sort/rated" items={asMovies(topRated)} marks={marks} />
    </Layout>
  );
}

function Layout({ slides, kind, children }: { slides: Awaited<ReturnType<typeof billboard>>; kind: "show" | "movie"; children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <SiteNav />
      <header>
        <CinemaHero slides={slides} corner={<KindSwitch kind={kind} />} />
      </header>
      <main className="flex-1 w-full px-[clamp(16px,3.2vw,64px)] pb-16">{children}</main>
      <SiteFooter />
    </div>
  );
}

/** Shows or Movies, as links rather than state — the choice is the URL, so it
    can be shared, bookmarked and rendered on the server. Smoky glass, since
    it sits on the billboard's photograph. */
function KindSwitch({ kind }: { kind: "show" | "movie" }) {
  const tabs: [string, string, boolean][] = [
    ["/shows", "Shows", kind === "show"],
    ["/movies", "Movies", kind === "movie"],
  ];
  return (
    <div className="inline-flex gap-1 p-[3px] rounded-full bg-black/40 border border-white/20 backdrop-blur-md">
      {tabs.map(([href, label, on]) => (
        <Link
          key={label}
          href={href}
          aria-current={on ? "page" : undefined}
          className={`px-4 py-1.5 rounded-full text-[13px] font-bold no-underline transition-colors ${
            on ? "bg-accent-fill text-on-accent" : "text-white/75 hover:text-white"
          }`}
        >
          {label}
        </Link>
      ))}
      {/* Every film or series, with filters. */}
      <Link href={kind === "show" ? "/browse/series" : "/browse/films"} className="px-4 py-1.5 rounded-full text-[13px] font-bold no-underline text-white/75 hover:text-white">
        Browse all →
      </Link>
    </div>
  );
}
