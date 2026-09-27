import "server-only";
import type { LibraryArchive, Movie, Show } from "./archive";
import { genreNames, image, showDetail } from "./tmdb";

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
  /** How many episodes the entry covers; absent for a film. */
  episodeCount?: number;
  rating: number | null;
  loved: boolean;
  rewatch: boolean;
  /** Whether they wrote a review of the title. */
  reviewed: boolean;
  /** The review itself, read in a sheet from the Watchlog's Review column. */
  review?: DiaryReview;
  /** A made-up entry on the local preview. Not shown on the page (the user
      wants the mock-ups to read as real); kept so they can be found and
      removed before opening. */
  sample?: boolean;
}

export interface DiaryReview {
  text: string;
  spoilers: boolean;
  likes?: number;
  comments?: number;
}

export interface ReviewEntry extends ProfileTitle {
  text: string;
  date: string | null;
  rating: number | null;
  spoilers: boolean;
  /** For a review of one episode: "S2 E4", and the episode's own title. */
  episode?: string;
  episodeTitle?: string;
  rewatch?: boolean;
  loved?: boolean;
  likes?: number;
  comments?: number;
  /** A made-up review on the local preview. Not shown on the page (the user
      wants the mock-ups to read as real); kept so they can be found and
      removed before opening. */
  sample?: boolean;
}

export interface ListEntry {
  id: string;
  name: string;
  detail: string | null;
  count: number;
  /** Up to four posters, for the stacked cover. */
  posters: (string | null)[];
}

