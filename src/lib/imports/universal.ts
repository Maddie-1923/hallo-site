import type { LibraryArchive, Movie, MovieStatus, Show, TrackedMovie, TrackedShow, WatchStatus } from "../archive";
import { mergeArchives } from "./merge";
import { jsonEntries, recogniseJsonFormat } from "./json";
import { presetEntries, recognisePreset } from "./presets";
import { attempt, checkAborted, importArchive, reporter } from "./run-parts";
import { formatSwiftDate, swiftNow, utf16Compare } from "./swift";
import { guessMapping, ImportTable, isEpisode, readEntries, type ImportedEntry } from "./table";
import { titleKey } from "./text";
import { episodeKey, NothingReadable, type ImportDeps, type ImportFile, type ImportFileOutcome, type ImportPlan, type ImportRun, type UniversalImportResult } from "./types";
import { looksLikeZip, readZip } from "./zip";

// Turning somebody else's export into a plan for this library — Android's
// UniversalImporter.kt, `UniversalImporter` in ImportRun.swift.
//
// The readers hand over `ImportedEntry` rows. Every distinct title is resolved
// to a TMDB show or film once, one at a time, and the rows are written under
// whatever came back. Nothing is replaced: a show already here keeps its
// status, its dates and its ratings, and gains only the episodes it was
// missing — which is also what makes running the same import twice harmless.
//
// Where Android writes into the live library as it goes, this writes into a
// plan, and reads "the library as it now stands" off the snapshot it was
// given with the plan so far laid on top — so applying the plan once lands
// exactly what Android's run would have.

/**
 * A zip becomes its CSV and JSON files; anything else, or a zip that won't
 * open, is itself. Every export that arrives as an archive holds several
 * files that each say something different, and reading one would take
 * somebody's ratings and leave their history behind.
 */
function unpack(file: ImportFile): ImportFile[] {
  if (!looksLikeZip(file.data)) return [file];
  try {
    return readZip(file.data, [".csv", ".json"]).payloads;
  } catch {
    return [file];
  }
}

/** One file as rows, and what it was recognised as. The nested exports go first. */
function read(name: string, data: Uint8Array): [ImportedEntry[], string | null] {
  const format = recogniseJsonFormat(data);
  if (format) return [jsonEntries(format, data, name), format];
  const table = ImportTable.read(data);
  if (!table) return [[], null];
  const preset = recognisePreset(name, table);
  if (preset) return [presetEntries(preset, table), preset.name];
  // Nothing recognised it, so the columns are guessed at. A file naming
  // nothing is reported as read but empty — usually the account details or
  // settings that came in the same archive.
  const mapping = guessMapping(table);
  if (!mapping.isUsable) return [[], null];
  return [readEntries(table, mapping), null];
}

/**
 * What the importer will make of a file, before anything is looked up: each
 * file inside it (a zip opened), what it was recognised as, and its rows.
 * The website shows this under the files picked, so what it says there is
 * what Import will do.
 */
export function describeImportFile(file: ImportFile): { name: string; format: string | null; entries: ImportedEntry[] }[] {
  return unpack(file).map((f) => {
    const [entries, format] = read(f.name, f.data);
    return { name: f.name, format, entries };
  });
}

type Match = { kind: "show"; show: Show; guessed: boolean } | { kind: "movie"; movie: Movie; guessed: boolean };

/**
 * What tells one title from another before anything is looked up: an id
 * where there is one, else the folded name with its year — which is what
 * separates the three films called The Thing.
 */
function identity(entry: ImportedEntry) {
  const kind = entry.kind ?? (isEpisode(entry) ? "shows" : "?");
  if (entry.tmdbID !== null) return `t:${kind}:${entry.tmdbID}`;
  if (entry.imdbID !== null) return `i:${entry.imdbID}`;
  if (entry.tvdbID !== null) return `v:${entry.tvdbID}`;
  return `n:${kind}:${titleKey(entry.title)}:${entry.year ?? 0}`;
}

/**
 * The ids, cheapest and surest first; then the name. A row naming a season
 * and an episode is about a series whatever its type column says; only where
 * nothing says which are both searched at once.
 */
