import "server-only";
import type { LibraryArchive, MovieStatus, WatchStatus } from "@/lib/archive";
import { genreNames, image } from "@/lib/tmdb";

// The Library page's titles (/library): everything tracked, series and
// films, with what its tools sort and filter on. Built on the server from
// the person's own library (or the preview's).
export interface LibraryItem {
  key: string;
  kind: "show" | "movie";
  id: number;
  title: string;
  href: string;
  poster: string | null;
  year: string;
  genres: string[];
  status: WatchStatus | MovieStatus;
  /** When it was added, for "Recently added". */
  added: string | null;
  /** The last day anything of it was watched, for Default. */
  lastWatched: string | null;
  /** Series: episodes ticked off. */
  episodes?: number;
}

export function libraryItems(a: LibraryArchive): LibraryItem[] {
  const last = new Map<number, string>();
  const count = new Map<number, number>();
  for (const k of a.watched) {
    const sid = Number(k.split("-")[0]);
    count.set(sid, (count.get(sid) ?? 0) + 1);
  }
  for (const [k, d] of Object.entries(a.watchedDates ?? {})) {
    const sid = Number(k.split("-")[0]);
    if ((last.get(sid) ?? "") < d) last.set(sid, d);
  }
  const shows: LibraryItem[] = a.shows.map((t) => ({
    key: `s${t.show.id}`,
    kind: "show",
    id: t.show.id,
    title: t.show.name,
    href: `/show/${t.show.id}`,
    poster: image.poster(t.show.poster_path, "w342"),
    year: (t.show.first_air_date ?? "").slice(0, 4),
    genres: genreNames(t.show.genre_ids, 6),
    status: t.status,
    added: t.added ?? null,
    lastWatched: last.get(t.show.id)?.slice(0, 10) ?? null,
    episodes: count.get(t.show.id) ?? 0,
  }));
  const movies: LibraryItem[] = a.movies.map((t) => ({
    key: `m${t.movie.id}`,
    kind: "movie",
    id: t.movie.id,
    title: t.movie.title,
    href: `/movie/${t.movie.id}`,
    poster: image.poster(t.movie.poster_path, "w342"),
    year: (t.movie.release_date ?? "").slice(0, 4),
    genres: genreNames(t.movie.genre_ids, 6),
    status: t.status,
    added: t.added ?? null,
    lastWatched: a.movieWatchedDates?.[String(t.movie.id)]?.slice(0, 10) ?? null,
  }));
  return [...shows, ...movies];
}
