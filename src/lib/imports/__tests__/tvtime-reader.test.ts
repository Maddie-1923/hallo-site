import assert from "node:assert/strict";
import { zipSync } from "fflate";
import { instantString } from "../text";
import { diagnosticsReport, favoriteSeriesIDs, movieYear, readTvTime } from "../tvtime-reader";
import { TvTimeReadFailure } from "../types";
import { looksLikeZip, readZip } from "../zip";
import { bytes, run, Skip, test, trimIndent, tvTimeSample } from "./harness";

// The zip reader and the TV Time reader — Android's ImportZipTests.kt and
// TvTimeImportTests.kt, the second from kodigoTests/TVTimeImportTests.swift
// case for case.
//
// TV Time shut down on 15 July 2026 and deleted the accounts behind it, so no
// fresh export can ever be produced. What is here instead is the header line
// and the row shapes of an export captured before the shutdown and published
// as test data by another importer — the columns, the duplicate columns, the
// `key` discriminator, the date format and the boolean spellings are the real
// ones. If a column is renamed here to make a test pass, the test has stopped
// being evidence of anything.

function zip(...entries: [string, string | null][]) {
  return zipSync(Object.fromEntries(entries.map(([name, body]) => [name, body === null ? new Uint8Array(0) : bytes(body)])));
}

function failure(read: () => unknown): TvTimeReadFailure {
  try {
    read();
  } catch (e) {
    if (e instanceof TvTimeReadFailure) return e;
    throw e;
  }
  assert.fail("expected the read to fail");
}

// ---- ImportZipTests ----

test("takes the wanted files with their paths and lists everything", () => {
  const data = zip(
    ["letterboxd/", null],
    ["letterboxd/diary.csv", "Date,Name\n"],
    ["letterboxd/likes/films.csv", "Date,Name\n"],
    ["__MACOSX/letterboxd/._diary.csv", "junk"],
    ["profile.png", "png"],
    ["Export.JSON", "{}"],
  );
  assert.ok(looksLikeZip(data));
  const contents = readZip(data, [".csv", ".json"]);
  assert.deepEqual(contents.names, ["letterboxd/", "letterboxd/diary.csv", "letterboxd/likes/films.csv", "__MACOSX/letterboxd/._diary.csv", "profile.png", "Export.JSON"]);
  assert.deepEqual(contents.payloads.map((p) => p.name), ["letterboxd/diary.csv", "letterboxd/likes/films.csv", "Export.JSON"]);
  assert.equal(new TextDecoder().decode(contents.payloads[0].data), "Date,Name\n");
});

test("an unreadable zip says so and a loose file is not a zip", () => {
  const broken = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 1, 2, 3]);
  assert.ok(looksLikeZip(broken));
  assert.deepEqual(failure(() => readTvTime(broken, "export.zip")).reason, { kind: "archiveUnreadable" });
  assert.equal(looksLikeZip(bytes("Date,Name")), false);
});

test("a zip with nothing TV Time in it names its files", () => {
  const e = failure(() => readTvTime(zip(["notes.txt", "hello"]), "export.zip"));
  assert.deepEqual(e.reason, { kind: "nothingRecognised" });
  assert.deepEqual(e.diagnostics.filesInArchive, ["notes.txt"]);
  assert.ok(diagnosticsReport(e.diagnostics).includes("  notes.txt"));
});

test("reads the sample export", () => {
  const sample = tvTimeSample();
  if (!sample) throw new Skip("No TV Time sample on this machine");
  const exported = readTvTime(sample.data, sample.name);
  assert.deepEqual(exported.diagnostics.filesInArchive, ["tracking-prod-records-v2.csv", "tracking-prod-records.csv", "ratings-prod-records.csv"]);
  const shows = new Map(exported.shows.map((s) => [s.title, s]));
  assert.deepEqual(new Set(shows.keys()), new Set(["Breaking Bad", "The Office", "Ted Lasso", "Severance", "The Mandalorian"]));
  // Four first watches; the rewatch folded into the first, which keeps its
  // earlier night. The count row invented nothing.
  const breakingBad = shows.get("Breaking Bad")!;
  assert.equal(breakingBad.tvdbID, 81189);
  assert.equal(breakingBad.episodes.length, 4);
  assert.equal(instantString(breakingBad.episodes.find((e) => e.number === 1)!.watchedAt), "2022-03-10T20:30:00Z");
  assert.ok(shows.get("Ted Lasso")!.isArchived);
  assert.equal(shows.get("Severance")!.episodes.length, 0);
  assert.ok(shows.get("Severance")!.isForLater);
  // Named only by TV Time's own episode id.
  assert.equal(exported.episodesWithoutNumbers, 1);

  const movies = new Map(exported.movies.map((m) => [m.title, m]));
  assert.deepEqual(new Set(movies.keys()), new Set(["Inception", "Parasite", "The Matrix", "Dune"]));
  assert.ok(movies.get("The Matrix")!.isWatched);
  assert.ok(movies.get("Dune")!.isForLater);
  assert.equal(movies.get("Dune")!.isWatched, false);
  assert.equal(movies.get("Dune")!.watchedAt, null);
});