async function resolve(rows: ImportedEntry[], deps: ImportDeps): Promise<Match | null> {
  const { catalog, signal } = deps;
  const entry = rows[0];
  const isShow = rows.some(isEpisode) || entry.kind === "shows";
  const isMovie = entry.kind === "movies" && !rows.some(isEpisode);

  if (entry.tmdbID !== null) {
    const tmdb = entry.tmdbID;
    if (isShow) {
      const show = await attempt(() => catalog.show(tmdb), signal);
      if (show) return { kind: "show", show, guessed: false };
    }
    if (isMovie) {
      const movie = await attempt(() => catalog.movie(tmdb), signal);
      if (movie) return { kind: "movie", movie, guessed: false };
    }
  }
  for (const id of [entry.tvdbID, entry.imdbID]) {
    if (id === null) continue;
    const found = await attempt(() => catalog.find(id), signal);
    if (!found) continue;
    const show = found.tvResults?.[0];
    if (show) return { kind: "show", show, guessed: false };
    const movie = found.movieResults?.[0];
    if (movie) return { kind: "movie", movie, guessed: false };
  }

  if (entry.title === "") return null;
  const wanted = titleKey(entry.title);
  if (isShow) {
    const items = await attempt(() => catalog.searchShows(entry.title, entry.year), signal);
    if (!items || items.length === 0) return null;
    const exact = items.filter((s) => titleKey(s.name) === wanted);
    if (exact.length === 1) return { kind: "show", show: exact[0], guessed: false };
    return { kind: "show", show: exact[0] ?? items[0], guessed: true };
  }
  if (isMovie) {
    const items = await attempt(() => catalog.searchMovies(entry.title, entry.year), signal);
    if (!items || items.length === 0) return null;
    const exact = items.filter((m) => titleKey(m.title) === wanted);
    if (exact.length === 1) return { kind: "movie", movie: exact[0], guessed: false };
    return { kind: "movie", movie: exact[0] ?? items[0], guessed: true };
  }
  // Neither the file nor the row said which — a Letterboxd list of titles and
  // years arrives here — so TMDB's own answer decides.
  const hits = await attempt(() => catalog.searchMulti(entry.title, entry.year), signal);
  const hit = hits?.[0];
  if (!hit) return null;
  if (hit.kind === "movie") return { kind: "movie", movie: hit.movie, guessed: titleKey(hit.movie.title) !== wanted };
  return { kind: "show", show: hit.show, guessed: titleKey(hit.show.name) !== wanted };
}

/**
 * Where a show stands, from whatever the file called it — iOS
 * `status(from:)`. Watching unless plainly otherwise. "For later" is read
 * against the viewing: a show saved before it was started lands in Ready to
 * Start by itself as Watching, and one somebody stopped part way through is
 * what On Hold ("Stopped" in the file) is for.
 */
export function showStatus(rows: ImportedEntry[]): WatchStatus {
  const words = new Set(rows.map((r) => r.status).filter((s): s is string => s !== null));
  const any = (test: (w: string) => boolean) => [...words].some(test);
  if (any((w) => w.includes("dropped") || w.includes("abandoned") || w.includes("notfinish") || w.includes("stopwatching") || w.includes("stopped"))) return "Dropped";
  if (any((w) => w.includes("hold") || w.includes("paused"))) return "Stopped";
  const startedIt = rows.some((r) => isEpisode(r) && r.watchedAt !== null);
  if (startedIt && any((w) => w.includes("later") || w.includes("plan"))) return "Stopped";
  return "Watching";
}

/**
 * A film's standing — iOS `movieStatus(from:watched:)`. `watched` rather
 * than `watch` in the words, because a watchlist is the opposite claim and
 * shares its first five letters.
 */
export function movieStatus(rows: ImportedEntry[], watched: boolean): MovieStatus {
  if (watched) return "Watched";
  const words = rows.map((r) => r.status).filter((s): s is string => s !== null);
  if (words.some((w) => w.includes("completed") || w.includes("watched") || w.includes("finished") || w.includes("seen"))) return "Watched";
  if (words.some((w) => w.includes("hold"))) return "On Hold";
  if (words.some((w) => w.includes("dropped") || w.includes("abandoned"))) return "Dropped";
  return "To Watch";
}

function emptyResult(files: ImportFileOutcome[]): UniversalImportResult {
  return {
    files, showsAdded: 0, showsAlreadyTracked: 0, episodesAdded: 0, moviesAdded: 0, moviesAlreadyTracked: 0,
    ratingsApplied: 0, ratingsKept: 0, ratingsUnplaced: 0, unmatched: [], ambiguous: [],
  };
}

const sortedDistinct = (values: string[]) => [...new Set(values)].sort(utf16Compare);

/**
 * Runs an import of one or more files from another app — each a CSV, a JSON
 * export or a zip of them — against the library snapshot in `deps`. Rejects
 * with `NothingReadable` when no file held a row, and with the signal's
 * reason when cancelled. Nothing is written: the plan says what to write.
 */
