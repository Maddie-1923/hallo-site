import "server-only";
import type { LibraryArchive, Movie, Show } from "./archive";
import { genreNames, image, seasonEpisodes, showDetail } from "./tmdb";
import type { SheetReview } from "@/components/ReviewSheet";

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
}

/**
 * One of the profile's categories, as the app's profile grid has them: the
 * eight it ships (Shows, Movies, Up to Date, Finished, On Hold, Stopped
 * Watching, Favorites, Rewatched), then every list the person made. The app's
 * code calls them shelves (`ProfileShelf`); on screen they are categories.
 */
export interface CategoryEntry {
  /** The app's key for it: "shows", "upToDate", "list:<id>" and so on. */
  id: string;
  name: string;
  /** A list's one line about itself. */
  detail?: string | null;
  /** Everything in it, for the sheet that opens from the tile. */
  titles: ProfileTitle[];
  /** The title whose picture the tile shows unless the owner picks another:
      the one added last. (A list doesn't record when each title joined it,
      so for a list it is the one most recently added to the library.) */
  latest?: string | null;
  /** The title the owner chose for the picture, by key. From the app, a
      list's poster cover is matched back to its title; an uploaded photo
      lives on the phone and doesn't travel. */
  chosen?: string | null;
  /** A list the person made, rather than one of the eight. */
  custom: boolean;
  /** Shown to the profile's owner and nobody else: On Hold and Stopped
      Watching, which say what someone set aside or gave up on. */
  ownerOnly?: boolean;
}

/** Something a member liked, for their profile's Likes tab. */
export interface LikedItem {
  key: string;
  kind: "review" | "list";
  /** The film's or series' title, or the list's name. */
  title: string;
  poster: string | null;
  href: string;
  /** Whose review or list it is. */
  owner: string;
}

/** A series in progress, for the profile's mini tracker. */
export interface TrackerShow extends ProfileTitle {
  /** Every episode they have watched, as "season-episode". */
  seen: string[];
  /** Episodes aired so far in each season, from TMDB, season 1 first; null
      until filled in. */
  aired: number[] | null;
  /** Episode names by "season-episode", for the season the next episode is
      in and the one after, so the row can name it as the app does. */
  episodeNames?: Record<string, string>;
  /** The episode the row is about when it isn't the next one (a skipped
      one, on the tracker's Skipped pile), as "season-episode". */
  focus?: string;
}

export interface PublicProfileView {
  username: string;
  displayName: string;
  avatar: string | null;
  banner: string | null;
  /** The line they wrote about themselves, shown in quotation marks. */
  bio: string | null;
  /** Where they say they are, as they wrote it ("San Francisco, CA"). */
  location: string | null;
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
  /** Only the categories with something in them; a visitor has no use for
      an empty tile. */
  categories: CategoryEntry[];
  /** Watch days for the calendar: "YYYY-MM-DD" → how many things watched. */
  activity: Record<string, number>;
  /** Every rating they have given, out of ten, for the spread chart. */
  ratingValues: number[];
  /** Their most-watched genres, with each one's share of the top five. */
  genres: { name: string; share: number }[];
  /** The mini tracker: series they are in the middle of, most recently
      watched first, and films on their watchlist, newest first. */
  tracker: { shows: TrackerShow[]; films: ProfileTitle[] };
  /** What they mean to watch: series tracked with nothing watched yet and
      films To Watch, newest added first. */
  watchlist?: ProfileTitle[];
  /** Watching now: every series marked Watching with something watched,
      last watched first, with its progress (filled like the tracker's). */
  watching?: (TrackerShow & { lastWatched: string | null })[];
  /** Present only when the person viewing is the profile's owner: what the
      Favourites editor offers first, their own library, best first. */
  owner?: { films: ProfileTitle[]; shows: ProfileTitle[] };
  /** Shown as a ribbon when the page is a preview rather than a real profile. */
  previewNote?: string;
  /** A private profile: visitors who don't follow them see only the card. */
  isPrivate?: boolean;
  /** For visitors, the tabs the owner has turned off (Settings → Privacy):
      "activity", "watchlog". */
  hiddenSections?: string[];
  /** For visitors: false when the owner doesn't let people follow them. */
  allowFollows?: boolean;
  /** For the owner: each category's eye as their account keeps it. */
  categoryPrivacy?: Record<string, boolean>;
  /** Whether the person viewing follows them (real profiles, signed in). */
  viewerFollow?: "none" | "pending" | "following" | "self";
  /** Reviews and lists they've liked, newest first. */
  liked?: LikedItem[];
}

