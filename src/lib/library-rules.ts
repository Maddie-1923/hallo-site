import type { LibraryArchive, Movie, Show } from "./archive";

// The app's own rules for a tick, a skip and a watched film, as plain
// functions on the archive (the website's actions in library-actions.ts
// apply them). They match kodigo/Library.swift toggleWatched, toggleSkipped
// and setMovieWatched, and the merge in LibraryArchive.swift depends on them:
// a check or uncheck moves the episode's watchedStamps entry, a skip carries
// a date and no stamp, and the two can never both be true.

/** Ticks or unticks an episode ("showID-season-episode"). */
export function applyEpisodeWatched(a: LibraryArchive, key: string, watched: boolean, stamp: string) {
  const set = new Set(a.watched);
  a.watchedDates ??= {};
  a.watchedStamps ??= {};
  if (watched) {
    set.add(key);
    // First viewing date is never rewritten.
    a.watchedDates[key] ??= stamp;
    // Watching settles a skip the other way.
    a.skipped = (a.skipped ?? []).filter((k) => k !== key);
    if (a.skippedDates) delete a.skippedDates[key];
  } else {
    set.delete(key);
    delete a.watchedDates[key];
  }
  // The stamp moves either way: present in stamps and absent from watched is
  // how an uncheck survives a merge.
  a.watchedStamps[key] = stamp;
  a.watched = [...set];
  const showID = Number(key.split("-")[0]);
  const tracked = a.shows.find((s) => s.show.id === showID);
  if (tracked) tracked.modified = stamp;
}

/** Skips an episode (or takes the skip back). Skipping a watched episode
    unticks it, with a stamp so the untick travels. As in the app, an unskip
    doesn't travel: the merge unions skips so one can never go missing. */
export function applyEpisodeSkipped(a: LibraryArchive, key: string, skipped: boolean, stamp: string) {
  const set = new Set(a.skipped ?? []);
  a.skippedDates ??= {};
  if (skipped) {
    set.add(key);
    a.skippedDates[key] = stamp;
    if (a.watched.includes(key)) {
      a.watched = a.watched.filter((k) => k !== key);
      a.watchedDates ??= {};
      delete a.watchedDates[key];
      a.watchedStamps ??= {};
      a.watchedStamps[key] = stamp;
    }
  } else {
    set.delete(key);
    delete a.skippedDates[key];
  }
  a.skipped = [...set];
}

/** A film watched now: recorded in watchedMovies (which outlives removing
    it), dated, and its tracked copy moved to Watched from any status. */
export function applyMovieWatched(a: LibraryArchive, id: number, stamp: string) {
  a.watchedMovies ??= [];
  a.movieWatchedDates ??= {};
  if (!a.watchedMovies.includes(id)) a.watchedMovies.push(id);
  a.movieWatchedDates[String(id)] = stamp;
  const tracked = a.movies.find((m) => m.movie.id === id);
  if (tracked) {
    tracked.status = "Watched";
    tracked.modified = stamp;
  }
}

// ---- Your take (a rating, moods, tags, a review, a private note) ----

/** What "Your take" on a title's page is about. */
export type TakeTarget = { kind: "movie"; movie: Movie } | { kind: "show"; show: Show } | { kind: "episode"; show: Show; season: number; episode: number };

export interface TakeInput {
  rating: number | null;
  /** The app's mood ids ("lovedIt", …), at most three. */
  moods: string[];
  tags: string[];
  text: string;
  spoilers: boolean;
  /** "YYYY-MM-DD", or empty. */
  watchedOn: string;
  rewatch: boolean;
  /** Private: never leaves the owner's library (the public copy drops it). */
  note: string;
}

export const MOOD_IDS = ["lovedIt", "hatedIt", "likedIt", "sad", "onEdge", "boring", "frustrated", "disappointed", "hot", "shocked", "scared", "confused"];
/** Library.tagLimit. */
export const TAG_LIMIT = 12;

export const takeKey = (t: TakeTarget) => (t.kind === "movie" ? `movie:${t.movie.id}` : t.kind === "show" ? `show:${t.show.id}` : `episode:${t.show.id}-${t.season}-${t.episode}`);

/** What the library holds for a title, in the form the page edits. */
export function readTake(a: LibraryArchive, key: string): TakeInput | null {
  const review = a.reviews?.[key];
  const take: TakeInput = {
    rating: a.ratings?.[key] ?? null,
    moods: a.moods?.[key] ?? [],
    tags: a.tags?.[key] ?? [],
    text: review?.text ?? "",
    spoilers: !!review?.spoilers,
    watchedOn: review?.watchedOn ?? "",
    rewatch: !!review?.rewatch,
    note: a.notes?.[key] ?? "",
  };
  const empty = take.rating == null && !take.moods.length && !take.tags.length && !take.text && !take.watchedOn && !take.note;
  return empty ? null : take;
}

