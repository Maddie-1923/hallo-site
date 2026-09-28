import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { TitleActivity } from "@/components/TitleActivity";
import { CastSection, HeaderCard, MoreLikeThisSection, Section, TitleBanner, TrailerSection, WhereToWatchSection } from "@/components/TitleParts";
import { FilmTray } from "@/components/FilmTray";
import { optionalLibrary } from "@/lib/library";
import { reviewsOfTitle } from "@/lib/profile-previews";
import { ReviewsSection } from "@/components/TitleReviews";
import { filmPage, image, titleLogo } from "@/lib/tmdb";
import { visitorRegion } from "@/lib/region";

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
  const [page, lib, logo, reviews] = await Promise.all([filmPage(movieID, region), optionalLibrary(), titleLogo("movie", movieID), reviewsOfTitle(`m${movieID}`)]);
  if (!page) notFound();
  const { movie } = page;

  const tracked = lib.archive?.movies.find((m) => m.movie.id === movieID) ?? null;
  const watched = tracked?.status === "Watched" || !!lib.archive?.movieWatchedDates?.[String(movieID)];
  const loved = lib.archive?.reactions?.[`movie:${movieID}`] === "loved";

  const runtime = movie.runtime ? (movie.runtime >= 60 ? `${Math.floor(movie.runtime / 60)}h ${movie.runtime % 60}m` : `${movie.runtime}m`) : null;

  // The facts, in the app's order with the year added, each only when there is something to say.
  const facts = [
    page.genres.length > 0 && { label: "Genres", value: page.genres.join(" · ") },
    movie.release_date && { label: "Year", value: movie.release_date.slice(0, 4) },
    runtime && { label: "Runtime", value: runtime },
    movie.vote_average && { label: "TMDB", value: movie.vote_average.toFixed(1) },
    page.released && { label: "Released", value: longDate(page.released), accent: true },
  ].filter(Boolean) as { label: string; value: string; accent?: boolean }[];

  return (
    <div className="min-h-screen flex flex-col">
      <SiteNav />
      {/* Laid out like the profile: the picture as a banner across the whole
          width, then two columns on the same widths as the profile's. */}
      <main className="w-full px-[clamp(16px,3.2vw,64px)] pt-[clamp(12px,2.2vw,32px)] pb-20 flex-1">
        <TitleBanner art={image.banner(movie.backdrop_path) ?? image.poster(movie.poster_path, "w780")} logo={logo} title={movie.title} />
        <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] items-start">
          {/* The left column: About, then the members' reviews under it at
              the same width. */}
          <div className="grid gap-8 min-w-0">
          {/* Headed like the sections beside and below it. */}
          <Section title="About">
            <HeaderCard title={movie.title} titleOnBanner={!!logo} facts={facts} overview={movie.overview ?? null}>
              <FilmTray tracked={!!tracked} watched={watched} loved={loved} signedIn={lib.signedIn} />
            </HeaderCard>
          </Section>
          <ReviewsSection reviews={reviews} />
          </div>
          <div className="grid gap-4">
            {page.trailer && <TrailerSection id={page.trailer} />}
            {page.watch && <WhereToWatchSection watch={page.watch} />}
          </div>
        </div>
        <div className="mt-8 grid gap-8">
          {page.cast.length > 0 && <CastSection cast={page.cast} />}
          {page.moreLikeThis.length > 0 && <MoreLikeThisSection items={page.moreLikeThis} kind="movie" />}
          {lib.signedIn && <TitleActivity target={{ kind: "movie", movie }} archive={lib.archive} signedIn={lib.signedIn} />}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

/** "23 September 2022". */
function longDate(d: string) {
  const [y, m, day] = d.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, day)).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}
