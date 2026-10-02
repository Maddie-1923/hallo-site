import Link from "next/link";
import type { EpisodeGroup, WatchedFilm, WatchedShow } from "@/lib/public-profile";
import type { WatchedPageData } from "@/lib/real-profile";
import { SiteNav } from "./SiteNav";
import { SiteFooter } from "./SiteFooter";
import { BlockGate } from "./SafetySheets";
import { Day } from "./Day";
import { H, SHELL } from "./ListsChrome";
import { PrivateNotice } from "./ProfileNav";

// The pages behind a profile's three numbers (/u/<name>/movies, /shows and
// /episodes): who it is, back to their profile; the page's name and count,
// with This year / All time when the library carries dates; then the titles
// themselves in one shell. Everything comes from the archive the profile is
// drawn from, so it's never more than the profile itself would show.

export type WatchedKind = "movies" | "shows" | "episodes";
const NAMES: Record<WatchedKind, string> = { movies: "Movies", shows: "Shows", episodes: "Episodes" };

export function WatchedPage({ data: d, kind, thisYear }: { data: WatchedPageData; kind: WatchedKind; thisYear: boolean }) {
  const w = d.lists;
  // This year only means something with dates to go on.
  const year = thisYear && w.dated;
  const films = year ? w.films.filter((f) => f.date?.startsWith(w.year)) : w.films;
  const shows = year ? w.shows.filter((s) => s.yearEpisodes > 0) : w.shows;
  const groups = year ? w.episodes.map((g) => ({ ...g, episodes: g.episodes.filter((e) => e.date?.startsWith(w.year)) })).filter((g) => g.episodes.length > 0) : w.episodes;
  const total = kind === "movies" ? films.length : kind === "shows" ? shows.length : groups.reduce((n, g) => n + g.episodes.length, 0);
  const none = year ? `Nothing yet in ${w.year}.` : kind === "movies" ? "No films watched yet." : kind === "shows" ? "No shows in the library yet." : "No episodes watched yet.";

  const page = (
    <div className="max-w-[86.6667rem] mx-auto grid grid-cols-[minmax(0,1fr)] gap-4">
      <Link href={`/u/${d.username}`} className="group justify-self-start flex items-center gap-3 min-w-0 max-w-full no-underline text-ink">
        <span className="shrink-0 w-[3.3333rem] h-[3.3333rem] rounded-full overflow-hidden bg-accent-fill text-on-accent flex items-center justify-center display text-[1.6667rem] leading-none">
          {d.avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={d.avatar} alt="" className="w-full h-full object-cover" />
          ) : (
            (d.displayName[0] ?? "?").toUpperCase()
          )}
        </span>
        <span className="min-w-0">
          {d.displayName !== d.username && <span className="block display text-[1.6667rem] leading-[.95] truncate group-hover:text-accent transition-colors">{d.displayName}</span>}
          <span className={`block truncate ${d.displayName !== d.username ? "text-[1.0417rem] text-dim" : "text-[1.4167rem] font-semibold group-hover:text-accent transition-colors"}`}>@{d.username}</span>
        </span>
      </Link>

      {d.isPrivate ? (
        <PrivateNotice />
      ) : (
        <section className="grid grid-cols-[minmax(0,1fr)] gap-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h1 className={H}>
              {NAMES[kind]} <span className="text-dim tabular-nums">{total.toLocaleString("en")}</span>
            </h1>
            {w.dated && <RangeSwitch base={`/u/${d.username}/${kind}`} year={year} label={w.year} />}
          </div>
          <div className={SHELL}>
            {total === 0 ? (
              <p className="m-0 rounded-shell bg-piece p-3 text-[1.0417rem] text-dim">{none}</p>
            ) : kind === "movies" ? (
              <FilmGrid films={films} />
            ) : kind === "shows" ? (
              <ShowGrid shows={shows} year={year} />
            ) : (
              <EpisodeGroups groups={groups} />
            )}
          </div>
        </section>
      )}
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col">
      <SiteNav />
      <main className="w-full px-[clamp(16px,3.2vw,64px)] pt-8 pb-20 flex-1">
        {/* Someone you've blocked: the same notice as on their profile. */}
        {d.owner ? page : (
          <BlockGate username={d.username} bare>
            {page}
          </BlockGate>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}

// This year / All time, as two links so the choice is in the address.
function RangeSwitch({ base, year, label }: { base: string; year: boolean; label: string }) {
  const pill = (on: boolean) =>
    `inline-flex items-center h-[2.3333rem] px-3.5 rounded-full text-[0.875rem] font-bold uppercase tracking-[.08em] no-underline transition-colors ${on ? "bg-accent-fill text-on-accent" : "text-dim hover:text-ink"}`;
  return (
    <nav aria-label="Period" className="inline-flex items-center gap-1 p-1 rounded-full bg-card border border-hair">
      <Link href={`${base}?range=year`} aria-current={year ? "page" : undefined} className={pill(year)} title={label}>
        This year
      </Link>
      <Link href={base} aria-current={year ? undefined : "page"} className={pill(!year)}>
        All time
      </Link>
    </nav>
  );
}

// As the profile's Watchlist grid: poster, title, and a line under it.
function Grid<T extends { key: string; href: string; poster: string | null; title: string }>({ items, line }: { items: T[]; line: (t: T) => React.ReactNode }) {
  return (
    <ol className="m-0 p-0 list-none grid gap-2 grid-cols-3 sm:grid-cols-4 md:grid-cols-5 xl:grid-cols-6">
      {items.map((t) => (
        <li key={t.key} className="min-w-0">
          <Link href={t.href} className="group block rounded-shell bg-piece p-1.5 no-underline text-ink">
            <span className="block aspect-[2/3] rounded-[10px] overflow-hidden bg-card border border-hair group-hover:border-accent transition-colors">
              {t.poster && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={t.poster} alt="" className="w-full h-full object-cover" loading="lazy" />
              )}
            </span>
            <span className="block px-1 pt-1.5 text-[1.0417rem] leading-[1.3333rem] font-semibold truncate group-hover:text-accent transition-colors">{t.title}</span>
            <span className="block px-1 pb-0.5 text-[1.0417rem] leading-[1.3333rem] text-dim truncate">{line(t)}</span>
          </Link>
        </li>
      ))}
    </ol>
  );
}

function FilmGrid({ films }: { films: WatchedFilm[] }) {
  return <Grid items={films} line={(f) => (f.date ? <Day iso={f.date} style="short" /> : f.year || "Watched")} />;
}

// How far along each series is: the episodes they've watched (what has
// aired would take a TMDB ask a series, too many for a whole library).
function ShowGrid({ shows, year }: { shows: WatchedShow[]; year: boolean }) {
  const eps = (n: number) => `${n.toLocaleString("en")} ${n === 1 ? "episode" : "episodes"}`;
  return <Grid items={shows} line={(s) => (year ? `${eps(s.yearEpisodes)} this year` : s.episodes ? `${eps(s.episodes)} watched` : "Not started")} />;
}

// Each series, latest watched first, with its episodes under it as rows
// ("S01 | E03" and the day), newest first. The archive keeps no episode
// names, and asking TMDB for each would make a big library's page crawl, so
// a row is the code and the date.
function EpisodeGroups({ groups }: { groups: EpisodeGroup[] }) {
  const two = (n: number) => String(n).padStart(2, "0");
  return (
    <div className="grid gap-2">
      {groups.map((g) => (
        <section key={g.key} className="rounded-shell bg-piece p-2 grid gap-2">
          <Link href={g.href} className="group flex items-center gap-3 min-w-0 no-underline text-ink">
            <span className="shrink-0 w-[3.3333rem] aspect-[2/3] rounded-[8px] overflow-hidden bg-card border border-hair group-hover:border-accent transition-colors">
              {g.poster && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={g.poster} alt="" className="w-full h-full object-cover" loading="lazy" />
              )}
            </span>
            <span className="min-w-0">
              <span className="block text-[1.25rem] leading-tight font-semibold truncate group-hover:text-accent transition-colors">{g.title}</span>
              <span className="block text-[1.0417rem] text-dim">
                {g.episodes.length.toLocaleString("en")} {g.episodes.length === 1 ? "episode" : "episodes"}
              </span>
            </span>
          </Link>
          <ol className="m-0 p-0 list-none grid gap-1 grid-cols-[minmax(0,1fr)] sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {g.episodes.map((e) => (
              <li key={e.key} className="min-w-0">
                <Link href={e.href} className="flex items-baseline justify-between gap-3 h-full rounded-[10px] bg-card border border-hair px-3 py-2 no-underline text-ink hover:border-accent transition-colors">
                  <span className="font-semibold tabular-nums whitespace-nowrap text-[1.0417rem]">
                    S{two(e.season)} <span className="text-dim font-normal">|</span> E{two(e.episode)}
                  </span>
                  {e.date && (
                    <span className="text-[1.0417rem] text-dim truncate">
                      <Day iso={e.date} style="short" />
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ol>
        </section>
      ))}
    </div>
  );
}
