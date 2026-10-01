import type { LibraryArchive, SavedRail } from "./archive";

// Custom categories: the app's saved Explore rails (`SavedRail` in
// Models.swift, `DiscoverFilter` in DiscoverView.swift). A category is a
// filter somebody kept, drawn as its own row on Explore under the built-in
// ones. The apps and the site share one list of them through the archive's
// `savedRails` and `savedRailOrder`, so everything here is written to read
// back in Swift exactly as the app wrote it.
//
// The rules that keep the apps able to open the archive at all, because the
// archive's decoder fails whole when one rail won't decode:
// - `catalogue` is exactly "Shows" or "Movies";
// - every rail carries id, name, catalogue, filter and created;
// - the id is an uppercase UUID, the way Swift's `uuidString` writes it;
// - `created` is ISO 8601 without fractional seconds;
// - `providerNames` is keyed by the id as a string.
//
// Pure functions only, so the tests can run them and the dialog can build
// names and counts in the browser. The TMDB fetch is in tmdb.ts and the
// writes are in saved-rail-actions.ts.

export type Catalogue = "Shows" | "Movies";
export const CATALOGUES: Catalogue[] = ["Shows", "Movies"];
export type RuntimeBand = "short" | "medium" | "long";
export type DiscoverSort = "popular" | "newest" | "rated" | "alphabetical";

/** The app's DiscoverFilter, field for field. Optional fields are the ones
    Swift writes with `encodeIfPresent`, so they are left out when unset. */
export interface DiscoverFilter {
  kinds: Catalogue[];
  genreKeys: string[];
  yearFrom?: number;
  yearTo?: number;
  providerIDs: number[];
  providerNames: Record<string, string>;
  originCountry?: string;
  originalLanguage?: string;
  runtime?: RuntimeBand;
  statuses: number[];
  types: number[];
  ratingFrom?: number;
  ratingTo?: number;
  sort: DiscoverSort;
}

/** A rail read out of the archive, with its filter decoded. */
export interface Rail {
  id: string;
  name: string;
  catalogue: Catalogue;
  filter: DiscoverFilter;
  created: string;
}

/** Library.savedRailLimit: ten per catalogue, not twenty shared. */
export const RAIL_LIMIT = 10;
/** Library.railNameLimit: what the heading over a row holds. */
export const RAIL_NAME_LIMIT = 26;

export function emptyFilter(kinds: Catalogue[] = [...CATALOGUES]): DiscoverFilter {
  return { kinds, genreKeys: [], providerIDs: [], providerNames: {}, statuses: [], types: [], sort: "popular" };
}

// ---- The tables the filter offers ----

/** DiscoverGenre.all: a key that never moves, and the id each catalogue
    numbers it under (none where TMDB has no such genre on that side). In
    label order, which is the order the app lists them. */
export const GENRES: { key: string; label: string; movieID: number | null; tvID: number | null }[] = [
  { key: "action", label: "Action", movieID: 28, tvID: 10759 },
  { key: "adventure", label: "Adventure", movieID: 12, tvID: null },
  { key: "animation", label: "Animation", movieID: 16, tvID: 16 },
  { key: "comedy", label: "Comedy", movieID: 35, tvID: 35 },
  { key: "crime", label: "Crime", movieID: 80, tvID: 80 },
  { key: "documentary", label: "Documentary", movieID: 99, tvID: 99 },
  { key: "drama", label: "Drama", movieID: 18, tvID: 18 },
  { key: "family", label: "Family", movieID: 10751, tvID: 10751 },
  { key: "fantasy", label: "Fantasy", movieID: 14, tvID: 10765 },
  { key: "history", label: "History", movieID: 36, tvID: null },
  { key: "horror", label: "Horror", movieID: 27, tvID: null },
  { key: "kids", label: "Kids", movieID: null, tvID: 10762 },
  { key: "music", label: "Music", movieID: 10402, tvID: null },
  { key: "mystery", label: "Mystery", movieID: 9648, tvID: 9648 },
  { key: "news", label: "News", movieID: null, tvID: 10763 },
  { key: "reality", label: "Reality", movieID: null, tvID: 10764 },
  { key: "romance", label: "Romance", movieID: 10749, tvID: null },
  // The key says sci-fi and fantasy for the reason the app gives: it is
  // written into every category built on it, so it can't follow the label.
  { key: "sciFiFantasy", label: "Science Fiction", movieID: 878, tvID: 10765 },
  { key: "soap", label: "Soap", movieID: null, tvID: 10766 },
  { key: "talk", label: "Talk", movieID: null, tvID: 10767 },
  { key: "thriller", label: "Thriller", movieID: 53, tvID: null },
  { key: "war", label: "War", movieID: 10752, tvID: 10768 },
  { key: "western", label: "Western", movieID: 37, tvID: 37 },
];

