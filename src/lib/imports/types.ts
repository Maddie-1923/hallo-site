import type { LibraryArchive, Movie, Show } from "../archive";

// What the two importers share with whoever runs them: the slice of TMDB they
// call, the episode listings they wait for, where they say they're up to, and
// what they hand back — Android's ImportRunParts.kt, which is the Android shape
// of what ImportRun.swift and TVTimeImport.swift keep on their view models.
//
// The catalogue and the episodes are handed in, so the importers run the same
// in the browser, on the server and in a test against answers the test
// chooses. Nothing here writes a library: an import returns a plan, and
// `applyImportPlan` is the one place a plan becomes a library.

// ---- TMDB, as an import asks it ----

/** What TMDB's `/find` answers: the shows and films carrying an outside id. */
export interface ImportFindResults {
  tvResults?: Show[] | null;
  movieResults?: Movie[] | null;
}

/** One entry from `/search/multi`, people already left out. */
export type ImportTitleHit = { kind: "show"; show: Show } | { kind: "movie"; movie: Movie };

/**
 * The TMDB calls an import makes — Android's `ImportCatalog`. A call that
 * fails, by throwing or by answering null, costs that one title and nothing
 * else, as iOS's `try?` does; the run carries on with the next.
 */
export interface ImportCatalog {
  /**
   * A title by an outside id. A number is a TheTVDB id and a string an IMDb
   * id, the two overloads Android's catalogue has.
   */
  find(id: number | string): Promise<ImportFindResults>;
  show(id: number): Promise<Show | null>;
  movie(id: number): Promise<Movie | null>;
  /** Page one of each search, as the apps ask for. */
  searchShows(text: string, year: number | null): Promise<Show[]>;
  searchMovies(text: string, year: number | null): Promise<Movie[]>;
  searchMulti(text: string, year: number | null): Promise<ImportTitleHit[]>;
}

/**
 * One episode of a show's listing — the parts of Android's `Episode` an import
 * reads. `id` is the library's own key for it, "showID-season-episode".
 */
export interface Episode {
  id: string;
  showID: number;
  season: number;
  episode: number;
  name: string;
  /** TMDB's "YYYY-MM-DD", or null where it has none. */
  airDate: string | null;
}

/** The library key an episode is filed under: "showID-season-episode". */
export function episodeKey(showID: number, season: number, episode: number) {
  return `${showID}-${season}-${episode}`;
}

/**
 * The listings an import waits for before it can place episode ratings or
 * finish a run — Android's `ImportEpisodes`. `load` is asked once, with every
 * show the run cares about; `episodes` is read afterwards and may answer from
 * whatever `load` fetched.
 */
export interface ImportEpisodes {
  load(showIDs: number[]): Promise<void>;
  episodes(showID: number): Episode[] | Promise<Episode[]>;
}

// ---- Progress ----

/** Where a run is up to — iOS's `Stage`, bar `finished` and `failed`, which are outcomes here. */
export type ImportStage = "reading" | "matching" | "saving" | "loadingEpisodes";

/** One report of progress. `toMatch` is zero until the total is known. */
export interface ImportProgress {
  stage: ImportStage;
  matched: number;
  toMatch: number;
  currentTitle: string;
}

/** 0…1, or null before the total is known. */
export function progressFraction(p: ImportProgress): number | null {
  return p.toMatch > 0 ? Math.min(1, p.matched / p.toMatch) : null;
}

// ---- Running one ----

/** A picked file, or one entry of a picked zip, as bytes. */
export interface ImportFile {
  name: string;
  data: Uint8Array;
}

export interface ImportDeps {
  catalog: ImportCatalog;
  episodes: ImportEpisodes;
  /**
   * The library as it stands before the run, read and never changed — what
   * Android reads off `library.state.value`.
   */
  library: LibraryArchive;
  /** The clock every date the plan writes is taken from. */
  now: () => Date;
  onProgress?: (p: ImportProgress) => void;
  /** Stops the run at the points Android checks for cancellation; the run then rejects with the signal's reason. */
  signal?: AbortSignal;
}

/**
 * What a run wants done to the library, in a form that can be applied later
 * and in one go — see `applyImportPlan`.
 *
 * `archive` is what Android hands `library.apply(…, Merge)`, both of its
 * calls folded into one. `ratings` and `loved` are what it sets through the
 * library's own setters afterwards, keyed like reactions ("movie:1",
 * "show:1", "episode:1-2-3"), and are applied only where the library holds
 * no rating or no reaction of its own when the plan lands.
 */
