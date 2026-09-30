import { parseDate, toIntOrNull, toLongOrNull } from "./text";
import { importedEntry, isJsonObject, numberText, parseJson, type ImportedEntry } from "./table";

// The exports that aren't tables — Android's ImportJson.kt, from
// ImportJSON.swift: Trakt, Simkl, SeriesGuide, Sofa Time and Showly, which
// hand out JSON with the history nested inside it. Flattened into rows they
// would import as a bare list of shows with the viewing thrown away, so each
// gets a reader that walks its own shape and comes out where everything else
// does, a run of `ImportedEntry`.
//
// None of them converts a rating: all five rate out of ten, which is what
// Kodigo rates out of.

/**
 * Just enough traversal to read these files without a decoder per format —
 * iOS `ImportJSONObject`. These formats disagree with themselves about types
 * (Simkl writes every external id as a string except its own), so this asks
 * for what it wants and takes either spelling.
 */
class JsonObj {
  constructor(readonly raw: Record<string, unknown>) {}

  private get(key: string): unknown {
    return Object.prototype.hasOwnProperty.call(this.raw, key) ? this.raw[key] : undefined;
  }

  string(key: string): string | null {
    const v = this.get(key);
    if (typeof v === "string") return v === "" ? null : v;
    // A number read as text — how `NSNumber.stringValue` spells it, so a
    // whole number stays whole and a boolean is `1` or `0`.
    if (typeof v === "boolean") return v ? "1" : "0";
    if (typeof v === "number") return numberText(v);
    return null;
  }

  /** A number written as a number or as a string, truncated as `NSNumber.intValue` truncates. */
  int(key: string): number | null {
    const v = this.get(key);
    if (typeof v === "string") return toIntOrNull(v);
    if (typeof v === "boolean") return v ? 1 : 0;
    if (typeof v !== "number") return null;
    // Android reads a whole number as a 64-bit one and narrows it, which
    // wraps; anything else goes through a double, which saturates.
    if (Number.isInteger(v) && toLongOrNull(numberText(v)) !== null) return v | 0;
    return Math.max(-2147483648, Math.min(2147483647, Math.trunc(v)));
  }

  bool(key: string): boolean {
    const v = this.get(key);
    if (typeof v === "string") return ["1", "true", "yes"].includes(v.toLowerCase());
    if (typeof v === "boolean") return v;
    if (typeof v === "number") return v !== 0;
    return false;
  }

  obj(key: string): JsonObj | null {
    const v = this.get(key);
    return isJsonObject(v) ? new JsonObj(v) : null;
  }

  array(key: string): JsonObj[] {
    const v = this.get(key);
    return Array.isArray(v) ? objectsOf(v) : [];
  }

  has(key: string): boolean {
    return Object.prototype.hasOwnProperty.call(this.raw, key);
  }

  /**
   * A date however the file writes one, through the shared parser — and
   * nothing in the first day of 1970, which is Simkl's way of saying
   * "watched, but they don't remember when".
   */
  date(key: string): Date | null {
    const text = this.string(key);
    if (text === null) return null;
    const parsed = parseDate(text);
    if (!parsed) return null;
    return Math.floor(parsed.getTime() / 1000) < 86_400 ? null : parsed;
  }
}

function objectsOf(values: unknown[]): JsonObj[] {
  return values.filter(isJsonObject).map((v) => new JsonObj(v));
}

/** Which of the nested exports a file is — iOS `ImportJSONFormat`. The value is what the summary names. */
export type ImportJsonFormat = "Trakt" | "Simkl" | "SeriesGuide" | "Sofa Time" | "Showly";

/**
 * Whether the bytes are a Kodigo archive rather than somebody else's export —
 * the three keys every archive the apps have written carries, and no other
 * tracker writes all three (Android's `ArchiveFiles.looksLikeOurs`).
 */
export function looksLikeOurs(data: Uint8Array): boolean {
  const json = parseJson(data);
  return isJsonObject(json) && "exported" in json && "version" in json && "device" in json;
}

