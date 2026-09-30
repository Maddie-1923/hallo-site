import assert from "node:assert/strict";
import type { LibraryArchive, MovieRewatchTick, RewatchRun, RewatchTick, SavedRail } from "../../archive";
import { applyImportPlan } from "../apply";
import { MERGED_VERSION, mergeArchives, normalisedTickID, pruneArchive, tickID } from "../merge";
import { canonicalDate, DISTANT_PAST, formatSwiftDate, parseSwiftDate } from "../swift";
import { archive, day, dayMs, iso, NOW, NOW_MS, nowText, run, test, trackedMovie, trackedShow } from "./harness";

// Folding one library into another — Android's archive merge suites
// (LibrarySyncTests.kt's LibraryMergeTests, LibrarySyncTests and
// LibraryMergeFieldTests; the merge and order cases of LibraryArchiveTests.kt;
// RewatchTickSyncTests.kt; and the merge and pruning cases of
// LibraryImportTests.kt), from kodigoTests/LibrarySyncTests.swift and
// LibraryArchiveTests.swift.
//
// Every date hangs off the fixture's `now`, including the one a merge
// measures the tombstone window against. A test measured against the real
// clock would pass all year and start failing ninety days after it was
// written.

const merged = (incoming: LibraryArchive, onto: LibraryArchive, asOf = NOW) => mergeArchives(incoming, onto, asOf);
const ids = (a: LibraryArchive) => a.shows.map((s) => s.show.id);
const sorted = (xs: number[]) => [...xs].sort((a, b) => a - b);

// ==== LibraryMergeTests: a deletion against an edit ====

test("a deletion beats an older edit", () => {
  const stillHasIt = archive({ shows: [trackedShow(1, "A Show", "Watching", day(-3))] });
  const dropped = archive({ showTombstones: [{ id: 1, removed: day(-1) }] });
  const m = merged(dropped, stillHasIt);
  assert.equal(m.shows.length, 0);
  assert.deepEqual(m.showTombstones!.map((t) => t.id), [1]);
});

test("a deletion beats an older edit from either side", () => {
  const stillHasIt = archive({ shows: [trackedShow(1, "A Show", "Watching", day(-3))] });
  const dropped = archive({ showTombstones: [{ id: 1, removed: day(-1) }] });
  const m = merged(stillHasIt, dropped);
  assert.equal(m.shows.length, 0);
  assert.deepEqual(m.showTombstones!.map((t) => t.id), [1]);
});

test("an edit beats an older deletion", () => {
  const dropped = archive({ showTombstones: [{ id: 1, removed: day(-3) }] });
  const trackedAgain = archive({ shows: [trackedShow(1, "A Show", "Stopped", day(-1))] });
  const m = merged(dropped, trackedAgain);
  assert.deepEqual(ids(m), [1]);
  assert.equal(m.shows[0].status, "Stopped");
  assert.equal(m.showTombstones!.length, 0);
});

test("an edit beats an older deletion from either side", () => {
  const dropped = archive({ showTombstones: [{ id: 1, removed: day(-3) }] });
  const trackedAgain = archive({ shows: [trackedShow(1, "A Show", "Stopped", day(-1))] });
  const m = merged(trackedAgain, dropped);
  assert.deepEqual(ids(m), [1]);
  assert.equal(m.showTombstones!.length, 0);
});

test("films resolve the same way", () => {
  const stillHasIt = archive({ movies: [trackedMovie(9, "A Movie", "To Watch", day(-3))] });
  const dropped = archive({ movieTombstones: [{ id: 9, removed: day(-1) }] });
  assert.equal(merged(dropped, stillHasIt).movies.length, 0);
  assert.equal(merged(stillHasIt, dropped).movies.length, 0);
});

test("the deletion itself travels on", () => {
  const dropped = archive({ showTombstones: [{ id: 1, removed: day(-1) }] });
  assert.equal(merged(dropped, archive()).showTombstones![0].removed, day(-1));
});

test("a tie goes to the incoming copy", () => {
  const mine = archive({ shows: [trackedShow(1)] });
  const theirs = archive({ showTombstones: [{ id: 1, removed: nowText }] });
  assert.equal(merged(theirs, mine).shows.length, 0);
  assert.deepEqual(ids(merged(mine, theirs)), [1]);
});

// ---- The window ----