export const SORTS: [DiscoverSort, string][] = [
  ["popular", "Most Popular"],
  ["newest", "Newest"],
  ["rated", "Highest Rated"],
  ["alphabetical", "A–Z"],
];

/** RuntimeBand: inclusive minutes, so the bands butt without overlapping. */
export const RUNTIMES: { band: RuntimeBand; label: string; low?: number; high?: number }[] = [
  { band: "short", label: "Under 30 min", high: 29 },
  { band: "medium", label: "30–60 min", low: 30, high: 60 },
  { band: "long", label: "Over 60 min", low: 61 },
];

/** The rating choices: a least number of stars out of ten, read against
    TMDB's own 0–10 average (which its site shows as a percentage). The
    word bands the app used to offer are gone. */
export const STAR_MINIMUMS = [5, 6, 7, 8, 9];
export const starsLabel = (n: number) => `${score(n)}+ stars`;

/** ShowStatusFilter and ShowTypeFilter, by the integers TMDB wants. TV only. */
export const STATUSES: [number, string][] = [
  [0, "Returning"],
  [1, "Planned"],
  [2, "In Production"],
  [3, "Ended"],
  [4, "Canceled"],
  [5, "Pilot"],
];
export const TYPES: [number, string][] = [
  [0, "Documentary"],
  [1, "News"],
  [2, "Miniseries"],
  [3, "Reality"],
  [4, "Scripted"],
  [5, "Talk Show"],
  [6, "Video"],
];

/** kodigoOriginCountries and kodigoOriginalLanguages: curated, since most
    ISO codes return nothing from TMDB. */
export const COUNTRIES = ["US", "GB", "KR", "JP", "FR", "DE", "ES", "IT", "IN", "CN", "HK", "TW", "CA", "AU", "NZ", "IE", "SE", "NO", "DK", "FI", "NL", "BE", "PL", "RU", "TR", "BR", "MX", "AR", "TH", "PH", "ZA", "IL"];
export const LANGUAGES = ["en", "ko", "ja", "zh", "es", "fr", "de", "it", "pt", "hi", "ar", "ru", "sv", "da", "no", "nl", "fi", "pl", "tr", "th", "he", "id", "vi", "tl"];

export function countryName(code: string) {
  try {
    return new Intl.DisplayNames(["en"], { type: "region" }).of(code) ?? code;
  } catch {
    return code;
  }
}
export function languageName(code: string) {
  try {
    return new Intl.DisplayNames(["en"], { type: "language" }).of(code) ?? code;
  } catch {
    return code;
  }
}

// ---- Reading and writing a filter ----

const SORT_VALUES = new Set<string>(SORTS.map(([s]) => s));
const RUNTIME_VALUES = new Set<string>(RUNTIMES.map((r) => r.band));
const STATUS_VALUES = new Set(STATUSES.map(([n]) => n));
const TYPE_VALUES = new Set(TYPES.map(([n]) => n));

const int = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? Math.trunc(v) : undefined);
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : undefined);
const str = (v: unknown) => (typeof v === "string" && v ? v : undefined);
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);

/**
 * A stored filter read the way the app's hand-written decoder reads it:
 * every field optional, an unknown enum value dropped rather than failing
 * the whole filter, no catalogues read as both, a provider id without a
 * name (or a name without an id) dropped, and the single-service keys of
 * older builds folded into the set.
 */
