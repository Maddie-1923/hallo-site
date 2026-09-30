import Link from "next/link";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { CinemaHero } from "@/components/CinemaHero";
import { asMovies, asShows, billboard, interleave, Row } from "@/components/TitleRows";
import { movieRails, regionServices, savedRailTitles, showRails, type Service } from "@/lib/tmdb";
import { optionalLibrary } from "@/lib/library";
import { markLookup } from "@/lib/marks";
import { accountsOpen } from "@/lib/accounts";
import { regionName, visitorRegion } from "@/lib/region";
import { AdSlot } from "@/components/AdSlot";
import { FilterButton, NewCategoryButton } from "@/components/CategoryDialog";
import { CategoryMenu } from "@/components/CategoryMenu";
import { CATALOGUES, orderedRails, railCounts, type Catalogue } from "@/lib/saved-rails";
import type { LibraryArchive } from "@/lib/archive";

// Explore, the app's name for the same idea: where you go to find something
// rather than to work through what you have. The home page's layout, with an
// All/Shows/Movies switch under the billboard: All mixes the two catalogues
// (where Explore opens), Shows and Movies keep to one each.
//
// Nothing personal draws here but the visitor's own custom categories (the
// app's saved rails), under the built-in rows: both catalogues on All, one on
// Shows or Movies, in the order they were arranged on the phone. Otherwise the
// library only decides whether the billboard's watchlist chip reads "added",
// so the page works signed out.
type Kind = "all" | "show" | "movie";

export async function ExplorePage({ kind }: { kind: Kind }) {
  const lib = accountsOpen ? await optionalLibrary() : { archive: null };
  const region = await visitorRegion();
  const marks = markLookup(lib.archive);
  const place = regionName(region);
  // Started now, awaited with the rest, so the custom rows cost no extra wait.
  const mine = customCategories(lib.archive, kind, region);
  // The Filter sheet's services, for everyone (the category rows fetch their own).
  const services = regionServices(region, 60);

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
      <Layout slides={slides} kind={kind} mine={await mine} services={await services}>
        <Row title="Trending this week" href="/explore/rail/trending" items={interleave(asMovies(trendingMovies), asShows(trendingShows)).filter((x) => !shown.has(x.key))} marks={marks} />
        <Row title={`In cinemas · ${place}`} href="/explore/rail/in-cinemas" items={asMovies(inCinemas)} marks={marks} />
        <Row title="New episodes this week" href="/explore/rail/new-episodes" items={asShows(airing)} marks={marks} />
        <AdSlot place="rows" className="mt-8" />
        <Row title="Coming soon" href="/explore/rail/coming-soon" items={interleave(asMovies(comingFilms), asShows(comingShows))} marks={marks} />
        <Row title="Top rated" href="/explore/rail/top-rated" items={interleave(asMovies(topFilms), asShows(topShows))} marks={marks} />
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
      <Layout slides={slides} kind={kind} mine={await mine} services={await services}>
        <Row title="Trending this week" href="/explore/rail/trending-series" items={asShows(trending).filter((x) => !shown.has(x.key))} marks={marks} />
        <Row title="New episodes this week" href="/explore/rail/new-episodes" items={asShows(airing)} marks={marks} />
        <AdSlot place="rows" className="mt-8" />
        <Row title="New series coming" href="/explore/rail/new-series" items={asShows(upcoming)} marks={marks} />
        <Row title="Popular now" href="/explore/rail/popular-series" items={asShows(popular)} marks={marks} />
        <Row title="Top rated" href="/explore/rail/top-rated-series" items={asShows(topRated)} marks={marks} />
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
    <Layout slides={slides} kind={kind} mine={await mine} services={await services}>
      <Row title="Trending this week" href="/explore/rail/trending-films" items={asMovies(trending).filter((x) => !shown.has(x.key))} marks={marks} />
      <Row title={`In cinemas · ${place}`} href="/explore/rail/in-cinemas" items={asMovies(inCinemas)} marks={marks} />
      <AdSlot place="rows" className="mt-8" />
      <Row title={`Coming soon · ${place}`} href="/explore/rail/coming-soon-films" items={asMovies(upcoming)} marks={marks} />
      <Row title="Popular now" href="/explore/rail/popular-films" items={asMovies(popular)} marks={marks} />
      <Row title="Top rated" href="/explore/rail/top-rated-films" items={asMovies(topRated)} marks={marks} />
    </Layout>
  );
}

function Layout({ slides, kind, mine, services, children }: { slides: Awaited<ReturnType<typeof billboard>>; kind: Kind; mine: Categories | null; services: Service[]; children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <SiteNav />
      <header>
        <CinemaHero slides={slides} />
      </header>
      <main className="flex-1 w-full px-[clamp(16px,3.2vw,64px)] pb-16 [&>section:first-of-type]:!mt-5">
        {/* The switch and Filter on the left, New category on the right. */}
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <KindSwitch kind={kind} />
          <FilterButton services={services} kinds={kindCatalogues(kind)} />
          {mine && (
            <div className="ml-auto">
              <NewCategoryButton services={mine.services} counts={mine.counts} kinds={kindCatalogues(kind)} />
            </div>
          )}
        </div>
        {children}
        {mine?.rows}
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

const kindCatalogues = (kind: Kind): Catalogue[] => (kind === "show" ? ["Shows"] : kind === "movie" ? ["Movies"] : [...CATALOGUES]);

type Categories = { services: Service[]; counts: Record<Catalogue, number>; rows: React.ReactNode };

/** The signed-in visitor's custom categories for this tab, as rows, and what
    the New category dialog needs. Null when there's nobody to make them for
    (accounts closed, signed out, or no library synced yet). */
async function customCategories(archive: LibraryArchive | null, kind: Kind, region: string): Promise<Categories | null> {
  if (!accountsOpen || !archive) return null;
  const rails = kind === "all" ? orderedRails(archive) : orderedRails(archive, kind === "show" ? "Shows" : "Movies");
  const [services, pages] = await Promise.all([regionServices(region, 60), Promise.all(rails.map((r) => savedRailTitles(r, region)))]);
  const counts = railCounts(archive);
  const marks = markLookup(archive);
  const rows = rails.map((rail, i) => {
    const p = pages[i];
    return (
      <Row
        key={rail.id}
        title={rail.name}
        href={`/explore/category/${rail.id}`}
        items={p.kind === "show" ? asShows(p.titles) : asMovies(p.titles)}
        marks={marks}
        empty="Nothing matches this category right now."
        extra={<CategoryMenu rail={rail} services={services} counts={counts} />}
      />
    );
  });
  return { services, counts, rows };
}
