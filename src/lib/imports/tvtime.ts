import type { Movie, MovieStatus, Show, TrackedMovie, TrackedShow, WatchStatus } from "../archive";
import { attempt, checkAborted, importArchive, movieYear, reporter, showYear } from "./run-parts";
import { formatSwiftDate, swiftNow, utf16Compare } from "./swift";
import { titleKey } from "./text";
import { movieYear as sourceMovieYear, readTvTimeFiles, searchable, showYear as sourceShowYear, type TvTimeExport, type TvTimeMovie, type TvTimeShow } from "./tvtime-reader";
import {
  emptyDiagnostics,
  episodeKey,
  TvTimeReadFailure,
  type ImportAmbiguity,
  type ImportDeps,
  type ImportFile,
  type ImportPlan,
  type ImportRun,
  type TvTimeImportResult,
} from "./types";

// Bringing a TV Time history into a plan for the library — Android's
// TvTimeImporter.kt, `TVTimeImporter` in TVTimeImport.swift.
//
// TV Time knew titles and TheTVDB ids and Kodigo runs on TMDB ids, so every
// distinct series in the file is resolved to a TMDB show before a single
// episode can be checked off: matched once and reused for every row, four at
// a time, as the phones do.
//
// Nothing is replaced. A show already tracked keeps its entry, its status and
// its dates, and gains only the episodes it was missing — arranged by leaving
// it out of the archive the merge is handed. That same rule makes a second
// run of one export harmless.

/** How many lookups run at once — iOS `concurrency`, what the phones' request gate leaves room for. */
const CONCURRENCY = 4;

type Resolved<T> = { kind: "notFound" } | { kind: "exact"; value: T } | { kind: "best"; value: T };

/**
 * TV Time's vote type read as a score: Wow at nine (TV Time handed Wow out
 * too freely for a ten), Good at seven, Meh at five. Any other id is no
 * rating rather than a fourth guess.
 */
export function tvTimeRatingScore(vote: number): number | null {
  switch (vote) {
    case 3:
      return 9;
    case 27:
      return 7;
    case 29:
      return 5;
    default:
      return null;
  }
}

/**
 * Resolves `sources` four at a time, handing each answer to `handle` as it
 * arrives — iOS's task group of four, refilled as each one finishes.
 */
async function inFours<S, T>(sources: S[], resolve: (s: S) => Promise<T>, handle: (s: S, r: T) => void, signal: AbortSignal | undefined) {
  let next = 0;
  const running = new Map<number, Promise<[number, S, T]>>();
  const addNext = () => {
    const at = next++;
    const source = sources[at];
    running.set(at, resolve(source).then((r): [number, S, T] => [at, source, r]));
  };
  while (next < Math.min(CONCURRENCY, sources.length)) addNext();
  while (running.size > 0) {
    const [at, source, resolved] = await Promise.race(running.values());
    running.delete(at);
    handle(source, resolved);
    checkAborted(signal);
    if (next < sources.length) addNext();
  }
}

/**
 * One exact title is exact; several go to the year TV Time wrote in brackets,
 * else TMDB's own order, either way worth a look; none take the first result
 * only when one name contains the other — a first result sharing nothing with
 * the query is a different show that happened to score, better reported than
 * filed under a name nobody would find.
 */
function pick<T>(items: T[], wanted: string, year: number | null, name: (t: T) => string, yearOf: (t: T) => string): Resolved<T> {
  const exact = items.filter((it) => titleKey(name(it)) === wanted);
  if (exact.length === 1) return { kind: "exact", value: exact[0] };
  if (exact.length > 1) {
    const onYear = year === null ? undefined : exact.find((it) => yearOf(it) === String(year));
    return { kind: "best", value: onYear ?? exact[0] };
  }
  const candidate = items[0];
  const candidateKey = titleKey(name(candidate));
  return candidateKey.includes(wanted) || wanted.includes(candidateKey) ? { kind: "best", value: candidate } : { kind: "notFound" };
}

