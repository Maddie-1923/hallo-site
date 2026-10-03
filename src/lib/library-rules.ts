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
  /** Replies turned off on the review (the library's `noReplies`). */
  noReplies: boolean;
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
    noReplies: !!review?.noReplies,
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

/** Dates the tags a write adds to a title and the ones it takes off, so a
    sync can't bring a removed tag back (archive.ts, tagAdded / tagRemoved).
    Compared without case, as the app does: "Cozy" for "cozy" is a respelling,
    dated as both at once, which a merge keeps. */
function datedTagChange(a: LibraryArchive, key: string, before: string[], after: string[], stamp: string) {
  const fold = (list: string[]) => new Map(list.map((t) => [t.toLowerCase(), t]));
  const was = fold(before);
  const now = fold(after);
  a.tagAdded ??= {};
  a.tagRemoved ??= {};
  for (const [low, tag] of was) {
    if (now.get(low) === tag) continue;
    a.tagRemoved[`${key}|${low}`] = stamp;
    delete a.tagAdded[`${key}|${low}`];
  }
  for (const [low, tag] of now) {
    if (was.get(low) === tag) continue;
    a.tagAdded[`${key}|${low}`] = stamp;
    if (!was.has(low)) delete a.tagRemoved[`${key}|${low}`];
  }
}

/** Takes the whole of someone's take off a title: review, rating, moods,
    heart, tags and note. What they watched stays watched. */
