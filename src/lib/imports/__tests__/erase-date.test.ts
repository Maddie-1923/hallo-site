import assert from "node:assert/strict";
import type { LibraryArchive } from "../../archive";
import { applyImportPlan } from "../apply";
import { mergeArchives } from "../merge";
import { archive, day, NOW, nowText, run, test, trackedMovie, trackedShow } from "./harness";

// An erase and the copy that hadn't heard of it — the apps' EraseDateTests
// (kodigoTests/EraseSyncTests.swift, Android's EraseDateTests.kt). Ratings,
// notes, lists and the rest merge as a union with no tombstones, so the
// erase's date is the only thing standing between them and coming back.

const ERASED = day(-1);

/** The other phone's copy, untouched since three days before the erase. */
function beforeErase(): LibraryArchive {
  return archive({
    device: "Other",
    shows: [trackedShow(1, "A Show", "Watching", day(-3))],
    movies: [trackedMovie(2, "A Movie", "Watched", day(-3))],
    watched: ["1-1-1"],
    watchedStamps: { "1-1-1": day(-3) },
    watchedDates: { "1-1-1": day(-3) },
    skipped: ["1-1-2"],
    skippedDates: { "1-1-2": day(-3) },
    watchedMovies: [2],
    movieWatchedDates: { "2": day(-3) },
    ratings: { "show:1": 8, "movie:2": 6, "episode:1-1-1": 9 },
    reactions: { "show:1": "loved" },
    moods: { "movie:2": ["Cosy"] },
    notes: { "show:1": "Rewatch with Sam" },
    reviews: { "movie:2": { text: "Lovely.", modified: day(-3) } },
    tags: { "show:1": ["Comfort"] },
    tagAdded: { "show:1|comfort": day(-3) },
    customLists: [{ id: "A1B2C3D4-0000-0000-0000-000000000001", name: "Faves", created: day(-3) }],
    savedRails: [{ id: "A1B2C3D4-0000-0000-0000-000000000002", name: "Horror", created: day(-3) }],
    mutedShows: [1],
    hiddenShows: [1],
    catchUpOptOuts: [1],
    hiddenRecs: ["movie:2"],
    chosenArt: { "show:1#poster#library": "upload-1" },
    uploadedArt: { "upload-1": "AAAA" },
    rewatchCounts: [{ id: 1, count: 2 }],
    rewatchLog: [{ episodeID: "1-1-1", showID: 1, watched: day(-3) }],
    movieRewatchLog: [{ movieID: 2, watched: day(-3) }],
  });
}

/** The erased copy as the phone that erased it pushed it. */
function erased(fields: Partial<LibraryArchive> = {}): LibraryArchive {
  return archive({ device: "Erased", erasedAt: ERASED, ...fields });
}

function assertNothingCameBack(m: LibraryArchive) {
  assert.deepEqual(m.shows, []);
  assert.deepEqual(m.movies, []);
  assert.deepEqual(m.watched, []);
  assert.deepEqual(m.skipped, []);
  assert.deepEqual(m.watchedMovies, []);
  assert.deepEqual(m.movieWatchedDates, {});
  assert.deepEqual(m.ratings, {});
  assert.deepEqual(m.reactions, {});
  assert.deepEqual(m.moods, {});
  assert.deepEqual(m.notes, {});
  assert.deepEqual(m.reviews, {});
  assert.deepEqual(m.tags, {});
  assert.deepEqual(m.customLists, []);
  assert.deepEqual(m.savedRails, []);
  assert.deepEqual(m.mutedShows, []);
  assert.deepEqual(m.hiddenShows, []);
  assert.deepEqual(m.catchUpOptOuts, []);
  assert.deepEqual(m.hiddenRecs, []);
  assert.deepEqual(m.chosenArt, {});
  assert.deepEqual(m.uploadedArt, {});
  assert.deepEqual(m.rewatchCounts, []);
  assert.deepEqual(m.rewatchLog, []);
  assert.deepEqual(m.movieRewatchLog, []);
  assert.equal(m.erasedAt, ERASED);
}

test("an erase keeps every kind out of an older copy", () => {
  assertNothingCameBack(mergeArchives(erased(), beforeErase(), NOW));
});

test("an erase keeps every kind out from either side", () => {
  assertNothingCameBack(mergeArchives(beforeErase(), erased(), NOW));
});

test("everything dated after the erase survives", () => {
  const later = archive({
    shows: [trackedShow(5, "New Show", "Watching", nowText)],
    watched: ["5-1-1"],
    watchedStamps: { "5-1-1": nowText },
    reviews: { "movie:9": { text: "Fresh.", modified: nowText } },
    customLists: [{ id: "A1B2C3D4-0000-0000-0000-000000000009", name: "New", created: nowText }],
  });
  const m = mergeArchives(later, erased(), NOW);
  assert.deepEqual(m.shows.map((s) => s.show.id), [5]);
  assert.deepEqual(m.watched, ["5-1-1"]);
  assert.deepEqual(Object.keys(m.reviews ?? {}), ["movie:9"]);
  assert.deepEqual(m.customLists!.map((l) => l.name), ["New"]);
});

test("an undated entry lives or dies with its title", () => {
  const other = archive({
    shows: [trackedShow(5, "Touched", "Watching", nowText), trackedShow(6, "Untouched", "Watching", day(-3))],
    ratings: { "show:5": 7, "show:6": 4 },
    notes: { "show:5": "kept", "show:6": "gone" },
  });
  const m = mergeArchives(other, erased(), NOW);
  assert.deepEqual(m.ratings, { "show:5": 7 });
  assert.deepEqual(m.notes, { "show:5": "kept" });
});

test("the copy that erased keeps its undated entries", () => {
  const phone = erased({ ratings: { "show:3": 10 }, notes: { "show:3": "after" } });
  const m = mergeArchives(phone, archive(), NOW);
  assert.deepEqual(m.ratings, { "show:3": 10 });
  assert.deepEqual(m.notes, { "show:3": "after" });
});

test("the later erase wins", () => {
  const earlier = archive({ erasedAt: day(-5), ratings: { "show:1": 3 } });
  const m = mergeArchives(earlier, erased(), NOW);
  assert.equal(m.erasedAt, ERASED);
  assert.deepEqual(m.ratings, {});
  assert.equal(mergeArchives(erased(), earlier, NOW).erasedAt, ERASED);
});

test("no erase on either side changes nothing and writes no date", () => {
  const m = mergeArchives(beforeErase(), archive(), NOW);
  assert.deepEqual(m.ratings, beforeErase().ratings);
  assert.ok(!("erasedAt" in m));
});

test("an import after the erase keeps what it brings", () => {
  const plan = { archive: beforeErase(), ratings: {}, loved: [] };
  const out = applyImportPlan(erased(), plan, NOW);
  assert.deepEqual(out.shows.map((s) => s.show.id), [1]);
  assert.equal(out.ratings?.["show:1"], 8);
  assert.equal(out.notes?.["show:1"], "Rewatch with Sam");
  assert.equal(out.erasedAt, ERASED);
});

test("the key and its format are the apps'", () => {
  // The fixture both app suites decode, byte for byte.
  const json = '{"device":"Fixture","erasedAt":"2026-10-16T09:30:00Z","exported":"2026-10-16T09:31:00Z","version":14}';
  const read = JSON.parse(json) as LibraryArchive;
  assert.equal(read.erasedAt, "2026-10-16T09:30:00Z");
  const m = mergeArchives(archive({ erasedAt: read.erasedAt }), archive(), NOW);
  assert.equal(m.erasedAt, "2026-10-16T09:30:00Z");
});

void run("erase-date.test.ts");
