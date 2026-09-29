import "server-only";
import type { LibraryArchive, Movie, Show } from "./archive";
import { moviePiles, showPiles } from "./piles";
import { fillAired, movieTitle, showTitle, type ProfileTitle, type TrackerShow } from "./public-profile";
import { seasonEpisodes, showDetail } from "./tmdb";

// The full tracker, as the app's Shows and Movies tabs lay it out: a watch
// list of piles (Up next, Ready to start, On hold, Entering the void) and
// Coming soon by day (Today, Tomorrow, This week, Later). Built from a
// library alone plus TMDB for what has aired and what airs next.

export type ComingShow = { t: ProfileTitle; episode: string; name: string; date: string; inDays: number };
export type ComingFilm = { t: ProfileTitle; date: string; inDays: number };
/** A poster for the banner: a tracked show with an episode just out (its
    show's poster, never the episode's still), or a tracked film now out. */
/** A day's entry on the tracker's calendar: an episode of a show being
    watched, or a watch-list film's release. */
export type CalendarEvent = { date: string; t: ProfileTitle; label: string; /** An episode's "season-episode". */ episode?: string };
export type Fresh = { t: ProfileTitle; label: string; date: string; show?: Show; movie?: Movie };

export interface TrackerPage {
  fresh: Fresh[];
  calendar: CalendarEvent[];
  shows: { upNext: TrackerShow[]; readyToStart: TrackerShow[]; onHold: TrackerShow[]; theVoid: TrackerShow[]; coming: ComingShow[] };
  films: { toWatch: ProfileTitle[]; onHold: ProfileTitle[]; theVoid: ProfileTitle[]; coming: ComingFilm[] };
}

/** Enough series to cover a big library without a request storm; TMDB
    answers are cached an hour. */
const LIMIT = 80;