/** Recognised from the shape of the document, never from its name alone. */
export function recogniseJsonFormat(data: Uint8Array): ImportJsonFormat | null {
  const json = parseJson(data);
  if (json === undefined) return null;
  // Never one of ours: a Kodigo archive keys its shows and films where
  // Trakt's export does and carries a `watched` besides, so the Trakt arm
  // would claim it and read a tenth of it.
  if (looksLikeOurs(data)) return null;

  if (isJsonObject(json)) {
    const o = new JsonObj(json);
    // Showly before Simkl: both key by shows and movies, but Showly's shows
    // are an object of lettered buckets.
    if (o.has("version") && o.has("platform") && (o.obj("shows")?.has("pEp") === true || o.obj("movies")?.has("cH") === true)) return "Showly";
    if (o.has("shows") || o.has("movies") || o.has("anime")) return o.has("history") || o.has("watched") ? "Trakt" : "Simkl";
    if (o.has("history") || o.has("watched")) return "Trakt";
  }
  if (Array.isArray(json)) {
    const first = isJsonObject(json[0]) ? new JsonObj(json[0]) : null;
    if (!first) return null;
    // Sofa before SeriesGuide: its shows carry `seasons` too, and what tells
    // them apart is the ids.
    if ((first.has("tmdb") || first.has("imdb")) && first.has("addedDate")) return "Sofa Time";
    // Trakt wraps a record's title in a `show` or `movie`, where SeriesGuide's
    // show is the record; tested first because Trakt's rolled-up file has
    // seasons in it too.
    if (first.has("show") || first.has("movie") || first.has("episode")) return "Trakt";
    if (first.has("watched_at") || first.has("rated_at") || first.has("action")) return "Trakt";
    if (first.has("seasons") || first.has("tvdb_id") || first.has("in_collection")) return "SeriesGuide";
  }
  return null;
}

/**
 * The rows a recognised file holds. `fileName` matters to exactly one format
 * and completely there: a Sofa Time export says what a list is only in the
 * name of the file it came in.
 */
export function jsonEntries(format: ImportJsonFormat, data: Uint8Array, fileName = ""): ImportedEntry[] {
  const json = parseJson(data);
  if (json === undefined) return [];
  switch (format) {
    case "Trakt":
      return trakt(json);
    case "Simkl":
      return simkl(json);
    case "SeriesGuide":
      return seriesGuide(json);
    case "Sofa Time":
      return sofaTime(json, fileName);
    case "Showly":
      return showly(json);
  }
}

// ---- Trakt: one row per viewing, every rewatch its own row, ids for everything ----

function trakt(json: unknown): ImportedEntry[] {
  let rows: JsonObj[] = [];
  if (Array.isArray(json)) rows = objectsOf(json);
  else if (isJsonObject(json)) {
    const o = new JsonObj(json);
    rows = [...o.array("history"), ...o.array("watched"), ...o.array("ratings"), ...o.array("movies"), ...o.array("shows")];
  }
  return rows.flatMap((row) => {
    // A rolled-up record — the show with its seasons under it.
    if (row.has("seasons")) return traktRolledUp(row.obj("show") ?? row, row);
    const entry = traktPlay(row);
    return entry ? [entry] : [];
  });
}

function traktPlay(row: JsonObj): ImportedEntry | null {
  const entry = importedEntry();
  entry.watchedAt = row.date("watched_at") ?? row.date("collected_at") ?? row.date("rated_at");
  entry.rating = row.int("rating");
  const movie = row.obj("movie");
  const episode = row.obj("episode");
  const show = row.obj("show");
  if (movie) {
    entry.kind = "movies";
    entry.title = movie.string("title") ?? "";
    entry.year = movie.int("year");
    applyIds(movie.obj("ids"), entry);
  } else if (episode && show) {
    // The show sits beside the episode rather than around it: an episode's
    // own ids are the episode's, and the show's name and year are next door.
    entry.kind = "shows";
    entry.title = show.string("title") ?? "";
    entry.year = show.int("year");
    entry.season = episode.int("season");
    entry.episode = episode.int("number");
    entry.episodeTitle = episode.string("title");
    applyIds(show.obj("ids"), entry);
  } else if (show) {
    entry.kind = "shows";
    entry.title = show.string("title") ?? "";
    entry.year = show.int("year");
    applyIds(show.obj("ids"), entry);
  } else {
    return null;
  }
  return entry.title === "" && entry.tmdbID === null ? null : entry;
}

/**
 * `watched-shows.json`: every episode under its season, dated by the
 * episode's own last watch where it has one. A show with none of them still
 * belongs on the list.
 */
function traktRolledUp(show: JsonObj, row: JsonObj): ImportedEntry[] {
  const title = show.string("title") ?? "";
  if (title === "") return [];
  const year = show.int("year");
  const ids = show.obj("ids");
  const entries: ImportedEntry[] = [];
  for (const season of row.array("seasons")) {
    const number = season.int("number");
    for (const episode of season.array("episodes")) {
      const entry = importedEntry({ title, kind: "shows", year, season: number, episode: episode.int("number"), watchedAt: episode.date("last_watched_at") });
      applyIds(ids, entry);
      entries.push(entry);
    }
  }
  if (entries.length === 0) {
    const entry = importedEntry({ title, kind: "shows", year, watchedAt: row.date("last_watched_at") });
    applyIds(ids, entry);
    entries.push(entry);
  }
  return entries;
}

