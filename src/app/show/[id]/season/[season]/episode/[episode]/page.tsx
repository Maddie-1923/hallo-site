import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { People } from "@/components/People";
import { TitleCredits } from "@/components/TitleCredits";
import { TitleActions } from "@/components/TitleActions";
import { ReviewsSection } from "@/components/TitleReviews";
import { YourReview } from "@/components/YourReview";
import { EpisodesSection, HeaderCard, Section, SectionCard, TitleBanner, TrailerSection, WhereToWatchSection } from "@/components/TitleParts";
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

  const facts = [
    { label: "Show", value: <Link href={`/show/${showID}`} className="text-accent no-underline hover:underline">{show.show.name}</Link> },
    { label: "Episode", value: code(ep.season, ep.episode) },
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
        <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] items-start">
          <div className="grid gap-8 min-w-0">
            <Section title="About">
              <HeaderCard title={ep.name} subtitle={code(ep.season, ep.episode)} facts={facts} overview={ep.overview} />
            </Section>
            <Section title="Your take">
              <SectionCard>
                <YourReview kind="episode" title={{ key: `e${key}`, kind: "show", title: `${show.show.name} ${code(ep.season, ep.episode)}`, href: `/show/${showID}/season/${ep.season}/episode/${ep.episode}`, poster: image.poster(show.show.poster_path, "w342"), backdrop: ep.still, year: (ep.airDate ?? "").slice(0, 4) }} />
              </SectionCard>
            </Section>
            <ReviewsSection reviews={[]} />
          </div>
          <div className="grid gap-4">
            <div className="lg:mt-14">
              <TitleActions kind="episode" title={`${show.show.name} ${code(ep.season, ep.episode)}`} tracked={!!lib.archive?.shows.some((s) => s.show.id === showID)} watched={watched} loved={loved} />
            </div>
            {/* Back and on an episode, as the app pages through a season. */}
            {(ep.previous || ep.next) && (
              <SectionCard>
                <div className="grid grid-cols-2 gap-2">
                  <Step showID={showID} to={ep.previous} dir={-1} />
                  <Step showID={showID} to={ep.next} dir={1} />
                </div>
              </SectionCard>
            )}
            {ep.trailer && <TrailerSection id={ep.trailer} />}
            {show.watch && <WhereToWatchSection watch={show.watch} />}
          </div>
        </div>
        <div className="mt-8 grid grid-cols-[minmax(0,1fr)] gap-8">
          {ep.seasonEpisodes.length > 1 && <EpisodesSection showID={showID} episodes={ep.seasonEpisodes} current={ep.episode} title={ep.season === 0 ? "Specials" : `Season ${ep.season}`} />}
          {(ep.cast.length > 0 || ep.crew.length > 0) && <TitleCredits cast={ep.cast} crew={ep.crew} />}
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