export async function trackerFromArchive(a: LibraryArchive, now = new Date()): Promise<TrackerPage> {
  const piles = showPiles(a, now);
  // Seen episodes by show, and the day of the last check-off, which orders
  // Up next as the app does: most recently watched first.
  const seen = new Map<number, string[]>();
  for (const k of a.watched) {
    const [sid, s, e] = k.split("-").map(Number);
    if (s === 0) continue;
    seen.set(sid, [...(seen.get(sid) ?? []), `${s}-${e}`]);
  }
  const last = new Map<number, string>();
  for (const [k, d] of Object.entries(a.watchedDates ?? {})) {
    const sid = Number(k.split("-")[0]);
    if ((last.get(sid) ?? "") < d) last.set(sid, d);
  }
  const byLast = (x: { show: { id: number } }, y: { show: { id: number } }) => (last.get(y.show.id) ?? "").localeCompare(last.get(x.show.id) ?? "");
  const tracker = (list: { show: Parameters<typeof showTitle>[0] }[]) => list.map((t): TrackerShow => ({ ...showTitle(t.show), seen: seen.get(t.show.id) ?? [], aired: null }));

  const onHoldShows = a.shows.filter((t) => t.status === "Stopped");
  const [upNext, readyToStart, onHold, theVoid] = await Promise.all([
    fillAired(tracker([...piles.upNext].sort(byLast).slice(0, LIMIT))),
    fillAired(tracker(piles.readyToStart.slice(0, LIMIT))),
    fillAired(tracker([...onHoldShows].sort(byLast).slice(0, LIMIT))),
    fillAired(tracker([...piles.theVoid].sort(byLast).slice(0, LIMIT))),
  ]);

  // Coming soon: the next episode of every series being watched or waiting.
  const today = new Date(now);
  today.setUTCHours(0, 0, 0, 0);
  const days = (d: string) => Math.round((Date.parse(d) - today.getTime()) / 86_400_000);
  const watching = a.shows.filter((t) => t.status === "Watching").slice(0, LIMIT);
  const details = await Promise.all(watching.map((t) => showDetail(t.show.id)));
  const coming: ComingShow[] = [];
  details.forEach((d, i) => {
    const ep = d?.nextEpisode;
    if (!ep?.air_date || days(ep.air_date) < 0) return;
    coming.push({ t: showTitle(watching[i].show), episode: `${ep.season_number}-${ep.episode_number}`, name: ep.name, date: ep.air_date, inDays: days(ep.air_date) });
  });
  coming.sort((x, y) => x.inDays - y.inDays || x.t.title.localeCompare(y.t.title));

  // The banner: shows whose latest episode aired in the past week, and films
  // on the watch list that came out in the past two months.
  const fresh: Fresh[] = [];
  details.forEach((d, i) => {
    const ep = d?.lastEpisode;
    if (!ep?.air_date) return;
    const n = days(ep.air_date);
    if (n > 0 || n < -7) return;
    fresh.push({ t: showTitle(watching[i].show), label: `New episode · ${code(ep.season_number, ep.episode_number)}`, date: ep.air_date, show: watching[i].show });
  });
  for (const t of a.movies) {
    const r = t.movie.release_date;
    if (t.status !== "To Watch" || !r) continue;
    const n = days(r);
    if (n <= 0 && n >= -60) fresh.push({ t: movieTitle(t.movie), label: "Now showing", date: r, movie: t.movie });
  }
  fresh.sort((x, y) => y.date.localeCompare(x.date));

  // The calendar: every episode of the season just aired and the season
  // airing next, for each show being watched, and watch-list films' dates.
  const calendar: CalendarEvent[] = [];
  await Promise.all(
    details.map(async (d, i) => {
      if (!d) return;
      const seasons = [...new Set([d.lastEpisode?.season_number, d.nextEpisode?.season_number].filter((n): n is number => !!n))];
      for (const n of seasons) {
        for (const e of await seasonEpisodes(watching[i].show.id, n)) {
          if (e.air_date) calendar.push({ date: e.air_date, t: showTitle(watching[i].show), label: `${code(e.season_number, e.episode_number)}${e.name ? ` · ${e.name}` : ""}`, episode: `${e.season_number}-${e.episode_number}` });
        }
      }
    }),
  );
  for (const t of a.movies) {
    if (t.status === "To Watch" && t.movie.release_date) calendar.push({ date: t.movie.release_date, t: movieTitle(t.movie), label: "Release" });
  }
  calendar.sort((x, y) => x.date.localeCompare(y.date) || x.t.title.localeCompare(y.t.title));

  const mp = moviePiles(a, now);
  const newest = (x: { added?: string }, y: { added?: string }) => (y.added ?? "").localeCompare(x.added ?? "");
  const filmsComing: ComingFilm[] = a.movies
    .filter((t) => t.status === "To Watch" && t.movie.release_date && days(t.movie.release_date) >= 0)
    .map((t) => ({ t: movieTitle(t.movie), date: t.movie.release_date!, inDays: days(t.movie.release_date!) }))
    .sort((x, y) => x.inDays - y.inDays);
  // A film not out yet waits in Coming soon rather than on the watch list.
  const out = (t: { movie: { release_date?: string | null } }) => !t.movie.release_date || days(t.movie.release_date) < 0;

  return {
    fresh,
    calendar,
    shows: { upNext, readyToStart, onHold, theVoid, coming },
    films: {
      toWatch: [...mp.readyToStart].filter(out).sort(newest).map((t) => movieTitle(t.movie)),
      onHold: a.movies.filter((t) => t.status === "On Hold").sort(newest).map((t) => movieTitle(t.movie)),
      theVoid: [...mp.theVoid].filter(out).sort(newest).map((t) => movieTitle(t.movie)),
      coming: filmsComing,
    },
  };
}

function code(s: number, e: number) {
  return `S${String(s).padStart(2, "0")} | E${String(e).padStart(2, "0")}`;
}