test("an expired deletion stops carrying", () => {
  const stillHasIt = archive({ shows: [trackedShow(1, "A Show", "Watching", day(-200))] });
  const droppedLongAgo = archive({ showTombstones: [{ id: 1, removed: day(-100) }] });
  const m = merged(droppedLongAgo, stillHasIt);
  assert.deepEqual(ids(m), [1]);
  assert.equal(m.showTombstones!.length, 0);
});

test("a deletion inside the window still carries", () => {
  const stillHasIt = archive({ shows: [trackedShow(1, "A Show", "Watching", day(-200))] });
  const dropped = archive({ showTombstones: [{ id: 1, removed: day(-89) }] });
  assert.equal(merged(dropped, stillHasIt).shows.length, 0);
});

test("the window ends at exactly ninety days", () => {
  const stones = [{ id: 1, removed: day(-90) }, { id: 2, removed: iso(dayMs(-90) + 1000) }];
  assert.deepEqual(pruneArchive(archive({ showTombstones: stones }), NOW).showTombstones!.map((t) => t.id), [2]);
});

// ---- Episodes ----

test("an uncheck beats an older tick", () => {
  const ticked = archive({ watched: ["1-1-1"], watchedStamps: { "1-1-1": day(-3) } });
  const unticked = archive({ watchedStamps: { "1-1-1": day(-1) } });
  assert.equal(merged(unticked, ticked).watched.length, 0);
  assert.equal(merged(ticked, unticked).watched.length, 0);
});

test("a tick beats an older uncheck", () => {
  const unticked = archive({ watchedStamps: { "1-1-1": day(-3) } });
  const ticked = archive({ watched: ["1-1-1"], watchedStamps: { "1-1-1": day(-1) } });
  assert.deepEqual(merged(unticked, ticked).watched, ["1-1-1"]);
  assert.deepEqual(merged(ticked, unticked).watched, ["1-1-1"]);
});

test("an episode only one side knows about is still added", () => {
  const m = merged(archive({ watched: ["1-1-2"] }), archive({ watched: ["1-1-1"] }));
  assert.deepEqual(new Set(m.watched), new Set(["1-1-1", "1-1-2"]));
});

test("an unstamped tick stays unstamped", () => {
  const m = merged(archive({ watched: ["1-1-1"] }), archive());
  assert.deepEqual(m.watched, ["1-1-1"]);
  assert.deepEqual(m.watchedStamps, {});
});

// ==== LibrarySyncTests: the library round trips, at the archive's level ====

const later = NOW_MS + 3600 * 1000;
const laterText = iso(later);

test("an untracked show stays untracked across a merge", () => {
  const backup = archive({ shows: [trackedShow(1, "Kept"), trackedShow(2, "Dropped")] });
  const local = { ...backup, exported: laterText, shows: backup.shows.slice(0, 1), showTombstones: [{ id: 2, removed: laterText }] };
  const m = merged(backup, local, new Date(later));
  assert.deepEqual(ids(m), [1]);
  assert.deepEqual(m.showTombstones!.map((t) => t.id), [2]);
});

test("an untracked film stays untracked across a merge", () => {
  const backup = archive({ movies: [trackedMovie(8, "Kept"), trackedMovie(9, "Dropped")] });
  const local = { ...backup, exported: laterText, movies: backup.movies.slice(0, 1), movieTombstones: [{ id: 9, removed: laterText }] };
  assert.deepEqual(merged(backup, local, new Date(later)).movies.map((m) => m.movie.id), [8]);
});

/**
 * A file written before version 3, made by stripping the fields that didn't
 * exist then out of a real archive, so the test is about the missing keys and
 * nothing else.
 */
function withoutStamps(a: LibraryArchive): LibraryArchive {
  const copy = JSON.parse(JSON.stringify(a)) as LibraryArchive;
  delete copy.showTombstones;
  delete copy.movieTombstones;
  delete copy.watchedStamps;
  copy.version = 2;
  for (const s of copy.shows) delete s.modified;
  for (const m of copy.movies) delete m.modified;
  return copy;
}

