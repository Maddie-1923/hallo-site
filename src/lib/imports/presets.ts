import { fold } from "./text";
import { FIELD_ORDER, ImportMapping, readEntries, type ImportField, type ImportTable, type ImportTitleKind, type ImportedEntry, type RatingScale } from "./table";

// Knowing an export on sight — Android's ImportPresets.kt, from
// ImportPresets.swift.
//
// The guesser can read a file nobody has seen. This is the other half: for the
// files people actually arrive with, it shouldn't have to guess. A preset is a
// way of recognising a file, the mapping to use once it's recognised, and the
// facts true about that export and nothing else — Letterboxd's diary holds two
// dates and only one is the night in question; IMDb's ratings hold two ratings
// and only one is yours. Every header below was read off a real export or an
// app's own published format.

/** An export recognised by sight — iOS `ImportPreset`. */
export interface ImportPreset {
  id: string;
  /** What the import summary says it found. */
  name: string;
  /** From the lowercased full path and the folded headers. */
  matches: (fileName: string, headers: string[]) => boolean;
  /**
   * The columns to read, by the names in that export. Walked in field order:
   * iOS walks a dictionary, whose order is nobody's, which is safe only
   * because no preset names one column twice.
   */
  columns: Partial<Record<ImportField, string[]>>;
  kind?: ImportTitleKind;
  /** The export's published scale, which replaces anything worked out from the values. */
  ratingScale?: RatingScale;
  /** A file that is a list of favourites rather than a column saying so. */
  everyRowIsFavorite?: boolean;
  /** A standing every row carries where the file itself is the only thing saying so. */
  standing?: string;
}

export function presetMapping(preset: ImportPreset, table: ImportTable): ImportMapping {
  const folded = table.foldedHeaders;
  const mapping = new ImportMapping();
  const claimed = new Set<number>();
  for (const field of FIELD_ORDER) {
    const names = preset.columns[field];
    if (!names) continue;
    for (const name of names) {
      const index = folded.indexOf(fold(name));
      if (index < 0 || claimed.has(index)) continue;
      mapping.set(field, index);
      claimed.add(index);
      break;
    }
  }
  return mapping;
}

export function presetEntries(preset: ImportPreset, table: ImportTable): ImportedEntry[] {
  const rows = readEntries(table, presetMapping(preset, table), preset.ratingScale ?? null);
  const kind = preset.kind ?? "either";
  for (const row of rows) {
    if (preset.everyRowIsFavorite) row.isFavorite = true;
    if (preset.standing != null) row.status = row.status ?? preset.standing;
    // A file that holds one kind says so by being that file.
    if (kind !== "either" && row.kind === null) row.kind = kind;
  }
  return rows;
}

// ---- Bingers — four files, one job each, a TMDB id on every row ----

/** `watches.csv`: the first night rather than the last; the last of two is a rewatch. */
const bingersWatches: ImportPreset = {
  id: "bingers.watches",
  name: "Bingers history",
  matches: (_, h) => h.includes("firstwatchedat") && h.includes("plays"),
  columns: {
    kind: ["type"], title: ["title"],
    season: ["season_number"], episode: ["episode_number"],
    tmdbID: ["tmdb_id"], tvdbID: ["tvdb_id"],
    watchedAt: ["first_watched_at"],
  },
};

/** `library.csv`: `added_at` is the day it went on the shelf and deliberately not read as a watch. */
const bingersLibrary: ImportPreset = {
  id: "bingers.library",
  name: "Bingers library",
  matches: (_, h) => h.includes("liststatus") && h.includes("addedat"),
  columns: {
    kind: ["type"], title: ["title"], year: ["year"],
    tmdbID: ["tmdb_id"], tvdbID: ["tvdb_id"],
    status: ["list_status"], favorite: ["favorite"],
  },
};

/** `ratings.csv`: five stars and no halves, which the app itself settles. */
const bingersRatings: ImportPreset = {
  id: "bingers.ratings",
  name: "Bingers ratings",
  matches: (_, h) => h.includes("rating") && (h.includes("favoritecharacter") || h.includes("emotions")),
  columns: {
    kind: ["type"], title: ["title"],
    season: ["season_number"], episode: ["episode_number"],
    tmdbID: ["tmdb_id"], tvdbID: ["tvdb_id"], rating: ["rating"],
  },
  ratingScale: "fivePoint",
};

/** `lists.csv`: titles carrying the name of the list they were on. */
const bingersLists: ImportPreset = {
  id: "bingers.lists",
  name: "Bingers lists",
  matches: (_, h) => h.includes("listname") && h.includes("title"),
  columns: {
    kind: ["type"], title: ["title"],
    tmdbID: ["tmdb_id"], tvdbID: ["tvdb_id"], status: ["list_name"],
  },
};

// ---- Refract — a backup whose `readable/` CSVs carry the TMDB id ----