export function readFilter(raw: unknown): DiscoverFilter {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const kinds = arr(o.kinds).filter((k): k is Catalogue => k === "Shows" || k === "Movies");
  const f: DiscoverFilter = emptyFilter(kinds.length ? [...new Set(kinds)] : [...CATALOGUES]);
  f.genreKeys = arr(o.genreKeys).filter((k): k is string => typeof k === "string");
  const yearFrom = int(o.yearFrom);
  const yearTo = int(o.yearTo);
  if (yearFrom !== undefined) f.yearFrom = yearFrom;
  if (yearTo !== undefined) f.yearTo = yearTo;
  if (Array.isArray(o.providerIDs)) {
    const ids = arr(o.providerIDs).map(int).filter((x): x is number => x !== undefined);
    const stored = (o.providerNames && typeof o.providerNames === "object" ? o.providerNames : {}) as Record<string, unknown>;
    for (const id of ids) {
      const name = stored[String(id)];
      if (typeof name === "string") f.providerNames[String(id)] = name;
    }
    f.providerIDs = [...new Set(ids.filter((id) => f.providerNames[String(id)] !== undefined))].sort((a, b) => a - b);
  } else {
    const legacyID = int(o.providerID);
    const legacyName = str(o.providerName);
    if (legacyID !== undefined && legacyName) {
      f.providerIDs = [legacyID];
      f.providerNames = { [String(legacyID)]: legacyName };
    }
  }
  const country = str(o.originCountry);
  const language = str(o.originalLanguage);
  if (country) f.originCountry = country;
  if (language) f.originalLanguage = language;
  if (typeof o.runtime === "string" && RUNTIME_VALUES.has(o.runtime)) f.runtime = o.runtime as RuntimeBand;
  f.statuses = arr(o.statuses).map(int).filter((x): x is number => x !== undefined && STATUS_VALUES.has(x));
  f.types = arr(o.types).map(int).filter((x): x is number => x !== undefined && TYPE_VALUES.has(x));
  const ratingFrom = num(o.ratingFrom);
  const ratingTo = num(o.ratingTo);
  if (ratingFrom !== undefined) f.ratingFrom = ratingFrom;
  if (ratingTo !== undefined) f.ratingTo = ratingTo;
  if (typeof o.sort === "string" && SORT_VALUES.has(o.sort)) f.sort = o.sort as DiscoverSort;
  return f;
}

/**
 * A filter from the dialog, tidied before it is kept: only genres, statuses
 * and types the tables know (in the tables' order), codes in the shapes TMDB
 * takes, years and scores in range, and a backwards range turned round —
 * the app's normalizeYears and normalizeRatings. What came from the browser
 * is only a request.
 */
export function cleanFilter(input: unknown): DiscoverFilter {
  const f = readFilter(input);
  f.genreKeys = GENRES.map((g) => g.key).filter((k) => f.genreKeys.includes(k));
  f.statuses = [...new Set(f.statuses)].sort((a, b) => a - b);
  f.types = [...new Set(f.types)].sort((a, b) => a - b);
  const thisYear = new Date().getUTCFullYear();
  for (const k of ["yearFrom", "yearTo"] as const) {
    const y = f[k];
    if (y !== undefined && (y < 1874 || y > thisYear + 5)) delete f[k];
  }
  if (f.yearFrom !== undefined && f.yearTo !== undefined && f.yearFrom > f.yearTo) [f.yearFrom, f.yearTo] = [f.yearTo, f.yearFrom];
  for (const k of ["ratingFrom", "ratingTo"] as const) {
    const r = f[k];
    if (r !== undefined && (r < 0 || r > 10)) delete f[k];
  }
  if (f.ratingFrom !== undefined && f.ratingTo !== undefined && f.ratingFrom > f.ratingTo) [f.ratingFrom, f.ratingTo] = [f.ratingTo, f.ratingFrom];
  if (f.originCountry && !/^[A-Z]{2}$/.test(f.originCountry)) delete f.originCountry;
  if (f.originalLanguage && !/^[a-z]{2,3}$/.test(f.originalLanguage)) delete f.originalLanguage;
  for (const id of f.providerIDs) f.providerNames[String(id)] = f.providerNames[String(id)].slice(0, 80);
  f.providerIDs = f.providerIDs.slice(0, 40);
  f.providerNames = Object.fromEntries(f.providerIDs.map((id) => [String(id), f.providerNames[String(id)]]));
  return f;
}

