import assert from "node:assert/strict";
import type { LibraryArchive } from "../archive";
import { mergeArchives, tickID } from "../imports/merge";
import { applyDeleteRewatch, applyRewatch, rewatchNights } from "../library-rules";

// Watching a film or an episode again, as the app records it: a night in the
// log, the first viewing untouched, and a night taken back staying gone
// after a sync.
let failed = 0;
const test = (name: string, fn: () => void) => {
  try {
    fn();
    console.log(`  ok    ${name}`);
  } catch (e) {
    failed++;
    console.log(`  FAIL  ${name}\n${String(e)}`);
  }
};
const base = (): LibraryArchive => ({
  version: 12,
  exported: "2026-09-30T10:00:00Z",
  device: "test",
  shows: [],
  movies: [],
  watched: ["1396-1-1"],
  watchedDates: { "1396-1-1": "2026-01-01T20:00:00Z" },
  watchedMovies: [329865],
  movieWatchedDates: { "329865": "2026-02-01T20:00:00Z" },
});
const film = { kind: "movie" as const, id: 329865 };
const ep = { kind: "episode" as const, showID: 1396, season: 1, episode: 1 };

test("only something watched can be watched again", () => {
  const a = base();
  assert.equal(applyRewatch(a, { kind: "movie", id: 1 }, "2026-09-30T20:00:00Z"), false);
  assert.equal(applyRewatch(a, { ...ep, episode: 2 }, "2026-09-30T20:00:00Z"), false);
  assert.equal(a.movieRewatchLog, undefined);
});

test("a night goes in the log; the first viewing never moves", () => {
  const a = base();
  assert.ok(applyRewatch(a, film, "2026-09-29T20:00:00Z"));
  assert.ok(applyRewatch(a, film, "2026-09-30T20:00:00Z"));
  assert.ok(applyRewatch(a, ep, "2026-09-30T21:00:00Z"));
  assert.deepEqual(rewatchNights(a, film), ["2026-09-30T20:00:00Z", "2026-09-29T20:00:00Z"]);
  assert.deepEqual(rewatchNights(a, ep), ["2026-09-30T21:00:00Z"]);
  assert.equal(a.movieWatchedDates!["329865"], "2026-02-01T20:00:00Z");
  assert.deepEqual(a.watched, ["1396-1-1"]);
});

test("a night taken back is gone, tombstoned by the app's id", () => {
  const a = base();
  applyRewatch(a, film, "2026-09-29T20:00:00Z");
  applyRewatch(a, ep, "2026-09-30T21:00:00Z");
  applyDeleteRewatch(a, film, "2026-09-29T20:00:00Z", "2026-09-30T22:00:00Z", tickID);
  applyDeleteRewatch(a, ep, "2026-09-30T21:00:00Z", "2026-09-30T22:00:00Z", tickID);
  assert.deepEqual(rewatchNights(a, film), []);
  assert.deepEqual(rewatchNights(a, ep), []);
  assert.equal(a.movieRewatchTickTombstones![0].id, "329865-1790712000.0");
  assert.equal(a.rewatchTickTombstones![0].id, "1396-1-1-1790802000.0");
});

test("another device that still has the night doesn't bring it back", () => {
  const phone = base();
  applyRewatch(phone, film, "2026-09-29T20:00:00Z");
  const web = structuredClone(phone);
  applyDeleteRewatch(web, film, "2026-09-29T20:00:00Z", "2026-09-30T22:00:00Z", tickID);
  const merged = mergeArchives(phone, web, new Date("2026-10-01T00:00:00Z"));
  assert.deepEqual(rewatchNights(merged, film), []);
});

console.log(`rewatch-rules.test.ts: ${failed ? `${failed} failed` : "all passed"}`);
if (failed) process.exitCode = 1;
