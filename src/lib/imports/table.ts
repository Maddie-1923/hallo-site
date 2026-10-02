import { parseCsv } from "./csv";
import { moodsIn, readMoodTags } from "./moods";
import { cleanReviewText, cut, type ImportedReview } from "./reviews";
import { fold, ktTrim, parseDate, toDoubleOrNull, toIntOrNull, trimSpaces, truthy } from "./text";

// Reading an export from any app as a table — Android's UniversalImport.kt,
// from UniversalImport.swift.
//
// Every tracker exports the same handful of facts — a title, a year, sometimes
// a season and an episode, a date, a rating — and disagrees only about what to
// call them and how to punctuate them. So this reads a table rather than a
// format: the file is parsed into rows, and each column is guessed at from its
// name and from what is in it. A named app is a short list of aliases on top
// (`presets.ts`) rather than a reader of its own.
//
// Nothing here touches TMDB or the library.

/** The facts worth pulling out of somebody else's export — iOS `ImportField`, in its declared order. */
export type ImportField =
  | "title"
  | "year"
  | "season"
  | "episode"
  | "episodeTitle"
  | "episodeCode"
  | "watchedAt"
  | "rating"
  | "kind"
  | "status"
  | "favorite"
  | "watched"
  | "imdbID"
  | "tmdbID"
  | "tvdbID";

/**
 * Each field's aliases, most specific first, in the fields' declared order —
 * which is the order the guesser claims columns in, so it matters.
 */
export const IMPORT_FIELDS: readonly (readonly [ImportField, readonly string[]])[] = [
  ["title", ["title", "name", "seriesname", "showname", "tvshowname", "movietitle", "moviename", "filmtitle", "filmname", "primarytitle", "originaltitle", "show", "series", "movie", "film"]],
  ["year", ["year", "releaseyear", "releasedate", "firstaired", "startyear", "released", "premiered"]],
  ["season", ["season", "seasonnumber", "seasonno", "sno", "episodeseasonnumber"]],
  ["episode", ["episode", "episodenumber", "episodeno", "epno", "epnumber", "number"]],
  ["episodeTitle", ["episodetitle", "episodename", "epname", "eptitle"]],
  // A season and an episode in one cell — `s1e2`, Simkl's last episode watched.
  ["episodeCode", ["lastepwatched", "lastwatchedepisode", "episodecode", "code"]],
  // Listed before `watched`, as on iOS, and so a yes/no column headed
  // "Watched" is claimed as the date column by the guesser — iOS behaviour
  // the spec flags; presets name their columns and aren't affected.
  ["watchedAt", ["watcheddate", "watchedat", "lastwatchedat", "dateswatched", "datewatched", "lastwatched", "seenat", "watched", "createdat", "daterated", "ratedat", "collectedat", "listedat", "date", "timestamp", "updatedat"]],
  ["rating", ["yourrating", "myrating", "rating", "score", "userrating", "vote", "stars"]],
  // Film or show, where the file says so in a column — `movie`/`episode`, `Movie`/`TV Series`.
  ["kind", ["type", "entitytype", "titletype", "mediatype", "recordtype", "itemtype"]],
  ["status", ["liststatus", "watchlist", "status", "list", "state", "collection", "specialstatus"]],
  // The heart somebody put on a title, a separate axis from a rating.
  ["favorite", ["favorite", "favourite", "isfavorited", "isfavourited", "liked", "love"]],
  // Whether the row was watched at all, which a few exports carry beside rows that weren't.
  ["watched", ["watched", "iswatched", "seen", "isseen", "hasseen"]],
  ["imdbID", ["imdbid", "imdb", "const", "tconst", "imdburl", "imdblink"]],
  ["tmdbID", ["tmdbid", "tmdb", "themoviedbid", "moviedbid"]],
  ["tvdbID", ["tvdbid", "tvdb", "thetvdbid", "seriesid", "sid", "tvshowid"]],
];

export const FIELD_ORDER: readonly ImportField[] = IMPORT_FIELDS.map(([f]) => f);

/** A row with no title and no id is not a row about anything. */
export function isIdentifying(field: ImportField) {
  return field === "title" || field === "imdbID" || field === "tmdbID" || field === "tvdbID";
}

/**
 * What the rows in a file are about, where the file itself settles it —
 * iOS `ImportTitleKind`. "either" is decided per row: a file holding both, or
 * one that doesn't say.
 */
