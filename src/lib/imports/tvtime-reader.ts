import { csvValue, parseCsv, type CsvTable } from "./csv";
import { isJsonObject, parseJson } from "./table";
import { utf16Compare } from "./swift";
import { ktTrim, parseDate, titleKey, toIntOrNull, trimSpaces, truthy } from "./text";
import { emptyDiagnostics, TvTimeReadFailure, type TvTimeDiagnostics } from "./types";
import { looksLikeZip, readZip, type ZipEntry } from "./zip";

// Reading a TV Time export — Android's TvTimeReader.kt, from
// TVTimeArchive.swift bar the zip walker, which is `zip.ts` here.
//
// TV Time shut down on 15 July 2026 and deleted the data behind it, so nobody
// can produce a fresh export to test this against. Everything here is built
// from the documented shape of the GDPR export and from what other importers
// were seen to read, which means the reader's job is not only to read a file
// but to say precisely what it found when it can't — the file names inside the
// zip, the column headers inside the CSV. Those details are the only way the
// reader will ever get corrected.
//
// Pure value work over bytes. Nothing here touches TMDB or the library;
// `tvtime.ts` does that with what comes out.

/**
 * The export formats Kodigo knows the look of — iOS `TVTimeFormat`. Only the
 * GDPR CSVs are read; the other three are named so the failure can say
 * "that's a TV Time Out export" rather than the generic sentence.
 */
export const TV_TIME_FORMATS = {
  gdprCsv: "TV Time GDPR export",
  tvTimeOutJson: "TV Time Out (JSON)",
  tvTimeOutCsv: "TV Time Out (CSV)",
  liberatorCsv: "Liberator (CSV)",
} as const;

type TvTimeFormat = keyof typeof TV_TIME_FORMATS;

/** One series as TV Time had it, with every episode row that named it folded in. */
export interface TvTimeShow {
  title: string;
  /**
   * TheTVDB's series id, which TV Time was built on and TMDB will translate
   * exactly. When it's here, matching costs one lookup and can't pick the
   * wrong show.
   */
  tvdbID: number | null;
  episodes: TvTimeEpisode[];
  isFollowed: boolean;
  isForLater: boolean;
  isArchived: boolean;
  /** TV Time's favourite heart, which becomes a Loved reaction on the show. */
  isFavorited: boolean;
  ratedEpisodes: TvTimeEpisodeRating[];
}

export interface TvTimeEpisode {
  season: number;
  number: number;
  watchedAt: Date | null;
}

/** One episode's Wow/Good/Meh, named by season and number and resolved once the listings load. */
export interface TvTimeEpisodeRating {
  season: number;
  number: number;
  vote: number;
}

export interface TvTimeMovie {
  title: string;
  isWatched: boolean;
  isForLater: boolean;
  watchedAt: Date | null;
  ratingVote: number | null;
  /**
   * The year off the export's own release date. A film is the one thing in
   * the export carrying no public id at all, so its title and this year are
   * everything a match has to go on.
   */
  releaseYear: number | null;
}

/**
 * The year in brackets after a show's title — "Doctor Who (2005)" — which TV
 * Time used to separate revivals, and the tiebreaker when a search comes back
 * with two shows of one name.
 */
export function showYear(show: TvTimeShow) {
  return bracketedYear(show.title);
}

/** A film's year: the export's own, then whatever the title carries in brackets. */
export function movieYear(movie: TvTimeMovie) {
  return movie.releaseYear ?? bracketedYear(movie.title);
}

export interface TvTimeExport {
  shows: TvTimeShow[];
  movies: TvTimeMovie[];
  /** Episode rows with only TV Time's own episode id, which nothing can place in a season. */
  episodesWithoutNumbers: number;
  diagnostics: TvTimeDiagnostics;
}

/** "Doctor Who (2005)" → 2005. Four characters that are a number, between the last `(` and a final `)`. */
export function bracketedYear(title: string): number | null {
  const open = title.lastIndexOf("(");
  if (open < 0 || !title.endsWith(")")) return null;
  const inner = title.slice(open + 1, title.length - 1);
  return inner.length === 4 ? toIntOrNull(inner) : null;
}

