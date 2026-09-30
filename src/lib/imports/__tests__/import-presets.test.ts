import assert from "node:assert/strict";
import { IMPORT_PRESETS, presetEntries, presetMapping, recognisePreset, type ImportPreset } from "../presets";
import { episodeCode, guessMapping, ImportTable, readEntries, type ImportedEntry } from "../table";
import { bytes, run, test, trimIndent } from "./harness";

// Each export recognised on sight and read without asking — Android's
// ImportPresetsTests.kt, from kodigoTests/ImportPresetsTests.swift. Every
// header line is the real one, quoted exactly: the moment one is edited to
// make a test pass, the test stops being evidence that we can read anybody's
// file. What is mostly being checked is not "did it find the columns" but
// "did it find the right one of two".

function load(text: string, name: string): [ImportTable, ImportPreset] {
  const table = ImportTable.read(bytes(trimIndent(text)))!;
  const preset = recognisePreset(name, table);
  assert.ok(preset, `no preset recognised ${name}`);
  return [table, preset];
}

const year = (entry: ImportedEntry) => entry.watchedAt?.getUTCFullYear() ?? null;

// ---- Letterboxd ----

test("reads a Letterboxd diary", () => {
  const [table, preset] = load(`
    Date,Name,Year,Letterboxd URI,Rating,Rewatch,Tags,Watched Date
    2021-04-29,Blade Runner 2049,2017,https://boxd.it/1Pjsv7,5,,in theaters,2017-10-05
    2020-08-31,Midsommar,2019,https://boxd.it/1kqPxb,5,Yes,,2019-09-01
  `, "diary.csv");
  assert.equal(preset.id, "letterboxd.diary");
  const entries = readEntries(table, presetMapping(preset, table));
  assert.equal(entries[0].title, "Blade Runner 2049");
  assert.equal(entries[0].year, 2017);
  // `Watched Date`, four years before the `Date` it was logged on.
  assert.equal(year(entries[0]), 2017);
  // Five stars out of five, not five out of ten.
  assert.equal(entries[0].rating, 10);
});

test("reads a Letterboxd list past its banner", () => {
  const table = ImportTable.read(bytes(trimIndent(`
    Letterboxd list export v7
    Date,Name,Tags,URL,Description
    2022-11-20,Studio Ghibli Ranked,allstats,https://boxd.it/jceO6,

    Position,Name,Year,URL,Description
    1,Spirited Away,2001,https://boxd.it/2b4m,
    2,Princess Mononoke,1997,https://boxd.it/2b4n,
  `)))!;
  assert.deepEqual(table.headers, ["Position", "Name", "Year", "URL", "Description"]);
  const entries = readEntries(table, guessMapping(table));
  assert.equal(entries.length, 2);
  assert.equal(entries[0].title, "Spirited Away");
});

test("tells Letterboxd's three identical files apart", () => {
  const header = "Date,Name,Year,Letterboxd URI\n2026-09-19,The Odyssey,2026,https://boxd.it/QFQU";

  const [watchedTable, watched] = load(header, "watched.csv");
  assert.equal(watched.id, "letterboxd.watched");
  assert.notEqual(presetEntries(watched, watchedTable)[0].watchedAt, null);

  const [listTable, list] = load(header, "watchlist.csv");
  assert.equal(list.id, "letterboxd.watchlist");
  const planned = presetEntries(list, listTable)[0];
  assert.equal(planned.watchedAt, null);
  assert.equal(planned.status, "watchlist");

  const [likesTable, likes] = load(header, "likes/films.csv");
  assert.equal(likes.id, "letterboxd.likes");
  const liked = presetEntries(likes, likesTable)[0];
  assert.equal(liked.isFavorite, true);
  assert.equal(liked.watchedAt, null);
});

test("leaves Letterboxd's deleted and orphaned files alone", () => {
  const diary = trimIndent(`
    Date,Name,Year,Letterboxd URI,Rating,Rewatch,Tags,Watched Date
    2021-04-29,Blade Runner 2049,2017,https://boxd.it/1Pjsv7,5,,,2017-10-05
  `);
  const table = ImportTable.read(bytes(diary))!;
  assert.notEqual(recognisePreset("diary.csv", table), null);
  assert.equal(recognisePreset("deleted/diary.csv", table), null);
  assert.equal(recognisePreset("orphaned/diary.csv", table), null);
});

// ---- IMDb, all three generations ----

