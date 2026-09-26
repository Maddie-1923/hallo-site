import Link from "next/link";
import { accountsOpen } from "@/lib/accounts";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { CinemaHero, type CinemaSlide } from "@/components/CinemaHero";
import { WideRow, type WideItem } from "@/components/WideRow";
import { AppleMark } from "@/components/StoreIcons";
import { cardBackdrop, image, movieBillboard, movieRails, showBillboard, showRails, titleLogo } from "@/lib/tmdb";
import { year, type LibraryArchive, type Movie, type Show } from "@/lib/archive";
import { optionalLibrary } from "@/lib/library";
import { regionName, visitorRegion } from "@/lib/region";

// The front door, Letterboxd-shaped: a billboard of what the world is
// watching this week, then rows of smaller posters to wander through. The
// pitch for the app itself moved to /about; here it is one line and a button.

async function billboard(shows: Show[], movies: Movie[], archive: LibraryArchive | null, region: string): Promise<CinemaSlide[]> {
  // Films and series taking turns, only titles with artwork behind them.
  const picks: ({ kind: "show"; show: Show } | { kind: "movie"; movie: Movie })[] = [];
  const s = shows.filter((x) => x.backdrop_path);
  const m = movies.filter((x) => x.backdrop_path);
  for (let i = 0; picks.length < 8 && (i < s.length || i < m.length); i++) {
    if (m[i]) picks.push({ kind: "movie", movie: m[i] });
    if (s[i] && picks.length < 8) picks.push({ kind: "show", show: s[i] });
  }

  const tracked = {
    show: new Set(archive?.shows.map((t) => t.show.id) ?? []),
    movie: new Set(archive?.movies.map((t) => t.movie.id) ?? []),
  };

  const [details, logos] = await Promise.all([
    Promise.all(picks.map((p) => (p.kind === "show" ? showBillboard(p.show.id, region) : movieBillboard(p.movie.id, region)))),
    Promise.all(picks.map((p) => (p.kind === "show" ? titleLogo("show", p.show.id) : titleLogo("movie", p.movie.id)))),
  ]);

  return picks.map((p, i): CinemaSlide => {
    const d = details[i];
    const isShow = p.kind === "show";
    const t = isShow ? p.show : p.movie;
    const id = t.id;
    return {
      key: `${isShow ? "s" : "m"}${id}`,
      eyebrow: isShow ? "Trending series" : "Trending film",
      title: isShow ? p.show.name : p.movie.title,
      href: isShow ? `/show/${id}` : `/movie/${id}`,
      backdrop: image.banner(t.backdrop_path)!,
      thumb: image.backdrop(t.backdrop_path)!,
      tagline: d?.tagline ?? null,
      year: year(isShow ? p.show.first_air_date : p.movie.release_date),
      certification: d?.certification ?? null,
      runtime: d?.runtime ?? null,
      genres: d?.genres ?? [],
      overview: t.overview ?? null,
      trailer: d?.trailer ?? null,
      logo: logos[i],
      target: p,
      tracked: isShow ? tracked.show.has(id) : tracked.movie.has(id),
    };
  });
}

// A title on its way into a row, before it is turned into a card.
interface PosterItem {
  key: string;
  href: string;
  title: string;
  backdrop: string | null | undefined;
}

const asShows = (xs: Show[]): PosterItem[] => xs.map((s) => ({ key: `s${s.id}`, href: `/show/${s.id}`, title: s.name, backdrop: s.backdrop_path }));
const asMovies = (xs: Movie[]): PosterItem[] => xs.map((m) => ({ key: `m${m.id}`, href: `/movie/${m.id}`, title: m.title, backdrop: m.backdrop_path }));

// Landscape cards need a backdrop, and look like a streaming service's with
// the title's logo on them. Logos are one request a title, cached for a day,
// so a row asks only for the cards it draws.
async function asWide(items: PosterItem[], limit = 16): Promise<WideItem[]> {
  const withArt = items.filter((it) => it.backdrop).slice(0, limit);
  const logos = await Promise.all(withArt.map((it) => titleLogo(it.key.startsWith("s") ? "show" : "movie", Number(it.key.slice(1)))));
  return withArt.map((it, i) => ({ key: it.key, href: it.href, title: it.title, backdrop: cardBackdrop(it.backdrop)!, logo: logos[i] }));
}

async function Row({ title, href, items }: { title: string; href: string; items: PosterItem[] }) {
  return <WideRow title={title} href={href} items={await asWide(items)} />;
}

function interleave<T>(a: T[], b: T[]) {
  const out: T[] = [];
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    if (a[i]) out.push(a[i]);
    if (b[i]) out.push(b[i]);
  }
  return out;
}

export default async function Home() {
  // The library only decides whether the watchlist chip reads "added". While
  // the accounts side is closed nobody is signed in, so skip the lookup.
  const lib = accountsOpen ? await optionalLibrary() : { archive: null };
  const region = await visitorRegion();

  const [trendingShows, trendingMovies, inCinemas, airing, comingFilms, topFilms, topShows] = await Promise.all([
    showRails.trending(),
    movieRails.trending(),
    movieRails.nowPlaying(region),
    showRails.airingNow(),
    movieRails.upcoming(region),
    movieRails.topRated(),
    showRails.topRated(),
  ]);
  const slides = await billboard(trendingShows, trendingMovies, lib.archive, region);
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
          <Row title="Trending this week" href="/explore" items={trending} />
          <Row title={`In cinemas · ${regionName(region)}`} href="/explore?kind=movie" items={asMovies(inCinemas)} />
          <Row title="New episodes this week" href="/explore" items={asShows(airing)} />
          <Row title={`Coming soon · ${regionName(region)}`} href="/explore?kind=movie" items={asMovies(comingFilms)} />
          <Row title="Highest rated" href="/explore?kind=movie" items={interleave(asMovies(topFilms), asShows(topShows))} />
        </div>

        {/* The app's pitch, last: the page opens on the posters, and whoever
            has scrolled this far has seen what Kodigo is for. */}
        <section className="wrap !max-w-[1240px] text-center pt-14 pb-20 border-t border-hair">
          <p className="display text-[clamp(28px,4vw,46px)] leading-[1] m-0">
            Track what you watch. Save what you want to see.
            <br />
            <span className="text-accent">Tell your friends what&apos;s good.</span>
          </p>
          <div className="flex flex-wrap justify-center gap-3 mt-6">
            <a className="btn !inline-flex items-center gap-2 !py-2.5 !px-5 !text-[15px]" href="#">
              <AppleMark />
              Get the app
            </a>
            <Link className="btn ghost !py-2.5 !px-5 !text-[15px]" href="/about">
              What Kodigo does
            </Link>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
