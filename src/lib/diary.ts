import type { LibraryArchive } from "./archive";
import { year } from "./archive";

// One diary entry — a film, a series, or an episode — with everything a row
// needs already looked up. Built once from the archive, so the page never
// pokes through five maps per entry.
export interface DiaryEntry {
  key: string;
  kind: "movie" | "show" | "episode";
  /** "YYYY-MM-DD" of the watch. */
  day: string;
  href: string;
  poster: string | null | undefined;
  name: string;
  /** For an episode: "Silo · S2 E7". */
  context?: string;
  released: string;
  rating: number | null;
  loved: boolean;
  rewatch: boolean;
  review: string | null;
  spoilers: boolean;
}

function day(iso: string) {
  return iso.slice(0, 10);
}

/**
 * Everything watched, newest first. A film's entry is its first watch date
 * (or the review's day when the review says otherwise); an episode's is the
 * day it was checked. Shows appear through their episodes, not as a row of
 * their own — a series isn't watched on a day.
 */
export function diaryEntries(a: LibraryArchive): DiaryEntry[] {
  const out: DiaryEntry[] = [];
  const ratings = a.ratings ?? {};
  const reactions = a.reactions ?? {};
  const reviews = a.reviews ?? {};

  for (const t of a.movies) {
    const id = t.movie.id;
    const key = `movie:${id}`;
    const rev = reviews[key];
    const watched = a.movieWatchedDates?.[String(id)] ?? (a.watchedMovies?.includes(id) ? t.modified : null);
    const when = rev?.watchedOn ?? (watched ? day(watched) : null);
    if (!when) continue;
    out.push({
      key,
      kind: "movie",
      day: when,
      href: `/movie/${id}`,
      poster: t.movie.poster_path,
      name: t.movie.title,
      released: year(t.movie.release_date),
      rating: ratings[key] ?? null,
      loved: reactions[key] === "loved",
      rewatch: rev?.rewatch ?? false,
      review: rev?.text || null,
      spoilers: rev?.spoilers ?? false,
    });
  }

  const shows = new Map(a.shows.map((s) => [s.show.id, s.show]));
  for (const ep of a.watched) {
    const m = /^(\d+)-(\d+)-(\d+)$/.exec(ep);
    if (!m) continue;
    const showID = Number(m[1]);
    const show = shows.get(showID);
    if (!show) continue;
    const when = a.watchedDates?.[ep];
    if (!when) continue;
    const key = `episode:${ep}`;
    const rev = reviews[key];
    out.push({
      key,
      kind: "episode",
      day: day(when),
      href: `/show/${showID}?season=${m[2]}`,
      poster: show.poster_path,
      name: `Episode ${m[3]}`,
      context: `${show.name} · S${m[2]} E${m[3]}`,
      released: year(show.first_air_date),
      rating: ratings[key] ?? null,
      loved: reactions[key] === "loved",
      rewatch: rev?.rewatch ?? false,
      review: rev?.text || null,
      spoilers: rev?.spoilers ?? false,
    });
  }

  return out.sort((x, y) => (x.day < y.day ? 1 : x.day > y.day ? -1 : 0));
}

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function monthLabel(d: string) {
  return `${MONTHS[Number(d.slice(5, 7)) - 1]} ${d.slice(0, 4)}`;
}

export function weekday(d: string) {
  return DAYS[new Date(`${d}T12:00:00Z`).getUTCDay()];
}