test("reads the current IMDb export", () => {
  const [table, preset] = load(`
    Position,Const,Created,Modified,Description,Title,Original Title,URL,Title Type,IMDb Rating,Runtime (mins),Year,Genres,Num Votes,Release Date,Directors,Your Rating,Date Rated
    1,tt2448843,2014-07-18,2014-07-18,,Interstellar,Interstellar,https://x,Movie,8.4,164,2014,"Action",1956132,2014-07-20,Nolan,9,2014-12-13
  `, "ratings.csv");
  assert.equal(preset.id, "imdb.v3");
  const entries = readEntries(table, presetMapping(preset, table));
  assert.equal(entries[0].imdbID, "tt2448843");
  assert.equal(entries[0].rating, 9);
  assert.equal(entries[0].year, 2014);
});

test("leaves an unrated IMDb row alone", () => {
  const [table, preset] = load(`
    Position,Const,Created,Modified,Description,Title,Original Title,URL,Title Type,IMDb Rating,Runtime (mins),Year,Genres,Num Votes,Release Date,Directors,Your Rating,Date Rated
    1,tt17491088,2026-09-18,2026-09-18,,"The Diplomat","The Diplomat",https://x,TV Series,8.0,50,2023,"Drama",100748,2023-04-20,,,
    2,tt13210838,2026-09-18,2026-09-18,,"The Gentlemen","The Gentlemen",https://x,TV Series,8.0,50,2024,"Crime",195192,2024-03-07,,9,2026-09-18
    3,tt22084616,2026-09-18,2026-09-18,,"Spider-Man: Brand New Day","Spider-Man: Brand New Day",https://x,Movie,8.0,145,2026,"Action",302097,2026-07-31,"Cretton",,
    4,tt43706317,2026-09-18,2026-09-18,,"Unmasking a Monster","Unmasking a Monster",https://x,TV Mini Series,,,2026,"Documentary",0,2026-09-30,,,
  `, "2f36023d-f139-4bfa-a7ae-94d00c19439a.csv");
  assert.equal(preset.id, "imdb.v3");
  const entries = presetEntries(preset, table);
  assert.equal(entries.length, 4);
  assert.equal(entries[0].rating, null);
  assert.equal(entries[0].watchedAt, null);
  assert.equal(entries[1].rating, 9);
  assert.notEqual(entries[1].watchedAt, null);
  assert.equal(entries[0].kind, "shows");
  assert.equal(entries[2].kind, "movies");
  assert.equal(entries[3].kind, "shows");
  assert.ok(entries.every((e) => e.imdbID !== null));
});

test("reads the middle IMDb export", () => {
  const [, preset] = load(`
    Const,Your Rating,Date Rated,Title,URL,Title Type,IMDb Rating,Runtime (mins),Year,Genres,Num Votes,Release Date,Directors
    tt0111161,9,2021-04-03,The Shawshank Redemption,https://x,Movie,9.3,142,1994,Drama,2800000,1994-09-23,Darabont
  `, "ratings.csv");
  assert.equal(preset.id, "imdb.v2");
});

test("reads the old IMDb export", () => {
  const [table, preset] = load(`
    "position","const","created","modified","description","Title","Title type","Directors","You rated","IMDb Rating","Runtime (mins)","Year","Genres","Num. Votes","Release Date (month/day/year)","URL"
    "1","tt2872718","Sat Dec 31 00:00:00 2016","","","Nightcrawler","Feature Film","Dan Gilroy","8","7.9","117","2014","crime","311885","2014-09-05","http://www.imdb.com/title/tt2872718/"
  `, "ratings.csv");
  assert.equal(preset.id, "imdb.v1");
  const entries = readEntries(table, presetMapping(preset, table));
  assert.equal(entries[0].title, "Nightcrawler");
  assert.equal(entries[0].imdbID, "tt2872718");
  assert.equal(entries[0].rating, 8);
  // Android only, kept here: the C-style date is read, so the film counts as
  // seen rather than landing on To Watch as it does on iOS.
  assert.equal(year(entries[0]), 2016);
});

test("rescues a Windows-encoded file", () => {
  const head = bytes("Const,Your Rating,Date Rated,Title,URL,Title Type,Year\ntt0211915,9,2021-04-03,Am");
  const tail = bytes("lie,https://x,Movie,2001");
  const data = new Uint8Array(head.length + 1 + tail.length);
  data.set(head);
  data[head.length] = 0xe9; // é, as Windows writes it
  data.set(tail, head.length + 1);
  const table = ImportTable.read(data)!;
  const entries = readEntries(table, presetMapping(IMPORT_PRESETS.imdbV2, table));
  assert.equal(entries[0].title, "Amélie");
});

// ---- Trakt ----