/**
 * Column names. Exports disagree with each other about what a column is
 * called — `episode_id` and `ep_id` both appear for one field — so each field
 * lists every spelling it answers to, compared after the header is folded. In
 * preference order. iOS `TVTimeColumn`.
 */
const Col = {
  showTitle: ["seriesname", "tvshowname", "showname", "seriestitle", "showtitle", "tvshow", "series", "show"],
  movieTitle: ["moviename", "movietitle", "movie", "filmname", "film"],
  season: ["seasonnumber", "episodeseasonnumber", "sno", "seasonno", "season"],
  episode: ["episodenumber", "epno", "episodeno", "epnumber", "episode"],
  episodeID: ["episodeid", "epid", "episodeuuid"],
  showID: ["tvdbid", "tvdbseriesid", "tvshowid", "seriesid", "showid", "sid"],
  /** `created_at` is when a watch row was written, which is when it was checked off. */
  watchedAt: ["createdat", "watchdate", "watchedat", "date", "updatedat"],
  type: ["type", "entitytype", "recordtype"],
  followed: ["isfollowed", "followed", "active"],
  forLater: ["isforlater", "forlater"],
  archived: ["isarchived", "archived"],
  favorited: ["isfavorited", "favorited", "isfavourited", "favourited", "favorite", "favourite"],
  specialStatus: ["specialstatus", "status"],
  voteKey: ["votekey", "vote", "ratingkey", "voteid", "ratingid"],
  releaseDate: ["releasedate", "firstaired", "released", "year"],
};

const ALL_COLUMNS = new Set(Object.values(Col).flat());

/** Files worth pulling out of a zip. Everything else in a GDPR export is account and device data. */
const WANTED_EXTENSIONS = [".csv", ".json"];

interface Named {
  name: string;
  table: CsvTable;
}

const intersects = (set: Set<string>, names: string[]) => names.some((n) => set.has(n));

/** A file's own name, without the folder the archive kept it in. */
const lastPath = (name: string) => name.slice(name.lastIndexOf("/") + 1);
/** The same, lowercased, for comparing against the names TV Time used. */
const base = (name: string) => lastPath(name).toLowerCase();

/**
 * Reads whatever was picked and returns the export inside it, or throws a
 * `TvTimeReadFailure`. The person is never asked which format they have:
 * entry names if it's a zip, column headers if it's a CSV, top-level keys if
 * it's JSON.
 */
export function readTvTime(data: Uint8Array, name: string): TvTimeExport {
  return readTvTimeFiles([{ name, data }]);
}

/**
 * The same over several picked files at once, read as one export — a zip and
 * a loose ratings file, say. The phones take one file; with one file this is
 * exactly their read.
 */
export function readTvTimeFiles(picked: { name: string; data: Uint8Array }[]): TvTimeExport {
  let diagnostics = emptyDiagnostics(picked.map((p) => p.name).join(", "));
  const files: ZipEntry[] = [];
  for (const { name, data } of picked) {
    if (looksLikeZip(data)) {
      let contents;
      try {
        contents = readZip(data, WANTED_EXTENSIONS);
      } catch {
        throw new TvTimeReadFailure({ kind: "archiveUnreadable" }, diagnostics);
      }
      // Recorded before anything is judged, so the failure can list what the
      // archive held even when none of it was usable.
      diagnostics = { ...diagnostics, filesInArchive: [...diagnostics.filesInArchive, ...contents.names] };
      files.push(...contents.payloads);
    } else {
      files.push({ name: lastPath(name), data });
    }
  }
  if (files.length === 0) throw new TvTimeReadFailure({ kind: "nothingRecognised" }, diagnostics);

  const tables: Named[] = [];
  const jsonNames: string[] = [];
  const headers: Record<string, string[]> = {};
  for (const file of files) {
    if (file.name.toLowerCase().endsWith(".json")) {
      jsonNames.push(file.name);
      continue;
    }
    const table = parseCsv(file.data);
    if (!table) continue;
    headers[file.name] = table.headers;
    tables.push({ name: file.name, table });
  }
  diagnostics = { ...diagnostics, headers };

  // A single picked file that is neither a zip, nor a CSV, nor JSON — "you've
  // picked the wrong file", which is different news from "this export has a
  // shape I don't know".
  if (diagnostics.filesInArchive.length === 0 && tables.length === 0 && jsonNames.length === 0) {
    throw new TvTimeReadFailure({ kind: "notAnArchive" }, diagnostics);
  }

  const format = detect(tables, jsonNames, files, diagnostics);
  if (format === "gdprCsv") return readGdpr(tables, diagnostics);
  throw new TvTimeReadFailure({ kind: "notSupportedYet", formatLabel: TV_TIME_FORMATS[format] }, diagnostics);
}