export async function runUniversalImport(files: ImportFile[], deps: ImportDeps): Promise<ImportRun<UniversalImportResult>> {
  const { signal } = deps;
  const report = reporter(deps.onProgress);
  report("reading");
  const outcomes: ImportFileOutcome[] = [];
  const entries: ImportedEntry[] = [];
  for (const file of files) {
    for (const part of unpack(file)) {
      checkAborted(signal);
      const [rows, format] = read(part.name, part.data);
      outcomes.push({ name: part.name, format, rows: rows.length });
      entries.push(...rows);
    }
  }
  if (entries.length === 0) throw new NothingReadable(outcomes);

  // Every distinct title looked up once — once per title rather than per row
  // is why an import takes minutes rather than hours. One at a time, as on iOS.
  const groups = new Map<string, ImportedEntry[]>();
  for (const entry of entries) {
    const key = identity(entry);
    const group = groups.get(key);
    if (group) group.push(entry);
    else groups.set(key, [entry]);
  }
  const total = groups.size;
  let matched = 0;
  report("matching", 0, total);
  const shows = new Map<number, { show: Show; rows: ImportedEntry[] }>();
  const movies = new Map<number, { movie: Movie; rows: ImportedEntry[] }>();
  const result = emptyResult(outcomes);

  for (const rows of groups.values()) {
    checkAborted(signal);
    const first = rows[0];
    report("matching", matched, total, first.title);
    const found = await resolve(rows, deps);
    if (found?.kind === "show") {
      const held = shows.get(found.show.id) ?? { show: found.show, rows: [] };
      held.rows.push(...rows);
      shows.set(found.show.id, held);
      if (found.guessed) result.ambiguous.push(first.title);
    } else if (found?.kind === "movie") {
      const held = movies.get(found.movie.id) ?? { movie: found.movie, rows: [] };
      held.rows.push(...rows);
      movies.set(found.movie.id, held);
      if (found.guessed) result.ambiguous.push(first.title);
    } else if (first.title !== "") {
      result.unmatched.push(first.title);
    }
    matched++;
    report("matching", matched, total, first.title);
  }
  checkAborted(signal);

  const plan = await write(shows, movies, result, deps);
  result.unmatched = sortedDistinct(result.unmatched);
  result.ambiguous = sortedDistinct(result.ambiguous);
  return { result, plan };
}