export type ImportTitleKind = "shows" | "movies" | "either";

/** Any export, as columns and rows — iOS `ImportTable`. */
export class ImportTable {
  readonly foldedHeaders: string[];

  constructor(
    readonly headers: string[],
    readonly rows: string[][],
  ) {
    this.foldedHeaders = headers.map(fold);
  }

  /**
   * Reads a CSV, or a JSON array of flat objects, into a table. JSON is tried
   * first, and only when the file looks like JSON: the CSV parser accepts
   * very nearly anything, and a JSON export offered to it first came back as
   * a table of braces rather than failing.
   */
  static read(data: Uint8Array): ImportTable | null {
    if (looksLikeJson(data)) {
      const json = ImportTable.readJson(data);
      if (json) return json;
    }
    const csv = parseCsv(banner(asUtf8(data)));
    if (csv) return new ImportTable(csv.headers, csv.rows);
    return ImportTable.readJson(data);
  }

  /**
   * JSON's keys become the columns, unioned across the first two hundred
   * objects rather than taken from the first alone — exporters leave a key
   * out where it is empty, so the first film with no rating would otherwise
   * decide the file has no rating column at all.
   */
  static readJson(data: Uint8Array): ImportTable | null {
    const root = parseJson(data);
    if (root === undefined) return null;
    const objects = flatten(root);
    if (objects.length === 0) return null;
    const keys = new Set<string>();
    for (const entry of objects.slice(0, 200)) for (const key of Object.keys(entry).sort()) keys.add(key);
    if (keys.size === 0) return null;
    const columns = [...keys];
    return new ImportTable(
      columns,
      objects.map((entry) => columns.map((c) => cell(Object.prototype.hasOwnProperty.call(entry, c) ? entry[c] : undefined))),
    );
  }

  /**
   * JSON Lines — one object to a line, Refract's `data/*.jsonl` — into a
   * table the same way. An object inside a record (Refract's `item`, which
   * holds the title and its ids) has its plain values lifted up beside the
   * record's own, which win a clash; a list of plain values (`moodTags`)
   * becomes one cell, comma-separated. A line that isn't an object is
   * skipped, and a file with none is no table.
   */
  static readJsonLines(data: Uint8Array): ImportTable | null {
    const objects: JsonObject[] = [];
    for (const line of keepBom.decode(data).replace(/^\uFEFF/, "").split("\n")) {
      if (!line.trim()) continue;
      let parsed: unknown;
      try {
        parsed = JSON.parse(line);
      } catch {
        continue;
      }
      if (!isJsonObject(parsed)) continue;
      const flat: JsonObject = {};
      for (const [key, value] of Object.entries(parsed)) {
        if (isJsonObject(value)) for (const [inner, v] of Object.entries(value)) if (!isJsonObject(v) && !Array.isArray(v) && !(inner in parsed)) flat[inner] = v;
        if (Array.isArray(value) && value.every((v) => !isJsonObject(v) && !Array.isArray(v))) flat[key] = value.map(cell).filter((v) => v).join(", ");
        else if (!isJsonObject(value) && !Array.isArray(value)) flat[key] = value;
      }
      objects.push(flat);
    }
    if (objects.length === 0) return null;
    const keys = new Set<string>();
    for (const entry of objects.slice(0, 200)) for (const key of Object.keys(entry).sort()) keys.add(key);
    const columns = [...keys];
    return new ImportTable(
      columns,
      objects.map((entry) => columns.map((c) => cell(Object.prototype.hasOwnProperty.call(entry, c) ? entry[c] : undefined))),
    );
  }
}

type JsonObject = Record<string, unknown>;

const keepBom = new TextDecoder("utf-8", { ignoreBOM: true });

/** JSON as the Kotlin parser reads it — strict, and a byte-order mark is not whitespace. Undefined when it isn't JSON. */
export function parseJson(data: Uint8Array): unknown {
  try {
    return JSON.parse(keepBom.decode(data));
  } catch {
    return undefined;
  }
}

export function isJsonObject(v: unknown): v is JsonObject {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/**
 * Windows-1252 as Java decodes it: Latin-1, with the printable characters
 * Microsoft put in 0x80–0x9F, and the five bytes it left undefined becoming
 * U+FFFD.
 */
const CP1252_HIGH = [
  0x20ac, 0xfffd, 0x201a, 0x0192, 0x201e, 0x2026, 0x2020, 0x2021, 0x02c6, 0x2030, 0x0160, 0x2039, 0x0152, 0xfffd, 0x017d, 0xfffd,
  0xfffd, 0x2018, 0x2019, 0x201c, 0x201d, 0x2022, 0x2013, 0x2014, 0x02dc, 0x2122, 0x0161, 0x203a, 0x0153, 0xfffd, 0x017e, 0x0178,
];

const strictUtf8 = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true });