/** Which export this is, decided from content rather than a file name alone. */
function detect(tables: Named[], jsonNames: string[], files: ZipEntry[], diagnostics: TvTimeDiagnostics): TvTimeFormat {
  if (tables.some((t) => base(t.name).startsWith("tracking-prod-records"))) return "gdprCsv";
  // Its shape, failing its names: a title beside an episode, or beside a
  // follow flag or a vote — detection has to admit everything the passes
  // below can use, or an export handed over without its tracking file is
  // turned away when it would read perfectly well.
  const looksLikeTracking = tables.some(({ table }) => {
    const h = new Set(table.foldedHeaders);
    const hasTitle = intersects(h, Col.showTitle) || intersects(h, Col.movieTitle);
    if (!hasTitle) return false;
    const hasEpisode = intersects(h, Col.episodeID) || intersects(h, Col.episode);
    const hasStanding =
      intersects(h, Col.followed) || intersects(h, Col.forLater) || intersects(h, Col.archived) ||
      intersects(h, Col.favorited) || intersects(h, Col.specialStatus) || intersects(h, Col.voteKey);
    return hasEpisode || hasStanding;
  });
  if (looksLikeTracking) return "gdprCsv";

  if (jsonNames.length > 0) {
    const names = jsonNames.map((n) => n.toLowerCase());
    if (names.some((n) => n.includes("tvtime") || n.includes("tv-time") || n.includes("export"))) return "tvTimeOutJson";
    const json = files.find((f) => f.name.toLowerCase().endsWith(".json"));
    const obj = json ? parseJson(json.data) : undefined;
    if (isJsonObject(obj)) {
      const keys = new Set(Object.keys(obj).map((k) => k.toLowerCase()));
      if (intersects(keys, ["shows", "series", "seen_episodes", "watched_episodes", "episodes"])) return "tvTimeOutJson";
    }
  }
  if (tables.some(({ table }) => table.foldedHeaders.includes("tvshowname") && table.foldedHeaders.includes("seasonnumber"))) return "tvTimeOutCsv";
  if (tables.some(({ table }) => ["title", "season", "episode"].every((h) => table.foldedHeaders.includes(h)))) return "liberatorCsv";
  throw new TvTimeReadFailure({ kind: "nothingRecognised" }, diagnostics);
}

function isTrackingShaped(table: CsvTable) {
  const h = new Set(table.foldedHeaders);
  const hasTitle = intersects(h, Col.showTitle) || intersects(h, Col.movieTitle);
  const hasEpisode = intersects(h, Col.episodeID) || intersects(h, Col.episode);
  return hasTitle && hasEpisode;
}

function earliest(a: Date | null, b: Date | null): Date | null {
  if (a && b) return a.getTime() <= b.getTime() ? a : b;
  return a ?? b;
}

/**
 * Folds every tracking file into one export. Each row says what it is about
 * by carrying a series name or a movie name, and the row is trusted over the
 * file name, so an export whose two files came back swapped, merged or
 * renamed still reads. iOS `readGDPR`.
 */
