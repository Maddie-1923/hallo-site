import Link from "next/link";
import { SeriesPill, seriesBadge } from "@/components/SeriesBadge";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { People } from "@/components/People";
import { TitleCredits } from "@/components/TitleCredits";
import { TitleActions } from "@/components/TitleActions";
import { ReviewsSection } from "@/components/TitleReviews";
import { YourReview } from "@/components/YourReview";
import { EpisodesSection, HeaderCard, TitleBento, Section, SectionCard, TitleBanner, TrailerSection, WhereToWatchTile } from "@/components/TitleParts";
import { optionalLibrary } from "@/lib/library";
import { episodePage, image, seriesPage, titleLogo, type EpisodeLink } from "@/lib/tmdb";
import { visitorRegion } from "@/lib/region";

// An episode's page, laid out as its show's (the picture across the top, the
// About card and the keys beside it, Your take and reviews under it) with the
// pieces of the app's episode screen (EpisodeDetailView): the still, when it
// aired, the description, and Watched, Like, Rewatch and Skip. Beside it, a
// card to step back or on an episode; below, the season's episodes, then its
// cast and crew.
type Params = PageProps<"/show/[id]/season/[season]/episode/[episode]">;

const code = (s: number, e: number) => (s === 0 ? `SP | ${String(e).padStart(2, "0")}` : `S${String(s).padStart(2, "0")} | E${String(e).padStart(2, "0")}`);

async function load(params: Params["params"]) {
  const { id, season, episode } = await params;
  const [showID, s, e] = [Number(id), Number(season), Number(episode)];
  if (![showID, s, e].every(Number.isInteger)) return null;
  const region = await visitorRegion();
  const show = await seriesPage(showID, region);
  if (!show) return null;
  const ep = await episodePage(showID, s, e, show.seasonCount);
  return ep ? { show, ep, showID, region } : null;
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const d = await load(params);
  return { title: d ? `${d.show.show.name} ${code(d.ep.season, d.ep.episode)} · ${d.ep.name} — Kodigo` : "Episode — Kodigo" };
}