function applyIds(ids: JsonObj | null, entry: ImportedEntry) {
  if (!ids) return;
  entry.imdbID = ids.string("imdb");
  entry.tmdbID = ids.int("tmdb");
  entry.tvdbID = ids.int("tvdb");
}

// ---- Simkl: keyed by what a thing is, anime its own bucket beside shows and films ----

function simkl(json: unknown): ImportedEntry[] {
  if (!isJsonObject(json)) return [];
  const root = new JsonObj(json);
  return [
    ...root.array("movies").flatMap((row) => {
      const e = simklEntry(row, "movies");
      return e ? [e] : [];
    }),
    ...root.array("shows").flatMap(simklShow),
    ...root.array("anime").flatMap(simklShow),
  ];
}

function simklEntry(row: JsonObj, kind: "shows" | "movies"): ImportedEntry | null {
  const title = row.obj(kind === "movies" ? "movie" : "show");
  if (!title) return null;
  const entry = importedEntry({
    kind,
    title: title.string("title") ?? "",
    year: title.int("year"),
    watchedAt: row.date("last_watched_at"),
    rating: row.int("user_rating"),
    status: row.string("status"),
  });
  const ids = title.obj("ids");
  if (ids) {
    entry.imdbID = ids.string("imdb");
    entry.tmdbID = ids.int("tmdb");
    entry.tvdbID = ids.int("tvdb");
  }
  return entry.title === "" ? null : entry;
}

/**
 * A series and every episode the backup lists, then the series row itself,
 * which holds the rating, the status and the last-watched stamp. A completed
 * show with every episode counted and none listed is a finished run —
 * Simkl's export only walks the episodes of shows still in progress.
 */
function simklShow(row: JsonObj): ImportedEntry[] {
  const base = simklEntry(row, "shows");
  if (!base) return [];
  const counted = row.int("watched_episodes_count") ?? 0;
  const total = row.int("total_episodes_count") ?? 0;
  if (row.array("seasons").length === 0 && counted > 0 && counted >= total) base.finishedRun = true;
  const entries: ImportedEntry[] = [];
  for (const season of row.array("seasons")) {
    const number = season.int("number");
    for (const episode of season.array("episodes")) {
      // The series' verdict belongs to the series, not to each of its episodes.
      entries.push({ ...base, season: number, episode: episode.int("number"), watchedAt: episode.date("watched_at") ?? base.watchedAt, rating: null });
    }
  }
  entries.push(base);
  return entries;
}

// ---- SeriesGuide: shows with seasons and episodes under them, and films beside them ----

/** It holds no per-episode watch date at all, so what somebody watched survives the move and when cannot. */
function seriesGuide(json: unknown): ImportedEntry[] {
  if (!Array.isArray(json)) return [];
  return objectsOf(json).flatMap((row) => (row.has("seasons") ? seriesGuideShow(row) : seriesGuideMovie(row)));
}

function seriesGuideShow(row: JsonObj): ImportedEntry[] {
  const base = importedEntry({
    kind: "shows",
    title: row.string("title") ?? "",
    tmdbID: row.int("tmdb_id"),
    tvdbID: row.int("tvdb_id"),
    imdbID: row.string("imdb_id"),
  });
  if (base.title === "" && base.tmdbID === null && base.tvdbID === null) return [];
  const entries: ImportedEntry[] = [];
  for (const season of row.array("seasons")) {
    const number = season.int("season");
    for (const episode of season.array("episodes")) {
      if (!episode.bool("watched")) continue;
      // Nothing to date it with: `first_aired` is when it was broadcast, not when it was seen.
      entries.push({ ...base, season: number, episode: episode.int("episode"), episodeTitle: episode.string("title"), watchedAt: null, rating: episode.int("rating_user") });
    }
  }
  entries.push({ ...base, rating: row.int("rating_user"), watchedAt: row.date("last_watched_ms") });
  return entries;
}

function seriesGuideMovie(row: JsonObj): ImportedEntry[] {
  const watched = row.bool("watched");
  const entry = importedEntry({
    kind: "movies",
    title: row.string("title") ?? "",
    tmdbID: row.int("tmdb_id"),
    imdbID: row.string("imdb_id"),
    // Android only, kept here: a film SeriesGuide says was watched is filed as
    // watched. iOS reads `watched` as a filter and nothing more, so the status
    // falls to the watchlist or collection word, or none, and every film
    // somebody saw lands on To Watch ("Three import rules lose data" in the
    // Android port's backup-import.md). The status word is what the
    // importer's film rule reads when a row carries no date, and SeriesGuide's
    // never do.
    status: watched ? "watched" : row.bool("in_watchlist") ? "watchlist" : row.bool("in_collection") ? "collection" : null,
    watchedAt: null,
  });
  if (entry.title === "" && entry.tmdbID === null) return [];
  return watched || row.bool("in_watchlist") || row.bool("in_collection") ? [entry] : [];
}