// ---- TvTimeImportTests ----

/**
 * The header line of `tracking-prod-records-v2.csv`, verbatim. Every field
 * appears twice under two names, and there is no `type` column: what a row
 * is about is in `key`. The show's TheTVDB id is `s_id`.
 */
const V2_HEADER =
  "episode_number,user_id,ep_no,gsi,created_at,episode_id,s_no,series_name,bulk_type,ep_id,runtime,key,s_id,season_number,movie_watch_count,series_follow_count,updated_at,ep_watch_count,total_movies_runtime,total_series_runtime,most_recent_ep_watched,is_for_later,uuid,is_archived,is_followed,followed_at,rewatch_count,is_unitary,is_special";

/** One watch row, filled the way a real one is: both spellings of each number, a stamp with no zone. */
const watchRow = (series: string, tvdb: number, season: number, episode: number, at: string, key = "watch-episode") =>
  `${episode},7,${episode},,${at},4764625,${season},${series},,4764625,,${key}-abc-def,${tvdb},${season},,,${at},,,,,,,,,,0,false,`;

/** The show-level row: the follow flags and no episode at all. */
const seriesRow = (series: string, tvdb: number, followed = true, archived = false, forLater = false) =>
  `,7,,,2017-05-07 03:01:27,,,${series},,,,user-series-abc,${tvdb},,,,2017-05-07 03:01:27,61,,,,${forLater},abc,${archived},${followed},,,,`;

const read = (csv: string, name: string) => readTvTime(bytes(csv), name);

test("reads a real watch row", () => {
  const exported = read([V2_HEADER, watchRow("The Blacklist", 266189, 1, 13, "2017-05-03 12:38:26")].join("\n"), "tracking-prod-records-v2.csv");
  assert.equal(exported.shows.length, 1);
  const show = exported.shows[0];
  assert.equal(show.title, "The Blacklist");
  // With the id the show is resolved through TMDB's find endpoint and is
  // exactly right; without it every show falls back to a name search.
  assert.equal(show.tvdbID, 266189);
  assert.equal(show.episodes.length, 1);
  assert.equal(show.episodes[0].season, 1);
  assert.equal(show.episodes[0].number, 13);
});

test("reads the stamp as UTC", () => {
  const exported = read([V2_HEADER, watchRow("Luther", 159591, 2, 4, "2017-05-03 12:38:26")].join("\n"), "tracking-prod-records-v2.csv");
  const watched = exported.shows[0].episodes[0].watchedAt!;
  assert.equal(watched.getUTCFullYear(), 2017);
  assert.equal(watched.getUTCMonth() + 1, 5);
  assert.equal(watched.getUTCDate(), 3);
  assert.equal(watched.getUTCHours(), 12);
  assert.equal(watched.getUTCMinutes(), 38);
});

test("folds a rewatch into the first watch", () => {
  // The night that survives has to be the first: dating a 2017 episode by a
  // 2024 rewatch moves it in every chart that reads those dates.
  const csv = [V2_HEADER, watchRow("Barry", 333072, 1, 2, "2024-01-09 20:00:00", "rewatch-episode"), watchRow("Barry", 333072, 1, 2, "2018-04-01 19:30:00")].join("\n");
  const exported = read(csv, "tracking-prod-records-v2.csv");
  assert.equal(exported.shows[0].episodes.length, 1);
  assert.equal(exported.shows[0].episodes[0].watchedAt!.getUTCFullYear(), 2018);
});

test("keeps a show that has no episode rows", () => {
  const exported = read([V2_HEADER, seriesRow("You", 336924, true)].join("\n"), "tracking-prod-records-v2.csv");
  const show = exported.shows[0];
  assert.equal(show.title, "You");
  assert.equal(show.tvdbID, 336924);
  assert.ok(show.isFollowed);
  assert.equal(show.episodes.length, 0);
});

test("reads the booleans the export actually writes", () => {
  const exported = read([V2_HEADER, seriesRow("Avatar: The Last Airbender", 74852, false, true, true)].join("\n"), "tracking-prod-records-v2.csv");
  const show = exported.shows[0];
  assert.ok(show.isArchived);
  assert.ok(show.isForLater);
  assert.equal(show.isFollowed, false);
});