/** The filter as the app's encoder writes it: the same keys in the same
    order, providers sorted, and the optional ones left out when unset. */
export function encodeFilter(f: DiscoverFilter): Record<string, unknown> {
  const ids = [...f.providerIDs].sort((a, b) => a - b);
  const out: Record<string, unknown> = { kinds: [...f.kinds], genreKeys: [...f.genreKeys] };
  if (f.yearFrom !== undefined) out.yearFrom = f.yearFrom;
  if (f.yearTo !== undefined) out.yearTo = f.yearTo;
  out.providerIDs = ids;
  out.providerNames = Object.fromEntries(ids.filter((id) => f.providerNames[String(id)] !== undefined).map((id) => [String(id), f.providerNames[String(id)]]));
  if (f.originCountry) out.originCountry = f.originCountry;
  if (f.originalLanguage) out.originalLanguage = f.originalLanguage;
  if (f.runtime) out.runtime = f.runtime;
  out.statuses = [...f.statuses];
  out.types = [...f.types];
  if (f.ratingFrom !== undefined) out.ratingFrom = f.ratingFrom;
  if (f.ratingTo !== undefined) out.ratingTo = f.ratingTo;
  out.sort = f.sort;
  return out;
}

/** The keys the app's filter coding knows. Anything else on a stored filter
    came from a newer build and is carried through an edit untouched. */
const FILTER_KEYS = new Set(["kinds", "genreKeys", "yearFrom", "yearTo", "providerIDs", "providerNames", "providerID", "providerName", "originCountry", "originalLanguage", "runtime", "statuses", "types", "ratingFrom", "ratingTo", "sort"]);

/** How many things the filter narrows — the app's activeCount. One
    catalogue counts; both is the default and doesn't. Services count once
    however many, and so does the rating range. */
export function activeCount(f: DiscoverFilter): number {
  return (
    (f.kinds.length === 1 ? 1 : 0) +
    f.genreKeys.length +
    f.statuses.length +
    f.types.length +
    (f.yearFrom === undefined ? 0 : 1) +
    (f.yearTo === undefined ? 0 : 1) +
    (f.providerIDs.length ? 1 : 0) +
    (f.originCountry ? 1 : 0) +
    (f.originalLanguage ? 1 : 0) +
    (f.runtime ? 1 : 0) +
    (f.ratingFrom === undefined && f.ratingTo === undefined ? 0 : 1)
  );
}

/** Which ids a catalogue numbers the picked genres under, dropping the ones
    it doesn't have (Horror on the series side). */
export function genreIDs(f: DiscoverFilter, catalogue: Catalogue): number[] {
  return f.genreKeys.flatMap((key) => {
    const g = GENRES.find((x) => x.key === key);
    const id = g && (catalogue === "Movies" ? g.movieID : g.tvID);
    return id ? [id] : [];
  });
}

// Swift's String(Double) keeps a trailing ".0", and the query should be the
// one the app sends so the two ask TMDB the same question.
const swiftDouble = (x: number) => (Number.isInteger(x) ? `${x}.0` : String(x));

/**
 * The discover request a rail makes, as TMDB.swift builds it: discoverQuery
 * (the parts both endpoints share) plus discoverShows' or discoverMovies'
 * own genre and date fields. Every multi-pick is OR'd with `|`. The vote
 * floor rides with any rating bound or the rated sort, and the service ids
 * only mean something with the region beside them. The catalogue passed in
 * decides the endpoint, not the filter's `kinds`, for the reason the app
 * gives: the rail is the authority on which tab it draws on.
 */
