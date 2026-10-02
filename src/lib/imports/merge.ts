import type {
  CustomList,
  LibraryArchive,
  MovieRewatchTick,
  Review,
  RewatchCount,
  RewatchRun,
  RewatchTick,
  SavedRail,
  TickTombstone,
  Tombstone,
  TrackedMovie,
  TrackedShow,
} from "../archive";
import { canonicalDate, DISTANT_PAST, parseSwiftDate, swiftCompare, swiftDescription, swiftParseDouble } from "./swift";

// Folding one library into another — `merged(onto:asOf:)`, `pruned(asOf:)` and
// the resolvers behind them, from LibraryArchive.swift by way of Android's
// ArchiveMerge.kt.
//
// Ported line for line, because two phones and this site merging the same
// pair of libraries have to arrive at the same answer whichever of them runs
// it. Where iOS leaves an order to a Swift `Set` — which has none — this picks
// the fixed one Android picked, so the three agree with each other too.
//
// Dates are compared as moments and written back in the apps' own spelling
// (whole seconds, a `Z`); a record handed through whole — a tracked show, a
// rewatch night — is handed through exactly as it came.

/** The version a merged archive states: Swift's `LibraryArchive.currentVersion`, which the site's own `CURRENT_VERSION` trails. */
export const MERGED_VERSION = 14;

// ---- The deletion window (Android's LibraryRules.kt, iOS `Library.tombstoneLifetime`) ----

/**
 * Ninety days. A tombstone has to outlive the longest gap expected between
 * two copies of the library speaking to each other, because one that expires
 * before the other device sees it is a deletion that comes back.
 */
export const TOMBSTONE_LIFETIME_MS = 90 * 24 * 60 * 60 * 1000;

/** Whether a deletion is still worth telling anyone about — strictly inside the window, as on iOS. */
export function tombstoneIsLive(removed: number, asOf: number) {
  return asOf - removed < TOMBSTONE_LIFETIME_MS;
}

/** A date as the merge compares it. Missing or unreadable is the oldest there is, which loses every argument. */
function moment(text: string | null | undefined): number {
  return parseSwiftDate(text) ?? DISTANT_PAST;
}

/** A moment and the text it was written as, so the winner can be written back as it came. */
interface Stamp {
  at: number;
  text: string;
}

function stamp(text: string): Stamp {
  return { at: moment(text), text: canonicalDate(text) };
}

/** The later of two stamps, the first winning a tie — Kotlin's `maxOf`. */
function later(a: Stamp | undefined, b: Stamp): Stamp {
  return a && a.at >= b.at ? a : b;
}

/**
 * The episode stamps worth keeping. A stamp on an episode that is checked off
 * is the record's own time and lives as long as it does; a stamp on one that
 * isn't is an uncheck, and gets the same window a dropped show gets.
 */
function liveWatchedStamps(stamps: Record<string, string>, watched: Set<string>, asOf: number) {
  const out: Record<string, string> = {};
  for (const [key, text] of Object.entries(stamps)) if (watched.has(key) || tombstoneIsLive(moment(text), asOf)) out[key] = text;
  return out;
}

// ---- Rewatch night ids (Android's RewatchTickID) ----

/**
 * How a rewatch night is named: the title's id and the whole second, printed
 * as Swift prints a Double — `1399-1-1-1727261234.0`. The file keeps whole
 * seconds, so a name built from anything finer would change on a round trip
 * and stop matching its own tombstone.
 */
export function tickID(title: string, watched: string) {
  return `${title}-${swiftDescription(Math.floor(moment(watched) / 1000))}`;
}

/**
 * An id written before whole seconds, brought to the current spelling, so an
 * old tombstone still matches the night it deleted. Ported as iOS has it,
 * including the corner it gets wrong before 1970 (the last dash is then the
 * minus sign); no rewatch night predates the app, and fixing it on one side
 * only would make the apps disagree about ids instead.
 */
export function normalisedTickID(id: string) {
  const dash = id.lastIndexOf("-");
  if (dash < 0) return id;
  const seconds = swiftParseDouble(id.slice(dash + 1));
  if (seconds === null) return id;
  return `${id.slice(0, dash)}-${swiftDescription(Math.floor(seconds))}`;
}