export function showTitle(s: Show): ProfileTitle {
  return {
    key: `s${s.id}`,
    kind: "show",
    title: s.name,
    href: `/show/${s.id}`,
    poster: image.poster(s.poster_path, "w780"),
    backdrop: image.backdrop(s.backdrop_path),
    year: (s.first_air_date ?? "").slice(0, 4),
  };
}

export function movieTitle(m: Movie): ProfileTitle {
  return {
    key: `m${m.id}`,
    kind: "movie",
    title: m.title,
    href: `/movie/${m.id}`,
    poster: image.poster(m.poster_path, "w780"),
    backdrop: image.backdrop(m.backdrop_path),
    year: (m.release_date ?? "").slice(0, 4),
  };
}

/** A library read into a profile. `meta` is the profile's own dressing.
    `forOwner` adds what only the owner's own view needs (the Favourites
    editor's suggestions), which a visitor's page never carries. */
export function profileFromArchive(
  a: LibraryArchive,
  meta: { username: string; displayName: string; avatar: string | null; banner: string | null; bio: string | null; location: string | null },
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
    if (!rv.text?.trim()) continue;
    // A review of one episode: the series' picture, the episode's own page
    // and key ("e1396-1-2"), and which episode it is.
    if (kind === "episode") {
      const [sid, season, episode] = id.split("-").map(Number);
      const show = shows.get(sid);
      if (!show || !season || !episode) continue;
      reviewList.push({ ...showTitle(show), key: `e${sid}-${season}-${episode}`, href: `/show/${sid}/season/${season}/episode/${episode}`, episode: `S${season} E${episode}`, text: rv.text, date: rv.watchedOn ?? rv.modified?.slice(0, 10) ?? null, rating: ratings[key] ?? null, spoilers: rv.spoilers ?? false });
      continue;
    }
    const t = kind === "show" ? (shows.get(Number(id)) ? showTitle(shows.get(Number(id))!) : null) : movies.get(Number(id)) ? movieTitle(movies.get(Number(id))!) : null;
    if (!t) continue;
    reviewList.push({ ...t, text: rv.text, date: rv.watchedOn ?? rv.modified?.slice(0, 10) ?? null, rating: ratings[key] ?? null, spoilers: rv.spoilers ?? false });
  }
  reviewList.sort((x, y) => (y.date ?? "").localeCompare(x.date ?? ""));

  // On Hold and Stopped Watching never leave the server for anyone but the
  // owner, so a visitor's page can't reveal them.
  const categories = categoriesFromArchive(a).filter((c) => forOwner || !c.ownerOnly);

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

  // The watchlist: the app's Ready to start (a series you're tracking with
  // nothing watched) and films still To Watch, newest added first.
  const started = new Set(a.watched.filter((k) => !/-0-\d+$/.test(k)).map((k) => Number(k.split("-")[0])));
  const watchlist = [
    ...a.shows.filter((t) => t.status === "Watching" && !started.has(t.show.id)).map((t) => ({ t: showTitle(t.show), added: t.added ?? "" })),
    ...a.movies.filter((t) => t.status === "To Watch").map((t) => ({ t: movieTitle(t.movie), added: t.added ?? "" })),
  ]
    .sort((x, y) => y.added.localeCompare(x.added))
    .map((x) => x.t);

  // Watching now: every series in progress, the tracker's rule without its
  // cap of seven (forty, for the TMDB asks behind the progress bars).
  const watching = a.shows
    .filter((t) => t.status === "Watching" && started.has(t.show.id))
    .sort((x, y) => (lastWatched.get(y.show.id) ?? "").localeCompare(lastWatched.get(x.show.id) ?? ""))
    .slice(0, 40)
    .map((t) => ({ ...showTitle(t.show), seen: seenBy.get(t.show.id) ?? [], aired: null, lastWatched: lastWatched.get(t.show.id)?.slice(0, 10) ?? null }));

  return {
    ...meta,
    owner,
    tracker,
    watchlist,
    watching,
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
    categories,
  };
}

/**
 * Fills in how many episodes of each tracked series have aired, season by
 * season, which needs TMDB: one request a show, cached for an hour like every
 * other TMDB call. With it the tracker can say what is up next and how far
 * along they are.
 */
export async function withAiredEpisodes(view: PublicProfileView): Promise<PublicProfileView> {
  const [shows, watching] = await Promise.all([fillAired(view.tracker.shows), view.watching ? fillAired(view.watching) : Promise.resolve(undefined)]);
  return { ...view, tracker: { ...view.tracker, shows }, watching: watching as PublicProfileView["watching"] };
}