function readGdpr(tables: Named[], start: TvTimeDiagnostics): TvTimeExport {
  const showsByKey = new Map<string, TvTimeShow>();
  const moviesByKey = new Map<string, TvTimeMovie>();
  const unrecognised = new Set<string>();
  const filesRead: string[] = [];
  let rowsRead = 0;
  let rowsUsed = 0;
  let episodesWithoutNumbers = 0;
  // The same episode appears once per rewatch, and the watched set is a set
  // — so a repeat folds into the row already held, keeping the earliest
  // stamp. Keyed to the position in that show's list, because the file is in
  // no guaranteed order.
  const episodeIndex = new Map<string, number>();

  const noteHeaders = (table: CsvTable) => {
    for (const h of table.foldedHeaders) if (h && !ALL_COLUMNS.has(h)) unrecognised.add(h);
  };
  const show = (title: string): TvTimeShow => {
    const key = titleKey(title);
    let s = showsByKey.get(key);
    if (!s) {
      s = { title, tvdbID: null, episodes: [], isFollowed: false, isForLater: false, isArchived: false, isFavorited: false, ratedEpisodes: [] };
      showsByKey.set(key, s);
    }
    return s;
  };
  const movie = (title: string): TvTimeMovie => {
    const key = titleKey(title);
    let m = moviesByKey.get(key);
    if (!m) {
      m = { title, isWatched: false, isForLater: false, watchedAt: null, ratingVote: null, releaseYear: null };
      moviesByKey.set(key, m);
    }
    return m;
  };
  const noteTvdb = (s: TvTimeShow, table: CsvTable, row: string[]) => {
    if (s.tvdbID === null) {
      const id = toIntOrNull(csvValue(table, row, Col.showID));
      if (id !== null) s.tvdbID = id;
    }
  };

  // 1. History. Ratings files are tracking-shaped too, but belong to the
  // ratings pass: read here, a rating date would fold in as a watch night.
  for (const { name, table } of tables) {
    if (base(name).startsWith("ratings")) continue;
    if (!base(name).startsWith("tracking-prod-records") && !isTrackingShaped(table)) continue;
    filesRead.push(name);
    noteHeaders(table);
    for (const row of table.rows) {
      rowsRead++;
      const type = (csvValue(table, row, Col.type) ?? "").toLowerCase();
      // Aggregate rows — "count-week", "count-month" — carry a title and no episode.
      if (type.startsWith("count")) continue;

      const movieTitle = csvValue(table, row, Col.movieTitle);
      if (movieTitle !== null) {
        const m = movie(movieTitle);
        if (m.releaseYear === null) {
          const y = releaseYear(csvValue(table, row, Col.releaseDate));
          if (y !== null) m.releaseYear = y;
        }
        if (type === "towatch" || type === "follow" || type === "watchlist") {
          m.isForLater = true;
        } else if (type === "" || type === "watch" || type === "rewatch" || type === "seen") {
          m.isWatched = true;
          m.watchedAt = earliest(m.watchedAt, parseDate(csvValue(table, row, Col.watchedAt)));
        } else {
          continue;
        }
        rowsUsed++;
        continue;
      }

      const showTitle = csvValue(table, row, Col.showTitle);
      if (showTitle === null) continue;
      const s = show(showTitle);
      noteTvdb(s, table, row);
      if (truthy(csvValue(table, row, Col.followed))) s.isFollowed = true;
      if (truthy(csvValue(table, row, Col.forLater))) s.isForLater = true;
      if (truthy(csvValue(table, row, Col.archived))) s.isArchived = true;

      const season = toIntOrNull(csvValue(table, row, Col.season));
      const number = toIntOrNull(csvValue(table, row, Col.episode));
      if (season === null || number === null) {
        // Placeable only with a TMDB request per episode, which for a decade
        // of history is thousands. Counted and reported.
        if (csvValue(table, row, Col.episodeID) !== null) episodesWithoutNumbers++;
        continue;
      }
      const stamp = parseDate(csvValue(table, row, Col.watchedAt));
      const episodeKey = `${titleKey(showTitle)}|${season}|${number}`;
      const at = episodeIndex.get(episodeKey);
      if (at !== undefined) {
        if (at < s.episodes.length) {
          const kept = earliest(s.episodes[at].watchedAt, stamp);
          if (kept !== s.episodes[at].watchedAt) s.episodes[at] = { season, number, watchedAt: kept };
        }
        continue;
      }
      episodeIndex.set(episodeKey, s.episodes.length);
      s.episodes.push({ season, number, watchedAt: stamp });
      rowsUsed++;
    }
  }

  // 2. Standing files: shows followed or saved for later with no episode
  // row, which the history pass never saw.
  for (const { name, table } of tables) {
    const lower = base(name);
    if (lower.startsWith("tracking-prod-records") || lower.startsWith("ratings") || isTrackingShaped(table)) continue;
    const h = new Set(table.foldedHeaders);
    const hasTitle = intersects(h, Col.showTitle);
    const hasSignal =
      intersects(h, Col.followed) || intersects(h, Col.forLater) || intersects(h, Col.archived) ||
      intersects(h, Col.favorited) || intersects(h, Col.specialStatus);
    if (!hasTitle || !hasSignal) continue;
    filesRead.push(name);
    noteHeaders(table);
    for (const row of table.rows) {
      const showTitle = csvValue(table, row, Col.showTitle);
      if (showTitle === null) continue;
      const s = show(showTitle);
      noteTvdb(s, table, row);
      if (truthy(csvValue(table, row, Col.followed))) s.isFollowed = true;
      if (truthy(csvValue(table, row, Col.forLater))) s.isForLater = true;
      if (truthy(csvValue(table, row, Col.archived))) s.isArchived = true;
      if (truthy(csvValue(table, row, Col.favorited))) s.isFavorited = true;
      if ((csvValue(table, row, Col.specialStatus) ?? "").toLowerCase() === "for_later") s.isForLater = true;
      rowsUsed++;
    }
  }

  // 3. Favourites, which are not where anybody would look for them: the
  // tracking file's `is_favorited` is nought on every row of every export
  // seen, and the real hearts are in `lists-prod-lists.csv`, in a Go map
  // printed as text. Series only — a favourite film is named by TV Time's own
  // uuid, which no public catalogue can be asked about.
  for (const { name, table } of tables) {
    if (!base(name).startsWith("lists-prod-lists")) continue;
    const keyIndex = table.foldedHeaders.indexOf("skey");
    const objectsIndex = table.foldedHeaders.indexOf("objects");
    if (keyIndex < 0 || objectsIndex < 0) continue;
    if (!filesRead.includes(name)) filesRead.push(name);
    for (const row of table.rows) {
      if (keyIndex >= row.length || row[keyIndex] !== "favorite-series" || objectsIndex >= row.length) continue;
      for (const id of favoriteSeriesIDs(row[objectsIndex])) {
        // Only shows the export already named: one favourited and never
        // watched has no title anywhere in the file.
        for (const s of showsByKey.values()) {
          if (s.tvdbID === id) {
            s.isFavorited = true;
            rowsUsed++;
          }
        }
      }
    }
  }

  // 4. Ratings: a film's rides on the film, an episode's is gathered onto its
  // show and resolved to a TMDB episode in the importer.
  for (const { name, table } of tables) {
    const h = new Set(table.foldedHeaders);
    if (!base(name).startsWith("ratings") && !intersects(h, Col.voteKey)) continue;
    filesRead.push(name);
    noteHeaders(table);
    for (const row of table.rows) {
      const vote = voteValue(csvValue(table, row, Col.voteKey));
      if (vote === null) continue;
      const movieTitle = csvValue(table, row, Col.movieTitle);
      if (movieTitle !== null) {
        movie(movieTitle).ratingVote = vote;
        rowsUsed++;
        continue;
      }
      const showTitle = csvValue(table, row, Col.showTitle);
      if (showTitle === null) continue;
      const season = toIntOrNull(csvValue(table, row, Col.season));
      if (season === null) continue;
      const number = toIntOrNull(csvValue(table, row, Col.episode));
      if (number === null) continue;
      const s = show(showTitle);
      noteTvdb(s, table, row);
      s.ratedEpisodes.push({ season, number, vote });
      rowsUsed++;
    }
  }

  const diagnostics: TvTimeDiagnostics = {
    ...start,
    filesRead,
    unrecognisedHeaders: [...unrecognised].sort(utf16Compare),
    rowsRead,
    rowsUsed,
  };
  if (showsByKey.size === 0 && moviesByKey.size === 0) throw new TvTimeReadFailure({ kind: "noRowsUsable" }, diagnostics);
  return { shows: [...showsByKey.values()], movies: [...moviesByKey.values()], episodesWithoutNumbers, diagnostics };
}