export function discoverQuery(f: DiscoverFilter, catalogue: Catalogue, region: string, page = 1): { path: string; params: Record<string, string> } {
  const movies = catalogue === "Movies";
  const sortBy = { popular: "popularity.desc", newest: movies ? "primary_release_date.desc" : "first_air_date.desc", rated: "vote_average.desc", alphabetical: movies ? "title.asc" : "name.asc" }[f.sort];
  const q: Record<string, string> = { sort_by: sortBy };
  if (f.ratingFrom !== undefined) q["vote_average.gte"] = swiftDouble(f.ratingFrom);
  if (f.ratingTo !== undefined) q["vote_average.lte"] = swiftDouble(f.ratingTo);
  if (f.ratingFrom !== undefined || f.ratingTo !== undefined || f.sort === "rated") q["vote_count.gte"] = "200";
  if (f.providerIDs.length) {
    q.with_watch_providers = [...f.providerIDs].sort((a, b) => a - b).join("|");
    q.watch_region = region;
  }
  if (f.originCountry) q.with_origin_country = f.originCountry;
  if (f.originalLanguage) q.with_original_language = f.originalLanguage;
  const band = RUNTIMES.find((r) => r.band === f.runtime);
  if (band?.low !== undefined) q["with_runtime.gte"] = String(band.low);
  if (band?.high !== undefined) q["with_runtime.lte"] = String(band.high);
  const genres = genreIDs(f, catalogue);
  if (genres.length) q.with_genres = genres.join("|");
  if (!movies) {
    if (f.statuses.length) q.with_status = f.statuses.join("|");
    if (f.types.length) q.with_type = f.types.join("|");
  }
  const dateKey = movies ? "primary_release_date" : "first_air_date";
  if (f.yearFrom !== undefined) q[`${dateKey}.gte`] = `${f.yearFrom}-01-01`;
  if (f.yearTo !== undefined) q[`${dateKey}.lte`] = `${f.yearTo}-12-31`;
  q.page = String(page);
  return { path: movies ? "/discover/movie" : "/discover/tv", params: q };
}

// ---- Words ----

const cap = (s: string) => Array.from(s).slice(0, RAIL_NAME_LIMIT).join("");

/** A name to start from, short enough to be a rail head — the app's
    suggestedName: the first section of the filter with anything to say, two
    terms at most, capped like anything typed. */
export function suggestedName(f: DiscoverFilter): string {
  const genres = GENRES.filter((g) => f.genreKeys.includes(g.key)).map((g) => g.label);
  if (genres.length) return cap(genres.slice(0, 2).join(" & "));
  const services = [...f.providerIDs].sort((a, b) => a - b).flatMap((id) => f.providerNames[String(id)] ?? []);
  if (services.length) return cap(services.slice(0, 2).join(" & "));
  if (f.originCountry) return cap(countryName(f.originCountry));
  if (f.originalLanguage) return cap(languageName(f.originalLanguage));
  if (f.yearFrom !== undefined && f.yearTo !== undefined) return `${f.yearFrom}–${f.yearTo}`;
  if (f.yearFrom !== undefined) return String(f.yearFrom);
  if (f.yearTo !== undefined) return String(f.yearTo);
  return SORTS.find(([s]) => s === f.sort)![1];
}

const score = (x: number) => (Number.isInteger(x) ? String(x) : x.toFixed(1));

/** The filter said back in words, over a category's own page — the app's
    criteriaLine, in the dialog's order. */