test("ignores the aggregate rows", () => {
  // Running totals in the same file, carrying a title and no episode. Counted
  // as viewing they would invent shows. Nothing else is in this file, so
  // nothing is left and the read says so (iOS's version of this test expects
  // an empty success its own reader can't give; see the Android port).
  const csv = [V2_HEADER, ",7,,,2017-05-03 12:38:26,,,,,,,count-week-abc,,,,,2017-05-03 12:38:26,,,,,,,,,,,,"].join("\n");
  const e = failure(() => read(csv, "tracking-prod-records-v2.csv"));
  assert.deepEqual(e.reason, { kind: "noRowsUsable" });
  assert.equal(e.diagnostics.rowsUsed, 0);
});

test("reads a movie with its year", () => {
  const csv = trimIndent(`
    movie_name,entity_type,type,created_at,updated_at,release_date,uuid,watch_count
    Dune,movie,watch,2021-10-22 21:00:00,2021-10-22 21:00:00,2021-09-15,abc,1
  `);
  const movie = read(csv, "tracking-prod-records.csv").movies[0];
  assert.equal(movie.title, "Dune");
  assert.ok(movie.isWatched);
  assert.equal(movieYear(movie), 2021);
});

test("reads a film with no release date", () => {
  const csv = trimIndent(`
    movie_name,entity_type,type,created_at,release_date
    Some Short,movie,watch,2021-10-22 21:00:00,0000-00-00
  `);
  assert.equal(movieYear(read(csv, "tracking-prod-records.csv").movies[0]), null);
});

test("reads a film saved for later", () => {
  const csv = trimIndent(`
    movie_name,entity_type,type,created_at,release_date
    Sinners,movie,towatch,2025-01-02 10:00:00,2025-04-18
  `);
  const movie = read(csv, "tracking-prod-records.csv").movies[0];
  assert.ok(movie.isForLater);
  assert.equal(movie.isWatched, false);
});

test("reads the vote key", () => {
  const csv = trimIndent(`
    series_name,season_number,episode_number,vote_key,created_at
    Barry,1,2,episode-3,2018-04-02 09:00:00
  `);
  const rated = read(csv, "ratings-v2-prod-votes.csv").shows[0].ratedEpisodes[0];
  assert.equal(rated.season, 1);
  assert.equal(rated.number, 2);
  assert.equal(rated.vote, 3);
});

test("does not take a rating date for a watch night", () => {
  const csv = trimIndent(`
    series_name,season_number,episode_number,vote_key,created_at
    Barry,1,2,episode-3,2018-04-02 09:00:00
  `);
  assert.equal(read(csv, "ratings-v2-prod-votes.csv").shows[0].episodes.length, 0);
});

test("reads a tracking-shaped file whatever it is called", () => {
  const csv = trimIndent(`
    tv_show_name,episode_season_number,episode_number,episode_id,created_at
    Fringe,2,7,123,2011-02-11 22:15:00
  `);
  const exported = read(csv, "seen_episode_latest.csv");
  assert.equal(exported.shows[0].title, "Fringe");
  assert.equal(exported.shows[0].episodes[0].season, 2);
});

test("reads the follow file with its own booleans", () => {
  const csv = trimIndent(`
    tv_show_id,tv_show_name,active,archived,is_favorited
    305288,Stranger Things,1,0,0
  `);
  const show = read(csv, "followed_tv_show.csv").shows[0];
  assert.equal(show.title, "Stranger Things");
  assert.equal(show.tvdbID, 305288);
  assert.ok(show.isFollowed);
  assert.equal(show.isArchived, false);
});

test("reads a semicolon file", () => {
  const csv = trimIndent(`
    series_name;season_number;episode_number;created_at;s_id
    Dark;1;1;2017-12-01 20:00:00;332411
  `);
  const exported = read(csv, "tracking-prod-records-v2.csv");
  assert.equal(exported.shows[0].episodes[0].season, 1);
  assert.equal(exported.shows[0].tvdbID, 332411);
});

test("finds the favourite series in a printed Go map", () => {
  const objects =
    "[map[created_at:1.563396086e+09 id:75897 type:series] " +
    "map[created_at:1.563396086e+09 id:79335 type:series] " +
    "map[created_at:1.575555202e+09 id:74852 type:series]]";
  assert.deepEqual(favoriteSeriesIDs(objects), [75897, 79335, 74852]);
});

test("leaves the favourite films alone", () => {
  const objects =
    "[map[created_at:1.575555202e+09 type:movie uuid:1be8d227-5d39-4561-8dfa-7520b8c51d0f] " +
    "map[created_at:1.593503194e+09 type:movie uuid:9f2a1c44-1111-2222-3333-444455556666]]";
  assert.deepEqual(favoriteSeriesIDs(objects), []);
});

test("names the headers it saw when nothing fits", () => {
  const csv = trimIndent(`
    some_column,another_column
    1,2
  `);
  const e = failure(() => read(csv, "mystery.csv"));
  assert.deepEqual(e.diagnostics.headers["mystery.csv"], ["some_column", "another_column"]);
});

void run("tvtime-reader.test.ts");
