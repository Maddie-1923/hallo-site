import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { SiteNav } from "@/components/SiteNav";
import { genreHref } from "@/lib/browse";
import { SiteFooter } from "@/components/SiteFooter";
import { People } from "@/components/People";
import { TitleCredits } from "@/components/TitleCredits";
import { TitleActivity } from "@/components/TitleActivity";
import { HeaderCard, TitleBento, MoreLikeThisSection, Section, SectionCard, TitleBanner, TrailerSection, WhereToWatchTile } from "@/components/TitleParts";
import { TitleActions } from "@/components/TitleActions";
import { optionalLibrary } from "@/lib/library";
import { publicReviewsOfTitle } from "@/lib/public-reads";
import { readTake } from "@/lib/library-rules";
import { ReviewsSection } from "@/components/TitleReviews";
import { YourReview } from "@/components/YourReview";
import { filmPage, image, titleLogo } from "@/lib/tmdb";
import { visitorRegion } from "@/lib/region";
import { Day } from "@/components/Day";
import { AdSlot } from "@/components/AdSlot";

// A film's page, laid out after the app's film screen (MovieDetailView): the
// header card (the wide artwork, the facts panel with the title and its rows,
// the overview, and the keys), then Where to watch and the trailer beside it
// on a wide screen, then the cast and more like this as rails. The app's
// Your take (rating, mood, tags, note) comes with accounts.
export async function generateMetadata({ params }: PageProps<"/movie/[id]">): Promise<Metadata> {
  const { id } = await params;
  const d = await filmPage(Number(id));
  return { title: d ? `${d.movie.title} — Kodigo` : "Movie — Kodigo" };
}

export default async function MoviePage({ params }: PageProps<"/movie/[id]">) {
  const { id } = await params;
  const movieID = Number(id);
  if (!Number.isInteger(movieID)) notFound();

  const region = await visitorRegion();
  const [page, lib, logo, reviews] = await Promise.all([filmPage(movieID, region), optionalLibrary(), titleLogo("movie", movieID), publicReviewsOfTitle("movie", movieID)]);
  if (!page) notFound();
  const { movie } = page;

  const tracked = lib.archive?.movies.find((m) => m.movie.id === movieID) ?? null;
  const watched = tracked?.status === "Watched" || !!lib.archive?.movieWatchedDates?.[String(movieID)];
  const loved = lib.archive?.reactions?.[`movie:${movieID}`] === "loved";

  const runtime = movie.runtime ? (movie.runtime >= 60 ? `${Math.floor(movie.runtime / 60)}h ${movie.runtime % 60}m` : `${movie.runtime}m`) : null;

  // The facts, in the app's order with the year added, each only when there is something to say.
  const facts = [
    page.genres.length > 0 && {
      label: "Genres",
      // Each genre goes to Browse, filtered to it.
      value: page.genres.map((g, i) => (
        <span key={g}>
          {i > 0 && " · "}
          <Link href={genreHref("movie", g)} className="text-ink no-underline hover:text-accent">
            {g}
          </Link>
        </span>
      )),
    },
    page.directors.length > 0 && { label: page.directors.length > 1 ? "Directors" : "Director", value: <People people={page.directors} /> },
    movie.release_date && { label: "Year", value: movie.release_date.slice(0, 4) },
    runtime && { label: "Runtime", value: runtime },
    movie.vote_average && { label: "TMDB", value: movie.vote_average.toFixed(1) },
    // The date opens the Releases tab below, as the app's row opens its
    // release dates page.
    page.released && {
      label: "Released",
      value: (
        <a href="#releases" className="text-accent no-underline hover:underline">
          <Day iso={page.released} /> →
        </a>
      ),
    },
  ].filter(Boolean) as { label: string; value: React.ReactNode; accent?: boolean }[];

  return (
    <div className="min-h-screen flex flex-col">
      <SiteNav />
      {/* Laid out like the profile: the picture as a banner across the whole
          width, then two columns on the same widths as the profile's. */}
      <main className="w-full px-[clamp(16px,3.2vw,64px)] pt-[clamp(12px,2.2vw,32px)] pb-20 flex-1">
        <TitleBanner art={image.banner(movie.backdrop_path) ?? image.poster(movie.poster_path, "w780")} logo={logo} title={movie.title} />
        {/* The top as one L-shaped bento: About down the left with the
            trailers under it, the credits tabs on the right, and the keys
            and where to watch set into the notch above them. */}
        <div className="mt-8">
          <TitleBento
            about={
              <>
              <Section title="About" small>
            <HeaderCard flat title={movie.title} titleOnBanner={!!logo} facts={facts} overview={movie.overview ?? null}>
            </HeaderCard>
          </Section>
              {/* The trailers, one or two, under About. */}
              {page.trailers.length > 0 && <TrailerSection flat videos={page.trailers} />}
              </>
            }
            actions={<TitleActions kind="movie" title={movie.title} tracked={!!tracked} watched={watched} loved={loved} />}
            beside={page.watch && <WhereToWatchTile watch={page.watch} />}
            side={<TitleCredits flat kind="movie" cast={page.cast} crew={page.crew} details={page.details} genres={page.genres} keywords={page.keywords} releases={page.releases} />}
          />
        </div>
        {/* Under it, the reviews at the About card's width, and their own
            take beside them, as the keys sit beside About. */}
        <div className="mt-8 grid gap-8 lg:gap-0 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-start">
          <div className="grid gap-8 min-w-0">
          <ReviewsSection reviews={reviews} />
          </div>
          <div className="lg:pl-2 min-w-0">
            <Section title="Your take" small>
              <SectionCard>
                <YourReview target={{ kind: "movie", movie }} initial={lib.archive ? readTake(lib.archive, `movie:${movieID}`) : null} live={lib.signedIn} kind="movie" out={page.released ?? movie.release_date ?? null} title={{ key: `m${movieID}`, kind: "movie", title: movie.title, href: `/movie/${movieID}`, poster: image.poster(movie.poster_path, "w780"), backdrop: image.backdrop(movie.backdrop_path), year: (movie.release_date ?? "").slice(0, 4) }} />
              </SectionCard>
            </Section>
          </div>
        </div>
        <AdSlot place="title" className="mt-8" />
        <div className="mt-8 grid grid-cols-[minmax(0,1fr)] gap-8">
          {page.moreLikeThis.length > 0 && <MoreLikeThisSection items={page.moreLikeThis} kind="movie" />}
          {lib.signedIn && <TitleActivity target={{ kind: "movie", movie }} archive={lib.archive} signedIn={lib.signedIn} />}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