/**
 * The bytes as UTF-8, whatever they were written as. IMDb writes Windows'
 * own single-byte encoding and has since 2017, and read as UTF-8 every
 * accented title — Amélie, Rashômon — arrives as rubble and matches nothing
 * on TMDB. Valid UTF-8 is left exactly alone.
 */
function asUtf8(data: Uint8Array): Uint8Array {
  try {
    strictUtf8.decode(data);
    return data;
  } catch {
    let text = "";
    for (const b of data) text += String.fromCharCode(b >= 0x80 && b <= 0x9f ? CP1252_HIGH[b - 0x80] : b);
    return new TextEncoder().encode(text);
  }
}

/**
 * Letterboxd writes a list with a banner line and a one-row table about the
 * list, then a blank line, then the films. Everything up to and including
 * the first blank line is the list's; what follows is the table this is
 * after.
 *
 * A line holding only a carriage return counts as blank here. iOS's test for
 * blank leaves the return in, so a list saved with Windows line endings
 * keeps its banner there; Android doesn't copy that, and nor does this.
 */
function banner(data: Uint8Array): Uint8Array {
  const text = keepBom.decode(data);
  if (!text.startsWith("Letterboxd list export")) return data;
  const lines = text.split("\n");
  const blank = lines.findIndex((l) => trimSpaces(l.endsWith("\r") ? l.slice(0, -1) : l).length === 0);
  if (blank < 0 || blank + 1 >= lines.length) return data;
  return new TextEncoder().encode(lines.slice(blank + 1).join("\n"));
}

/** The first non-space byte of the first 64 is a brace or a bracket. */
function looksLikeJson(data: Uint8Array): boolean {
  for (let i = 0; i < Math.min(64, data.length); i++) {
    const b = data[i];
    if (b === 0x20 || b === 0x09 || b === 0x0a || b === 0x0d) continue;
    return b === 0x7b || b === 0x5b;
  }
  return false;
}

/**
 * The array of objects inside a JSON export, wherever it is: the longest one
 * anywhere in the document, which is the history in every shape seen. An
 * array holding anything but objects is not one.
 */
function flatten(element: unknown): JsonObject[] {
  if (Array.isArray(element) && element.every(isJsonObject)) return element as JsonObject[];
  let best: JsonObject[] = [];
  if (isJsonObject(element)) {
    for (const value of Object.values(element)) {
      const found = flatten(value);
      if (found.length > best.length) best = found;
    }
  }
  return best;
}

/**
 * A JSON value as the text a column holds. A whole number prints without a
 * trailing `.0`, since a season arriving as `1.0` matches nothing. A boolean
 * prints as `1` or `0`, which is what iOS's `JSONSerialization` hands over
 * for one — it arrives as a number.
 */
function cell(value: unknown): string {
  if (value === undefined || value === null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "boolean") return value ? "1" : "0";
  if (typeof value === "number") return numberText(value);
  return JSON.stringify(value);
}

/**
 * A JSON number's text as iOS prints it: whole numbers bare, the rest as a
 * double in Java's spelling, which is what Android's reader matches against.
 */
export function numberText(n: number): string {
  if (Number.isInteger(n) && Math.abs(n) < 9.2e18) return BigInt(n).toString();
  const abs = Math.abs(n);
  if (abs >= 1e-3 && abs < 1e7) return String(n);
  // Java's Double.toString switches to its own exponent form out here.
  const [mantissa, exp] = n.toExponential().split("e");
  return `${mantissa.includes(".") ? mantissa : `${mantissa}.0`}E${Number(exp)}`;
}

/** Which column holds which fact — iOS `ImportMapping`, as column indices. */
export class ImportMapping {
  readonly columns = new Map<ImportField, number>();

  get(field: ImportField) {
    return this.columns.get(field) ?? null;
  }

  set(field: ImportField, index: number) {
    this.columns.set(field, index);
  }

  /** Whether this mapping names something a row can be identified by. */
  get isUsable() {
    return [...this.columns.keys()].some(isIdentifying);
  }
}