test("an old archive doesn't overwrite newer local work", () => {
  const before = archive({ shows: [trackedShow(1, "Edited since"), trackedShow(2, "Dropped since"), trackedShow(3, "Untouched")] });
  const old = withoutStamps(before);
  assert.equal(old.showTombstones, undefined);
  assert.ok(old.shows.every((s) => s.modified === undefined));
  assert.equal(old.version, 2);

  const local: LibraryArchive = {
    ...before,
    exported: laterText,
    shows: [trackedShow(1, "Edited since", "Stopped", laterText), trackedShow(3, "Untouched")],
    showTombstones: [{ id: 2, removed: laterText }],
    watched: ["1-1-1"],
    watchedStamps: { "1-1-1": laterText },
  };
  const m = merged(old, local, new Date(later));
  assert.equal(m.shows.find((s) => s.show.id === 1)!.status, "Stopped");
  assert.deepEqual(sorted(ids(m)), [1, 3]);
  assert.ok(m.watched.includes("1-1-1"));
});

test("an old archive still adds what's missing", () => {
  const old = withoutStamps(archive({ shows: [trackedShow(1), trackedShow(2)] }));
  const local = archive({ exported: laterText, shows: [trackedShow(3)] });
  assert.deepEqual(sorted(ids(merged(old, local, new Date(later)))), [1, 2, 3]);
});

// ==== LibraryMergeFieldTests: the rest of the merge ====

test("skips union but lose to a watch", () => {
  const mine = archive({ skipped: ["1-1-1", "1-1-2"], skippedDates: { "1-1-1": nowText, "1-1-2": nowText } });
  const theirs = archive({ watched: ["1-1-1"], skipped: ["1-1-3"] });
  const m = merged(mine, theirs);
  assert.deepEqual(m.skipped, ["1-1-2", "1-1-3"]);
  assert.deepEqual(Object.keys(m.skippedDates!), ["1-1-2"]);
});

test("watch dates follow the episodes that survived", () => {
  const mine = archive({ watchedStamps: { "1-1-1": day(-1) } });
  const theirs = archive({ watched: ["1-1-1", "1-1-2"], watchedStamps: { "1-1-1": day(-3) }, watchedDates: { "1-1-1": day(-3), "1-1-2": day(-3) } });
  assert.deepEqual(Object.keys(merged(mine, theirs).watchedDates!), ["1-1-2"]);
});

test("moods replace and tags union", () => {
  const mine = archive({ moods: { "episode:1-1-1": ["sad"] }, tags: { "show:1": ["cosy"] } });
  const theirs = archive({
    moods: { "episode:1-1-1": ["lovedIt", "shocked"], "episode:1-1-2": ["hot"] },
    tags: { "show:1": ["office"], "show:2": ["heist"] },
  });
  const m = merged(mine, theirs);
  assert.deepEqual(m.moods!["episode:1-1-1"], ["sad"]);
  assert.deepEqual(m.moods!["episode:1-1-2"], ["hot"]);
  assert.deepEqual(new Set(m.tags!["show:1"]), new Set(["office", "cosy"]));
  assert.deepEqual(m.tags!["show:2"], ["heist"]);
});

test("ratings, reactions and art are additive with this side winning", () => {
  const mine = archive({ ratings: { "episode:1-1-1": 9.5 }, chosenArt: { "show:1#poster#grid": "/mine.jpg" } });
  const theirs = archive({
    ratings: { "episode:1-1-1": 3, "episode:1-1-2": 7 },
    chosenArt: { "show:1#poster#grid": "/theirs.jpg", "show:2#poster#grid": "/two.jpg" },
  });
  const m = merged(mine, theirs);
  assert.deepEqual(m.ratings, { "episode:1-1-1": 9.5, "episode:1-1-2": 7 });
  assert.equal(m.chosenArt!["show:1#poster#grid"], "/mine.jpg");
  assert.equal(m.chosenArt!["show:2#poster#grid"], "/two.jpg");
});

test("uploaded pictures union", () => {
  const m = merged(archive({ uploadedArt: { a: "AQ==" } }), archive({ uploadedArt: { b: "Ag==" } }));
  assert.deepEqual(new Set(Object.keys(m.uploadedArt!)), new Set(["a", "b"]));
});