export function criteriaLine(f: DiscoverFilter): string {
  const parts: string[] = [f.kinds.length === 1 ? f.kinds[0] : "Shows & movies"];
  const genres = GENRES.filter((g) => f.genreKeys.includes(g.key)).map((g) => g.label);
  if (genres.length) parts.push(genres.join(", "));
  if (f.yearFrom !== undefined && f.yearTo !== undefined) parts.push(`${f.yearFrom}–${f.yearTo}`);
  else if (f.yearFrom !== undefined) parts.push(`${f.yearFrom} onwards`);
  else if (f.yearTo !== undefined) parts.push(`Up to ${f.yearTo}`);
  const services = [...f.providerIDs].sort((a, b) => a - b).flatMap((id) => f.providerNames[String(id)] ?? []);
  if (services.length) parts.push(services.length > 2 ? `${services.length} services` : services.join(", "));
  if (f.originCountry) parts.push(countryName(f.originCountry));
  if (f.originalLanguage) parts.push(languageName(f.originalLanguage));
  if (f.runtime) parts.push(RUNTIMES.find((r) => r.band === f.runtime)!.label);
  if (f.statuses.length) parts.push(f.statuses.map((s) => STATUSES.find(([n]) => n === s)?.[1]).join(", "));
  if (f.types.length) parts.push(f.types.map((s) => TYPES.find(([n]) => n === s)?.[1]).join(", "));
  if (f.ratingFrom !== undefined || f.ratingTo !== undefined) {
    if (f.ratingFrom !== undefined && f.ratingTo !== undefined) parts.push(`${score(f.ratingFrom)}–${score(f.ratingTo)} stars`);
    else if (f.ratingFrom !== undefined) parts.push(starsLabel(f.ratingFrom));
    else parts.push(`Up to ${score(f.ratingTo!)} stars`);
  }
  if (f.sort !== "popular") parts.push(SORTS.find(([s]) => s === f.sort)![1]);
  return parts.join(" · ");
}

// ---- Reading the archive's rails ----

/** UUIDs compare without case: Swift writes them upper, and nothing stops a
    hand-edited backup writing them lower. */
export const sameID = (a: string, b: string) => a.toUpperCase() === b.toUpperCase();

/** A stored rail, or null when it's one the app couldn't draw either. */
export function readRail(raw: SavedRail): Rail | null {
  if (!raw || typeof raw.id !== "string" || typeof raw.name !== "string") return null;
  if (raw.catalogue !== "Shows" && raw.catalogue !== "Movies") return null;
  return { id: raw.id, name: raw.name, catalogue: raw.catalogue, filter: readFilter(raw.filter), created: typeof raw.created === "string" ? raw.created : "" };
}

/**
 * The rails in the order they were dragged into — orderedSavedRails: what
 * the order names first, then anything it doesn't in the order they were
 * made. Pass a catalogue for one tab; leave it out for the All tab, which
 * runs the same one list over both.
 */
export function orderedRails(archive: Pick<LibraryArchive, "savedRails" | "savedRailOrder"> | null | undefined, catalogue?: Catalogue): Rail[] {
  const mine = (archive?.savedRails ?? []).map(readRail).filter((r): r is Rail => !!r && (!catalogue || r.catalogue === catalogue));
  const order = archive?.savedRailOrder ?? [];
  if (!order.length) return mine;
  const rank = new Map<string, number>();
  order.forEach((id, i) => {
    const key = String(id).toUpperCase();
    if (!rank.has(key)) rank.set(key, i);
  });
  return mine
    .map((r, i) => ({ r, at: rank.get(r.id.toUpperCase()) ?? order.length + i }))
    .sort((a, b) => a.at - b.at)
    .map((x) => x.r);
}

export function railCounts(archive: Pick<LibraryArchive, "savedRails"> | null | undefined): Record<Catalogue, number> {
  const rails = archive?.savedRails ?? [];
  return { Shows: rails.filter((r) => r.catalogue === "Shows").length, Movies: rails.filter((r) => r.catalogue === "Movies").length };
}

// ---- Changing them (the server actions run these inside withArchive) ----

/** A fresh id in the app's spelling. */
export const newRailID = () => crypto.randomUUID().toUpperCase();

/** A name as it is kept: trimmed and capped; empty falls back to the
    suggestion, since a blank heading can't be told from the row above. */
export function railName(typed: string, f: DiscoverFilter) {
  const name = cap(String(typed ?? "").trim()).trim();
  return name || suggestedName(f);
}

/**
 * Saving a filter: one rail per catalogue it asks, each with `kinds` forced
 * to its own catalogue — the app's saveRail. One tab full and the other not
 * keeps the one that fits and reports the other, rather than refusing both.
 * New ids go on the end of the order; an archive with no order yet gets one
 * made from the rails it has, which is the same order read back.
 */