/**
 * Works out what each column is from its name, and failing that from what is
 * in it — iOS `ImportGuesser`. Names first, most specific alias first, so
 * `episode_name` is an episode title before `name` can claim it as the show's.
 */
export function guessMapping(table: ImportTable): ImportMapping {
  const mapping = new ImportMapping();
  const claimed = new Set<number>();
  const folded = table.foldedHeaders;
  for (const [field, aliases] of IMPORT_FIELDS) {
    for (const alias of aliases) {
      const index = folded.indexOf(alias);
      if (index < 0 || claimed.has(index)) continue;
      mapping.set(field, index);
      claimed.add(index);
      break;
    }
  }
  // What the columns hold, for the ones still unclaimed. A file with no
  // header row at all lands here with nothing mapped, and this saves it.
  for (let index = 0; index < table.headers.length; index++) {
    if (claimed.has(index)) continue;
    const values = table.rows
      .slice(0, 40)
      .filter((r) => index < r.length)
      .map((r) => trimSpaces(r[index]))
      .filter((v) => v.length > 0);
    if (values.length < 3) continue;
    if (mapping.get("imdbID") === null && values.every(looksLikeImdbID)) {
      mapping.set("imdbID", index);
      claimed.add(index);
    } else if (mapping.get("watchedAt") === null && values.every((v) => parseDate(v) !== null)) {
      mapping.set("watchedAt", index);
      claimed.add(index);
    } else if (mapping.get("year") === null && values.every(looksLikeYear)) {
      mapping.set("year", index);
      claimed.add(index);
    }
  }
  return mapping;
}

/**
 * Where a file nobody recognised keeps somebody's own take on a title, by
 * column name (case and punctuation folded) — never by what's in a column,
 * so a column of free text is only a review when it says so. `tags` is read
 * as moods only when every tag in it is one.
 */
const TAKE_COLUMNS = {
  review: ["review", "reviews", "reviewtext", "comment", "comments", "body", "myreview"],
  note: ["note", "notes", "memo", "privatenote", "privatenotes"],
  spoilers: ["spoiler", "spoilers", "isspoiler", "containsspoilers", "hasspoilers"],
  moods: ["mood", "moods", "vibe", "vibes", "emotion", "emotions"],
  writtenAt: ["reviewdate", "reviewed", "reviewedat", "createdat", "written"],
};

/**
 * What reads a review, a private note, spoilers and moods off a guessed
 * file's rows, or nothing when it has none of those columns. A column the
 * mapping already took is left to it — except the date, since `created_at`
 * can be both the night and the day a review was written. A row bringing
 * only these, with no date, standing, rating or heart, is a take on a title
 * rather than a sign it was watched, and doesn't add the title.
 */
export function guessTakeReader(table: ImportTable, mapping: ImportMapping): ((entry: ImportedEntry, row: string[]) => void) | undefined {
  const mapped = new Set(mapping.columns.values());
  const find = (names: string[], free = true) => {
    for (const name of names) {
      const index = table.foldedHeaders.indexOf(name);
      if (index >= 0 && (!free || !mapped.has(index))) return index;
    }
    return -1;
  };
  const review = find(TAKE_COLUMNS.review);
  const note = find(TAKE_COLUMNS.note);
  const spoilers = find(TAKE_COLUMNS.spoilers);
  const written = find(TAKE_COLUMNS.writtenAt, false);
  let moods = find(TAKE_COLUMNS.moods);
  if (moods < 0) {
    const tags = find(["tags"]);
    const values = tags < 0 ? [] : table.rows.map((r) => (tags < r.length ? ktTrim(r[tags]) : "")).filter((v) => v);
    if (values.length > 0 && values.every((v) => readMoodTags(v).unknown === 0)) moods = tags;
  }
  if (review < 0 && note < 0 && moods < 0) return undefined;
  const at = (row: string[], index: number) => (index >= 0 && index < row.length ? ktTrim(row[index]) : null);
  return (entry, row) => {
    const text = cleanReviewText(at(row, review) ?? "");
    if (text.text) entry.review = { text: text.text, writtenAt: parseDate(at(row, written)), spoilers: text.spoilers || truthy(at(row, spoilers)), rewatch: false, source: null };
    const kept = cleanReviewText(at(row, note) ?? "").text;
    if (kept) entry.note = cut(kept);
    entry.moods = moodsIn(at(row, moods));
    const took = entry.review !== null || entry.note !== null || entry.moods.length > 0;
    if (took && entry.watchedAt === null && entry.status === null && entry.rating === null && !entry.isFavorite && entry.watchedFlag !== true) entry.reviewOnly = true;
  };
}