// ---- Pruning ----

function liveStones<T extends { removed: string }>(stones: T[] | undefined, asOf: number) {
  return (stones ?? []).filter((s) => tombstoneIsLive(moment(s.removed), asOf));
}

/**
 * The archive with the deletions that have aged out taken back off it, and
 * old night tombstones brought to the current id spelling as the apps do on
 * reading them.
 */
export function pruneArchive(archive: LibraryArchive, asOf: Date): LibraryArchive {
  const now = asOf.getTime();
  const ticks = (stones: TickTombstone[] | undefined) => liveStones(stones, now).map((s) => ({ id: normalisedTickID(s.id), removed: s.removed }));
  return {
    ...archive,
    showTombstones: liveStones(archive.showTombstones, now),
    movieTombstones: liveStones(archive.movieTombstones, now),
    watchedStamps: liveWatchedStamps(archive.watchedStamps ?? {}, new Set(archive.watched ?? []), now),
    rewatchRunTombstones: liveStones(archive.rewatchRunTombstones, now),
    rewatchTickTombstones: ticks(archive.rewatchTickTombstones),
    movieRewatchTickTombstones: ticks(archive.movieRewatchTickTombstones),
  };
}

// ---- The resolver ----

/**
 * What one copy of the library has to say about one id. Three answers rather
 * than two, and the third is the one the whole merge turns on: unknown means
 * this copy has never heard of the thing, which is not the same as having got
 * rid of it. It carries no date because there is no moment at which nothing
 * happened, so it loses to anything that has one.
 */
type RecordState<R> = { kind: "present"; record: R; at: Stamp } | { kind: "removed"; at: Stamp } | { kind: "unknown" };

const whenOf = <R>(s: RecordState<R>) => (s.kind === "unknown" ? DISTANT_PAST : s.at.at);

/** The later of two answers, with a tie going to `mine` — the archive being folded in. */
function laterState<R>(mine: RecordState<R>, theirs: RecordState<R>): RecordState<R> {
  if (mine.kind === "unknown") return theirs;
  if (theirs.kind === "unknown") return mine;
  return whenOf(mine) >= whenOf(theirs) ? mine : theirs;
}

/**
 * One side's answer, from the record it holds and the removal it recorded.
 * Nothing the app writes has both, but the file is one people are invited to
 * fix by hand, so both takes whichever is later.
 */
function recordState<R>(record: R | undefined, modified: Stamp | undefined, removed: Stamp | undefined): RecordState<R> {
  if (record !== undefined && modified && removed) return modified.at >= removed.at ? { kind: "present", record, at: modified } : { kind: "removed", at: removed };
  if (record !== undefined && modified) return { kind: "present", record, at: modified };
  if (removed) return { kind: "removed", at: removed };
  return { kind: "unknown" };
}

/** The lookup shape of a tombstone list. Later wins where a hand-edited file names the same id twice. */
function stonesByID<K>(stones: { id: K; removed: string }[]): Map<K, Stamp> {
  const out = new Map<K, Stamp>();
  for (const s of stones) out.set(s.id, later(out.get(s.id), stamp(s.removed)));
  return out;
}

/** Every id either side knows about, settled one at a time: the survivors, and the removals still worth carrying. */
function resolve<R>(
  mine: R[],
  mineRemoved: Map<number, Stamp>,
  theirs: R[],
  theirsRemoved: Map<number, Stamp>,
  idOf: (r: R) => number,
  modifiedOf: (r: R) => string | undefined,
): { records: R[]; removals: Tombstone[] } {
  // First wins on a duplicate id, since a hand-edited file can name a show twice.
  const byMe = new Map<number, R>();
  for (const r of mine) if (!byMe.has(idOf(r))) byMe.set(idOf(r), r);
  const byThem = new Map<number, R>();
  for (const r of theirs) if (!byThem.has(idOf(r))) byThem.set(idOf(r), r);
  const ids = [...new Set([...byMe.keys(), ...byThem.keys(), ...mineRemoved.keys(), ...theirsRemoved.keys()])].sort((a, b) => a - b);

  // A record with no `modified` was written before version 3 and reads as the oldest there is.
  const modifiedStamp = (r: R | undefined) => (r === undefined ? undefined : stamp(modifiedOf(r) ?? ""));
  const records: R[] = [];
  const removals: Tombstone[] = [];
  for (const id of ids) {
    const mineRecord = byMe.get(id);
    const theirRecord = byThem.get(id);
    const winner = laterState(
      recordState(mineRecord, modifiedStamp(mineRecord), mineRemoved.get(id)),
      recordState(theirRecord, modifiedStamp(theirRecord), theirsRemoved.get(id)),
    );
    if (winner.kind === "present") records.push(winner.record);
    else if (winner.kind === "removed") removals.push({ id, removed: winner.at.text });
  }
  return { records, removals };
}

