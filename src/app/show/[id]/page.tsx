import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { Poster } from "@/components/Poster";
import { TrackControls } from "@/components/TrackControls";
import { EpisodeList } from "@/components/EpisodeList";
import { CastRow, Hero } from "@/components/TitleHero";
import { TitleActivity } from "@/components/TitleActivity";
import { SeriesBadge } from "@/components/SeriesBadge";
import { optionalLibrary } from "@/lib/library";
import { seasonEpisodes, showDetail } from "@/lib/tmdb";
import { year } from "@/lib/archive";

export async function generateMetadata({ params }: PageProps<"/show/[id]">): Promise<Metadata> {
  const { id } = await params;
  const d = await showDetail(Number(id));
  return { title: d ? `${d.show.name} — Kodigo` : "Show — Kodigo" };
}

export default async function ShowPage({ params, searchParams }: PageProps<"/show/[id]">) {
  const { id } = await params;
  const sp = await searchParams;
  const showID = Number(id);
  if (!Number.isInteger(showID)) notFound();

  const [detail, lib] = await Promise.all([showDetail(showID), optionalLibrary()]);
  if (!detail) notFound();
  const { show } = detail;

  const tracked = lib.archive?.shows.find((s) => s.show.id === showID) ?? null;
  const watched = lib.archive?.watched.filter((k) => k.startsWith(`${showID}-`)) ?? [];

  const requested = typeof sp.season === "string" ? Number(sp.season) : NaN;
  const seasonNumbers = detail.seasons.map((s) => s.season_number);
  // Open on the season with the next unwatched episode when the show is
  // tracked, the way the app does; otherwise the first.
  const defaultSeason = (() => {
    if (Number.isInteger(requested) && seasonNumbers.includes(requested)) return requested;
    if (tracked && watched.length) {
      const seen = watched.map((k) => Number(k.split("-")[1]));
      return Math.max(...seen);
    }
    return seasonNumbers[0] ?? 1;
  })();
  const episodes = seasonNumbers.length ? await seasonEpisodes(showID, defaultSeason) : [];

  const facts = [
    year(show.first_air_date),
    detail.seasonCount ? `${detail.seasonCount} season${detail.seasonCount === 1 ? "" : "s"}` : "",
    detail.episodeCount ? `${detail.episodeCount} episodes` : "",
    show.status ?? "",
    detail.networks[0] ?? "",
  ].filter(Boolean);

  return (
    <>
      <SiteNav />
      <Hero backdrop={show.backdrop_path}>
        <div className="w-[160px] sm:w-[200px] shrink-0">
          <Poster path={show.poster_path} alt={show.name} />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <span className="eyebrow">Show</span>
            <SeriesBadge status={show.status} />
          </div>
          <h1 className="!text-[clamp(40px,7vw,72px)]">{show.name}</h1>
          <p className="text-sm text-dim mt-3">{facts.join(" · ")}</p>
          {detail.genres.length > 0 && <p className="text-sm text-dim mt-1">{detail.genres.join(", ")}</p>}
          {detail.tagline && <p className="italic text-bone mt-4">{detail.tagline}</p>}
          {show.overview && <p className="text-[15px] text-bone max-w-[64ch] mt-3">{show.overview}</p>}
          <div className="mt-5">
            <TrackControls kind="show" show={show} status={tracked?.status ?? null} signedIn={lib.signedIn} />
          </div>
          {tracked && (
            <p className="text-xs text-dim mt-3">
              {watched.length} of {detail.episodeCount || "?"} episodes watched
            </p>
          )}
          {detail.nextEpisode && (
            <p className="text-sm mt-3">
              <span className="text-accent font-bold">Next:</span> S{detail.nextEpisode.season_number} E
              {detail.nextEpisode.episode_number} · {detail.nextEpisode.name} · {detail.nextEpisode.air_date}
            </p>
          )}
          {show.vote_average ? <p className="text-xs text-dim mt-3">TMDB {show.vote_average.toFixed(1)} / 10</p> : null}
        </div>
      </Hero>

      <main className="wrap flex-1 py-10">
        {detail.cast.length > 0 && <CastRow cast={detail.cast} />}

        {seasonNumbers.length > 0 && (
          <section className="mt-10">
            <div className="rule" />
            <div className="eyebrow">Episodes</div>
            <div className="flex gap-2 flex-wrap mb-4">
              {detail.seasons.map((s) => {
                const on = s.season_number === defaultSeason;
                return (
                  <Link
                    key={s.id}
                    href={`/show/${showID}?season=${s.season_number}`}
                    scroll={false}
                    className={`px-3.5 py-1.5 rounded-full border text-sm font-semibold no-underline ${
                      on ? "bg-accent-fill text-graphite border-accent-fill" : "border-hair text-dim hover:text-ink"
                    }`}
                    aria-current={on ? "true" : undefined}
                  >
                    {s.season_number === 0 ? "Specials" : `Season ${s.season_number}`}
                  </Link>
                );
              })}
            </div>
            {!lib.signedIn && (
              <p className="text-sm text-dim mb-3">
                <Link href={`/login?next=/show/${showID}`} className="text-accent">Sign in</Link> to check episodes off.
              </p>
            )}
            {lib.signedIn && !tracked && <p className="text-sm text-dim mb-3">Add the show to your library to check episodes off.</p>}
            <EpisodeList showID={showID} episodes={episodes} watched={watched} canTrack={!!tracked} />
          </section>
        )}
        <TitleActivity target={{ kind: "show", show }} archive={lib.archive} signedIn={lib.signedIn} />
      </main>
      <SiteFooter />
    </>
  );
}
