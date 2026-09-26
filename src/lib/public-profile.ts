import "server-only";
import type { LibraryArchive, Movie, Show } from "./archive";
import { image, showDetail } from "./tmdb";

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

/** The series somebody is in the middle of, with how far along they are. */
export interface NowWatching extends ProfileTitle {
  /** The last episode they watched, "S3 E4", and when. */
  lastSeen: string;
  lastDate: string;
  /** The next aired episode they haven't seen, or null when caught up. */
  next: string | null;
  watched: number;
  /** Episodes aired so far, from TMDB; null when TMDB didn't answer. */
  aired: number | null;
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
  favorites: ProfileTitle[];
  nowWatching: NowWatching | null;
  /** Top five of each, hearts first by rating, topped up with the highest
      rated when there are fewer than five hearts. */
  topFilms: ProfileTitle[];
  topShows: ProfileTitle[];
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

  // Top five of each kind: the hearts, highest rated first, then — if there
  // are fewer than five hearts — the best of what else they rated 7 or over,
  // so the row isn't half empty for somebody who rates more than they heart.
  const top = (kind: "show" | "movie") => {
    const ids = kind === "show" ? [...shows.keys()] : [...movies.keys()];
    const rate = (id: number) => ratings[`${kind}:${id}`] ?? 0;
    const loved = ids.filter((id) => reactions[`${kind}:${id}`] === "loved").sort((x, y) => rate(y) - rate(x));
    const extra = ids.filter((id) => !loved.includes(id) && rate(id) >= 7).sort((x, y) => rate(y) - rate(x));
    return [...loved, ...extra].slice(0, 5).map((id) => (kind === "show" ? showTitle(shows.get(id)!) : movieTitle(movies.get(id)!)));
  };

  // What they are watching now: of the shows marked Watching, the one with
  // the most recent episode logged, and the last episode they saw of it.
  let nowWatching: NowWatching | null = null;
  for (const t of a.shows) {
    if (t.status !== "Watching") continue;
    let last: { s: number; e: number; date: string } | null = null;
    let watched = 0;
    for (const [ep, date] of Object.entries(a.watchedDates ?? {})) {
      const [sid, season, episode] = ep.split("-").map(Number);
      if (sid !== t.show.id || season === 0) continue;
      watched++;
      if (!last || date > last.date || (date === last.date && (season > last.s || (season === last.s && episode > last.e)))) last = { s: season, e: episode, date };
    }
    if (!last) continue;
    if (!nowWatching || last.date > nowWatching.lastDate) {
      nowWatching = { ...showTitle(t.show), lastSeen: `S${last.s} E${last.e}`, lastDate: last.date, next: null, watched, aired: null };
    }
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
    favorites,
    nowWatching,
    topFilms: top("movie"),
    topShows: top("show"),
    diary: diary.slice(0, 24),
    reviews: reviewList.slice(0, 12),
    lists,
  };
}

/**
 * Fills in how far along "now watching" is, which needs the show's aired
 * episodes from TMDB: episodes aired so far, and the next one they haven't
 * seen. One request, cached for an hour like every other TMDB call.
 */
export async function withProgress(view: PublicProfileView, watchedKeys: string[]): Promise<PublicProfileView> {
  const now = view.nowWatching;
  if (!now) return view;
  const id = Number(now.key.slice(1));
  const d = await showDetail(id);
  const lastAired = d?.lastEpisode;
  if (!d || !lastAired) return view;
  const seasons = d.seasons.filter((x) => x.season_number > 0).sort((x, y) => x.season_number - y.season_number);
  const aired = seasons.filter((x) => x.season_number < lastAired.season_number).reduce((n, x) => n + x.episode_count, 0) + lastAired.episode_number;
  const seen = new Set(watchedKeys.filter((k) => k.startsWith(`${id}-`)));
  // Up next is the first unseen aired episode after the one they last
  // watched, which is where they will pick up; an older gap they skipped is
  // only offered when there is nothing unseen after it.
  const [ls, le] = now.lastSeen.slice(1).split(" E").map(Number);
  const aired_: [number, number][] = [];
  for (const x of seasons) {
    const count = x.season_number < lastAired.season_number ? x.episode_count : x.season_number === lastAired.season_number ? lastAired.episode_number : 0;
    for (let e = 1; e <= count; e++) aired_.push([x.season_number, e]);
  }
  const unseen = aired_.filter(([sn, e]) => !seen.has(`${id}-${sn}-${e}`));
  const after = unseen.find(([sn, e]) => sn > ls || (sn === ls && e > le));
  const pick = after ?? unseen[0];
  const next = pick ? `S${pick[0]} E${pick[1]}` : null;
  return { ...view, nowWatching: { ...now, aired, next } };
}
