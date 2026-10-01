import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { SiteNav } from "@/components/SiteNav";
import { genreHref } from "@/lib/browse";
import { SiteFooter } from "@/components/SiteFooter";
import { People } from "@/components/People";
import { TitleCredits } from "@/components/TitleCredits";
import { HeaderCard, TitleBento, MoreLikeThisSection, Section, SectionCard, TitleBanner, TrailerSection, WhereToWatchTile } from "@/components/TitleParts";
import { TitleActions } from "@/components/TitleActions";
import { SeasonBrowser } from "@/components/SeasonBrowser";
import { SeriesPill, seriesBadge } from "@/components/SeriesBadge";
import { optionalLibrary } from "@/lib/library";
import { markLookup } from "@/lib/marks";
import { publicReviewsOfTitle, titleRatings } from "@/lib/public-reads";
import { readTake } from "@/lib/library-rules";
import { ReviewsSection } from "@/components/TitleReviews";
import { YourReview } from "@/components/YourReview";
import { image, seriesPage, showTrailers, titleLogo } from "@/lib/tmdb";
import { visitorRegion } from "@/lib/region";
import { Day } from "@/components/Day";
import { AdSlot } from "@/components/AdSlot";

// A series' page, laid out like the film page and the profile (the picture
// as a banner across the top, then two columns), with the pieces of the
// app's show screen (ShowDetailView): the header card with the title, how
// many seasons and episodes, the facts, the last-aired line and the series
// pill, the overview and the five keys; Where to watch and the trailer
// beside it; then All episodes with a small episode page beside it, the
// reviews, Your take and more like this.
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
  const [page, lib, logo, reviews, ratings] = await Promise.all([seriesPage(showID, region), optionalLibrary(), titleLogo("show", showID), publicReviewsOfTitle("show", showID), titleRatings("show", showID)]);
  if (!page) notFound();
  // The newest trailer, then each season's own, newest season first.
  const trailers = await showTrailers(showID, page.seasons.filter((x) => x.season_number > 0).map((x) => x.season_number));
  const { show } = page;

  const tracked = lib.archive?.shows.find((s) => s.show.id === showID) ?? null;
  const watched = lib.archive?.watched.filter((k) => k.startsWith(`${showID}-`)) ?? [];
  const loved = lib.archive?.reactions?.[`show:${showID}`] === "loved";

  // The facts, in the app's order, each only when there is something to say;
  // a tracked show adds how far along it is, in the accent.
  const left = page.episodeCount - watched.length;
  const facts = [
    page.genres.length > 0 && {
      label: "Genres",
      // Each genre goes to Browse, filtered to it.
      value: page.genres.map((g, i) => (
        <span key={g}>
          {i > 0 && " · "}
          <Link href={genreHref("show", g)} className="text-ink no-underline hover:text-accent">
            {g}
          </Link>
        </span>
      )),
    },
    page.creators.length > 0 && { label: "Created by", value: <People people={page.creators} /> },
    page.seasonCount && { label: "Seasons", value: String(page.seasonCount) },
    page.episodeCount && { label: "Episodes", value: String(page.episodeCount) },
    show.first_air_date && { label: "Year", value: show.first_air_date.slice(0, 4) },
    page.certification && { label: "Rated", value: page.certification },
    page.episodeRuntime && { label: "Episode", value: `${page.episodeRuntime}m` },
    show.vote_average && { label: "TMDB", value: show.vote_average.toFixed(1) },
    // As a film's Released date opens its Releases tab, the first air date
    // opens Air dates.
    show.first_air_date && {
      label: "First aired",
      value: (
        <a href="#air-dates" className="text-accent no-underline hover:underline">
          <Day iso={show.first_air_date} /> →
        </a>
      ),
    },
    tracked && { label: "Progress", value: left > 0 ? `${left} episodes left` : "Up to date", accent: true },
  ].filter(Boolean) as { label: string; value: React.ReactNode; accent?: boolean }[];

  const badge = seriesBadge(show.status, page.type);
  const seasons = page.seasons.map((s) => ({ number: s.season_number, name: s.name, count: s.episode_count }));
  // Open on the season they are up to, as the app does, else the first.
  // The small episode page opens on the episode they watched last (by the
  // day it was checked off, else the furthest along), or S01E01 before
  // they've started; the list opens on that episode's season.
  const when = (k: string) => lib.archive?.watchedDates?.[k] ?? lib.archive?.watchedStamps?.[k] ?? "";
  const order = (k: string) => k.split("-").slice(1).map(Number);
  const last = [...watched].sort((a, b) => when(b).localeCompare(when(a)) || order(b)[0] - order(a)[0] || order(b)[1] - order(a)[1])[0];
  const start = last ? { season: order(last)[0], episode: order(last)[1] } : { season: seasons.find((x) => x.number > 0)?.number ?? 1, episode: 1 };
  const openSeason = start.season;

  // What the visitor has done with each title, for the More like this keys.
  const look = markLookup(lib.archive);
  return (
    <div className="min-h-screen flex flex-col">
      <SiteNav />
      <main className="w-full px-[clamp(16px,3.2vw,64px)] pt-[clamp(12px,2.2vw,32px)] pb-20 flex-1">
        <TitleBanner art={image.banner(show.backdrop_path) ?? image.poster(show.poster_path, "w780")} logo={logo} title={show.name} />
        {/* The top as one L-shaped bento: About down the left with the
            trailers under it, the credits tabs on the right, and the keys
            and where to watch set into the notch above them. */}
        <div className="mt-8">
          <TitleBento
            about={
              <>
              <Section title="About" small>
            <HeaderCard flat
              title={show.name}
              titleOnBanner={!!logo}
              facts={facts}
              overview={show.overview ?? null}
              factsFooter={
                (page.lastAired || badge) && (
                  <div className="flex items-center justify-between gap-3 text-[1.0417rem] text-dim">
                    <span>{page.lastAired ? <>Last aired <Day iso={page.lastAired} /></> : ""}</span>
                    {badge && <SeriesPill label={badge.label} returning={badge.label === "RETURNING"} small />}
                  </div>
                )
              }
            >
            </HeaderCard>
          </Section>
              {/* The trailers, one or two, under About. */}
              {trailers.length > 0 && <TrailerSection flat videos={trailers} />}
              </>
            }
            actions={<TitleActions kind="show" title={show.name} tracked={!!tracked} loved={loved} stopped={tracked?.status === "Dropped"} />}
            beside={<WhereToWatchTile watch={page.watch} />}
            side={<TitleCredits flat kind="show" cast={page.cast} crew={page.crew} details={page.details} genres={page.genres} keywords={page.keywords} airing={page.airing} />}
          />
        </div>
        {/* The season list, straight under the bento and before their take,
            at the About card's width. */}
        {seasons.length > 0 && (
          <div className="mt-8">
            <SeasonBrowser showID={showID} seasons={seasons} watched={watched} skipped={lib.archive?.skipped?.filter((k) => k.startsWith(`${showID}-`)) ?? []} live={lib.signedIn} open={openSeason} start={start} />
          </div>
        )}
        {/* Under it, the reviews at the About card's width, and their own
            take beside them, as the keys sit beside About. */}
        <div className="mt-8 grid gap-8 lg:gap-0 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-start">
          <div className="grid gap-8 min-w-0">
          <ReviewsSection reviews={reviews} ratings={ratings} />
          </div>
          <div className="lg:pl-2 min-w-0">
            <Section title="Your take" small>
              <SectionCard>
                <YourReview target={{ kind: "show", show }} initial={lib.archive ? readTake(lib.archive, `show:${showID}`) : null} live={lib.signedIn} kind="show" out={show.first_air_date ?? null} title={{ key: `s${showID}`, kind: "show", title: show.name, href: `/show/${showID}`, poster: image.poster(show.poster_path, "w780"), backdrop: image.backdrop(show.backdrop_path), year: (show.first_air_date ?? "").slice(0, 4) }} />
              </SectionCard>
            </Section>
          </div>
        </div>
        <AdSlot place="title" className="mt-8" />
        <div className="mt-8 grid grid-cols-[minmax(0,1fr)] gap-8">
          {page.moreLikeThis.length > 0 && <MoreLikeThisSection items={page.moreLikeThis} kind="show" marks={Object.fromEntries(page.moreLikeThis.map((m) => [m.id, look.show(m.id)]))} lists={look.lists} />}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}