function tracked(a: LibraryArchive, t: TakeTarget, stamp: string, filmStatus?: "Watched") {
  if (t.kind === "movie") {
    const m = a.movies.find((x) => x.movie.id === t.movie.id);
    if (m) {
      if (filmStatus) m.status = filmStatus;
      m.modified = stamp;
    } else a.movies.push({ movie: t.movie, status: filmStatus ?? "To Watch", modified: stamp, added: stamp });
    a.movieTombstones = (a.movieTombstones ?? []).filter((x) => x.id !== t.movie.id);
  } else {
    const s = a.shows.find((x) => x.show.id === t.show.id);
    if (s) s.modified = stamp;
    else a.shows.push({ show: t.show, status: "Watching", modified: stamp, added: stamp });
    a.showTombstones = (a.showTombstones ?? []).filter((x) => x.id !== t.show.id);
  }
}

/** Takes the whole of someone's take off a title: review, rating, moods,
    heart, tags and note. What they watched stays watched. */
export function clearTake(a: LibraryArchive, t: TakeTarget, stamp: string) {
  const key = takeKey(t);
  for (const store of [a.reviews, a.ratings, a.moods, a.tags, a.notes]) if (store) delete (store as Record<string, unknown>)[key];
  if (a.reactions?.[key] === "loved") delete a.reactions[key];
  if (t.kind === "movie" ? a.movies.some((x) => x.movie.id === t.movie.id) : a.shows.some((x) => x.show.id === t.show.id)) tracked(a, t, stamp);
}

/** Saves a take with the app's rules (Library.swift setNote, addTag,
    setMood, the review and the heart) and logs the watch: a film goes to
    Watched on the day given (the first watch date is never rewritten), a
    series is tracked, an episode is ticked. Everything empty clears it. */
export function applyTake(a: LibraryArchive, t: TakeTarget, input: TakeInput, stamp: string) {
  const key = takeKey(t);
  const text = input.text.trim().slice(0, 10_000);
  const day = /^\d{4}-\d{2}-\d{2}$/.test(input.watchedOn) ? input.watchedOn : "";
  const moods = [...new Set(input.moods.filter((m) => MOOD_IDS.includes(m)))].slice(0, 3);
  const tags: string[] = [];
  for (const raw of input.tags) {
    const tag = raw.trim().slice(0, 40);
    if (tag && tags.length < TAG_LIMIT && !tags.some((x) => x.toLowerCase() === tag.toLowerCase())) tags.push(tag);
  }
  const note = input.note.trim().slice(0, 10_000);
  const rating = input.rating == null ? null : Math.max(0.5, Math.min(10, Math.round(input.rating * 2) / 2));
  if (!text && !day && rating == null && !moods.length && !tags.length && !note) return clearTake(a, t, stamp);

  a.reviews ??= {};
  if (text || day) a.reviews[key] = { text, watchedOn: day || undefined, rewatch: input.rewatch || undefined, spoilers: (text && input.spoilers) || undefined, modified: stamp };
  else delete a.reviews[key];
  a.ratings ??= {};
  if (rating == null) delete a.ratings[key];
  else a.ratings[key] = rating;
  a.moods ??= {};
  if (moods.length) a.moods[key] = moods;
  else delete a.moods[key];
  // The heart and the Loved it mood are one statement (setLoved's rule).
  a.reactions ??= {};
  if (moods.includes("lovedIt")) a.reactions[key] = "loved";
  else if (a.reactions[key] === "loved") delete a.reactions[key];
  a.tags ??= {};
  if (tags.length) a.tags[key] = tags;
  else delete a.tags[key];
  a.notes ??= {};
  if (note) a.notes[key] = note;
  else delete a.notes[key];

  if (t.kind === "movie") {
    tracked(a, t, stamp, "Watched");
    a.watchedMovies ??= [];
    a.movieWatchedDates ??= {};
    if (!a.watchedMovies.includes(t.movie.id)) a.watchedMovies.push(t.movie.id);
    a.movieWatchedDates[String(t.movie.id)] ??= day ? `${day}T12:00:00Z` : stamp;
  } else {
    tracked(a, t, stamp);
    if (t.kind === "episode") {
      const ep = `${t.show.id}-${t.season}-${t.episode}`;
      if (!a.watched.includes(ep)) {
        applyEpisodeWatched(a, ep, true, stamp);
        if (day) a.watchedDates![ep] = `${day}T12:00:00Z`;
      }
    }
  }
}