async function resolveShow(source: TvTimeShow, deps: ImportDeps): Promise<Resolved<Show>> {
  // TheTVDB id first: TV Time was built on that database, so there's no
  // search and no judgement — exactly one answer.
  if (source.tvdbID !== null) {
    const id = source.tvdbID;
    const found = await attempt(() => deps.catalog.find(id), deps.signal);
    const show = found?.tvResults?.[0];
    if (show) return { kind: "exact", value: show };
  }
  const query = searchable(source.title);
  if (!query) return { kind: "notFound" };
  const items = await attempt(() => deps.catalog.searchShows(query, null), deps.signal);
  if (!items || items.length === 0) return { kind: "notFound" };
  return pick(items, titleKey(query), sourceShowYear(source), (s) => s.name, showYear);
}

async function resolveMovie(source: TvTimeMovie, deps: ImportDeps): Promise<Resolved<Movie>> {
  const query = searchable(source.title);
  if (!query) return { kind: "notFound" };
  const items = await attempt(() => deps.catalog.searchMovies(query, null), deps.signal);
  if (!items || items.length === 0) return { kind: "notFound" };
  return pick(items, titleKey(query), sourceMovieYear(source), (m) => m.title, movieYear);
}

const matchDescription = (show: Show) => (showYear(show) ? `${show.name} (${showYear(show)})` : show.name);

/**
 * Runs a TV Time import of the picked file — the GDPR zip, or one of its
 * CSVs — against the library snapshot in `deps`. Rejects with a
 * `TvTimeReadFailure` when the file can't be read, and with the signal's
 * reason when cancelled. Nothing is written: the plan says what to write.
 */
