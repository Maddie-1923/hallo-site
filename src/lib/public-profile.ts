import "server-only";
import type { LibraryArchive, Movie, Show } from "./archive";
import { genreNames, image } from "./tmdb";

// What a public profile page draws, worked out from a library. The page never
// sees the archive itself: only what is meant to be shared comes through here
// — titles, dates, ratings, hearts, reviews and lists. Notes, moods, tags,
// hidden shows and saved rails never do.
//
// Today this is fed from a library file for the local preview (see
// app/u/[username]/page.tsx). Once the public tables exist it is fed from
// those instead, and the page does not change.

export interface ProfileTitle {
  key: string;
  kind: "show" | "movie";
  title: string;
  href: string;
  poster: string | null;
  backdrop: string | null;
  year: string;
}

export interface DiaryEntry extends ProfileTitle {
  /** "YYYY-MM-DD". */
  date: string;
  /** "S2 E5", or "S2 E1–E6" for several on one day; absent for a film. */
  episodes?: string;
  rating: number | null;
  loved: boolean;
  rewatch: boolean;
}

export interface ReviewEntry extends ProfileTitle {
  text: string;
  date: string | null;
  rating: number | null;
  spoilers: boolean;
}

export interface ListEntry {
  id: string;
  name: string;
  detail: string | null;
  count: number;
  /** Up to four posters, for the stacked cover. */
  posters: (string | null)[];
}

export interface PublicProfileView {
  username: string;
  displayName: string;
  avatar: string | null;
  banner: string | null;
  bio: string | null;
  followers: number;
  following: number;
  stats: { films: number; shows: number; episodes: number; hours: number; ratings: number; average: number | null };
  topGenres: string[];
  favorites: ProfileTitle[];
  diary: DiaryEntry[];
  reviews: ReviewEntry[];
  lists: ListEntry[];
  /** Shown as a ribbon when the page is a preview rather than a real profile. */
  previewNote?: string;
}

function showTitle(s: Show): ProfileTitle {
  return {
    key: `s${s.id}`,
    kind: "show",
    title: s.name,
    href: `/show/${s.id}`,
    poster: image.poster(s.poster_path, "w342"),
    backdrop: image.backdrop(s.backdrop_path),
    year: (s.first_air_date ?? "").slice(0, 4),
  };
}

function movieTitle(m: Movie): ProfileTitle {
  return {
    key: `m${m.id}`,
    kind: "movie",
    title: m.title,
    href: `/movie/${m.id}`,
    poster: image.poster(m.poster_path, "w342"),
    backdrop: image.backdrop(m.backdrop_path),
    year: (m.release_date ?? "").slice(0, 4),
  };
}

