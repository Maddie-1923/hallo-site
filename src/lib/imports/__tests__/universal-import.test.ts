import assert from "node:assert/strict";
import { parseCsv } from "../csv";
import { guessMapping, ImportTable, isEpisode, ratingScale, ratingScore, readEntries } from "../table";
import { fold, instantString, parseDate, titleKey } from "../text";
import { bytes, run, test, trimIndent } from "./harness";

// The mapper against the shapes real exports have — Android's
// UniversalImportTests.kt, from kodigoTests/UniversalImportTests.swift. A
// header line goes in, and what comes out is a guess at which column is which
// and a row of facts this app can act on.

const table = (text: string) => ImportTable.read(bytes(trimIndent(text)))!;

// ---- Letterboxd ----

test("maps a Letterboxd diary", () => {
  const file = table(`
    Date,Name,Year,Letterboxd URI,Rating
    2024-02-11,Dune: Part Two,2024,https://boxd.it/abc,4.5
    2023-07-21,Oppenheimer,2023,https://boxd.it/def,5
    2023-07-21,Barbie,2023,https://boxd.it/ghi,3.5
  `);
  const mapping = guessMapping(file);
  assert.equal(mapping.get("title"), 1);
  assert.equal(mapping.get("year"), 2);
  assert.equal(mapping.get("watchedAt"), 0);
  assert.equal(mapping.get("rating"), 4);

  const entries = readEntries(file, mapping);
  assert.equal(entries.length, 3);
  assert.equal(entries[0].title, "Dune: Part Two");
  assert.equal(entries[0].year, 2024);
  // Four and a half stars out of five is nine out of ten.
  assert.equal(entries[0].rating, 9);
  assert.equal(isEpisode(entries[0]), false);
});

// ---- IMDb ----

test("maps an IMDb ratings export", () => {
  // A `Your Rating` and an `IMDb Rating`, and a `Year` and a `Release Date`
  // which both answer to a year.
  const file = table(`
    Const,Your Rating,Date Rated,Title,URL,Title Type,IMDb Rating,Runtime (mins),Year,Genres,Num Votes,Release Date,Directors
    tt0111161,9,2021-04-03,The Shawshank Redemption,https://www.imdb.com/title/tt0111161/,Movie,9.3,142,1994,Drama,2800000,1994-09-23,Frank Darabont
    tt0068646,10,2020-01-05,The Godfather,https://www.imdb.com/title/tt0068646/,Movie,9.2,175,1972,Crime,1900000,1972-03-14,Francis Ford Coppola
    tt0903747,8,2019-11-30,Breaking Bad,https://www.imdb.com/title/tt0903747/,TV Series,9.5,49,2008,Crime,2000000,2008-01-20,Vince Gilligan
  `);
  const mapping = guessMapping(file);
  assert.equal(mapping.get("imdbID"), 0);
  assert.equal(mapping.get("rating"), 1);
  assert.equal(mapping.get("watchedAt"), 2);
  assert.equal(mapping.get("title"), 3);
  assert.equal(mapping.get("year"), 8);

  const entries = readEntries(file, mapping);
  assert.equal(entries[0].rating, 9);
  assert.equal(entries[0].imdbID, "tt0111161");
});

// ---- Episodes ----

test("maps an episode file", () => {
  const file = table(`
    series_name,season_number,episode_number,watched_date
    Severance,2,4,2025-02-14 21:30:00
    Severance,2,5,2025-02-21 21:30:00
  `);
  const entries = readEntries(file, guessMapping(file));
  assert.equal(entries[0].season, 2);
  assert.equal(entries[0].episode, 4);
  assert.equal(isEpisode(entries[0]), true);
  assert.notEqual(entries[0].watchedAt, null);
});

// ---- JSON ----

test("reads a JSON array", () => {
  const file = table(`
    [{"title":"Andor","season":1,"episode":3,"watched_at":"2022-09-21T20:00:00Z","rating":9},
     {"title":"Andor","season":1,"episode":4,"watched_at":"2022-09-28T20:00:00Z"}]
  `);
  const entries = readEntries(file, guessMapping(file));
  assert.equal(entries.length, 2);
  // JSON's own number has to come out as "1", not "1.0".
  assert.equal(entries[0].season, 1);
  assert.equal(entries[0].episode, 3);
  assert.notEqual(entries[0].watchedAt, null);
  // The key left out entirely is why columns are unioned over rows.
  assert.equal(entries[1].rating, null);
});