test("profile pictures travel as a pair", () => {
  const newer = archive({ profileAvatar: "AQ==", profilePicturesChanged: day(-1) });
  const older = archive({ profileAvatar: "Ag==", profileBanner: "Aw==", profilePicturesChanged: day(-2) });

  const a = merged(newer, older);
  assert.equal(a.profileAvatar, "AQ==");
  assert.equal(a.profileBanner, undefined);

  const b = merged(older, newer);
  assert.equal(b.profileAvatar, "AQ==");
  assert.equal(b.profilePicturesChanged, day(-1));

  // Neither stamped: a tie, which goes to this side.
  const c = merged(archive({ profileAvatar: "CQ==" }), { ...older, profilePicturesChanged: null });
  assert.equal(c.profileAvatar, "CQ==");
  assert.equal(c.profileBanner, undefined);
});

test("lists and rails take this side's copy whole", () => {
  const id = "3F2504E0-4F89-11D3-9A0C-0305E82C3301";
  const other = "9B2A64C1-2D1E-4F7A-8C3B-5E6D7F809A1B";
  const mine = archive({ customLists: [{ id, name: "Mine", showIDs: [1], created: day(-1) }] });
  const theirs = archive({
    customLists: [
      { id, name: "Theirs", showIDs: [1, 2], created: day(-1) },
      { id: other, name: "Older", created: day(-5) },
    ],
  });
  const m = merged(mine, theirs);
  assert.deepEqual(m.customLists!.map((l) => l.name), ["Older", "Mine"]);
  assert.deepEqual(m.customLists![m.customLists!.length - 1].showIDs, [1]);

  const rail: SavedRail = { id, name: "Mine", catalogue: "shows", filter: {}, created: nowText };
  const theirRail = { ...rail, name: "Theirs" };
  assert.deepEqual(merged(archive({ savedRails: [rail] }), archive({ savedRails: [theirRail] })).savedRails!.map((r) => r.name), ["Mine"]);
});

test("order fields follow their own rules", () => {
  const a = "00000000-0000-0000-0000-00000000000A";
  const b = "00000000-0000-0000-0000-00000000000B";
  const mine = archive({ customListOrder: [], savedRailOrder: null });
  const theirs = archive({ customListOrder: [a, b], savedRailOrder: [b, a] });
  const m = merged(mine, theirs);
  // An empty list order is "not arranged" and yields; a nil rail order is "no opinion" and yields too.
  assert.deepEqual(m.customListOrder, [a, b]);
  assert.deepEqual(m.savedRailOrder, [b, a]);
  assert.deepEqual(merged(archive({ customListOrder: [a] }), theirs).customListOrder, [a]);
});

test("rewatch runs settle like shows", () => {
  const runOf: RewatchRun = { showID: 1, started: day(-5), modified: day(-3) };
  const stopped = archive({ rewatchRunTombstones: [{ id: 1, removed: day(-1) }] });
  assert.equal(merged(stopped, archive({ rewatchRuns: [runOf] })).rewatchRuns!.length, 0);

  const touched = { ...runOf, modified: nowText };
  const m = merged(archive({ rewatchRuns: [touched] }), stopped);
  assert.deepEqual(m.rewatchRuns, [touched]);
  assert.equal(m.rewatchRunTombstones!.length, 0);
});

test("rewatch counts take the larger", () => {
  const mine = archive({ rewatchCounts: [{ id: 1, count: 1 }, { id: 2, count: 4 }] });
  const theirs = archive({ rewatchCounts: [{ id: 1, count: 3 }, { id: 3, count: 1 }] });
  assert.deepEqual(merged(mine, theirs).rewatchCounts, [{ id: 1, count: 3 }, { id: 2, count: 4 }, { id: 3, count: 1 }]);
});

test("the rewatch log unions and tombstones win", () => {
  const early: RewatchTick = { episodeID: "1-1-1", showID: 1, watched: day(-4) };
  const lateTick: RewatchTick = { episodeID: "1-1-2", showID: 1, watched: day(-2) };
  const gone: RewatchTick = { episodeID: "1-1-3", showID: 1, watched: day(-3) };
  const goneID = tickID(gone.episodeID, gone.watched);
  const mine = archive({ rewatchLog: [lateTick, gone] });
  const theirs = archive({
    rewatchLog: [early, gone],
    rewatchTickTombstones: [{ id: goneID, removed: day(-1) }, { id: "9-9-9-1.0", removed: day(-100) }],
  });
  const m = merged(mine, theirs);
  assert.deepEqual(m.rewatchLog, [early, lateTick]);
  assert.deepEqual(m.rewatchTickTombstones!.map((t) => t.id), [goneID]);
});