export function clearTake(a: LibraryArchive, t: TakeTarget, stamp: string) {
  const key = takeKey(t);
  datedTagChange(a, key, a.tags?.[key] ?? [], [], stamp);
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
  if (text || day) a.reviews[key] = { text, watchedOn: day || undefined, rewatch: input.rewatch || undefined, spoilers: (text && input.spoilers) || undefined, noReplies: (text && input.noReplies) || undefined, modified: stamp };
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
  datedTagChange(a, key, a.tags[key] ?? [], tags, stamp);
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

// ---- Lists (the person's own categories) ----

/** Library.customListLimit. */
export const LIST_LIMIT = 20;

export interface ListInput {
  /** Absent to make a new list. */
  id?: string;
  name: string;
  detail: string;
  /** Title keys ("m123", "s456") in the order they were picked; only titles
      in the library can be on a list, as in the app. */
  keys: string[];
}

/** Makes or edits a list (the app's createList, renameList, setListDetail
    and the list's contents): the name trimmed and required, an emptied
    description removed rather than stored blank, the titles as picked.
    Returns the list's id. New ids are uppercase UUIDs, as Swift writes them. */
export function applySaveList(a: LibraryArchive, input: ListInput, stamp: string, newID: () => string): string {
  const name = input.name.trim().slice(0, 60);
  if (!name) throw new Error("Give the list a name.");
  const detail = input.detail.trim().slice(0, 200);
  const shows = new Set(a.shows.map((t) => t.show.id));
  const movies = new Set(a.movies.map((t) => t.movie.id));
  const showIDs: number[] = [];
  const movieIDs: number[] = [];
  for (const k of input.keys) {
    const id = Number(k.slice(1));
    if (k[0] === "s" && shows.has(id) && !showIDs.includes(id)) showIDs.push(id);
    if (k[0] === "m" && movies.has(id) && !movieIDs.includes(id)) movieIDs.push(id);
  }
  a.customLists ??= [];
  const found = input.id ? a.customLists.find((l) => l.id.toUpperCase() === input.id!.toUpperCase()) : undefined;
  if (input.id && !found) throw new Error("That list is gone.");
  if (found) {
    found.name = name;
    if (detail) found.detail = detail;
    else delete found.detail;
    found.showIDs = showIDs;
    found.movieIDs = movieIDs;
    return found.id;
  }
  if (a.customLists.length >= LIST_LIMIT) throw new Error(`Kodigo keeps to ${LIST_LIMIT} lists.`);
  const id = newID();
  a.customLists.push({ id, name, ...(detail ? { detail } : {}), showIDs, movieIDs, created: stamp });
  a.customListOrder = [...(a.customListOrder ?? []), id];
  return id;
}

/** The app's deleteList: the list and its place in the order. What was on it
    stays tracked. (Lists carry no tombstone in the app either, so a device
    that changed things before it synced can bring a deleted list back.) */
export function applyDeleteList(a: LibraryArchive, id: string) {
  const same = (x: string) => x.toUpperCase() === id.toUpperCase();
  a.customLists = (a.customLists ?? []).filter((l) => !same(l.id));
  a.customListOrder = (a.customListOrder ?? []).filter((x) => !same(x));
}

/** A list's picture: a poster from a title on it, or back to the default.
    Stored as the app's CustomListCover.poster; a photo uploaded in the app is
    only replaced when a poster is chosen instead. */
export function applyListCover(a: LibraryArchive, id: string, posterPath: string | null) {
  const list = (a.customLists ?? []).find((l) => l.id.toUpperCase() === id.toUpperCase());
  if (!list) throw new Error("That list is gone.");
  const l = list as typeof list & { cover?: unknown };
  if (posterPath && /^\/[A-Za-z0-9_-]+\.(jpg|png|webp)$/.test(posterPath)) l.cover = { poster: { _0: posterPath } };
  else delete l.cover;
}

// ---- Watching again (the app's recordRewatch and recordMovieRewatch) ----
//
// A rewatch is another night, not a change to the first one: `watched`,
// `watchedStamps`, `watchedMovies` and `movieWatchedDates` never move. Each
// night goes in the log; taking one back removes it and writes a tombstone
// by the night's own id (the title and the whole second, tickID), so another
// device can't bring it back. Only a watched title can be watched again.

export type RewatchTarget = { kind: "movie"; id: number } | { kind: "episode"; showID: number; season: number; episode: number };

const episodeIDOf = (t: Extract<RewatchTarget, { kind: "episode" }>) => `${t.showID}-${t.season}-${t.episode}`;

function movieWatched(a: LibraryArchive, id: number) {
  return (a.watchedMovies ?? []).includes(id) || String(id) in (a.movieWatchedDates ?? {});
}

/** Records tonight as another viewing. False when it hasn't been watched the first time. */
export function applyRewatch(a: LibraryArchive, t: RewatchTarget, stamp: string): boolean {
  if (t.kind === "movie") {
    if (!movieWatched(a, t.id)) return false;
    (a.movieRewatchLog ??= []).push({ movieID: t.id, watched: stamp });
    return true;
  }
  const episodeID = episodeIDOf(t);
  if (!a.watched.includes(episodeID)) return false;
  (a.rewatchLog ??= []).push({ episodeID, showID: t.showID, watched: stamp });
  return true;
}

/** Takes back one night, found by its own id; the tombstone goes in either way. */
export function applyDeleteRewatch(a: LibraryArchive, t: RewatchTarget, watched: string, stamp: string, tickID: (title: string, watched: string) => string) {
  const title = t.kind === "movie" ? String(t.id) : episodeIDOf(t);
  const id = tickID(title, watched);
  if (t.kind === "movie") {
    a.movieRewatchLog = (a.movieRewatchLog ?? []).filter((x) => !(x.movieID === t.id && tickID(String(x.movieID), x.watched) === id));
    a.movieRewatchTickTombstones = [...(a.movieRewatchTickTombstones ?? []).filter((s) => s.id !== id), { id, removed: stamp }];
    return;
  }
  a.rewatchLog = (a.rewatchLog ?? []).filter((x) => !(x.episodeID === title && tickID(x.episodeID, x.watched) === id));
  // A night from a run still going sits in the run's ticks.
  for (const run of a.rewatchRuns ?? []) {
    if (run.showID === t.showID && run.ticks?.[title] && tickID(title, run.ticks[title]) === id) {
      delete run.ticks[title];
      run.modified = stamp;
    }
  }
  a.rewatchTickTombstones = [...(a.rewatchTickTombstones ?? []).filter((s) => s.id !== id), { id, removed: stamp }];
}

/** The nights it was watched again, newest first; none unless it's watched. */
export function rewatchNights(a: LibraryArchive, t: RewatchTarget): string[] {
  if (t.kind === "movie") {
    if (!movieWatched(a, t.id)) return [];
    return (a.movieRewatchLog ?? []).filter((x) => x.movieID === t.id).map((x) => x.watched).sort().reverse();
  }
  const episodeID = episodeIDOf(t);
  if (!a.watched.includes(episodeID)) return [];
  const open = (a.rewatchRuns ?? []).find((r) => r.showID === t.showID)?.ticks?.[episodeID];
  return [...(a.rewatchLog ?? []).filter((x) => x.episodeID === episodeID).map((x) => x.watched), ...(open ? [open] : [])].sort().reverse();
}