export interface ImportPlan {
  archive: LibraryArchive;
  ratings: Record<string, number>;
  loved: string[];
}

export interface ImportRun<R> {
  result: R;
  plan: ImportPlan;
}

// ---- Results ----

/** What one file of an import turned out to be, in the order read. */
export interface ImportFileOutcome {
  name: string;
  /** The export it was recognised as ("Letterboxd diary", "Trakt"), or null where the columns were guessed at. */
  format: string | null;
  rows: number;
}

/** What an import from another app did — iOS `UniversalImportResult`. */
export interface UniversalImportResult {
  files: ImportFileOutcome[];
  showsAdded: number;
  showsAlreadyTracked: number;
  episodesAdded: number;
  moviesAdded: number;
  moviesAlreadyTracked: number;
  ratingsApplied: number;
  /** Ratings for something this library had already judged, left alone. */
  ratingsKept: number;
  /** Episode ratings for an episode TMDB's listing doesn't have. */
  ratingsUnplaced: number;
  /** Titles given a review, however many texts each was put together from. */
  reviewsAdded: number;
  /** Reviews for a title already reviewed here, left alone. */
  reviewsKept: number;
  unmatched: string[];
  ambiguous: string[];
}

export function universalLanded(r: UniversalImportResult) {
  return r.showsAdded > 0 || r.episodesAdded > 0 || r.moviesAdded > 0 || r.ratingsApplied > 0 || r.reviewsAdded > 0;
}

/** A title matched on its name when more than one fitted, and what it was taken as. */
export interface ImportAmbiguity {
  title: string;
  takenAs: string | null;
}

/**
 * Everything the TV Time reader saw on the way through, kept whether it
 * succeeded or not — iOS `TVTimeDiagnostics`, the payload behind the failure
 * text. See `diagnosticsReport` for the copyable version.
 */
export interface TvTimeDiagnostics {
  /** What was picked, as the file picker named it. */
  pickedName: string;
  /** Every entry inside the zip, in the archive's own order. Empty for a loose file. */
  filesInArchive: string[];
  /** The entries the reader recognised and read. */
  filesRead: string[];
  /** Headers exactly as each opened file wrote them, by file name. */
  headers: Record<string, string[]>;
  /** Headers no accepted spelling matched — reported, never fatal. */
  unrecognisedHeaders: string[];
  rowsRead: number;
  rowsUsed: number;
}

export function emptyDiagnostics(pickedName = ""): TvTimeDiagnostics {
  return { pickedName, filesInArchive: [], filesRead: [], headers: {}, unrecognisedHeaders: [], rowsRead: 0, rowsUsed: 0 };
}

/** What a TV Time import did — iOS `TVTimeImportResult`. */
export interface TvTimeImportResult {
  showsAdded: number;
  showsAlreadyTracked: number;
  episodesAdded: number;
  moviesAdded: number;
  moviesAlreadyTracked: number;
  ambiguous: ImportAmbiguity[];
  unmatchedShows: string[];
  unmatchedMovies: string[];
  /** Episode rows carrying only TV Time's own episode id, which nothing can place in a season. */
  episodesWithoutNumbers: number;
  /** As in `UniversalImportResult`: titles given a review, and reviews left alone because one was here. */
  reviewsAdded: number;
  reviewsKept: number;
  diagnostics: TvTimeDiagnostics;
}

export function tvTimeLanded(r: TvTimeImportResult) {
  return r.showsAdded > 0 || r.episodesAdded > 0 || r.moviesAdded > 0 || r.reviewsAdded > 0;
}

// ---- Failures ----

/** Why a run ended without importing: nothing in the files was readable as rows. */
export class NothingReadable extends Error {
  constructor(readonly files: ImportFileOutcome[]) {
    super("Nothing in that file looked like a watch history");
    this.name = "NothingReadable";
  }
}

/** Why a TV Time read stopped — iOS `TVTimeReadFailure.Reason`. The sentence is the screen's to word. */
export type TvTimeFailureReason =
  | { kind: "notAnArchive" }
  | { kind: "archiveUnreadable" }
  | { kind: "nothingRecognised" }
  | { kind: "notSupportedYet"; formatLabel: string }
  | { kind: "noRowsUsable" };

/** A TV Time read that stopped, always carrying what it had seen up to that point. */
export class TvTimeReadFailure extends Error {
  constructor(
    readonly reason: TvTimeFailureReason,
    readonly diagnostics: TvTimeDiagnostics,
  ) {
    super(reason.kind);
    this.name = "TvTimeReadFailure";
  }
}