test("the film log unions by film and night", () => {
  const night: MovieRewatchTick = { movieID: 9, watched: day(-2) };
  const m = merged(archive({ movieRewatchLog: [night] }), archive({ movieRewatchLog: [night, { movieID: 8, watched: day(-2) }] }));
  assert.deepEqual(m.movieRewatchLog!.map((t) => t.movieID), [8, 9]);
});

test("shows and films come out by name", () => {
  const m = merged(archive({ shows: [trackedShow(2, "Zeta"), trackedShow(1, "Alpha")] }), archive());
  assert.deepEqual(m.shows.map((s) => s.show.name), ["Alpha", "Zeta"]);
});

test("a merge is always the current version", () => {
  const old = archive({ version: 2 });
  assert.equal(merged(old, old).version, MERGED_VERSION);
});

test("pruning drops only expired unchecks", () => {
  const a = archive({ watched: ["1-1-1"], watchedStamps: { "1-1-1": day(-200), "1-1-2": day(-200), "1-1-3": day(-10) } });
  assert.deepEqual(new Set(Object.keys(pruneArchive(a, NOW).watchedStamps!)), new Set(["1-1-1", "1-1-3"]));
});

// ==== LibraryArchiveTests: merging ====

test("merge keeps shows from both sides", () => {
  const m = merged(archive({ shows: [trackedShow(2)] }), archive({ shows: [trackedShow(1)] }));
  assert.deepEqual(new Set(ids(m)), new Set([1, 2]));
});

test("merge prefers the incoming status", () => {
  const mine = archive({ shows: [trackedShow(1, "A Show", "Watching")] });
  const theirs = archive({ shows: [trackedShow(1, "A Show", "Stopped")] });
  const m = merged(theirs, mine);
  assert.equal(m.shows.length, 1);
  assert.equal(m.shows[0].status, "Stopped");
});

test("merge unions the watch history", () => {
  const m = merged(archive({ watched: ["1-1-2", "1-1-3"] }), archive({ watched: ["1-1-1", "1-1-2"] }));
  assert.deepEqual(new Set(m.watched), new Set(["1-1-1", "1-1-2", "1-1-3"]));
});

test("merge keeps notes from both and prefers the incoming one", () => {
  const m = merged(archive({ notes: { "show:1": "Theirs" } }), archive({ notes: { "show:1": "Mine", "show:2": "Only mine" } }));
  assert.equal(m.notes!["show:1"], "Theirs");
  assert.equal(m.notes!["show:2"], "Only mine");
});

test("merge unions catch-up opt-outs", () => {
  const m = merged(archive({ catchUpOptOuts: [2, 3] }), archive({ catchUpOptOuts: [1, 2] }));
  assert.deepEqual(new Set(m.catchUpOptOuts), new Set([1, 2, 3]));
  assert.equal(m.catchUpOptOuts!.length, 3);
});

test("merge keeps a show the other copy merely lacks", () => {
  const m = merged(archive({ shows: [trackedShow(1)] }), archive({ shows: [trackedShow(1), trackedShow(2)] }));
  assert.deepEqual(new Set(ids(m)), new Set([1, 2]));
});

test("merge takes the later date and its device", () => {
  const older = archive({ exported: day(-3), device: "Old phone" });
  const newer = archive({ exported: nowText, device: "New phone" });
  assert.equal(merged(newer, older).device, "New phone");
  assert.equal(merged(older, newer).device, "New phone");
  assert.equal(merged(newer, older).exported, nowText);
});

test("nil optionals are omitted", () => {
  const m = merged(archive(), archive());
  for (const key of ["showOrder", "movieOrder", "savedRailOrder", "profileAvatar", "profileBanner", "profilePicturesChanged"]) {
    assert.ok(!(key in m), `${key} should be absent`);
  }
  assert.ok(Array.isArray(m.customListOrder));
  assert.equal(typeof m.uploadedArt, "object");
});

// ---- LibraryArchiveOrderTests: the manual drag order across a merge ----

const withOrder = (order: number[] | null) => archive({ showOrder: order });

test("a merge with no incoming order keeps the local one", () => {
  assert.deepEqual(merged(withOrder(null), withOrder([3, 1, 2])).showOrder, [3, 1, 2]);
});

test("a merge takes the incoming order whole", () => {
  assert.deepEqual(merged(withOrder([2, 3, 1]), withOrder([3, 1, 2])).showOrder, [2, 3, 1]);
});