/** A library read into a profile. `meta` is the profile's own dressing. */
export function profileFromArchive(
  a: LibraryArchive,
  meta: { username: string; displayName: string; avatar: string | null; banner: string | null; bio: string | null },
): PublicProfileView {
  const shows = new Map(a.shows.map((t) => [t.show.id, t.show]));
  const movies = new Map(a.movies.map((t) => [t.movie.id, t.movie]));
  const ratings = a.ratings ?? {};
  const reactions = a.reactions ?? {};
  const reviews = a.reviews ?? {};

  // The diary: every film with a watch date, and each show's episodes
  // grouped by the day they were watched.
  const diary: DiaryEntry[] = [];
  for (const [id, date] of Object.entries(a.movieWatchedDates ?? {})) {
    const m = movies.get(Number(id));
    if (!m) continue;
    const key = `movie:${m.id}`;
    diary.push({ ...movieTitle(m), date: date.slice(0, 10), rating: ratings[key] ?? null, loved: reactions[key] === "loved", rewatch: reviews[key]?.rewatch ?? false });
  }
  const byShowDay = new Map<string, { show: Show; date: string; eps: [number, number][] }>();
  for (const [ep, date] of Object.entries(a.watchedDates ?? {})) {
    const [sid, season, episode] = ep.split("-").map(Number);
    const show = shows.get(sid);
    if (!show) continue;
    const day = date.slice(0, 10);
    const k = `${sid}|${day}`;
    const g = byShowDay.get(k) ?? { show, date: day, eps: [] };
    g.eps.push([season, episode]);
    byShowDay.set(k, g);
  }
  for (const g of byShowDay.values()) {
    g.eps.sort((x, y) => x[0] - y[0] || x[1] - y[1]);
    const [f, l] = [g.eps[0], g.eps[g.eps.length - 1]];
    const label = g.eps.length === 1 ? `S${f[0]} E${f[1]}` : f[0] === l[0] ? `S${f[0]} E${f[1]}–E${l[1]}` : `S${f[0]} E${f[1]} – S${l[0]} E${l[1]}`;
    const key = `show:${g.show.id}`;
    diary.push({ ...showTitle(g.show), date: g.date, episodes: label, rating: ratings[key] ?? null, loved: reactions[key] === "loved", rewatch: false });
  }
  diary.sort((x, y) => y.date.localeCompare(x.date));

  const favorites: ProfileTitle[] = [];
  for (const [key, r] of Object.entries(reactions)) {
    if (r !== "loved") continue;
    const [kind, id] = key.split(":");
    if (kind === "show" && shows.get(Number(id))) favorites.push(showTitle(shows.get(Number(id))!));
    if (kind === "movie" && movies.get(Number(id))) favorites.push(movieTitle(movies.get(Number(id))!));
  }

  const reviewList: ReviewEntry[] = [];
  for (const [key, rv] of Object.entries(reviews)) {
    const [kind, id] = key.split(":");
    const t = kind === "show" ? (shows.get(Number(id)) ? showTitle(shows.get(Number(id))!) : null) : movies.get(Number(id)) ? movieTitle(movies.get(Number(id))!) : null;
    if (!t || !rv.text?.trim()) continue;
    reviewList.push({ ...t, text: rv.text, date: rv.watchedOn ?? rv.modified?.slice(0, 10) ?? null, rating: ratings[key] ?? null, spoilers: rv.spoilers ?? false });
  }
  reviewList.sort((x, y) => (y.date ?? "").localeCompare(x.date ?? ""));

  const order = new Map((a.customListOrder ?? []).map((id, i) => [id, i]));
  const lists: ListEntry[] = [...(a.customLists ?? [])]
    .sort((x, y) => (order.get(x.id) ?? 1e9) - (order.get(y.id) ?? 1e9))
    .map((l) => {
      const titles = [...(l.movieIDs ?? []).map((id) => movies.get(id)?.poster_path), ...(l.showIDs ?? []).map((id) => shows.get(id)?.poster_path)];
      return { id: l.id, name: l.name, detail: l.detail ?? null, count: titles.length, posters: titles.slice(0, 4).map((p) => image.poster(p, "w185")) };
    });

  // The genres that come up most across everything tracked, for the chips.
  const counts = new Map<string, number>();
  for (const t of [...a.shows.map((x) => x.show), ...a.movies.map((x) => x.movie)]) {
    for (const g of genreNames(t.genre_ids, 3)) counts.set(g, (counts.get(g) ?? 0) + 1);
  }
  const topGenres = [...counts.entries()].sort((x, y) => y[1] - x[1]).slice(0, 4).map(([g]) => g);

  const rated = Object.values(ratings);
  const films = new Set([...(a.watchedMovies ?? []), ...Object.keys(a.movieWatchedDates ?? {}).map(Number)]).size;
  const filmMinutes = a.movies.reduce((sum, t) => sum + (t.status === "Watched" ? (t.movie.runtime ?? 110) : 0), 0);
  // 42 minutes an episode: the app's own estimate, since the archive carries
  // no episode runtimes.
  const hours = Math.round((a.watched.length * 42 + filmMinutes) / 60);

  return {
    ...meta,
    followers: 0,
    following: 0,
    stats: {
      films,
      shows: a.shows.length,
      episodes: a.watched.length,
      hours,
      ratings: rated.length,
      average: rated.length ? Math.round((rated.reduce((x, y) => x + y, 0) / rated.length) * 10) / 10 : null,
    },
    topGenres,
    favorites,
    diary: diary.slice(0, 24),
    reviews: reviewList.slice(0, 12),
    lists,
  };
}