const DIGIT = /\p{Nd}/u;

function looksLikeImdbID(text: string) {
  return (text.startsWith("tt") || text.includes("imdb.com")) && DIGIT.test(text);
}

function looksLikeYear(text: string) {
  if (text.length !== 4) return false;
  const year = toIntOrNull(text);
  return year !== null && year >= 1871 && year <= 2199;
}

/**
 * A row of somebody else's file as the facts this app keeps — iOS
 * `ImportedEntry`. Every field is optional because every export leaves
 * something out; the importer decides what can be done with what arrived.
 */
export interface ImportedEntry {
  title: string;
  kind: ImportTitleKind | null;
  year: number | null;
  season: number | null;
  episode: number | null;
  episodeTitle: string | null;
  watchedAt: Date | null;
  /** On Kodigo's ten-point scale, whatever scale the file used. */
  rating: number | null;
  status: string | null;
  isFavorite: boolean;
  /**
   * A whole run somebody finished, where the file says so and then doesn't
   * list the episodes — Simkl's backup counts a completed show's episodes
   * and lists none of them.
   */
  finishedRun: boolean;
  /** What a `watched` column said. Null is no such column; only false stops a row counting. */
  watchedFlag: boolean | null;
  imdbID: string | null;
  tmdbID: number | null;
  tvdbID: number | null;
  /** What somebody wrote about the row's title — a film, the show, or the row's episode. */
  review: ImportedReview | null;
  /** A private note on the row's title, already cleaned as a review's text is. */
  note: string | null;
  /** Kodigo's mood ids for the row's title, each once, in the order the file gave them. */
  moods: string[];
  /**
   * A row that brings a review, a note or moods and nothing else — a Trakt
   * comment, a Refract vibe — which says somebody felt something about a
   * title, not that they watched it or meant to. Its title is matched for
   * the review's sake and isn't added to the library.
   */
  reviewOnly: boolean;
}

export function importedEntry(fields: Partial<ImportedEntry> = {}): ImportedEntry {
  return {
    title: "",
    kind: null,
    year: null,
    season: null,
    episode: null,
    episodeTitle: null,
    watchedAt: null,
    rating: null,
    status: null,
    isFavorite: false,
    finishedRun: false,
    watchedFlag: null,
    imdbID: null,
    tmdbID: null,
    tvdbID: null,
    review: null,
    note: null,
    moods: [],
    reviewOnly: false,
    ...fields,
  };
}

/** A season and an episode number: the only reliable sign a row is about an episode. */
export function isEpisode(entry: ImportedEntry) {
  return entry.season !== null && entry.episode !== null;
}

// ---- Reading rows through a mapping (iOS `ImportReader`) ----

/**
 * Every row, dropping the ones that name nothing. `known` is the scale a
 * preset knows the file's app to use; without one the scale is worked out
 * from the whole column. `also` reads whatever else a preset knows its file
 * holds off each kept row — Letterboxd's review, say.
 */
export function readEntries(
  table: ImportTable,
  mapping: ImportMapping,
  known: RatingScale | null = null,
  also?: (entry: ImportedEntry, row: string[]) => void,
): ImportedEntry[] {
  const ratingIndex = mapping.get("rating");
  const scale = known ?? (ratingIndex !== null ? ratingScale(table.rows.filter((r) => ratingIndex < r.length).map((r) => r[ratingIndex])) : "tenPoint");

  const out: ImportedEntry[] = [];
  for (const row of table.rows) {
    const value = (field: ImportField): string | null => {
      const index = mapping.get(field);
      if (index === null || index >= row.length) return null;
      const text = ktTrim(row[index]);
      return text ? text : null;
    };
    const entry = importedEntry();
    entry.title = value("title") ?? "";
    const y = value("year");
    entry.year = y === null ? null : readYear(y);
    entry.season = toIntOrNull(value("season"));
    entry.episode = toIntOrNull(value("episode"));
    entry.episodeTitle = value("episodeTitle");
    const code = value("episodeCode");
    const pair = code === null ? null : episodeCode(code);
    if (pair) {
      entry.season = entry.season ?? pair[0];
      entry.episode = entry.episode ?? pair[1];
    }
    entry.watchedAt = parseDate(value("watchedAt"));
    const r = value("rating");
    entry.rating = r === null ? null : ratingScore(r, scale);
    entry.status = value("status")?.toLowerCase() ?? null;
    const k = value("kind");
    entry.kind = k === null ? null : readKind(k);
    entry.isFavorite = truthy(value("favorite"));
    const w = value("watched");
    entry.watchedFlag = w === null ? null : truthy(w);
    const imdb = value("imdbID");
    entry.imdbID = imdb === null ? null : readImdbID(imdb);
    entry.tmdbID = toIntOrNull(value("tmdbID"));
    entry.tvdbID = toIntOrNull(value("tvdbID"));
    if (entry.title === "" && entry.imdbID === null && entry.tmdbID === null && entry.tvdbID === null) continue;
    also?.(entry, row);
    out.push(entry);
  }
  return out;
}

