import type { LibraryArchive, TrackedMovie, TrackedShow } from "./archive";

// The app's piles, worked out from the archive alone.
//
// `ShowPiles.swift` decides these from the tracked list, the episodes grouped
// by show, and the watch log. The website has the first and the third; it has
// no episode lists without a TMDB call per show, so the one split it cannot
// make is Up Next against Up to Date — both are "watching, and you touched it
// recently", and telling them apart means knowing whether an aired episode is
// still unwatched. The web calls that whole run Up Next, which is true of
// every show in it and never claims a show is finished when it isn't.

/** Ninety days, the app's `voidAfter`. Keep the two in step. */
export const VOID_AFTER_DAYS = 90;

function daysSince(iso: string | undefined, now: Date) {
  if (!iso) return Infinity;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return Infinity;
  return (now.getTime() - t) / 86_400_000;
}

/** The most recent check-off on this show, by the same key shape the app uses. */
function lastWatched(a: LibraryArchive, showID: number) {
  const prefix = `${showID}-`;
  let latest: string | undefined;
  for (const [key, when] of Object.entries(a.watchedDates ?? {})) {
    if (!key.startsWith(prefix)) continue;
    if (!latest || when > latest) latest = when;
  }
  return latest;
}

function hasStarted(a: LibraryArchive, showID: number) {
  const prefix = `${showID}-`;
  return a.watched.some((k) => k.startsWith(prefix));
}

export interface ShowPiles {
  upNext: TrackedShow[];
  readyToStart: TrackedShow[];
  theVoid: TrackedShow[];
  /** Settled, and drawn at the foot of the list rather than on the profile. */
  watched: TrackedShow[];
}

/**
 * The three piles the Shows list stacks, in the app's order — how far each has
 * drifted from tonight. Only Watching shows land here; the settled statuses
 * have their shelves on the profile.
 */
export function showPiles(a: LibraryArchive | null, now = new Date()): ShowPiles {
  const piles: ShowPiles = { upNext: [], readyToStart: [], theVoid: [], watched: [] };
  for (const t of a?.shows ?? []) {
    if (t.status === "Finished") {
      piles.watched.push(t);
      continue;
    }
    if (t.status !== "Watching") continue;
    const started = hasStarted(a!, t.show.id);
    // Started shows are measured from the last check-off, unstarted ones from
    // the day they were added — otherwise a series tracked last week and one
    // tracked last year both read as untouched forever.
    const since = started ? daysSince(lastWatched(a!, t.show.id) ?? t.modified, now) : daysSince(t.added ?? t.modified, now);
    if (since >= VOID_AFTER_DAYS) piles.theVoid.push(t);
    else if (started) piles.upNext.push(t);
    else piles.readyToStart.push(t);
  }
  return piles;
}

export interface MoviePiles {
  readyToStart: TrackedMovie[];
  theVoid: TrackedMovie[];
  watched: TrackedMovie[];
}

/** The film halves of the same two piles. A film has no middle, so there is no Up Next. */
export function moviePiles(a: LibraryArchive | null, now = new Date()): MoviePiles {
  const piles: MoviePiles = { readyToStart: [], theVoid: [], watched: [] };
  for (const t of a?.movies ?? []) {
    if (t.status === "Watched") {
      piles.watched.push(t);
      continue;
    }
    if (t.status !== "To Watch") continue;
    if (daysSince(t.added ?? t.modified, now) >= VOID_AFTER_DAYS) piles.theVoid.push(t);
    else piles.readyToStart.push(t);
  }
  return piles;
}