/**
 * The TheTVDB ids out of one of those printed Go maps —
 * `[map[created_at:1.563396086e+09 id:75897 type:series] map[…]]`. Only
 * entries saying `type:series` count; a film's entry carries a uuid where
 * this expects a number.
 */
export function favoriteSeriesIDs(text: string): number[] {
  const out: number[] = [];
  for (const m of text.matchAll(/id:([0-9]+)[^\]]*?type:series/g)) {
    const id = toIntOrNull(m[1]);
    if (id !== null) out.push(id);
  }
  return out;
}

/** "episode-3" → 3: the number after the last dash, which is the vote type (3 Wow, 27 Good, 29 Meh). */
function voteValue(raw: string | null): number | null {
  const text = raw === null ? "" : trimSpaces(raw);
  if (!text) return null;
  const parts = text.split("-").filter((p) => p.length > 0);
  const tail = parts.length > 0 ? parts[parts.length - 1] : text;
  return toIntOrNull(trimSpaces(tail));
}

/**
 * The year at the front of a release date. `0000` and `0000-00-00` — what an
 * export writes for a film it has no date for — fall out on the bounds.
 */
function releaseYear(text: string | null): number | null {
  if (text === null) return null;
  const t = trimSpaces(text);
  if (t.length < 4) return null;
  const year = toIntOrNull(t.slice(0, 4));
  return year !== null && year >= 1801 && year <= 2199 ? year : null;
}