/** The same, for any list of series (the full tracker page's piles). */
export async function fillAired(list: TrackerShow[]): Promise<TrackerShow[]> {
  return Promise.all(
    list.map(async (t) => {
      const d = await showDetail(Number(t.key.slice(1)));
      const last = d?.lastEpisode;
      if (!d || !last) return t;
      const aired = d.seasons
        .filter((x) => x.season_number > 0 && x.season_number <= last.season_number)
        .sort((x, y) => x.season_number - y.season_number)
        .map((x) => (x.season_number === last.season_number ? last.episode_number : x.episode_count));
      // The names for the next episode's season and the one after it (a
      // check-off on the page can carry the row into the next season).
      const seen = new Set(t.seen);
      const lastSeen = Math.max(0, ...t.seen.map((k) => Number(k.split("-")[0])));
      let season = aired.findIndex((n, i) => i + 1 >= lastSeen && Array.from({ length: n }, (_, e) => `${i + 1}-${e + 1}`).some((k) => !seen.has(k))) + 1;
      if (season < 1) season = Math.max(1, lastSeen);
      const episodeNames: Record<string, string> = {};
      for (const n of [season, season + 1].filter((x) => x <= aired.length)) {
        for (const e of await seasonEpisodes(Number(t.key.slice(1)), n)) episodeNames[`${n}-${e.episode_number}`] = e.name;
      }
      return { ...t, aired, episodeNames };
    }),
  );
}

/** A person's review of one title, for its own page and link preview: from
    their reviews, or else from a Watchlog entry that carries one. */
export function reviewFor(view: PublicProfileView, key: string): SheetReview | null {
  const r = view.reviews.find((x) => x.key === key);
  if (r) return { ...r, episodes: r.episode };
  const e = view.diary.find((x) => x.key === key && x.review);
  return e ? { ...e, ...e.review! } : null;
}

/**
 * The categories, in the app's own order (`ProfileShelf.builtIns`, then the
 * lists in the order the person set). Up to Date needs TMDB to know what has
 * aired, so it is added afterwards by `withUpToDate`; it sits third.
 */
