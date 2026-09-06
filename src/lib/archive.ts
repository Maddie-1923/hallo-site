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
 * A review of a title — what the web's "Review & catalogue" writes and what a
 * Letterboxd import brings over. Keyed like reactions ("show:ID" / "movie:ID"),
 * one per title; a rewatch replaces the text rather than stacking entries.
 * The app doesn't read this yet; being optional, older builds decode past it.
 */
export interface Review {
  text: string;
  /** The day it was watched, "YYYY-MM-DD"; absent when the person didn't say. */
  watchedOn?: string;
  rewatch?: boolean;
  spoilers?: boolean;
  modified: string;
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
  [extra: string]: unknown;
}

export const CURRENT_VERSION = 12;

export function isArchive(value: unknown): value is LibraryArchive {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return typeof v.version === "number" && Array.isArray(v.shows) && Array.isArray(v.movies) && Array.isArray(v.watched);
}

export function poster(path: string | null | undefined, size: "w185" | "w342" | "w500" = "w342") {
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