test("reads a Trakt ratings export", () => {
  const [table, preset] = load(`
    rated_at,type,title,year,trakt_rating,trakt_id,imdb_id,tmdb_id,tvdb_id,url,released,season_number,episode_number,episode_title,episode_released,episode_trakt_rating,episode_trakt_id,episode_imdb_id,episode_tmdb_id,episode_tvdb_id,genres,rating
    2021-03-22T06:33:24.000Z,episode,Star Wars: The Clone Wars,2008,8.1,4170,tt0458290,4194,83268,https://x,2008-01-20,7,7,Dangerous Debt,2020-04-10,7.9,2590748,tt9313956,2201892,7640571,animation,9
  `, "ratings.csv");
  assert.equal(preset.id, "trakt.ratings.csv");
  const entries = readEntries(table, presetMapping(preset, table));
  assert.equal(entries[0].season, 7);
  assert.equal(entries[0].episode, 7);
  assert.equal(entries[0].rating, 9);
  assert.equal(entries[0].imdbID, "tt0458290");
  assert.equal(entries[0].tmdbID, 4194);
  assert.equal(entries[0].tvdbID, 83268);
  assert.notEqual(entries[0].watchedAt, null);
});

// ---- Simkl ----

test("reads a Simkl CSV", () => {
  const [table, preset] = load(`
    simkl_id,TVDB_ID,TMDB,IMDB_ID,MAL_ID,Type,Title,Year,LastEpWatched,Watchlist,WatchedDate,Rating,Memo
    ,,,,27775,tv,"Plastic, Memories",2015,s1e2,plan to watch,8/21/2015,5,
    ,,,tt1638355,,movie,The Man from U.N.C.L.E.,2015,,completed,8/20/2015,6,my memo
  `, "SimklBackup.csv");
  assert.equal(preset.id, "simkl.csv");
  const entries = readEntries(table, presetMapping(preset, table));
  assert.equal(entries[0].season, 1);
  assert.equal(entries[0].episode, 2);
  assert.equal(entries[0].title, "Plastic, Memories");
  assert.equal(entries[1].imdbID, "tt1638355");
});

// ---- Bingers ----

test("reads a Bingers history", () => {
  const [table, preset] = load(`
    type,title,tvdb_id,tmdb_id,season_number,episode_number,first_watched_at,last_watched_at,plays
    episode,Game of Thrones,121361,1399,0,1,2026-08-11T05:20:03.592Z,2026-08-11T05:20:03.592Z,1
    episode,Game of Thrones,121361,1399,1,1,2018-04-01T19:30:00.000Z,2024-01-09T20:00:00.000Z,2
    movie,Dune,,438631,,,2026-09-13T21:00:00.000Z,2026-09-13T21:00:00.000Z,1
  `, "watches.csv");
  assert.equal(preset.id, "bingers.watches");
  const entries = presetEntries(preset, table);
  assert.equal(entries.length, 3);
  assert.equal(entries[0].season, 0);
  assert.equal(entries[0].kind, "shows");
  assert.equal(entries[0].tmdbID, 1399);
  assert.equal(year(entries[1]), 2018);
  assert.equal(entries[2].kind, "movies");
  assert.equal(entries[2].season, null);
});

test("reads a Bingers library without inventing dates", () => {
  const [table, preset] = load(`
    type,title,original_title,year,tvdb_id,tmdb_id,favorite,list_status,added_at,for_later_at,stopped_watching_at,hidden_at
    movie,Harry Potter and the Order of the Phoenix,Harry Potter and the Order of the Phoenix,2007,,675,no,following,2026-09-17T11:26:30.056Z,,,
    show,Severance,,2022,371980,95396,yes,watching,2026-09-01T10:00:00.000Z,,,
  `, "library.csv");
  assert.equal(preset.id, "bingers.library");
  const entries = presetEntries(preset, table);
  assert.equal(entries[0].kind, "movies");
  assert.equal(entries[0].status, "following");
  assert.equal(entries[0].isFavorite, false);
  assert.equal(entries[1].kind, "shows");
  assert.equal(entries[1].isFavorite, true);
  assert.equal(entries[0].watchedAt, null);
});

test("reads Bingers ratings out of five", () => {
  const [table, preset] = load(`
    type,title,tvdb_id,tmdb_id,season_number,episode_number,rating,favorite_character,emotions
    episode,Stranger Things,305288,66732,1,3,4,,
  `, "ratings.csv");
  assert.equal(preset.id, "bingers.ratings");
  const entries = presetEntries(preset, table);
  assert.equal(entries[0].rating, 8);
  assert.equal(entries[0].season, 1);
  assert.equal(entries[0].episode, 3);
});

// ---- The scale a preset knows and a column can't say ----