export async function runTvTimeImport(files: ImportFile[], deps: ImportDeps): Promise<ImportRun<TvTimeImportResult>> {
  const { signal } = deps;
  const report = reporter(deps.onProgress);
  report("reading");
  let exported: TvTimeExport;
  try {
    exported = readTvTimeFiles(files);
  } catch (e) {
    if (e instanceof TvTimeReadFailure) throw e;
    throw new TvTimeReadFailure({ kind: "nothingRecognised" }, emptyDiagnostics(files.map((f) => f.name).join(", ")));
  }
  checkAborted(signal);

  const total = exported.shows.length + exported.movies.length;
  let matched = 0;
  report("matching", 0, total);
  const before = deps.library;
  const trackedShows = new Set((before.shows ?? []).map((t) => t.show.id));
  const trackedMovies = new Set((before.movies ?? []).map((t) => t.movie.id));

  const ambiguous: ImportAmbiguity[] = [];
  const unmatchedShows: string[] = [];
  const unmatchedMovies: string[] = [];
  const shows: { source: TvTimeShow; show: Show; status: WatchStatus }[] = [];
  const movies: { source: TvTimeMovie; movie: Movie; status: MovieStatus }[] = [];
  const tick = (title: string) => {
    matched++;
    report("matching", matched, total, title);
  };

  await inFours(exported.shows, (s) => resolveShow(s, deps), (source, resolved) => {
    tick(source.title);
    const status: WatchStatus = source.isArchived ? "Stopped" : "Watching";
    if (resolved.kind === "notFound") unmatchedShows.push(source.title);
    else {
      if (resolved.kind === "best") ambiguous.push({ title: source.title, takenAs: matchDescription(resolved.value) });
      shows.push({ source, show: resolved.value, status });
    }
  }, signal);
  checkAborted(signal);
  await inFours(exported.movies, (m) => resolveMovie(m, deps), (source, resolved) => {
    tick(source.title);
    const status: MovieStatus = source.isWatched ? "Watched" : "To Watch";
    if (resolved.kind === "notFound") unmatchedMovies.push(source.title);
    else {
      if (resolved.kind === "best") ambiguous.push({ title: source.title, takenAs: resolved.value.title });
      movies.push({ source, movie: resolved.value, status });
    }
  }, signal);
  checkAborted(signal);

  report("saving");
  const now = swiftNow(deps.now());
  const alreadyWatched = new Set(before.watched ?? []);
  const newShows: TrackedShow[] = [];
  const watched = new Set<string>();
  const watchedDates = new Map<string, number>();
  let showsAdded = 0;
  let showsKept = 0;
  for (const match of shows) {
    if (trackedShows.has(match.show.id)) {
      showsKept++;
    } else if (!newShows.some((t) => t.show.id === match.show.id)) {
      // Once per TMDB show. Two TV Time series can resolve to the same one —
      // "The Office" and "The Office (US)" — and iOS counts and appends it
      // twice, which overstates "Shows added". Android's fix, kept.
      showsAdded++;
      newShows.push({ show: match.show, status: match.status, modified: now, added: now });
    }
    for (const episode of match.source.episodes) {
      const key = episodeKey(match.show.id, episode.season, episode.number);
      // Already checked off here: this library's own night stands.
      if (alreadyWatched.has(key)) continue;
      watched.add(key);
      // Earliest rather than first seen: two TV Time series can resolve to
      // one TMDB show, their rows in no particular order.
      if (episode.watchedAt) {
        const at = episode.watchedAt.getTime();
        const held = watchedDates.get(key);
        watchedDates.set(key, held === undefined ? at : Math.min(held, at));
      }
    }
  }
  const newMovies: TrackedMovie[] = [];
  const watchedMovies: number[] = [];
  const movieDates: Record<string, string> = {};
  let moviesAdded = 0;
  let moviesKept = 0;
  for (const match of movies) {
    if (trackedMovies.has(match.movie.id)) {
      moviesKept++;
      continue;
    }
    if (newMovies.some((t) => t.movie.id === match.movie.id)) continue;
    moviesAdded++;
    newMovies.push({ movie: match.movie, status: match.status, modified: now, added: now });
    if (match.status === "Watched") {
      watchedMovies.push(match.movie.id);
      if (match.source.watchedAt) movieDates[String(match.movie.id)] = formatSwiftDate(match.source.watchedAt.getTime());
    }
  }

  const result: TvTimeImportResult = {
    showsAdded,
    showsAlreadyTracked: showsKept,
    episodesAdded: watched.size,
    moviesAdded,
    moviesAlreadyTracked: moviesKept,
    ambiguous: [...ambiguous].sort((a, b) => utf16Compare(a.title, b.title)),
    unmatchedShows: [...unmatchedShows].sort(utf16Compare),
    unmatchedMovies: [...unmatchedMovies].sort(utf16Compare),
    episodesWithoutNumbers: exported.episodesWithoutNumbers,
    diagnostics: exported.diagnostics,
  };

  const archive = importArchive(now);
  const plan: ImportPlan = { archive, ratings: {}, loved: [] };
  // A score set by the phones replaces whatever was there, and an unknown
  // vote clears it; within the plan the later of two for one title wins the
  // same way. (The plan itself only fills gaps when it lands — see
  // `applyImportPlan`.)
  const setRating = (key: string, vote: number) => {
    const score = tvTimeRatingScore(vote);
    if (score === null) delete plan.ratings[key];
    else plan.ratings[key] = score;
  };

  if (showsAdded > 0 || result.episodesAdded > 0 || moviesAdded > 0) {
    archive.shows = newShows;
    archive.movies = newMovies;
    archive.watched = [...watched];
    archive.watchedDates = Object.fromEntries([...watchedDates].map(([k, at]) => [k, formatSwiftDate(at)]));
    archive.watchedMovies = watchedMovies;
    archive.movieWatchedDates = movieDates;
    // Verdicts on newly added titles only; a title already tracked keeps
    // whatever it had. The heart only where there is none, since on the
    // phones setting it is a toggle.
    for (const match of movies) {
      if (trackedMovies.has(match.movie.id) || match.source.ratingVote === null) continue;
      setRating(`movie:${match.movie.id}`, match.source.ratingVote);
    }
    for (const match of shows) {
      if (trackedShows.has(match.show.id) || !match.source.isFavorited) continue;
      const key = `show:${match.show.id}`;
      if (before.reactions?.[key] == null && !plan.loved.includes(key)) plan.loved.push(key);
    }
  }

  // The listings for every show just added, so the library reads right the
  // moment the import finishes — and then the episode ratings, which name
  // their episode by season and number and so wait for them.
  if (showsAdded > 0) {
    report("loadingEpisodes");
    await deps.episodes.load(newShows.map((t) => t.show.id));
    checkAborted(signal);
    for (const match of shows) {
      if (trackedShows.has(match.show.id)) continue;
      const listing = match.source.ratedEpisodes.length > 0 ? await deps.episodes.episodes(match.show.id) : [];
      for (const rated of match.source.ratedEpisodes) {
        const episode = listing.find((e) => e.season === rated.season && e.episode === rated.number);
        if (episode) setRating(`episode:${episode.id}`, rated.vote);
      }
    }
  }
  return { result, plan };
}