async function write(
  shows: Map<number, { show: Show; rows: ImportedEntry[] }>,
  movies: Map<number, { movie: Movie; rows: ImportedEntry[] }>,
  result: UniversalImportResult,
  deps: ImportDeps,
): Promise<ImportPlan> {
  const report = reporter(deps.onProgress);
  report("saving");
  const before = deps.library;
  const trackedShows = new Set((before.shows ?? []).map((t) => t.show.id));
  const trackedMovies = new Set((before.movies ?? []).map((t) => t.movie.id));
  const alreadyWatched = new Set(before.watched ?? []);
  const now = swiftNow(deps.now());

  const archive = importArchive(now);
  const plan: ImportPlan = { archive, ratings: {}, loved: [] };
  let applied = false;

  const newShows: TrackedShow[] = [];
  const watched = new Set<string>();
  const watchedDates = new Map<string, number>();
  for (const entry of shows.values()) {
    if (trackedShows.has(entry.show.id)) {
      result.showsAlreadyTracked++;
    } else {
      result.showsAdded++;
      newShows.push({ show: entry.show, status: showStatus(entry.rows), modified: now, added: now });
    }
    for (const row of entry.rows) {
      if (!isEpisode(row)) continue;
      // A file listing every episode and ticking some says so in a column;
      // ignoring it would check off the whole run.
      if (row.watchedFlag === false) continue;
      const key = episodeKey(entry.show.id, row.season!, row.episode!);
      // Already ticked here, so this library's own date stands.
      if (alreadyWatched.has(key)) continue;
      watched.add(key);
      // The earliest wins: two files in one archive can carry the same
      // episode, in no particular order.
      if (row.watchedAt) {
        const at = row.watchedAt.getTime();
        const held = watchedDates.get(key);
        watchedDates.set(key, held === undefined ? at : Math.min(held, at));
      }
    }
  }

  const newMovies: TrackedMovie[] = [];
  const watchedMovies: number[] = [];
  const movieDates: Record<string, string> = {};
  for (const entry of movies.values()) {
    if (trackedMovies.has(entry.movie.id)) {
      result.moviesAlreadyTracked++;
      continue;
    }
    result.moviesAdded++;
    const watchedRow = entry.rows.some((r) => r.watchedAt !== null && r.watchedFlag !== false);
    const standing = movieStatus(entry.rows, watchedRow);
    newMovies.push({ movie: entry.movie, status: standing, modified: now, added: now });
    if (standing === "Watched") {
      watchedMovies.push(entry.movie.id);
      const times = entry.rows.flatMap((r) => (r.watchedAt ? [r.watchedAt.getTime()] : []));
      if (times.length > 0) movieDates[String(entry.movie.id)] = formatSwiftDate(Math.min(...times));
    }
  }
  result.episodesAdded = watched.size;

  // "Does the library hold a verdict here" as Android asks it after each
  // setter: the snapshot, with what this plan has already set laid on top.
  const loved = new Set<string>();
  const verdicts = (rows: ImportedEntry[], key: string) => {
    // The highest rating when a title is rated in two files of one archive —
    // the kinder reading of somebody's own verdict.
    const ratings = rows.flatMap((r) => (r.rating !== null ? [r.rating] : []));
    if (ratings.length > 0) {
      if (before.ratings?.[key] == null && !(key in plan.ratings)) {
        plan.ratings[key] = Math.max(...ratings);
        result.ratingsApplied++;
      } else {
        result.ratingsKept++;
      }
    }
    // The heart is asked before it's set, because on the phones setting it
    // is a toggle and toggling a title that's already loved takes it off.
    if (rows.some((r) => r.isFavorite) && before.reactions?.[key] == null && !loved.has(key)) {
      loved.add(key);
      plan.loved.push(key);
    }
  };

  const landed = result.showsAdded > 0 || result.episodesAdded > 0 || result.moviesAdded > 0 || result.ratingsApplied > 0;
  if (landed || newShows.length > 0 || newMovies.length > 0) {
    archive.shows = newShows;
    archive.movies = newMovies;
    archive.watched = [...watched];
    archive.watchedDates = Object.fromEntries([...watchedDates].map(([k, at]) => [k, formatSwiftDate(at)]));
    archive.watchedMovies = watchedMovies;
    archive.movieWatchedDates = movieDates;
    applied = true;
    // Ratings and hearts after the merge, for every matched title — but only
    // where the library holds nothing: an import fills gaps and never
    // overwrites a verdict given here.
    for (const entry of movies.values()) verdicts(entry.rows, `movie:${entry.movie.id}`);
    for (const entry of shows.values()) verdicts(entry.rows.filter((r) => !isEpisode(r)), `show:${entry.show.id}`);
  }

  // The listings, for every show this added — whose Up Next and tallies would
  // read zero until something else refreshed them — and whenever an episode
  // rating is waiting, since it needs them too.
  const hasEpisodeRatings = [...shows.values()].some((e) => e.rows.some((r) => isEpisode(r) && r.rating !== null));
  if (result.showsAdded > 0 || hasEpisodeRatings) {
    report("loadingEpisodes");
    await deps.episodes.load([...shows.keys()]);
    checkAborted(deps.signal);

    // A run somebody finished elsewhere, which their export counted and didn't
    // list. Newly added shows only — on one this library already holds, the
    // progress is somebody's own. Undated, since the file has no dates to
    // give; specials left alone. "Already ticked" is asked of the library as
    // the first merge left it, as Android asks it.
    const state: LibraryArchive = applied ? mergeArchives(archive, before, deps.now()) : before;
    const ticked = new Set(state.watched ?? []);
    const finished: string[] = [];
    for (const entry of shows.values()) {
      if (trackedShows.has(entry.show.id)) continue;
      if (!entry.rows.some((r) => r.finishedRun) || entry.rows.some(isEpisode)) continue;
      for (const ep of await deps.episodes.episodes(entry.show.id)) {
        if (ep.season <= 0 || ticked.has(ep.id)) continue;
        finished.push(ep.id);
      }
    }
    if (finished.length > 0) {
      // Android's second `apply`, folded into the first: an undated tick with
      // no stamp merges the same whether it arrives now or with the rest.
      archive.watched = [...new Set([...archive.watched, ...finished])];
      applied = true;
      result.episodesAdded += finished.length;
    }

    for (const entry of shows.values()) {
      for (const row of entry.rows) {
        if (!isEpisode(row) || row.rating === null) continue;
        const listing = await deps.episodes.episodes(entry.show.id);
        const episode = listing.find((e) => e.season === row.season && e.episode === row.episode);
        if (!episode) result.ratingsUnplaced++;
        else verdicts([row], `episode:${episode.id}`);
      }
    }
  }
  return plan;
}