/** A series in progress, for the profile's mini tracker. */
export interface TrackerShow extends ProfileTitle {
  /** Every episode they have watched, as "season-episode". */
  seen: string[];
  /** Episodes aired so far in each season, from TMDB, season 1 first; null
      until filled in. */
  aired: number[] | null;
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
  /** Top five of each, hearts first by rating, topped up with the highest
      rated when there are fewer than five hearts. */
  topFilms: ProfileTitle[];
  topShows: ProfileTitle[];
  diary: DiaryEntry[];
  reviews: ReviewEntry[];
  lists: ListEntry[];
  /** Watch days for the calendar: "YYYY-MM-DD" → how many things watched. */
  activity: Record<string, number>;
  /** Every rating they have given, out of ten, for the spread chart. */
  ratingValues: number[];
  /** Their most-watched genres, with each one's share of the top five. */
  genres: { name: string; share: number }[];
  /** The mini tracker: series they are in the middle of, most recently
      watched first, and films on their watchlist, newest first. */
  tracker: { shows: TrackerShow[]; films: ProfileTitle[] };
  /** Present only when the person viewing is the profile's owner: what the
      Favourites editor offers first, their own library, best first. */
  owner?: { films: ProfileTitle[]; shows: ProfileTitle[] };
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

/** A library read into a profile. `meta` is the profile's own dressing.
    `forOwner` adds what only the owner's own view needs (the Favourites
    editor's suggestions), which a visitor's page never carries. */
export function profileFromArchive(
  a: LibraryArchive,
  meta: { username: string; displayName: string; avatar: string | null; banner: string | null; bio: string | null },
  forOwner = false,
): PublicProfileView {
  const shows = new Map(a.shows.map((t) => [t.show.id, t.show]));
  const movies = new Map(a.movies.map((t) => [t.movie.id, t.movie]));
  const ratings = a.ratings ?? {};
  const reactions = a.reactions ?? {};
  const reviews = a.reviews ?? {};
  const reviewOf = (key: string): DiaryReview | undefined => (reviews[key]?.text?.trim() ? { text: reviews[key].text!, spoilers: reviews[key].spoilers ?? false } : undefined);

  // The diary: every film with a watch date, and each show's episodes
  // grouped by the day they were watched.
  const diary: DiaryEntry[] = [];
  for (const [id, date] of Object.entries(a.movieWatchedDates ?? {})) {
    const m = movies.get(Number(id));
    if (!m) continue;
    const key = `movie:${m.id}`;
    diary.push({ ...movieTitle(m), date: date.slice(0, 10), rating: ratings[key] ?? null, loved: reactions[key] === "loved", rewatch: reviews[key]?.rewatch ?? false, reviewed: !!reviews[key]?.text?.trim(), review: reviewOf(key) });
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
    diary.push({ ...showTitle(g.show), date: g.date, episodes: label, episodeCount: g.eps.length, rating: ratings[key] ?? null, loved: reactions[key] === "loved", rewatch: false, reviewed: !!reviews[key]?.text?.trim(), review: reviewOf(key) });
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

  // A day counts once per film and once per episode watched on it.
  const activity: Record<string, number> = {};
  for (const d of [...Object.values(a.movieWatchedDates ?? {}), ...Object.values(a.watchedDates ?? {})]) {
    const day = d.slice(0, 10);
    activity[day] = (activity[day] ?? 0) + 1;
  }

  // Genres across everything tracked, a show counted once however many
  // episodes, so a long-running sitcom doesn't drown everything else.
  const genreCount = new Map<string, number>();
  for (const t of [...a.shows.map((x) => x.show), ...a.movies.map((x) => x.movie)]) {
    for (const g of genreNames(t.genre_ids, 3)) genreCount.set(g, (genreCount.get(g) ?? 0) + 1);
  }
  const topG = [...genreCount.entries()].sort((x, y) => y[1] - x[1]).slice(0, 5);
  const topTotal = topG.reduce((n, [, c]) => n + c, 0) || 1;
  const genres = topG.map(([name, c]) => ({ name, share: c / topTotal }));

  const rated = Object.values(ratings);
  const films = new Set([...(a.watchedMovies ?? []), ...Object.keys(a.movieWatchedDates ?? {}).map(Number)]).size;
  const filmMinutes = a.movies.reduce((sum, t) => sum + (t.status === "Watched" ? (t.movie.runtime ?? 110) : 0), 0);
  // 42 minutes an episode: the app's own estimate, since the archive carries
  // no episode runtimes.
  const hours = Math.round((a.watched.length * 42 + filmMinutes) / 60);

  // The owner's library, hearts first, then by rating, then by name: what the
  // Favourites picker offers before anything is searched.
  const byLiking = (kind: "show" | "movie") => (x: { id: number; name?: string; title?: string }, y: { id: number; name?: string; title?: string }) => {
    const k = (t: { id: number }) => `${kind}:${t.id}`;
    const loved = (t: { id: number }) => (reactions[k(t)] === "loved" ? 1 : 0);
    return loved(y) - loved(x) || (ratings[k(y)] ?? 0) - (ratings[k(x)] ?? 0) || (x.name ?? x.title ?? "").localeCompare(y.name ?? y.title ?? "");
  };
  const owner = forOwner
    ? {
        films: a.movies.map((t) => t.movie).sort(byLiking("movie")).map(movieTitle),
        shows: a.shows.map((t) => t.show).sort(byLiking("show")).map(showTitle),
      }
    : undefined;

  // The mini tracker. Series marked Watching, ordered by the last day an
  // episode of each was logged; films still To Watch, newest added first.
  const lastWatched = new Map<number, string>();
  const seenBy = new Map<number, string[]>();
  for (const [ep, date] of Object.entries(a.watchedDates ?? {})) {
    const [sid, season, episode] = ep.split("-").map(Number);
    if (season === 0) continue;
    if ((lastWatched.get(sid) ?? "") < date) lastWatched.set(sid, date);
    seenBy.set(sid, [...(seenBy.get(sid) ?? []), `${season}-${episode}`]);
  }
  const tracker = {
    shows: a.shows
      .filter((t) => t.status === "Watching")
      .sort((x, y) => (lastWatched.get(y.show.id) ?? "").localeCompare(lastWatched.get(x.show.id) ?? ""))
      .slice(0, 7)
      .map((t): TrackerShow => ({ ...showTitle(t.show), seen: seenBy.get(t.show.id) ?? [], aired: null })),
    films: a.movies
      .filter((t) => t.status === "To Watch")
      .sort((x, y) => (y.added ?? "").localeCompare(x.added ?? ""))
      .slice(0, 7)
      .map((t) => movieTitle(t.movie)),
  };

  return {
    ...meta,
    owner,
    tracker,
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
    topFilms: top("movie"),
    topShows: top("show"),
    activity,
    ratingValues: rated,
    genres,
    // The whole diary: the page shows it a year at a time.
    diary,
    reviews: reviewList.slice(0, 12),
    lists,
  };
}

/**
 * Fills in how many episodes of each tracked series have aired, season by
 * season, which needs TMDB: one request a show, cached for an hour like every
 * other TMDB call. With it the tracker can say what is up next and how far
 * along they are.
 */
export async function withAiredEpisodes(view: PublicProfileView): Promise<PublicProfileView> {
  const shows = await Promise.all(
    view.tracker.shows.map(async (t) => {
      const d = await showDetail(Number(t.key.slice(1)));
      const last = d?.lastEpisode;
      if (!d || !last) return t;
      const aired = d.seasons
        .filter((x) => x.season_number > 0 && x.season_number <= last.season_number)
        .sort((x, y) => x.season_number - y.season_number)
        .map((x) => (x.season_number === last.season_number ? last.episode_number : x.episode_count));
      return { ...t, aired };
    }),
  );
  return { ...view, tracker: { ...view.tracker, shows } };
}