/**
 * The episode twin of `resolve`, where membership of `watched` is the record
 * and the stamp is all there is to date it by. A key checked off with no stamp
 * was ticked before version 3, so it reads as present and oldest — and comes
 * out still unstamped rather than stamped now, since inventing a moment would
 * let the next merge treat an old tick as a fresh decision.
 */
function resolveEpisodes(
  mineWatched: Set<string>,
  mineStamps: Record<string, string>,
  theirsWatched: Set<string>,
  theirsStamps: Record<string, string>,
): { checked: Set<string>; stamps: Record<string, string> } {
  const own = (stamps: Record<string, string>, key: string) => (Object.prototype.hasOwnProperty.call(stamps, key) ? stamps[key] : undefined);
  const sideState = (watched: Set<string>, stamps: Record<string, string>, key: string): RecordState<string> => {
    const text = own(stamps, key);
    if (watched.has(key)) return { kind: "present", record: key, at: text === undefined ? { at: DISTANT_PAST, text: "" } : stamp(text) };
    if (text === undefined) return { kind: "unknown" };
    return { kind: "removed", at: stamp(text) };
  };

  const keys = [...new Set([...mineWatched, ...theirsWatched, ...Object.keys(mineStamps), ...Object.keys(theirsStamps)])].sort(swiftCompare);
  const checked = new Set<string>();
  const stamps: Record<string, string> = {};
  for (const key of keys) {
    const winner = laterState(sideState(mineWatched, mineStamps, key), sideState(theirsWatched, theirsStamps, key));
    if (winner.kind === "present") {
      checked.add(key);
      if (winner.at.at > DISTANT_PAST) stamps[key] = winner.at.text;
    } else if (winner.kind === "removed") {
      stamps[key] = winner.at.text;
    }
  }
  return { checked, stamps };
}

/** Both sides' night tombstones, the later removal winning a shared id. */
function tickStones(mine: TickTombstone[], theirs: TickTombstone[]): Map<string, Stamp> {
  const stones = stonesByID(mine);
  for (const s of theirs) stones.set(s.id, later(stones.get(s.id) ?? { at: DISTANT_PAST, text: "" }, stamp(s.removed)));
  return stones;
}

const tickStoneList = (stones: Map<string, Stamp>): TickTombstone[] =>
  [...stones.keys()].sort(swiftCompare).map((id) => ({ id, removed: stones.get(id)!.text }));

const dates = (map: Record<string, string>) => Object.fromEntries(Object.entries(map).map(([k, v]) => [k, canonicalDate(v)]));

const distinct = <T>(values: T[]) => [...new Set(values)];

/** Swift reads UUIDs in either case and writes them in capitals, so two spellings are one list. */
const uuidKey = (id: string) => id.toUpperCase();

/**
 * Reviews: per title the later `modified` wins, the incoming copy taking a
 * tie — the rule the merge gives a tracked show, since a review is edited in
 * place the same way. No tombstones, so a review deleted on one side can come
 * back from the other. The apps merge them by the same rule
 * (docs/reviews-import.md).
 */
function mergeReviews(mine: Record<string, Review> | undefined, theirs: Record<string, Review> | undefined) {
  if (!mine && !theirs) return undefined;
  const out: Record<string, Review> = { ...(theirs ?? {}) };
  for (const [key, review] of Object.entries(mine ?? {})) {
    const other = out[key];
    if (!other || moment(review.modified) >= moment(other.modified)) out[key] = review;
  }
  return out;
}

