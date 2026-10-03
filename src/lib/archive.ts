// The TypeScript twin of `LibraryArchive` in the iOS app. Field names match
// the Swift CodingKeys exactly, because the same JSON travels through backup
// files, the sync row and this site, and a rename on either side would split
// the format. Everything past version 1 is optional here for the reason it is
// defaulted there: an older file decodes with gaps, never with a failure.

export type WatchStatus = "Watching" | "Stopped" | "Dropped" | "Finished";
export type MovieStatus = "To Watch" | "On Hold" | "Dropped" | "Watched";
export type Reaction = "loved" | "liked" | "notForMe";

export interface Show {
  id: number;
  name: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  first_air_date?: string | null;
  vote_average?: number | null;
  overview?: string | null;
  status?: string | null;
  genre_ids?: number[] | null;
}

export interface Movie {
  id: number;
  title: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  release_date?: string | null;
  vote_average?: number | null;
  overview?: string | null;
  runtime?: number | null;
  genre_ids?: number[] | null;
}

export interface TrackedShow {
  show: Show;
  status: WatchStatus;
  modified?: string;
  added?: string;
}

export interface TrackedMovie {
  movie: Movie;
  status: MovieStatus;
  modified?: string;
  added?: string;
}

export interface Tombstone {
  id: number;
  removed: string;
}

export interface CustomList {
  id: string;
  name: string;
  detail?: string | null;
  showIDs?: number[];
  movieIDs?: number[];
  created?: string;
}

/**
 * A review of a title — what the web's "Review & catalogue" writes and what an
 * import from Letterboxd, TV Time, Trakt, Refract or any file with a review
 * column brings over. Keyed like reactions
 * ("show:ID" / "movie:ID" / "episode:showID-s-e"), one per title; a rewatch
 * replaces the text rather than stacking entries. Public, unlike a note. The
 * spec both apps follow is docs/reviews-import.md.
 */
export interface Review {
  /** Plain text, trimmed, at most 10,000 characters. */
  text: string;
  /** The day it was watched, "YYYY-MM-DD"; absent when the person didn't say. */
  watchedOn?: string;
  rewatch?: boolean;
  spoilers?: boolean;
  /** True when the writer has turned replies off; absent means replies are on. */
  noReplies?: boolean;
  /** When it was written, or for an imported one when the other app says it was. */
  modified: string;
  /** Where an imported review came from: "letterboxd", "tvtime", "trakt" or "refract". Absent for one written here, or from a file whose app wasn't known. */
  source?: string;
}

/**
 * A saved Explore rail — a custom category. `id` is an uppercase UUID,
 * `catalogue` exactly "Shows" or "Movies", `filter` the app's DiscoverFilter
 * and `created` ISO 8601 without fractional seconds; the app's decoder fails
 * the whole archive on a rail that breaks any of that. Loose here because
 * the merge only needs id and `created`; lib/saved-rails.ts reads the
 * insides and writes new ones.
 */
export interface SavedRail {
  id: string;
  name: string;
  catalogue?: string;
  filter?: unknown;
  created?: string;
  [extra: string]: unknown;
}

/** A rewatch of a show in progress, one per show. `ticks` maps episode ids to the night each was watched again. */
export interface RewatchRun {
  showID: number;
  started?: string;
  ticks?: Record<string, string>;
  modified?: string;
}

/** A finished-rewatch tally for one show. */
export interface RewatchCount {
  id: number;
  count: number;
}

/** One episode watched again on one night. Kept after its run is gone. */
export interface RewatchTick {
  episodeID: string;
  showID: number;
  watched: string;
}

/** One night a film was watched again. */
export interface MovieRewatchTick {
  movieID: number;
  watched: string;
}

/**
 * A rewatch night taken back. The id is the night's own — the title's id and
 * the whole second, as "1-1-1-1785931200.0".
 */
export interface TickTombstone {
  id: string;
  removed: string;
}

