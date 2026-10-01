import Link from "next/link";
import { accountsOpen } from "@/lib/accounts";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { CinemaHero } from "@/components/CinemaHero";
import { asMovies, asShows, billboard, interleave, Row } from "@/components/TitleRows";
import { AppleMark } from "@/components/StoreIcons";
import { movieRails, showRails } from "@/lib/tmdb";
import { optionalLibrary } from "@/lib/library";
import { markLookup } from "@/lib/marks";
import { regionName, visitorRegion } from "@/lib/region";
import { AdSlot } from "@/components/AdSlot";

// The front door, Netflix-shaped: a billboard of what the world is watching
// this week, then rows of wide cards to wander through. The pitch for the app
// itself sits at the foot and in full at /about.

export default async function Home() {
  // The library only decides whether the watchlist chip reads "added". While
  // the accounts side is closed nobody is signed in, so skip the lookup.
  const lib = accountsOpen ? await optionalLibrary() : { archive: null };
  const region = await visitorRegion();
  const marks = markLookup(lib.archive);

  const [trendingShows, trendingMovies, inCinemas, airing, comingFilms, topFilms, topShows, soonShows, soonFilms] = await Promise.all([
    showRails.trending(),
    movieRails.trending(),
    movieRails.nowPlaying(region),
    showRails.airingNow(),
    movieRails.upcoming(region),
    movieRails.topRated(),
    showRails.topRated(),
    showRails.anticipated(),
    movieRails.anticipated(region),
  ]);
  // Trending, with the most anticipated films and series still to come mixed in.
  const slides = await billboard(trendingShows, trendingMovies, lib.archive, region, { shows: soonShows, movies: soonFilms });
  const shown = new Set(slides.map((s) => s.key));
  // Below the billboard, the trending row starts where the billboard stops.
  const trending = interleave(asMovies(trendingMovies), asShows(trendingShows)).filter((x) => !shown.has(x.key));

  return (
    <div className="min-h-screen flex flex-col">
      <SiteNav />
      <header>
        <CinemaHero slides={slides} />
      </header>

      <main className="flex-1">

        {/* The same gutters as the billboard, so the rows' edges line up with
            the card's. Not .wrap: its padding is unlayered and would win. */}
        <div className="w-full px-[clamp(16px,3.2vw,64px)] pb-16">
          <Row title="Trending this week" href="/explore/rail/trending" items={trending} marks={marks} />
          <Row title={`In cinemas · ${regionName(region)}`} href="/explore/rail/in-cinemas" items={asMovies(inCinemas)} marks={marks} />
          <AdSlot place="rows" className="mt-8" />
          <Row title="New episodes this week" href="/explore/rail/new-episodes" items={asShows(airing)} marks={marks} />
          <Row title={`Coming soon · ${regionName(region)}`} href="/explore/rail/coming-soon-films" items={asMovies(comingFilms)} marks={marks} />
          <Row title="Highest rated" href="/explore/rail/top-rated" items={interleave(asMovies(topFilms), asShows(topShows))} marks={marks} />
        </div>

        {/* The app's pitch, last: the page opens on the posters, and whoever
            has scrolled this far has seen what Kodigo is for. */}
        <section className="wrap !max-w-[103.3333rem] text-center pt-14 pb-20 border-t border-hair">
          <p className="display text-[clamp(28px,4vw,46px)] leading-[1] m-0">
            Track what you watch. Save what you want to see.
            <br />
            <span className="text-accent">Tell your friends what&apos;s good.</span>
          </p>
          <div className="flex flex-wrap justify-center gap-3 mt-6">
            <a className="btn !inline-flex items-center gap-2 !py-2.5 !px-5 !text-[1.25rem]" href="#">
              <AppleMark />
              Get the app
            </a>
            <Link className="btn ghost !py-2.5 !px-5 !text-[1.25rem]" href="/about">
              What Kodigo does
            </Link>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
