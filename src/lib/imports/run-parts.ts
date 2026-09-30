import type { LibraryArchive, Movie, Show } from "../archive";
import { MERGED_VERSION } from "./merge";
import type { ImportProgress, ImportStage } from "./types";

// What the two importers share beyond the types: the error-swallowing TMDB
// call, the cancellation check, and the small reads of a title the matching
// compares on.

/** The device an import's incoming archive names; the merge keeps nothing of it but the name. */
export const IMPORT_DEVICE = "Import";

/**
 * Stops the run if it has been cancelled — the points Android checks
 * `ensureActive()` at.
 */
export function checkAborted(signal: AbortSignal | undefined) {
  if (signal?.aborted) throw signal.reason ?? new DOMException("The import was cancelled.", "AbortError");
}

/**
 * A TMDB call whose failure costs this title and nothing else — iOS's `try?`.
 * A cancelled run still stops rather than carrying on without answers.
 */
export async function attempt<T>(call: () => Promise<T | null | undefined>, signal: AbortSignal | undefined): Promise<T | null> {
  try {
    return (await call()) ?? null;
  } catch {
    checkAborted(signal);
    return null;
  }
}

export function reporter(onProgress: ((p: ImportProgress) => void) | undefined) {
  return (stage: ImportStage, matched = 0, toMatch = 0, currentTitle = "") => onProgress?.({ stage, matched, toMatch, currentTitle });
}

/** A show's year as TMDB's date gives it, or "" — Android's `Show.year`. */
export function showYear(show: Show) {
  const d = show.first_air_date;
  return d && d.length >= 4 ? d.slice(0, 4) : "";
}

/** A film's year as TMDB's date gives it, or "". */
export function movieYear(movie: Movie) {
  const d = movie.release_date;
  return d && d.length >= 4 ? d.slice(0, 4) : "";
}

/**
 * The archive an import hands the merge. Both orders are left out, so the
 * merge leaves the library's own arrangement alone: an import has no opinion
 * about where a show sits in somebody's list.
 */
export function importArchive(exported: string): LibraryArchive {
  return {
    version: MERGED_VERSION,
    exported,
    device: IMPORT_DEVICE,
    shows: [],
    movies: [],
    watched: [],
    watchedDates: {},
    watchedMovies: [],
    movieWatchedDates: {},
  };
}
