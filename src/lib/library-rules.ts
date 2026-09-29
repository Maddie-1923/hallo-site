import type { LibraryArchive } from "./archive";

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