export default async function EpisodePage({ params }: Params) {
  const d = await load(params);
  if (!d) notFound();
  const { show, ep, showID } = d;
  const [lib, logo] = await Promise.all([optionalLibrary(), titleLogo("show", showID)]);
  const key = `${showID}-${ep.season}-${ep.episode}`;
  const watched = !!lib.archive?.watched.includes(key);
  const loved = lib.archive?.reactions?.[`episode:${key}`] === "loved";

  const badge = seriesBadge(show.show.status, show.type);
  const facts = [
    { label: "Episode", value: `${code(ep.season, ep.episode)} · ${ep.name}` },
    ep.airDate && { label: "Aired", value: longDate(ep.airDate) },
    ep.runtime && { label: "Runtime", value: `${ep.runtime}m` },
    ep.vote && { label: "TMDB", value: ep.vote.toFixed(1) },
    ep.directors.length > 0 && { label: ep.directors.length > 1 ? "Directors" : "Director", value: <People people={ep.directors} /> },
    ep.writers.length > 0 && { label: ep.writers.length > 1 ? "Writers" : "Writer", value: <People people={ep.writers} /> },
  ].filter(Boolean) as { label: string; value: React.ReactNode }[];

  return (
    <div className="min-h-screen flex flex-col">
      <SiteNav />
      <main className="w-full px-[clamp(16px,3.2vw,64px)] pt-[clamp(12px,2.2vw,32px)] pb-20 flex-1">
        <TitleBanner art={ep.still ?? image.banner(show.show.backdrop_path)} logo={logo} title={show.show.name} />
        {/* The top as one L-shaped bento: About down the left with the
            trailers under it, the credits tabs on the right, and the keys
            and where to watch set into the notch above them. */}
        <div className="mt-5">
          <TitleBento
            about={
              <>
              <Section title="About" small>
              <HeaderCard
                flat
                title={ep.name}
                heading={
                  // As the app heads an episode: its show, going to the show's
                  // page, and the show's seasons and episodes under it.
                  <div>
                    <Link href={`/show/${showID}`} className="group no-underline text-ink">
                      <h1 className="inline !text-[clamp(30px,3vw,37px)] !leading-[.95] tracking-[.04em] uppercase group-hover:text-accent transition-colors">
                        {show.show.name}
                        <span aria-hidden className="ml-2 text-[.55em] align-[.25em] text-dim">→</span>
                      </h1>
                    </Link>
                    <div className="mt-1 text-[12.5px] font-semibold text-mid-tone">
                      {plural(show.seasonCount, "Season")} · {plural(show.episodeCount, "Episode")}
                    </div>
                  </div>
                }
                facts={facts}
                overview={ep.overview}
                factsFooter={
                  // The show's status, as the show page closes its facts.
                  (show.lastAired || badge) && (
                    <div className="flex items-center justify-between gap-3 text-[12.5px] text-dim">
                      <span>{show.lastAired ? `Last aired ${longDate(show.lastAired)}` : ""}</span>
                      {badge && <SeriesPill label={badge.label} returning={badge.label === "RETURNING" || badge.label === "PILOT"} />}
                    </div>
                  )
                }
              />
            </Section>
              {/* The trailers, one or two, under About. */}
              {ep.trailers.length > 0 && <TrailerSection flat videos={ep.trailers} />}
            {/* Back and on an episode, as the app pages through a season. */}
            {(ep.previous || ep.next) && (
              <SectionCard flat>
                <div className="grid grid-cols-2 gap-2">
                  <Step showID={showID} to={ep.previous} dir={-1} />
                  <Step showID={showID} to={ep.next} dir={1} />
                </div>
              </SectionCard>
            )}
              </>
            }
            actions={<TitleActions kind="episode" title={`${show.show.name} ${code(ep.season, ep.episode)}`} tracked={!!lib.archive?.shows.some((s) => s.show.id === showID)} watched={watched} loved={loved} />}
            beside={show.watch && <WhereToWatchTile watch={show.watch} />}
            side={(ep.cast.length > 0 || ep.crew.length > 0) && <TitleCredits flat cast={ep.cast} crew={ep.crew} />}
          />
        </div>
        {/* The season's episodes, straight under the bento, before their take. */}
        {ep.seasonEpisodes.length > 1 && (
          <div className="mt-8 grid grid-cols-[minmax(0,1fr)]">
            <EpisodesSection showID={showID} episodes={ep.seasonEpisodes} current={ep.episode} title={ep.season === 0 ? "Specials" : `Season ${ep.season}`} />
          </div>
        )}
        {/* Their own take on it, as the app calls it, across the page's
            full width so its parts sit side by side: the rating beside the
            moods, the review beside the note and tags. */}
        <div className="mt-8">
          <Section title="Your take" small>
            <SectionCard>
              <YourReview kind="episode" out={ep.airDate ?? null} title={{ key: `e${key}`, kind: "show", title: `${show.show.name} ${code(ep.season, ep.episode)}`, href: `/show/${showID}/season/${ep.season}/episode/${ep.episode}`, poster: image.poster(show.show.poster_path, "w342"), backdrop: ep.still, year: (ep.airDate ?? "").slice(0, 4) }} />
            </SectionCard>
          </Section>
        </div>
        {/* Under it, at the About card's width: the reviews. */}
        <div className="mt-8 grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="grid gap-8 min-w-0">
            <ReviewsSection reviews={[]} />
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

function Step({ showID, to, dir }: { showID: number; to: EpisodeLink | null; dir: 1 | -1 }) {
  if (!to) return <span className="rounded-[12px] bg-piece opacity-35" />;
  return (
    <Link href={`/show/${showID}/season/${to.season}/episode/${to.episode}`} className={`rounded-[12px] bg-piece px-3 py-2.5 no-underline text-ink hover:text-accent transition-colors grid gap-0.5 ${dir === 1 ? "text-right" : ""}`}>
      <span className="text-[11px] font-bold uppercase tracking-[.08em] text-dim">{dir === 1 ? "Next ›" : "‹ Previous"}</span>
      <span className="text-[12.5px] font-semibold">{code(to.season, to.episode)}</span>
      <span className="text-[12px] text-dim truncate">{to.name}</span>
    </Link>
  );
}

function longDate(d: string) {
  const [y, m, day] = d.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, day)).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;