// ---- Sofa Time: six files, one per list, and the list is named nowhere but in the file name ----

function sofaTime(json: unknown, fileName: string): ImportedEntry[] {
  if (!Array.isArray(json)) return [];
  const lower = fileName.toLowerCase();
  const list = lower.startsWith("stopwatching") ? "stopped" : lower.startsWith("watchlist") ? "watchlist" : "watched";
  return objectsOf(json).flatMap((row) => sofaTitle(row, list));
}

function sofaTitle(row: JsonObj, list: string): ImportedEntry[] {
  const release = row.string("release_date");
  const base = importedEntry({
    title: row.string("title") ?? "",
    kind: row.string("type") === "movie" ? "movies" : "shows",
    tmdbID: row.int("tmdb"),
    imdbID: row.string("imdb"),
    year: release === null ? null : toIntOrNull(release.slice(0, 4)),
    status: list,
    rating: row.int("rating"),
  });
  if (base.title === "" && base.tmdbID === null) return [];
  // A film's `addedDate` is the day it went on this list — a watch date only on the watched one.
  if (base.kind !== "shows") return [{ ...base, watchedAt: list === "watched" ? row.date("addedDate") : null }];
  const entries: ImportedEntry[] = [];
  for (const season of row.array("seasons")) {
    const number = season.int("number");
    for (const episode of season.array("episodes")) {
      // Taken as written, including the ones that are plainly an air date
      // Sofa filled in for a season marked in one go: what Sofa shows its
      // owner is what those dates say.
      entries.push({ ...base, season: number, episode: episode.int("number"), rating: episode.int("rating"), watchedAt: list === "watched" ? episode.date("addedDate") : null });
    }
  }
  entries.push({ ...base, watchedAt: null });
  return entries;
}

// ---- Showly: one file of lettered buckets ----

/**
 * `cH` is kept, `cW` meant to watch, `pEp` every episode ticked, `rS` and
 * `rM` verdicts. An episode record names no title, so the titles are gathered
 * from the buckets that have them and matched on Trakt's id.
 */
function showly(json: unknown): ImportedEntry[] {
  if (!isJsonObject(json)) return [];
  const root = new JsonObj(json);
  const shows = root.obj("shows");
  const movies = root.obj("movies");
  const bucket = (o: JsonObj | null, name: string) => o?.array(name) ?? [];

  const titles = new Map<number, string>();
  for (const name of ["cH", "cW", "pD", "pOH", "pP", "cHid"]) {
    for (const row of bucket(shows, name)) {
      const id = row.int("id");
      const title = row.string("t");
      if (id === null || title === null) continue;
      titles.set(id, title);
    }
  }
  const titleOf = (id: number | null) => (id === null ? "" : (titles.get(id) ?? ""));
  const entries: ImportedEntry[] = [];
  const keep = (entry: ImportedEntry) => {
    if (entry.title === "" && entry.tmdbID === null) return;
    entries.push(entry);
  };
  for (const [name, standing] of [["cH", "watching"], ["cW", "watchlist"], ["pD", "dropped"], ["pOH", "hold"]]) {
    for (const row of bucket(shows, name)) keep(importedEntry({ kind: "shows", title: row.string("t") ?? "", tmdbID: row.int("tmId"), status: standing, watchedAt: null }));
  }
  for (const row of bucket(shows, "pEp")) {
    keep(importedEntry({ kind: "shows", tmdbID: row.int("stmId"), title: titleOf(row.int("sId")), season: row.int("sN"), episode: row.int("eN"), watchedAt: row.date("a") }));
  }
  for (const row of bucket(shows, "rS")) {
    keep(importedEntry({ kind: "shows", tmdbID: row.int("tmId"), title: titleOf(row.int("id")), rating: row.int("r") }));
  }
  for (const row of bucket(shows, "rEp")) {
    keep(importedEntry({ kind: "shows", tmdbID: row.int("stmId"), title: titleOf(row.int("sId")), season: row.int("sN"), episode: row.int("eN"), rating: row.int("r") }));
  }
  for (const [name, standing] of [["cH", "watched"], ["cW", "watchlist"]]) {
    for (const row of bucket(movies, name)) {
      // On a film this is the night it was seen, and on the watchlist the
      // day it was added — which is not a viewing.
      keep(importedEntry({ kind: "movies", title: row.string("t") ?? "", tmdbID: row.int("tmId"), status: standing, watchedAt: standing === "watched" ? row.date("a") : null }));
    }
  }
  for (const row of bucket(movies, "rM")) {
    keep(importedEntry({ kind: "movies", tmdbID: row.int("tmId"), title: row.string("t") ?? "", rating: row.int("r") }));
  }
  return entries;
}