/**
 * What a `type` column is saying. Every spelling here is unambiguous on its
 * own; an empty or unknown cell is nothing rather than a guess at the commoner
 * of the two.
 */
export function readKind(text: string): ImportTitleKind | null {
  switch (fold(text)) {
    case "movie": case "movies": case "film": case "films": case "feature": case "featurefilm": case "tvmovie": case "video":
      return "movies";
    case "episode": case "episodes": case "show": case "shows": case "tv": case "tvshow": case "series": case "tvseries":
    case "tvminiseries": case "tvspecial": case "season": case "anime":
      return "shows";
    default:
      return null;
  }
}

/**
 * A season and an episode out of `s1e2`, `S01E02` or `1x2`, or null — a code
 * this doesn't recognise placed at season one would put a decade of viewing
 * in the wrong season.
 */
export function episodeCode(text: string): [number, number] | null {
  const lower = text.toLowerCase();
  const match = (lower.includes("x") ? /([0-9]+)x([0-9]+)/ : /s([0-9]+)e([0-9]+)/).exec(lower);
  if (!match) return null;
  const season = toIntOrNull(match[1]);
  const episode = toIntOrNull(match[2]);
  return season === null || episode === null ? null : [season, episode];
}

/** A bare year, or the year at the front of a date. */
function readYear(text: string): number | null {
  const whole = toIntOrNull(text);
  if (whole !== null && whole >= 1871 && whole <= 2199) return whole;
  if (text.length < 4) return null;
  const front = toIntOrNull(text.slice(0, 4));
  return front !== null && front >= 1871 && front <= 2199 ? front : null;
}

/** The id out of a column holding the id or a link to it. */
function readImdbID(text: string): string | null {
  if (text.startsWith("tt") && [...text.slice(2)].every((c) => DIGIT.test(c))) return text;
  return /tt[0-9]{6,}/.exec(text)?.[0] ?? null;
}

// ---- What somebody else's rating is worth (iOS `ImportRating`) ----

export type RatingScale = "fivePoint" | "tenPoint" | "hundredPoint";

/**
 * Worked out over the whole column, never per row: a single `4` is four out
 * of five on one service and four out of ten on another. Five or under is
 * five-point — including the strict rater out of ten, which is the one case
 * this gets wrong and why a preset's known scale wins.
 */
export function ratingScale(values: string[]): RatingScale {
  let highest: number | null = null;
  for (const v of values) {
    const n = toDoubleOrNull(trimSpaces(v));
    if (n !== null && n > 0 && (highest === null || n > highest)) highest = n;
  }
  if (highest === null) return "tenPoint";
  if (highest > 10) return "hundredPoint";
  if (highest > 5) return "tenPoint";
  return "fivePoint";
}

/** On Kodigo's ten-point scale, capped at ten; null for anything that isn't a positive number. */
export function ratingScore(text: string, scale: RatingScale): number | null {
  const trimmed = trimSpaces(text);
  // A column of stars, halves written with the half glyph.
  if (trimmed.includes("★")) {
    const stars = [...trimmed].filter((c) => c === "★").length;
    const half = trimmed.includes("½") ? 0.5 : 0;
    return Math.min(10, (stars + half) * 2);
  }
  const number = toDoubleOrNull(trimmed);
  if (number === null || !(number > 0)) return null;
  switch (scale) {
    case "fivePoint":
      return Math.min(10, number * 2);
    case "tenPoint":
      return Math.min(10, number);
    case "hundredPoint":
      return Math.min(10, number / 10);
  }
}