/** `readable/episodes.csv`: the history, with a `watched` column that is not always true. */
const refractEpisodes: ImportPreset = {
  id: "refract.episodes",
  name: "Refract episodes",
  matches: (_, h) => h.includes("watchedattz") && h.includes("season") && h.includes("episode"),
  columns: {
    title: ["title"], year: ["year"], kind: ["media_type"],
    tmdbID: ["tmdb_id"], season: ["season"], episode: ["episode"],
    watched: ["watched"], watchedAt: ["watched_at"], rating: ["rating"],
  },
  ratingScale: "tenPoint",
};

/**
 * `readable/library.csv`. `watched_episodes` is deliberately not read: it
 * holds the episodes file's episodes again, as codes in one cell and without
 * their dates.
 */
const refractLibrary: ImportPreset = {
  id: "refract.library",
  name: "Refract library",
  matches: (_, h) => h.includes("progresspercent") || h.includes("watchedepisodes"),
  columns: {
    title: ["title"], year: ["year"], kind: ["media_type"],
    tmdbID: ["tmdb_id"], status: ["status"], rating: ["rating"],
    watchedAt: ["last_watched_at"],
  },
  ratingScale: "tenPoint",
};

/** `readable/ratings.csv`: a verdict on a film, a series or one episode. */
const refractRatings: ImportPreset = {
  id: "refract.ratings",
  name: "Refract ratings",
  matches: (_, h) => h.includes("targettype") && h.includes("value"),
  columns: {
    title: ["title"], year: ["year"], kind: ["media_type"],
    tmdbID: ["tmdb_id"], season: ["season"], episode: ["episode"],
    rating: ["value"],
  },
  ratingScale: "tenPoint",
};

/** `readable/favorites.csv`: every row a heart; hearts on people carry no title id and fall out. */
const refractFavorites: ImportPreset = {
  id: "refract.favorites",
  name: "Refract favourites",
  matches: (_, h) => h.includes("personname") && h.includes("kind"),
  columns: {
    title: ["title"], year: ["year"], kind: ["media_type"],
    tmdbID: ["tmdb_id"], season: ["season"], episode: ["episode"],
  },
  everyRowIsFavorite: true,
};

/**
 * `readable/diary.csv`, recognised and read as nothing: an activity log,
 * whose rows left to the guesser would arrive as titles dated the day they
 * were filed — which on a film reads as having watched it.
 */
const refractDiary: ImportPreset = {
  id: "refract.diary",
  name: "Refract diary (activity log, not imported)",
  matches: (_, h) => h.includes("actiontype") && h.includes("actiondatetz"),
  columns: {},
};

// ---- Letterboxd — films only, no id of any kind, a preset per file ----

const letterboxdColumns = { title: ["Name"], year: ["Year"] };

/**
 * A Letterboxd file by its name, whatever folder it sits in — but never the
 * copies under `deleted/` or `orphaned/`, which hold entries somebody deleted
 * and films Letterboxd itself removed.
 */
function letterboxdFile(name: string, wanted: string) {
  const path = name.toLowerCase();
  if (path.includes("deleted/") || path.includes("orphaned/")) return false;
  return path.endsWith(wanted);
}

/** `Watched Date`, not `Date`: the night watched rather than the day logged. */
const letterboxdDiary: ImportPreset = {
  id: "letterboxd.diary",
  name: "Letterboxd diary",
  matches: (name, h) =>
    h.includes("letterboxduri") && h.includes("watcheddate") && (letterboxdFile(name, "diary.csv") || letterboxdFile(name, "reviews.csv")),
  columns: { ...letterboxdColumns, watchedAt: ["Watched Date"], rating: ["Rating"] },
  kind: "movies",
  ratingScale: "fivePoint",
};

/** `ratings.csv`: a rated film is a watched one, dated the day the verdict was given. */
const letterboxdRatings: ImportPreset = {
  id: "letterboxd.ratings",
  name: "Letterboxd ratings",
  matches: (name, h) => h.includes("letterboxduri") && h.includes("rating") && letterboxdFile(name, "ratings.csv"),
  columns: { ...letterboxdColumns, rating: ["Rating"], watchedAt: ["Date"] },
  kind: "movies",
  ratingScale: "fivePoint",
};

const letterboxdWatched: ImportPreset = {
  id: "letterboxd.watched",
  name: "Letterboxd watched",
  matches: (name, h) => h.includes("letterboxduri") && letterboxdFile(name, "watched.csv"),
  columns: { ...letterboxdColumns, watchedAt: ["Date"] },
  kind: "movies",
};

/**
 * `watchlist.csv`, whose header is identical to `watched.csv`'s — the file
 * that made the names matter. Its `Date` is the day added, not a viewing.
 */
const letterboxdWatchlist: ImportPreset = {
  id: "letterboxd.watchlist",
  name: "Letterboxd watchlist",
  matches: (name, h) => h.includes("letterboxduri") && letterboxdFile(name, "watchlist.csv"),
  columns: letterboxdColumns,
  kind: "movies",
  standing: "watchlist",
};