export interface LibraryArchive {
  version: number;
  exported: string;
  device: string;
  shows: TrackedShow[];
  movies: TrackedMovie[];
  watchedMovies?: number[];
  movieWatchedDates?: Record<string, string>;
  /** Episode ids as "showID-season-episode". */
  watched: string[];
  skipped?: string[];
  /** When each skip was made, keyed like `skipped`. */
  skippedDates?: Record<string, string>;
  watchedDates?: Record<string, string>;
  /** Keys are "show:ID", "movie:ID" or "episode:showID-s-e". */
  reactions?: Record<string, Reaction>;
  ratings?: Record<string, number>;
  moods?: Record<string, string[]>;
  notes?: Record<string, string>;
  reviews?: Record<string, Review>;
  tags?: Record<string, string[]>;
  customLists?: CustomList[];
  customListOrder?: string[];
  showOrder?: number[] | null;
  movieOrder?: number[] | null;
  /** Keyed like `watched`; a key here that isn't in `watched` is an uncheck. */
  watchedStamps?: Record<string, string>;
  showTombstones?: Tombstone[];
  movieTombstones?: Tombstone[];
  catchUpOptOuts?: number[];
  /** Shows whose alerts arrive silently. */
  mutedShows?: number[];
  /** Shows kept out of Up Next. */
  hiddenShows?: number[];
  /** Titles kept off the For You rail, keyed like reactions. */
  hiddenRecs?: string[];
  savedRails?: SavedRail[];
  /** Null or missing is "no opinion", as with `showOrder`. */
  savedRailOrder?: string[] | null;
  rewatchRuns?: RewatchRun[];
  rewatchRunTombstones?: Tombstone[];
  rewatchCounts?: RewatchCount[];
  rewatchLog?: RewatchTick[];
  rewatchTickTombstones?: TickTombstone[];
  movieRewatchLog?: MovieRewatchTick[];
  movieRewatchTickTombstones?: TickTombstone[];
  /** Which picture the viewer chose for a title, keyed "target#role#surface". */
  chosenArt?: Record<string, string>;
  /** Uploaded pictures by id, as base64 (Swift writes `Data` that way). */
  uploadedArt?: Record<string, string>;
  profileAvatar?: string | null;
  profileBanner?: string | null;
  /** When the avatar and banner last changed, together. */
  profilePicturesChanged?: string | null;
  /**
   * When something was last imported into this library (a backup included).
   * The database reads it to keep that write's changes out of feeds.
   */
  importedAt?: string;
  [extra: string]: unknown;
}

export const CURRENT_VERSION = 12;

export function isArchive(value: unknown): value is LibraryArchive {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return typeof v.version === "number" && Array.isArray(v.shows) && Array.isArray(v.movies) && Array.isArray(v.watched);
}

export function poster(path: string | null | undefined, size: "w185" | "w342" | "w500" | "w780" = "w780") {
  const base = process.env.NEXT_PUBLIC_TMDB_IMAGE_URL ?? "https://image.tmdb.org/t/p";
  return path ? `${base}/${size}${path}` : null;
}

/** Episodes checked off for one show, from the flat watched list. */
export function episodesWatched(archive: LibraryArchive, showID: number) {
  const prefix = `${showID}-`;
  return archive.watched.filter((k) => k.startsWith(prefix)).length;
}

export function isFavorite(archive: LibraryArchive, key: string) {
  return archive.reactions?.[key] === "loved";
}

export function year(date: string | null | undefined) {
  return date ? date.slice(0, 4) : "";
}

const showStatusLabel: Record<WatchStatus, string> = {
  Watching: "Watching",
  Stopped: "On Hold",
  Dropped: "Did Not Finish",
  Finished: "Finished",
};
const movieStatusLabel: Record<MovieStatus, string> = {
  "To Watch": "To Watch",
  "On Hold": "On Hold",
  Dropped: "Did Not Finish",
  Watched: "Watched",
};

export const showSections: WatchStatus[] = ["Watching", "Stopped", "Finished", "Dropped"];
export const movieSections: MovieStatus[] = ["To Watch", "On Hold", "Watched", "Dropped"];

export function labelFor(status: WatchStatus | MovieStatus) {
  return (showStatusLabel as Record<string, string>)[status] ?? (movieStatusLabel as Record<string, string>)[status] ?? status;
}

/** Sort the way the app does — manual drag order first, then by recency. */
export function orderedShows(archive: LibraryArchive) {
  const order = archive.showOrder;
  const rank = new Map((order ?? []).map((id, i) => [id, i]));
  return [...archive.shows].sort((a, b) => {
    const ra = rank.get(a.show.id);
    const rb = rank.get(b.show.id);
    if (ra !== undefined && rb !== undefined) return ra - rb;
    if (ra !== undefined) return -1;
    if (rb !== undefined) return 1;
    return (b.modified ?? "").localeCompare(a.modified ?? "");
  });
}

export function orderedMovies(archive: LibraryArchive) {
  const order = archive.movieOrder;
  const rank = new Map((order ?? []).map((id, i) => [id, i]));
  return [...archive.movies].sort((a, b) => {
    const ra = rank.get(a.movie.id);
    const rb = rank.get(b.movie.id);
    if (ra !== undefined && rb !== undefined) return ra - rb;
    if (ra !== undefined) return -1;
    if (rb !== undefined) return 1;
    return (b.modified ?? "").localeCompare(a.modified ?? "");
  });
}