function categoriesFromArchive(a: LibraryArchive): CategoryEntry[] {
  const shows = new Map(a.shows.map((t) => [t.show.id, t.show]));
  const movies = new Map(a.movies.map((t) => [t.movie.id, t.movie]));
  const reactions = a.reactions ?? {};
  const byShowStatus = (st: string) => a.shows.filter((t) => t.status === st).map((t) => showTitle(t.show));
  const byMovieStatus = (st: string) => a.movies.filter((t) => t.status === st).map((t) => movieTitle(t.movie));
  const unique = (xs: ProfileTitle[]) => xs.filter((x, i) => xs.findIndex((y) => y.key === x.key) === i);

  // A loved or rewatched episode is drawn by its show's poster here.
  const episodeShow = (episodeID: string) => shows.get(Number(episodeID.split("-")[0]));
  const lovedEpisodes = Object.entries(reactions)
    .filter(([k, r]) => r === "loved" && k.startsWith("episode:"))
    .map(([k]) => episodeShow(k.slice(8)))
    .filter((x): x is Show => !!x)
    .map(showTitle);
  type Tick = { watched: string; movieID?: number; episodeID?: string };
  const newestFirst = (xs: Tick[]) => [...xs].sort((x, y) => y.watched.localeCompare(x.watched));
  const rewatchedMovies = newestFirst((a.movieRewatchLog as Tick[] | undefined) ?? [])
    .map((t) => movies.get(t.movieID!))
    .filter((x): x is Movie => !!x)
    .map(movieTitle);
  const rewatchedEpisodes = newestFirst((a.rewatchLog as Tick[] | undefined) ?? [])
    .map((t) => episodeShow(t.episodeID ?? ""))
    .filter((x): x is Show => !!x)
    .map(showTitle);

  const builtIns: CategoryEntry[] = [
    { id: "shows", name: "Shows", custom: false, titles: a.shows.map((t) => showTitle(t.show)) },
    { id: "movies", name: "Movies", custom: false, titles: a.movies.map((t) => movieTitle(t.movie)) },
    { id: "finished", name: "Finished", custom: false, titles: [...byShowStatus("Finished"), ...byMovieStatus("Watched")] },
    { id: "onHold", name: "On Hold", custom: false, ownerOnly: true, titles: [...byShowStatus("Stopped"), ...byMovieStatus("On Hold")] },
    { id: "didNotFinish", name: "Stopped Watching", custom: false, ownerOnly: true, titles: [...byShowStatus("Dropped"), ...byMovieStatus("Dropped")] },
    {
      id: "favorites",
      name: "Favorites",
      custom: false,
      titles: unique([...a.shows.filter((t) => reactions[`show:${t.show.id}`] === "loved").map((t) => showTitle(t.show)), ...a.movies.filter((t) => reactions[`movie:${t.movie.id}`] === "loved").map((t) => movieTitle(t.movie)), ...lovedEpisodes]),
    },
    { id: "rewatched", name: "Rewatched", custom: false, titles: unique([...rewatchedMovies, ...rewatchedEpisodes]) },
  ];

  const order = new Map((a.customListOrder ?? []).map((id, i) => [id, i]));
  const lists: CategoryEntry[] = [...(a.customLists ?? [])]
    .sort((x, y) => (order.get(x.id) ?? 1e9) - (order.get(y.id) ?? 1e9))
    .map((l) => {
      const cover = (l as { cover?: { poster?: { _0?: string } } }).cover?.poster?._0;
      const coverTitle = cover ? [...(l.showIDs ?? []).map((id) => shows.get(id)), ...(l.movieIDs ?? []).map((id) => movies.get(id))].find((x) => x?.poster_path === cover) : undefined;
      return {
        id: `list:${l.id}`,
        name: l.name,
        detail: l.detail ?? null,
        custom: true,
        chosen: coverTitle ? ("name" in coverTitle ? `s${coverTitle.id}` : `m${coverTitle.id}`) : null,
        titles: [...(l.showIDs ?? []).map((id) => shows.get(id)), ...(l.movieIDs ?? []).map((id) => movies.get(id))]
          .filter((x): x is Show | Movie => !!x)
          .map((x) => ("name" in x ? showTitle(x) : movieTitle(x))),
      };
    });
  // The last added of each, for its tile's picture. The library's own
  // "added" stamp decides; Rewatched is already newest night first.
  const added = new Map<string, string>([...a.shows.map((t) => [`s${t.show.id}`, t.added ?? t.modified ?? ""] as const), ...a.movies.map((t) => [`m${t.movie.id}`, t.added ?? t.modified ?? ""] as const)]);
  const latest = (c: CategoryEntry) =>
    c.id === "rewatched" ? c.titles[0]?.key : [...c.titles].sort((x, y) => (added.get(y.key) ?? "").localeCompare(added.get(x.key) ?? ""))[0]?.key;
  return [...builtIns, ...lists].filter((c) => c.titles.length > 0).map((c) => ({ ...c, latest: latest(c) ?? null }));
}

/**
 * Adds Up to Date: the series they are watching and have seen everything of
 * that has aired (skipped episodes count as dealt with, as in the app). One
 * TMDB request a series, cached for an hour.
 */
export async function withUpToDate(view: PublicProfileView, a: LibraryArchive): Promise<PublicProfileView> {
  const done = new Set([...a.watched, ...(a.skipped ?? [])]);
  const upToDate = (
    await Promise.all(
      a.shows
        .filter((t) => t.status === "Watching")
        .map(async (t) => {
          const d = await showDetail(t.show.id);
          const last = d?.lastEpisode;
          if (!d || !last) return null;
          let aired = 0;
          let seen = 0;
          for (const season of d.seasons) {
            const n = season.season_number;
            if (n < 1 || n > last.season_number) continue;
            const count = n === last.season_number ? last.episode_number : season.episode_count;
            aired += count;
            for (let e = 1; e <= count; e++) if (done.has(`${t.show.id}-${n}-${e}`)) seen++;
          }
          return aired > 0 && seen >= aired ? showTitle(t.show) : null;
        }),
    )
  ).filter((x): x is ProfileTitle => !!x);
  if (upToDate.length === 0) return view;
  const categories = [...view.categories];
  // Third, after Shows and Movies, where the app puts it.
  const at = categories.findIndex((c) => c.id !== "shows" && c.id !== "movies");
  const added = new Map(a.shows.map((t) => [`s${t.show.id}`, t.added ?? t.modified ?? ""]));
  const latest = [...upToDate].sort((x, y) => (added.get(y.key) ?? "").localeCompare(added.get(x.key) ?? ""))[0]?.key ?? null;
  categories.splice(at < 0 ? categories.length : at, 0, { id: "upToDate", name: "Up to Date", custom: false, titles: upToDate, latest });
  return { ...view, categories };
}