test("keeps ten-point ratings from a harsh rater", () => {
  const [table, preset] = load(`
    Const,Your Rating,Date Rated,Title,URL,Title Type,IMDb Rating,Runtime (mins),Year,Genres,Num Votes,Release Date,Directors
    tt0111161,5,2021-04-03,The Shawshank Redemption,https://x,Movie,9.3,142,1994,Drama,2800000,1994-09-23,Darabont
    tt0068646,4,2020-01-05,The Godfather,https://x,Movie,9.2,175,1972,Crime,1900000,1972-03-14,Coppola
    tt0109830,3,2019-11-30,Forrest Gump,https://x,Movie,8.8,142,1994,Drama,2000000,1994-07-06,Zemeckis
  `, "ratings.csv");
  assert.equal(preset.id, "imdb.v2");
  const entries = presetEntries(preset, table);
  assert.equal(entries[0].rating, 5);
  assert.equal(entries[1].rating, 4);
});

test("gives a one-kind file its kind", () => {
  const [table, preset] = load(`
    Date,Name,Year,Letterboxd URI,Rating,Rewatch,Tags,Watched Date
    2021-04-29,Blade Runner 2049,2017,https://boxd.it/1Pjsv7,5,,,2017-10-05
  `, "diary.csv");
  assert.equal(presetEntries(preset, table)[0].kind, "movies");
});

// ---- Refract ----

test("reads a Refract backup", () => {
  const [table, preset] = load(`
    title,year,media_type,tmdb_id,season,episode,watched,watched_at,watched_at_tz,rating,review,mood_tags,rewatch_count,is_special,imported,runtime_minutes
    Stuart Fails to Save the Universe,2026,tv,287620,1,3,true,2026-09-19 01:47,Asia/Manila,,,,0,false,false,18
    Stuart Fails to Save the Universe,2026,tv,287620,1,7,false,,Asia/Manila,,,,0,false,false,22
  `, "readable/episodes.csv");
  assert.equal(preset.id, "refract.episodes");
  const watched = presetEntries(preset, table);
  assert.equal(watched.length, 2);
  assert.equal(watched[0].season, 1);
  assert.equal(watched[0].episode, 3);
  assert.equal(watched[0].tmdbID, 287620);
  assert.notEqual(watched[0].watchedAt, null);
  assert.equal(watched[1].watchedFlag, false);
  assert.equal(watched[0].watchedFlag, true);
});

test("reads a Refract library without its episode codes", () => {
  const [table, preset] = load(`
    title,year,media_type,tmdb_id,status,rating,progress_season,progress_episode,progress_percent,rewatch_count,watched_episodes,mood_tags,watch_context,is_public,last_watched_at,source,added_at
    Stuart Fails to Save the Universe,2026,tv,287620,on_hold,,1,6,66,0,S1E1; S1E2; S1E3,,,false,2026-09-19T01:47:52.088Z,refract,2026-09-19T01:47:44.874Z
    Moana,2026,movie,1108427,completed,,,,100,0,,,,false,2026-09-19T01:45:33.921Z,refract,2026-09-19T01:45:30.000Z
  `, "readable/library.csv");
  assert.equal(preset.id, "refract.library");
  const entries = presetEntries(preset, table);
  assert.equal(entries[0].status, "on_hold");
  assert.equal(entries[1].kind, "movies");
  assert.equal(entries[1].status, "completed");
  assert.equal(entries[0].season, null);
  assert.equal(entries[0].episode, null);
});

test("does not import a Refract diary", () => {
  const [table, preset] = load(`
    title,year,media_type,tmdb_id,action_type,action_date,action_date_tz,rating,notes,imported,user_set_date,occurred_at
    Batang Quiapo,,tv,215803,episode,2026-09-19 01:45,Asia/Manila,,S1E1,false,,2026-09-19T01:45:44.462Z
    Spider-Man: Brand New Day,2026,movie,969681,rated,2026-08-13 10:13,Asia/Manila,5,,false,,2026-08-13T10:13:23.078Z
  `, "readable/diary.csv");
  assert.equal(preset.id, "refract.diary");
  assert.equal(presetEntries(preset, table).length, 0);
});

// ---- Codes ----

test("reads an episode code in either style", () => {
  assert.equal(episodeCode("s1e2")?.[0], 1);
  assert.equal(episodeCode("S01E02")?.[1], 2);
  assert.equal(episodeCode("3x14")?.[0], 3);
  assert.equal(episodeCode("3x14")?.[1], 14);
  assert.equal(episodeCode("pilot"), null);
});

void run("import-presets.test.ts");