test("a merge with an empty incoming order clears the local one", () => {
  assert.deepEqual(merged(withOrder([]), withOrder([3, 1, 2])).showOrder, []);
});

// ==== RewatchTickSyncTests: rewatch nights across a sync ====

/** Half a second past the hour, which is the whole bug: a moment the file can't write down exactly. */
const night = new Date(NOW_MS + 500).toISOString();
const dayLater = day(1);
/** What a trip through a phone's file does to a date: whole seconds. */
const roundTripped = (a: LibraryArchive): LibraryArchive =>
  JSON.parse(JSON.stringify(a), (key, value) => (typeof value === "string" && parseSwiftDate(value) !== null && key !== "id" ? canonicalDate(value) : value));

test("a deleted episode night stays deleted across a sync", () => {
  const tick: RewatchTick = { episodeID: "1-1-1", showID: 1, watched: night };
  const synced = roundTripped(archive({ device: "A", rewatchLog: [tick] }));
  const deleted = archive({ exported: dayLater, device: "A", rewatchTickTombstones: [{ id: tickID(tick.episodeID, tick.watched), removed: dayLater }] });
  assert.equal(merged(synced, deleted, new Date(dayMs(1))).rewatchLog!.length, 0);
});

test("an old fractional tombstone still matches", () => {
  const tick: RewatchTick = { episodeID: "1-1-1", showID: 1, watched: night };
  const synced = roundTripped(archive({ device: "A", rewatchLog: [tick] }));
  const deleted = archive({ exported: dayLater, device: "A", rewatchTickTombstones: [{ id: "1-1-1-1785931200.5", removed: dayLater }] });
  assert.equal(merged(synced, deleted, new Date(dayMs(1))).rewatchLog!.length, 0);
});

test("an old fractional tombstone reads as the current name", () => {
  assert.equal(normalisedTickID("1-1-1-1785931200.5"), "1-1-1-1785931200.0");
  const pruned = pruneArchive(archive({ rewatchTickTombstones: [{ id: "1-1-1-1785931200.5", removed: "2026-08-06T12:00:00Z" }] }), NOW);
  assert.equal(pruned.rewatchTickTombstones![0].id, "1-1-1-1785931200.0");
});

test("an episode night isn't doubled by its own round trip", () => {
  const local = archive({ device: "A", rewatchLog: [{ episodeID: "1-1-1", showID: 1, watched: night }] });
  assert.equal(merged(roundTripped(local), local, new Date(dayMs(1))).rewatchLog!.length, 1);
});

test("the id keeps its spelling", () => {
  assert.equal(tickID("1-1-1", night), "1-1-1-1785931200.0");
  assert.equal(tickID("9", night), "9-1785931200.0");
  assert.equal(tickID("1399-1-1", iso(1727261234 * 1000)), "1399-1-1-1727261234.0");
});

test("a deleted film night stays deleted across a sync", () => {
  const tick: MovieRewatchTick = { movieID: 9, watched: night };
  const synced = roundTripped(archive({ device: "A", movieRewatchLog: [tick] }));
  const deleted = archive({ exported: dayLater, device: "A", movieRewatchTickTombstones: [{ id: "9-1785931200.5", removed: dayLater }] });
  assert.equal(merged(synced, deleted, new Date(dayMs(1))).movieRewatchLog!.length, 0);
});

test("a film night isn't doubled by its own round trip", () => {
  const local = archive({ device: "A", movieRewatchLog: [{ movieID: 9, watched: night }] });
  assert.equal(merged(roundTripped(local), local, new Date(dayMs(1))).movieRewatchLog!.length, 1);
});

// ---- RewatchTickIDTests ----

test("an id already in whole seconds is left as it is", () => {
  assert.equal(normalisedTickID("1-1-1-1785931200.0"), "1-1-1-1785931200.0");
  assert.equal(normalisedTickID("9-1785931200.0"), "9-1785931200.0");
});

test("a fraction is rounded down", () => {
  assert.equal(normalisedTickID("1-1-1-1785931200.999"), "1-1-1-1785931200.0");
});

test("anything else is left alone", () => {
  assert.equal(normalisedTickID("1-1-1-soon"), "1-1-1-soon");
  assert.equal(normalisedTickID("nodash"), "nodash");
  assert.equal(normalisedTickID("1-1-1-"), "1-1-1-");
});