/** `likes/films.csv`, the same header a third time: a heart, which doesn't say it was seen. */
const letterboxdLikes: ImportPreset = {
  id: "letterboxd.likes",
  name: "Letterboxd likes",
  matches: (name, h) => h.includes("letterboxduri") && letterboxdFile(name, "likes/films.csv"),
  columns: letterboxdColumns,
  kind: "movies",
  everyRowIsFavorite: true,
  standing: "watchlist",
};

// ---- IMDb — an id on every row. `Your Rating` is yours; `IMDb Rating` is the crowd's ----

const imdbColumns = {
  imdbID: ["Const"], title: ["Title"], year: ["Year"],
  rating: ["Your Rating"], watchedAt: ["Date Rated"], kind: ["Title Type"],
};

const imdbV3: ImportPreset = {
  id: "imdb.v3",
  name: "IMDb",
  matches: (_, h) => h.includes("const") && h.includes("originaltitle"),
  columns: imdbColumns,
  ratingScale: "tenPoint",
};

const imdbV2: ImportPreset = {
  id: "imdb.v2",
  name: "IMDb",
  matches: (_, h) => h.includes("const") && h.includes("daterated"),
  columns: imdbColumns,
  ratingScale: "tenPoint",
};

/**
 * Everything IMDb exported until the end of 2017. Its `created` date is C's
 * `asctime` shape, which the shared parser reads as Android's does — see
 * `parseDate`.
 */
const imdbV1: ImportPreset = {
  id: "imdb.v1",
  name: "IMDb (2017 or earlier)",
  matches: (_, h) => h.includes("const") && h.includes("yourated"),
  columns: {
    imdbID: ["const"], title: ["Title"], year: ["Year"],
    rating: ["You rated"], watchedAt: ["created"], kind: ["Title type"],
  },
  ratingScale: "tenPoint",
};

// ---- Trakt's CSVs. Its JSON export has a reader of its own (`json.ts`) ----

const traktRatingsCsv: ImportPreset = {
  id: "trakt.ratings.csv",
  name: "Trakt ratings",
  matches: (_, h) => h.includes("ratedat") && h.includes("traktid"),
  columns: {
    title: ["title"], year: ["year"],
    season: ["season_number"], episode: ["episode_number"],
    episodeTitle: ["episode_title"], watchedAt: ["rated_at"], rating: ["rating"],
    imdbID: ["imdb_id"], tmdbID: ["tmdb_id"], tvdbID: ["tvdb_id"], kind: ["type"],
  },
  ratingScale: "tenPoint",
};

const traktCollectionCsv: ImportPreset = {
  id: "trakt.collection.csv",
  name: "Trakt collection",
  matches: (_, h) => h.includes("collectedat") && h.includes("traktid"),
  columns: {
    title: ["title"], year: ["year"], watchedAt: ["collected_at"],
    imdbID: ["imdb_id"], tmdbID: ["tmdb_id"], kind: ["type"],
  },
  ratingScale: "tenPoint",
};

/** Simkl's CSV carries only the last episode reached, as `s1e2` in one cell. */
const simklCsv: ImportPreset = {
  id: "simkl.csv",
  name: "Simkl",
  matches: (_, h) => h.includes("lastepwatched") || (h.includes("simklid") && h.includes("watchlist")),
  columns: {
    title: ["Title"], year: ["Year"], episodeCode: ["LastEpWatched"],
    watchedAt: ["WatchedDate"], rating: ["Rating"], status: ["Watchlist"],
    kind: ["Type"], imdbID: ["IMDB_ID", "IMDB"], tmdbID: ["TMDB"],
    tvdbID: ["TVDB_ID", "TVDB"],
  },
  ratingScale: "tenPoint",
};

export const IMPORT_PRESETS = {
  refractEpisodes, refractLibrary, refractRatings, refractFavorites, refractDiary,
  bingersWatches, bingersLibrary, bingersRatings, bingersLists,
  letterboxdDiary, letterboxdRatings, letterboxdWatched, letterboxdWatchlist, letterboxdLikes,
  imdbV3, imdbV2, imdbV1,
  traktRatingsCsv, traktCollectionCsv,
  simklCsv,
};

/**
 * Every preset, in the order they are tried. The more specific header wins
 * where two could, so Letterboxd's diary is tried before its shorter cousins
 * and IMDb's generations newest first.
 */
export const ALL_PRESETS: readonly ImportPreset[] = Object.values(IMPORT_PRESETS);

/** The preset that recognises this file, or null. */
export function recognisePreset(fileName: string, table: ImportTable): ImportPreset | null {
  const lower = fileName.toLowerCase();
  return ALL_PRESETS.find((p) => p.matches(lower, table.foldedHeaders)) ?? null;
}