/** The title with a trailing "(yyyy)" taken off, since TMDB's search matches on the name. */
export function searchable(title: string): string {
  let text = ktTrim(title);
  const open = text.lastIndexOf("(");
  if (text.endsWith(")") && open >= 0) {
    const inner = text.slice(open + 1, text.length - 1);
    if (inner.length === 4 && toIntOrNull(inner) !== null) text = trimSpaces(text.slice(0, open));
  }
  return text;
}

/**
 * The whole diagnostics as text, for a "Copy what the file looked like"
 * button. Plain English and unlocalised, as on the phones: it is written to
 * be pasted into a message to whoever corrects the reader.
 */
export function diagnosticsReport(d: TvTimeDiagnostics): string {
  const lines = [`Picked: ${d.pickedName}`];
  if (d.filesInArchive.length > 0) {
    lines.push("Files in the archive:");
    for (const f of d.filesInArchive) lines.push(`  ${f}`);
  }
  if (d.filesRead.length > 0) lines.push(`Read: ${d.filesRead.join(", ")}`);
  for (const name of Object.keys(d.headers).sort(utf16Compare)) {
    lines.push(`Columns in ${name}:`);
    lines.push(`  ${(d.headers[name] ?? []).join(" | ")}`);
  }
  if (d.unrecognisedHeaders.length > 0) lines.push(`Columns not recognised: ${d.unrecognisedHeaders.join(", ")}`);
  lines.push(`Rows read: ${d.rowsRead}, rows used: ${d.rowsUsed}`);
  return lines.join("\n");
}
