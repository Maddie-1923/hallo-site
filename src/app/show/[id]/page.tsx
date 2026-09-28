import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { People } from "@/components/People";
import { TitleCredits } from "@/components/TitleCredits";
import { TitleActivity } from "@/components/TitleActivity";
import { HeaderCard, MoreLikeThisSection, Section, SectionCard, TitleBanner, TrailerSection, WhereToWatchSection } from "@/components/TitleParts";
import { TitleActions } from "@/components/TitleActions";
import { SeasonList } from "@/components/SeasonList";
import { seriesBadge } from "@/components/SeriesBadge";
import { optionalLibrary } from "@/lib/library";
import { reviewsOfTitle } from "@/lib/profile-previews";
import { ReviewsSection } from "@/components/TitleReviews";
import { YourReview } from "@/components/YourReview";
import { image, seriesPage, titleLogo } from "@/lib/tmdb";
import { visitorRegion } from "@/lib/region";

// A series' page, laid out like the film page and the profile (the picture
// as a banner across the top, then two columns), with the pieces of the
// app's show screen (ShowDetailView): the header card with the title, how
// many seasons and episodes, the facts, the last-aired line and the series
// pill, the overview and the five keys; Where to watch and the trailer
// beside it; then All episodes, the cast and more like this.
export async function generateMetadata({ params }: PageProps<"/show/[id]">): Promise<Metadata> {
  const { id } = await params;
  const d = await seriesPage(Number(id));
  return { title: d ? `${d.show.name} — Kodigo` : "Show — Kodigo" };
}

export default async function ShowPage({ params }: PageProps<"/show/[id]">) {
  const { id } = await params;
  const showID = Number(id);
  if (!Number.isInteger(showID)) notFound();

  const region = await visitorRegion();
  const [page, lib, logo, reviews] = await Promise.all([seriesPage(showID, region), optionalLibrary(), titleLogo("show", showID), reviewsOfTitle(`s${showID}`)]);
  if (!page) notFound();
  const { show } = page;

  const tracked = lib.archive?.shows.find((s) => s.show.id === showID) ?? null;
  const watched = lib.archive?.watched.filter((k) => k.startsWith(`${showID}-`)) ?? [];
  const loved = lib.archive?.reactions?.[`show:${showID}`] === "loved";

  // The facts, in the app's order, each only when there is something to say;
  // a tracked show adds how far along it is, in the accent.
  const left = page.episodeCount - watched.length;
  const facts = [
    page.genres.length > 0 && { label: "Genres", value: page.genres.join(" · ") },
    page.creators.length > 0 && { label: "Created by", value: <People people={page.creators} /> },
    page.seasonCount && { label: "Seasons", value: String(page.seasonCount) },
    page.episodeCount && { label: "Episodes", value: String(page.episodeCount) },
    show.first_air_date && { label: "Year", value: show.first_air_date.slice(0, 4) },
    page.certification && { label: "Rated", value: page.certification },
    page.episodeRuntime && { label: "Episode", value: `${page.episodeRuntime}m` },
    show.vote_average && { label: "TMDB", value: show.vote_average.toFixed(1) },
    tracked && { label: "Progress", value: left > 0 ? `${left} episodes left` : "Up to date", accent: true },
  ].filter(Boolean) as { label: string; value: React.ReactNode; accent?: boolean }[];

  const badge = seriesBadge(show.status, page.type);
  const seasons = page.seasons.map((s) => ({ number: s.season_number, name: s.name, count: s.episode_count }));
  // Open on the season they are up to, as the app does, else the first.
  const upTo = watched.length ? Math.max(...watched.map((k) => Number(k.split("-")[1]))) : null;
  const openSeason = upTo ?? seasons[0]?.number ?? 1;

  return (
    <div className="min-h-screen flex flex-col">
      <SiteNav />
      <main className="w-full px-[clamp(16px,3.2vw,64px)] pt-[clamp(12px,2.2vw,32px)] pb-20 flex-1">
        <TitleBanner art={image.banner(show.backdrop_path) ?? image.poster(show.poster_path, "w780")} logo={logo} title={show.name} />
        <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] items-start">
          {/* The left column: About, then the members' reviews under it at
              the same width. */}
          <div className="grid gap-8 min-w-0">
          {/* Headed like the sections beside and below it. */}
          <Section title="About">
            <HeaderCard
              title={show.name}
              titleOnBanner={!!logo}
              facts={facts}
              overview={show.overview ?? null}
              factsFooter={
                (page.lastAired || badge) && (
                  <div className="flex items-center justify-between gap-3 text-[12.5px] text-dim">
                    <span>{page.lastAired ? `Last aired ${longDate(page.lastAired)}` : ""}</span>
                    {badge && <SeriesPill label={badge.label} returning={badge.label === "RETURNING" || badge.label === "PILOT"} />}
                  </div>
                )
              }
            >
            </HeaderCard>
          </Section>
          {/* Their own take on it, as the app calls it: rating, moods, tags,
              the review and the private note. */}
          <Section title="Your take">
            <SectionCard>
              <YourReview kind="show" title={{ key: `s${showID}`, kind: "show", title: show.name, href: `/show/${showID}`, poster: image.poster(show.poster_path, "w342"), backdrop: image.backdrop(show.backdrop_path), year: (show.first_air_date ?? "").slice(0, 4) }} />
            </SectionCard>
          </Section>
          <ReviewsSection reviews={reviews} />
          </div>
          <div className="grid gap-4">
            {/* What can be done with it, above the trailer, its top level with
                the About card's rather than its heading (the heading pill,
                44px, and the 12px under it). */}
            <div className="lg:mt-14">
              <TitleActions kind="show" title={show.name} tracked={!!tracked} loved={loved} stopped={tracked?.status === "Dropped"} />
            </div>
            {page.trailer && <TrailerSection id={page.trailer} />}
            {page.watch && <WhereToWatchSection watch={page.watch} />}
          </div>
        </div>
        <div className="mt-8 grid grid-cols-[minmax(0,1fr)] gap-8">
          {seasons.length > 0 && (
            <Section title="All episodes" tight>
              <SectionCard>
                <SeasonList showID={showID} seasons={seasons} watched={watched} open={openSeason} />
              </SectionCard>
            </Section>
          )}
          {/* Cast, crew, details, genres and air dates, as tabs. */}
          <TitleCredits cast={page.cast} crew={page.crew} details={page.details} genres={page.genres} keywords={page.keywords} airing={page.airing} />
          {page.moreLikeThis.length > 0 && <MoreLikeThisSection items={page.moreLikeThis} kind="show" />}
          {lib.signedIn && <TitleActivity target={{ kind: "show", show }} archive={lib.archive} signedIn={lib.signedIn} />}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

// The app's series pill: small bold capitals on a rounded chip; blue for a
// show still going, stone for one that has ended.
function SeriesPill({ label, returning }: { label: string; returning: boolean }) {
  return (
    <span className={`shrink-0 rounded-[6px] px-1.5 py-[2px] text-[11px] font-bold tracking-[.04em] ${returning ? "bg-[#6FAECF] text-[#0D2E40]" : "bg-[#CFCAC0] text-[#3A3833]"}`}>
      {label}
    </span>
  );
}

/** "23 September 2022". */
function longDate(d: string) {
  const [y, m, day] = d.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, day)).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}