export function applyCreateRails(a: LibraryArchive, typedName: string, f: DiscoverFilter, stamp: string, makeID = newRailID): { created: string[]; refused: Catalogue[] } {
  if (activeCount(f) === 0) throw new Error("Narrow something to save it.");
  const name = railName(typedName, f);
  const counts = railCounts(a);
  const created: string[] = [];
  const refused: Catalogue[] = [];
  const rails = (a.savedRails ??= []);
  const had = orderedRails(a).map((r) => r.id);
  for (const catalogue of CATALOGUES) {
    if (!f.kinds.includes(catalogue)) continue;
    if (counts[catalogue] >= RAIL_LIMIT) {
      refused.push(catalogue);
      continue;
    }
    const id = makeID();
    rails.push({ id, name, catalogue, filter: encodeFilter({ ...f, kinds: [catalogue] }), created: stamp });
    created.push(id);
  }
  if (created.length) a.savedRailOrder = [...(a.savedRailOrder?.length ? a.savedRailOrder : had), ...created];
  return { created, refused };
}

function findRail(a: LibraryArchive, id: string) {
  const rail = (a.savedRails ?? []).find((r) => typeof r.id === "string" && sameID(r.id, id));
  if (!rail) throw new Error("That category isn't there any more.");
  return rail;
}

/** Only the name changes; anything else on the rail stays as it was. */
export function applyRenameRail(a: LibraryArchive, id: string, typed: string) {
  const rail = findRail(a, id);
  const name = cap(String(typed ?? "").trim()).trim();
  if (!name) throw new Error("Give the category a name.");
  rail.name = name;
}

/** A new filter under a rail that keeps its name, id and place. `kinds`
    stays the rail's own catalogue, and keys a newer app wrote that this
    doesn't know are carried over. */
export function applySetRailFilter(a: LibraryArchive, id: string, f: DiscoverFilter) {
  const rail = findRail(a, id);
  const catalogue = rail.catalogue === "Movies" ? "Movies" : "Shows";
  const scoped = { ...f, kinds: [catalogue] as Catalogue[] };
  const old = (rail.filter && typeof rail.filter === "object" ? rail.filter : {}) as Record<string, unknown>;
  const kept = Object.fromEntries(Object.entries(old).filter(([k]) => !FILTER_KEYS.has(k)));
  rail.filter = { ...kept, ...encodeFilter(scoped) };
}

/** The rail and its place in the order go together. */
export function applyDeleteRail(a: LibraryArchive, id: string) {
  findRail(a, id);
  a.savedRails = (a.savedRails ?? []).filter((r) => !(typeof r.id === "string" && sameID(r.id, id)));
  if (a.savedRailOrder) a.savedRailOrder = a.savedRailOrder.filter((x) => !sameID(String(x), id));
}

/** A filter in a link: the app's JSON, base64url, so a filtered Explore page
    can be shared, bookmarked and rendered on the server. */
export function filterParam(f: DiscoverFilter): string {
  const bytes = new TextEncoder().encode(JSON.stringify(encodeFilter(f)));
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function readFilterParam(param: string | undefined): DiscoverFilter | null {
  if (!param) return null;
  try {
    const bin = atob(param.replace(/-/g, "+").replace(/_/g, "/"));
    const json = new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
    return cleanFilter(readFilter(JSON.parse(json)));
  } catch {
    return null;
  }
}

/** Explore's Arrange: the categories it moved, in their new order. The
    app's savedRailOrder is one list across both catalogues, so the moved
    ones take the places they held between them and every other id stays
    where it was. */
export function applyReorderRails(a: LibraryArchive, ids: string[]) {
  const all = orderedRails(a).map((r) => r.id);
  const moving = ids.map((id) => all.find((x) => sameID(x, id))).filter((x): x is string => !!x);
  const slots = all.map((id, i) => (moving.some((m) => sameID(m, id)) ? i : -1)).filter((i) => i >= 0);
  const next = [...all];
  slots.forEach((slot, k) => (next[slot] = moving[k]));
  a.savedRailOrder = next;
}
