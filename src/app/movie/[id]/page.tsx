import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { Poster } from "@/components/Poster";
import { TrackControls } from "@/components/TrackControls";
import { CastRow, Hero } from "@/components/TitleHero";
import { TitleActivity } from "@/components/TitleActivity";
import { optionalLibrary } from "@/lib/library";
import { movieDetail } from "@/lib/tmdb";
import { year } from "@/lib/archive";

export async function generateMetadata({ params }: PageProps<"/movie/[id]">): Promise<Metadata> {
  const { id } = await params;
  const d = await movieDetail(Number(id));
  return { title: d ? `${d.movie.title} — Kodigo` : "Movie — Kodigo" };
}

export default async function MoviePage({ params }: PageProps<"/movie/[id]">) {
  const { id } = await params;
  const movieID = Number(id);
  if (!Number.isInteger(movieID)) notFound();

  const [detail, lib] = await Promise.all([movieDetail(movieID), optionalLibrary()]);
  if (!detail) notFound();
  const { movie } = detail;

  const tracked = lib.archive?.movies.find((m) => m.movie.id === movieID) ?? null;
  const seenOn = lib.archive?.movieWatchedDates?.[String(movieID)];

  const facts = [
    year(movie.release_date),
    movie.runtime ? `${Math.floor(movie.runtime / 60)}h ${movie.runtime % 60}m` : "",
  ].filter(Boolean);

  return (
    <>
      <SiteNav />
      <Hero backdrop={movie.backdrop_path}>
        <div className="w-[160px] sm:w-[200px] shrink-0">
          <Poster path={movie.poster_path} alt={movie.title} />
        </div>
        <div className="min-w-0">
          <div className="eyebrow">Film</div>
          <h1 className="!text-[clamp(40px,7vw,72px)]">{movie.title}</h1>
          <p className="text-sm text-dim mt-3">{facts.join(" · ")}</p>
          {detail.genres.length > 0 && <p className="text-sm text-dim mt-1">{detail.genres.join(", ")}</p>}
          {detail.tagline && <p className="italic text-bone mt-4">{detail.tagline}</p>}
          {movie.overview && <p className="text-[15px] text-bone max-w-[64ch] mt-3">{movie.overview}</p>}
          <div className="mt-5">
            <TrackControls kind="movie" movie={movie} status={tracked?.status ?? null} signedIn={lib.signedIn} />
          </div>
          {seenOn && <p className="text-xs text-dim mt-3">Seen {seenOn.slice(0, 10)}</p>}
          {movie.vote_average ? <p className="text-xs text-dim mt-3">TMDB {movie.vote_average.toFixed(1)} / 10</p> : null}
        </div>
      </Hero>
      <main className="wrap flex-1 py-10">
        {detail.cast.length > 0 && <CastRow cast={detail.cast} />}
        <TitleActivity target={{ kind: "movie", movie }} archive={lib.archive} signedIn={lib.signedIn} />
      </main>
      <SiteFooter />
    </>
  );
}