test("whole seconds before 1970 survive normalising", () => {
  // distantPast, which Foundation dates in the Julian calendar — two days
  // earlier than JavaScript would put the same string.
  assert.equal(parseSwiftDate("0001-01-01T00:00:00Z"), DISTANT_PAST);
  assert.equal(formatSwiftDate(DISTANT_PAST), "0001-01-01T00:00:00Z");
  const id = tickID("1-1-1", "0001-01-01T00:00:00Z");
  assert.equal(id, "1-1-1--62135769600.0");
  assert.equal(normalisedTickID(id), id);
  assert.equal(tickID("1-1-1", new Date(-500).toISOString()), "1-1-1--1.0");
});

test("a fraction before 1970 normalises as iOS does", () => {
  assert.equal(normalisedTickID("1-1-1--5.5"), "1-1-1--5.0");
  assert.equal(tickID("1-1-1", new Date(-5500).toISOString()), "1-1-1--6.0");
});

// ==== LibraryImportTests: merge and the ninety-day window, on archives ====

function withDeletions() {
  return archive({
    watched: ["1-1-1"],
    showTombstones: [{ id: 1, removed: day(-91) }, { id: 2, removed: day(-89) }],
    movieTombstones: [{ id: 8, removed: day(-120) }, { id: 9, removed: day(-1) }],
    rewatchRunTombstones: [{ id: 5, removed: day(-100) }],
    rewatchTickTombstones: [{ id: "1-1-1-100.0", removed: day(-95) }, { id: "1-1-2-100.0", removed: day(-10) }],
    watchedStamps: {
      "1-1-1": day(-400), // checked off: the record's own stamp, kept however old
      "1-1-2": day(-91), // an uncheck past the window
      "1-1-3": day(-30), // an uncheck inside it
    },
  });
}

function assertOnlyLiveDeletions(s: LibraryArchive) {
  assert.deepEqual(s.showTombstones!.map((t) => t.id), [2]);
  assert.deepEqual(s.movieTombstones!.map((t) => t.id), [9]);
  assert.equal(s.rewatchRunTombstones!.length, 0);
  assert.deepEqual(s.rewatchTickTombstones!.map((t) => t.id), ["1-1-2-100.0"]);
  assert.deepEqual(new Set(Object.keys(s.watchedStamps!)), new Set(["1-1-1", "1-1-3"]));
}

test("expired deletions are dropped on the way in", () => {
  assertOnlyLiveDeletions(pruneArchive(withDeletions(), NOW));
  // And by a merge, which prunes both sides before comparing anything.
  assertOnlyLiveDeletions(merged(withDeletions(), archive()));
});

test("a deletion ages out as the clock moves", () => {
  const a = archive({ showTombstones: [{ id: 1, removed: day(-80) }] });
  assert.deepEqual(pruneArchive(a, NOW).showTombstones!.map((t) => t.id), [1]);
  assert.equal(pruneArchive(a, new Date(dayMs(11))).showTombstones!.length, 0);
});

// ==== applyImportPlan ====

test("a plan fills gaps and never overwrites a verdict", () => {
  const library = archive({ ratings: { "movie:1": 4 }, reactions: { "show:2": "liked" } });
  const plan = { archive: archive({ device: "Import" }), ratings: { "movie:1": 9, "movie:3": 7 }, loved: ["show:2", "show:4"] };
  const out = applyImportPlan(library, plan, NOW);
  assert.deepEqual(out.ratings, { "movie:1": 4, "movie:3": 7 });
  assert.deepEqual(out.reactions, { "show:2": "liked", "show:4": "loved" });
  // Nothing in the archive, so no merge ran and the library is as it was.
  assert.equal(out.device, "Test");
  assert.deepEqual(library.ratings, { "movie:1": 4 });
});

test("a plan's dates are whole seconds", () => {
  const plan = { archive: archive({ exported: nowText, device: "Import", shows: [trackedShow(1)], watched: ["1-1-1"], watchedDates: { "1-1-1": "2020-01-01T20:00:00.250Z" } }), ratings: {}, loved: [] };
  const out = applyImportPlan(archive(), plan, NOW);
  assert.equal(out.watchedDates!["1-1-1"], "2020-01-01T20:00:00Z");
  assert.ok(!/\.\d+Z/.test(JSON.stringify(out)));
});

void run("merge.test.ts");