/**
 * `incoming` folded on top of `onto`, record by record, with the side that
 * touched a thing more recently winning it — Swift's `incoming.merged(onto:)`.
 *
 * Each show, film, rewatch run and episode is settled on its own: a removal
 * recorded after the other side's last edit wins and the thing stays gone,
 * and an edit made after the removal wins and brings it back. A record from a
 * copy that carries no stamps — anything written before version 3 — counts as
 * oldest, so folding in an old backup adds what's missing and loses every
 * argument about what's already here: an import can't undo work done since.
 *
 * Still additive, on purpose: reactions, ratings, notes, art picks, opt-outs,
 * mutes and the watched-film memory. Those are things you set rather than
 * remove, and a stale one costs a few bytes and gives an old verdict back.
 *
 * Where the two sides are indistinguishable the incoming one wins. `asOf` is
 * what the deletion window is measured against. Anything in `onto` this site
 * doesn't model is carried over from it untouched.
 */
export function mergeArchives(incoming: LibraryArchive, onto: LibraryArchive, asOf: Date): LibraryArchive {
  // Expired deletions are dropped from both sides before anything is
  // compared, so "too old to matter" and "never happened" are one answer.
  const mine = pruneArchive(incoming, asOf);
  const theirs = pruneArchive(onto, asOf);

  const shows = resolve<TrackedShow>(
    mine.shows ?? [], stonesByID(mine.showTombstones ?? []), theirs.shows ?? [], stonesByID(theirs.showTombstones ?? []),
    (r) => r.show.id, (r) => r.modified,
  );
  const movies = resolve<TrackedMovie>(
    mine.movies ?? [], stonesByID(mine.movieTombstones ?? []), theirs.movies ?? [], stonesByID(theirs.movieTombstones ?? []),
    (r) => r.movie.id, (r) => r.modified,
  );

  // Episodes settle the same way, with the stamp standing in for both halves:
  // stamped and checked off is a record, stamped and not is the uncheck.
  const { checked, stamps } = resolveEpisodes(new Set(mine.watched ?? []), mine.watchedStamps ?? {}, new Set(theirs.watched ?? []), theirs.watchedStamps ?? {});

  // A union, since a skip carries no stamp to compare. Unskipping doesn't
  // travel as a result, which is the better failure: the other way round is a
  // skip going quietly missing. Minus whatever ended up checked, so an
  // episode can't come out both watched and skipped.
  const skipped = distinct([...(theirs.skipped ?? []), ...(mine.skipped ?? [])]).filter((k) => !checked.has(k)).sort(swiftCompare);
  const stillSkipped = new Set(skipped);

  // The episode log is a union rather than a settlement: a tick is one
  // episode on one evening and nothing edits it, so keeping both sides' is
  // the only answer that loses nothing. The same night from both sides has
  // the same id and collapses to one.
  const log = new Map<string, RewatchTick>();
  for (const tick of [...(mine.rewatchLog ?? []), ...(theirs.rewatchLog ?? [])]) {
    const id = tickID(tick.episodeID, tick.watched);
    if (!log.has(id)) log.set(id, tick);
  }
  // The one thing that takes a night back out. An id carries its moment, so
  // a deleted one can never be handed back by a legitimate later rewatch, and
  // the tombstone simply wins.
  const nightStones = tickStones(mine.rewatchTickTombstones ?? [], theirs.rewatchTickTombstones ?? []);
  for (const id of nightStones.keys()) log.delete(id);

  const movieLog = new Map<string, MovieRewatchTick>();
  for (const tick of [...(mine.movieRewatchLog ?? []), ...(theirs.movieRewatchLog ?? [])]) {
    const id = tickID(String(tick.movieID), tick.watched);
    if (!movieLog.has(id)) movieLog.set(id, tick);
  }
  const movieNightStones = tickStones(mine.movieRewatchTickTombstones ?? [], theirs.movieRewatchTickTombstones ?? []);
  for (const id of movieNightStones.keys()) movieLog.delete(id);

  const runs = resolve<RewatchRun>(
    mine.rewatchRuns ?? [], stonesByID(mine.rewatchRunTombstones ?? []), theirs.rewatchRuns ?? [], stonesByID(theirs.rewatchRunTombstones ?? []),
    (r) => r.showID, (r) => r.modified,
  );

  // Counts take the larger rather than the later. They only go up, and a
  // device that finished a run the other hasn't heard about holds the truer
  // number whichever copy was written last.
  const counts = new Map<number, number>();
  for (const c of theirs.rewatchCounts ?? []) counts.set(c.id, Math.max(counts.get(c.id) ?? c.count, c.count));
  for (const c of mine.rewatchCounts ?? []) counts.set(c.id, Math.max(counts.get(c.id) ?? 0, c.count));

  // The avatar and banner from whichever copy changed them last, together; a
  // tie goes to the incoming one.
  const takeMyPictures = moment(mine.profilePicturesChanged) >= moment(theirs.profilePicturesChanged);
  const pictures = takeMyPictures ? mine : theirs;

  // Lists and rails key off their id, and the incoming copy of one wins
  // whole: merging contents item by item would undo every removal, since a
  // removal looks just like an addition the other copy hasn't seen. Neither
  // has tombstones, so one deleted on one device comes back from the other —
  // a known limitation on iOS, kept so every copy behaves alike.
  const lists = new Map<string, CustomList>();
  for (const list of onto.customLists ?? []) if (!lists.has(uuidKey(list.id))) lists.set(uuidKey(list.id), list);
  for (const list of incoming.customLists ?? []) lists.set(uuidKey(list.id), list);
  const rails = new Map<string, SavedRail>();
  for (const rail of onto.savedRails ?? []) if (!rails.has(uuidKey(rail.id))) rails.set(uuidKey(rail.id), rail);
  for (const rail of incoming.savedRails ?? []) rails.set(uuidKey(rail.id), rail);
  const byCreated = <T extends { created?: string }>(a: T, b: T) => moment(a.created) - moment(b.created);

  // Unioned, unlike moods. A tag is a label somebody added, and one device's
  // silence shouldn't erase the other's word.
  const tags: Record<string, string[]> = {};
  for (const key of distinct([...Object.keys(theirs.tags ?? {}), ...Object.keys(mine.tags ?? {})])) {
    tags[key] = distinct([...(theirs.tags?.[key] ?? []), ...(mine.tags?.[key] ?? [])]);
  }

  const pick = <T>(mineValue: T | null | undefined, theirValue: T | null | undefined) => mineValue ?? theirValue ?? undefined;
  const incomingIsNewer = moment(incoming.exported) >= moment(onto.exported);

  // The later of the two import stamps, so the last import made on either
  // side is still the last one after they meet. Only a readable date counts.
  const importStamps = [incoming.importedAt, onto.importedAt].filter((t): t is string => typeof t === "string" && parseSwiftDate(t) !== null);
  const importedAt = importStamps.length > 0 ? importStamps.map(stamp).reduce((a, b) => later(a, b)).text : undefined;

  const merged: LibraryArchive = {
    ...theirs,
    version: MERGED_VERSION,
    exported: canonicalDate(incomingIsNewer ? incoming.exported : onto.exported),
    device: incomingIsNewer ? incoming.device : onto.device,

    shows: shows.records.sort((a, b) => swiftCompare(a.show.name, b.show.name)),
    showTombstones: shows.removals,
    movies: movies.records.sort((a, b) => swiftCompare(a.movie.title, b.movie.title)),
    movieTombstones: movies.removals,

    watched: [...checked].sort(swiftCompare),
    watchedStamps: stamps,
    skipped,
    watchedMovies: distinct([...(theirs.watchedMovies ?? []), ...(mine.watchedMovies ?? [])]),
    movieWatchedDates: dates({ ...(theirs.movieWatchedDates ?? {}), ...(mine.movieWatchedDates ?? {}) }),
    // Narrowed to what survived, so an episode that lost to an uncheck
    // doesn't keep a date describing a night it's no longer counted in.
    watchedDates: dates(Object.fromEntries(Object.entries({ ...(theirs.watchedDates ?? {}), ...(mine.watchedDates ?? {}) }).filter(([k]) => checked.has(k)))),
    // Narrowed to the skips that survived, so a date can't outlive its skip.
    skippedDates: dates(Object.fromEntries(Object.entries({ ...(theirs.skippedDates ?? {}), ...(mine.skippedDates ?? {}) }).filter(([k]) => stillSkipped.has(k)))),
    reactions: { ...(theirs.reactions ?? {}), ...(mine.reactions ?? {}) },
    ratings: { ...(theirs.ratings ?? {}), ...(mine.ratings ?? {}) },
    // Additive with the incoming copy winning a contested title. Resetting a
    // pick leaves no key, so a merge can bring one back — the cheap direction
    // to be wrong in.
    chosenArt: { ...(theirs.chosenArt ?? {}), ...(mine.chosenArt ?? {}) },
    // Keyed by an id minted per upload, so a collision is the same picture
    // either way. A union, so a pick never points at bytes nobody has.
    uploadedArt: { ...(theirs.uploadedArt ?? {}), ...(mine.uploadedArt ?? {}) },
    profileAvatar: pictures.profileAvatar ?? undefined,
    profileBanner: pictures.profileBanner ?? undefined,
    profilePicturesChanged: pictures.profilePicturesChanged ? canonicalDate(pictures.profilePicturesChanged) : undefined,
    // Key by key with the incoming set winning whole, and deliberately not
    // unioned: a mood cleared there would otherwise come straight back, and
    // two sets of three would union past the cap of three.
    moods: { ...(theirs.moods ?? {}), ...(mine.moods ?? {}) },
    notes: { ...(theirs.notes ?? {}), ...(mine.notes ?? {}) },
    reviews: mergeReviews(mine.reviews, theirs.reviews),
    importedAt,
    tags,
    catchUpOptOuts: distinct([...(theirs.catchUpOptOuts ?? []), ...(mine.catchUpOptOuts ?? [])]),
    mutedShows: distinct([...(theirs.mutedShows ?? []), ...(mine.mutedShows ?? [])]),
    hiddenShows: distinct([...(theirs.hiddenShows ?? []), ...(mine.hiddenShows ?? [])]),
    hiddenRecs: distinct([...(theirs.hiddenRecs ?? []), ...(mine.hiddenRecs ?? [])]),

    // Not unioned: two orders folded together give a third nobody asked
    // for. The incoming one wins whole — only when it has one to state, so
    // folding in an older file leaves the order here alone.
    showOrder: pick(incoming.showOrder, onto.showOrder),
    movieOrder: pick(incoming.movieOrder, onto.movieOrder),

    customLists: [...lists.values()].sort(byCreated),
    // Whichever copy has an order wins outright, and the incoming one wins a tie.
    customListOrder: incoming.customListOrder?.length ? incoming.customListOrder : (onto.customListOrder ?? []),
    savedRails: [...rails.values()].sort(byCreated),
    savedRailOrder: pick(incoming.savedRailOrder, onto.savedRailOrder),

    rewatchRuns: runs.records.sort((a, b) => a.showID - b.showID),
    rewatchRunTombstones: runs.removals,
    rewatchCounts: [...counts.entries()].map(([id, count]): RewatchCount => ({ id, count })).sort((a, b) => a.id - b.id),
    rewatchLog: [...log.values()].sort((a, b) => moment(a.watched) - moment(b.watched) || swiftCompare(a.episodeID, b.episodeID)),
    rewatchTickTombstones: tickStoneList(nightStones),
    movieRewatchLog: [...movieLog.values()].sort((a, b) => moment(a.watched) - moment(b.watched) || a.movieID - b.movieID),
    movieRewatchTickTombstones: tickStoneList(movieNightStones),
  };
  // Swift leaves a nil optional out of the file rather than writing null.
  for (const key of ["showOrder", "movieOrder", "savedRailOrder", "profileAvatar", "profileBanner", "profilePicturesChanged", "reviews", "importedAt"] as const) {
    if (merged[key] === undefined || merged[key] === null) delete merged[key];
  }
  return merged;
}