test("finds the history inside a wrapper", () => {
  const file = table(`
    {"account":{"name":"someone"},"settings":[{"a":"1"},{"b":"2"}],
     "history":[{"movie":"Heat","year":"1995","rating":"4"},
                {"movie":"Sicario","year":"2015","rating":"5"},
                {"movie":"Arrival","year":"2016","rating":"4.5"}]}
  `);
  const entries = readEntries(file, guessMapping(file));
  assert.equal(entries.length, 3);
  assert.equal(entries[0].title, "Heat");
  assert.equal(entries[0].rating, 8);
});

test("does not read JSON as a CSV", () => {
  const file = table(`[{"title":"Heat","year":1995}]`);
  assert.deepEqual([...file.headers].sort(), ["title", "year"]);
});

// ---- Ratings ----

test("reads stars", () => {
  assert.equal(ratingScore("★★★½", "fivePoint"), 7);
  assert.equal(ratingScore("★★★★★", "fivePoint"), 10);
});

test("picks the scale from the whole column", () => {
  assert.equal(ratingScale(["4", "5", "3.5"]), "fivePoint");
  assert.equal(ratingScale(["9", "10", "7"]), "tenPoint");
  assert.equal(ratingScale(["90", "75", "100"]), "hundredPoint");
});

// ---- The awkward files ----

test("saves a file with no header row", () => {
  const file = table(`
    tt0111161,1994,2021-04-03
    tt0068646,1972,2020-01-05
    tt0903747,2008,2019-11-30
    tt0109830,1994,2018-02-02
  `);
  const mapping = guessMapping(file);
  assert.equal(mapping.get("imdbID"), 0);
  assert.equal(mapping.get("year"), 1);
  assert.equal(mapping.get("watchedAt"), 2);
});

test("refuses a file that names nothing", () => {
  const file = table(`
    runtime,genres
    142,Drama
    175,Crime
  `);
  assert.equal(guessMapping(file).isUsable, false);
});

// ---- Android's own checks — the shared date parser, the order it tries things in ----

test("reads every date shape the exports write", () => {
  const at = (text: string) => instantString(parseDate(text));
  assert.equal(at("2021-01-23T04:25:15.000Z"), "2021-01-23T04:25:15Z");
  assert.equal(at("2022-09-21T20:00:00Z"), "2022-09-21T20:00:00Z");
  assert.equal(at("2022-09-21T20:00:00+02:00"), "2022-09-21T18:00:00Z");
  assert.equal(at("2017-05-03 12:38:26"), "2017-05-03T12:38:26Z");
  assert.equal(at("2017-05-03T12:38:26"), "2017-05-03T12:38:26Z");
  assert.equal(at("2026-09-19 01:47"), "2026-09-19T01:47:00Z");
  assert.equal(at("2017-10-05"), "2017-10-05T00:00:00Z");
  assert.equal(at("08/21/2020 10:00:00"), "2020-08-21T10:00:00Z");
  // Not a month, so the day-first shape answers.
  assert.equal(at("21/08/2020 10:00:00"), "2020-08-21T10:00:00Z");
  assert.equal(at("1614590799175"), "2021-03-01T09:26:39.175Z");
  assert.equal(at("1614590799"), "2021-03-01T09:26:39Z");
  // C's asctime, the old IMDb export's `created` — Android only, kept here.
  assert.equal(at("Sat Dec 31 00:00:00 2016"), "2016-12-31T00:00:00Z");
  assert.equal(at("Thu Dec  1 00:00:00 2016"), "2016-12-01T00:00:00Z");
  assert.equal(at("1994"), null);
  assert.equal(at("8/21/2015"), null);
  assert.equal(at("2021-02-30"), null);
  assert.equal(at(""), null);
  assert.equal(at("yesterday"), null);
});

test("title keys fold case, accents, punctuation and the article", () => {
  assert.equal(titleKey("The Office"), "office");
  assert.equal(titleKey("Amélie"), "amelie");
  assert.equal(titleKey("Star Wars: The Clone Wars"), "star wars the clone wars");
  assert.equal(fold("Episode ID"), "episodeid");
});

test("a CSV keeps quoted commas, line breaks and doubled quotes", () => {
  const bom = new Uint8Array([0xef, 0xbb, 0xbf]);
  const body = bytes('Title,Note\r\n"Plastic, Memories","say ""hi""\nthere"\r\n\r\n');
  const data = new Uint8Array(bom.length + body.length);
  data.set(bom);
  data.set(body, bom.length);
  const parsed = parseCsv(data)!;
  assert.deepEqual(parsed.headers, ["Title", "Note"]);
  assert.equal(parsed.rows.length, 1);
  assert.equal(parsed.rows[0][0], "Plastic, Memories");
  assert.equal(parsed.rows[0][1], 'say "hi"\nthere');
});

void run("universal-import.test.ts");
