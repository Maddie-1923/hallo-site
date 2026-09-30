import assert from "node:assert/strict";
import { jsonEntries, looksLikeOurs, recogniseJsonFormat, type ImportJsonFormat } from "../json";
import { isEpisode, type ImportedEntry } from "../table";
import { instantString } from "../text";
import { bytes, run, test, trimIndent } from "./harness";

// The nested exports read as the viewing they hold — Android's
// ImportJsonTests.kt, from kodigoTests/ImportJSONTests.swift. Mostly the
// places these formats disagree with each other in ways that would pass
// unnoticed: which object the show's name is in, whether an id is a number or
// a string, whether a date is a date or a lie.

function read(text: string): [ImportJsonFormat | null, ImportedEntry[]] {
  const data = bytes(trimIndent(text));
  const format = recogniseJsonFormat(data);
  return format ? [format, jsonEntries(format, data)] : [null, []];
}

const find = <T>(list: T[], p: (t: T) => boolean) => {
  const hit = list.find(p);
  assert.ok(hit, "expected a match");
  return hit;
};

// ---- Trakt ----

test("reads Trakt history", () => {
  const [format, entries] = read(`
    [{"id": 7178301624, "watched_at": "2021-01-23T04:25:15.000Z", "action": "watch", "type": "episode",
      "episode": {"season": 7, "number": 7, "title": "Dangerous Debt",
        "ids": {"trakt": 2590748, "tvdb": 7640571, "imdb": "tt9313956", "tmdb": 2201892}},
      "show": {"title": "Star Wars: The Clone Wars", "year": 2008,
        "ids": {"trakt": 4170, "tvdb": 83268, "imdb": "tt0458290", "tmdb": 4194}}},
     {"id": 7178301625, "watched_at": "2021-03-22T06:33:24.000Z", "action": "watch", "type": "movie",
      "movie": {"title": "Heat", "year": 1995, "ids": {"trakt": 1, "imdb": "tt0113277", "tmdb": 949}}}]
  `);
  assert.equal(format, "Trakt");
  assert.equal(entries.length, 2);
  const episode = entries[0];
  assert.equal(episode.title, "Star Wars: The Clone Wars");
  assert.equal(episode.season, 7);
  assert.equal(episode.episode, 7);
  assert.equal(episode.episodeTitle, "Dangerous Debt");
  assert.equal(episode.tmdbID, 4194); // the show's, not the episode's 2201892
  assert.equal(episode.kind, "shows");
  assert.equal(episode.watchedAt?.getUTCFullYear(), 2021);
  assert.equal(entries[1].title, "Heat");
  assert.equal(entries[1].kind, "movies");
  assert.equal(entries[1].tmdbID, 949);
});

test("keeps every Trakt rewatch", () => {
  const [, entries] = read(`
    [{"id":1,"watched_at":"2018-04-01T19:30:00.000Z","action":"watch","type":"episode",
      "episode":{"season":1,"number":2,"ids":{"tmdb":1}},"show":{"title":"Barry","year":2018,"ids":{"tmdb":1437}}},
     {"id":2,"watched_at":"2024-01-09T20:00:00.000Z","action":"watch","type":"episode",
      "episode":{"season":1,"number":2,"ids":{"tmdb":1}},"show":{"title":"Barry","year":2018,"ids":{"tmdb":1437}}}]
  `);
  assert.equal(entries.length, 2);
});

test("reads the rolled-up Trakt file", () => {
  const [format, entries] = read(`
    [{"plays": 8, "last_watched_at": "2021-03-22T06:33:24.000Z",
      "show": {"title": "Severance", "year": 2022, "ids": {"tvdb": 371980, "imdb": "tt11280740", "tmdb": 95396}},
      "seasons": [{"number": 1, "episodes": [{"number": 1, "plays": 1, "last_watched_at": "2022-02-18T20:00:00.000Z"},
                                              {"number": 2, "plays": 1, "last_watched_at": "2022-02-25T20:00:00.000Z"}]}]}]
  `);
  assert.equal(format, "Trakt");
  assert.equal(entries.length, 2);
  assert.equal(entries[0].title, "Severance");
  assert.equal(entries[0].season, 1);
  assert.equal(entries[0].tmdbID, 95396);
});

// ---- Simkl ----

test("reads a Simkl backup", () => {
  const [format, entries] = read(`
    {"shows": [{"last_watched_at": "2014-11-06T22:05:52Z", "user_rating": 10, "status": "completed",
       "show": {"title": "Hunter x Hunter", "year": 2011,
         "ids": {"simkl": 40398, "imdb": "tt2098220", "tmdb": "62417", "mal": "11061"}},
       "seasons": [{"number": 1, "episodes": [{"number": 1, "watched_at": "2026-05-16T14:02:10Z"},
                                              {"number": 3, "watched_at": "1970-01-01T00:00:01Z"}]}]}],
     "movies": [{"last_watched_at": "2021-10-22T21:00:00Z", "user_rating": 8, "status": "completed",
       "movie": {"title": "Dune", "year": 2021, "ids": {"simkl": 1, "imdb": "tt1160419", "tmdb": "438631"}}}],
     "anime": []}
  `);
  assert.equal(format, "Simkl");
  // Every external id a string, Simkl's own a number.
  assert.ok(entries.some((e) => e.tmdbID === 62417));
  assert.ok(entries.some((e) => e.title === "Dune" && e.kind === "movies" && e.tmdbID === 438631));
  assert.equal(entries.filter(isEpisode).length, 2);
  // The first second of 1970 is "watched, but they don't remember when", and
  // is never taken as a night: the episode falls back to the series' own
  // last-watched stamp.
  assert.equal(instantString(find(entries, (e) => e.episode === 3).watchedAt), "2014-11-06T22:05:52Z");
  // A verdict about a series is not a verdict about each of its episodes.
  assert.equal(find(entries, isEpisode).rating, null);
  assert.ok(entries.some((e) => !isEpisode(e) && e.rating === 10));
});

test("spots a Simkl run that was finished but not listed", () => {
  const [format, entries] = read(`
    {"shows": [{"last_watched_at": "2026-09-19T03:27:37Z", "status": "completed",
       "watched_episodes_count": 151, "total_episodes_count": 151,
       "show": {"title": "The Mentalist", "year": 2008,
         "ids": {"simkl": 9089, "imdb": "tt1196946", "tmdb": "5920", "tvdb": "82459"}}},
      {"last_watched_at": "2026-09-19T03:27:37Z", "status": "hold",
       "watched_episodes_count": 0, "total_episodes_count": 73,
       "show": {"title": "Game of Thrones", "ids": {"simkl": 1, "tmdb": "1399"}}}],
     "movies": []}
  `);
  assert.equal(format, "Simkl");
  const mentalist = find(entries, (e) => e.title === "The Mentalist");
  assert.equal(mentalist.finishedRun, true);
  assert.equal(mentalist.tmdbID, 5920);
  // Nothing watched and nothing listed is a show set aside, not finished.
  assert.equal(find(entries, (e) => e.title === "Game of Thrones").finishedRun, false);
});

test("does not call a part-watched Simkl show finished", () => {
  const [, entries] = read(`
    {"shows": [{"status": "watching", "watched_episodes_count": 13, "total_episodes_count": 19,
       "show": {"title": "Dark Matter", "ids": {"simkl": 2, "tmdb": "222766"}},
       "seasons": [{"number": 1, "episodes": [{"number": 1, "watched_at": "2026-09-19T03:20:00Z"}]}]}],
     "movies": []}
  `);
  assert.ok(entries.every((e) => !e.finishedRun));
  assert.ok(entries.some(isEpisode));
});

// ---- SeriesGuide ----

test("reads a SeriesGuide backup", () => {
  const [format, entries] = read(`
    [{ "tmdb_id": 68421, "tvdb_id": 332331, "imdb_id": "tt2261227", "trakt_id": 122265,
       "title": "Altered Carbon", "first_aired": "2018-02-02T08:00:00Z", "status": "canceled",
       "rating": 7.77, "rating_user": 9, "last_watched_ms": 1614593199175,
       "seasons": [{ "season": 1, "tmdb_id": "61343",
         "episodes": [{ "tmdb_id": 991306, "episode": 1, "title": "Out of the Past",
           "first_aired": 1517558400000, "watched": true, "plays": 1, "rating_user": 8 },
           { "episode": 2, "title": "Fallen Angel", "watched": false, "plays": 0 }]}]}]
  `);
  assert.equal(format, "SeriesGuide");
  assert.equal(entries.filter(isEpisode).length, 1);
  assert.equal(entries[0].tmdbID, 68421);
  assert.equal(entries[0].tvdbID, 332331);
  // No date for an episode: the file holds none, and `first_aired` is when it was broadcast.
  assert.equal(entries[0].watchedAt, null);
  assert.ok(entries.some((e) => !isEpisode(e) && e.rating === 9 && e.watchedAt !== null));
});

test("reads a show added before SeriesGuide moved to TMDB", () => {
  const [, entries] = read(`
    [{ "tvdb_id": 81189, "title": "Breaking Bad", "rating_user": 10,
       "seasons": [{ "season": 1, "episodes": [{ "episode": 1, "watched": true, "plays": 1 }]}]}]
  `);
  assert.equal(entries[0].tvdbID, 81189);
  assert.equal(entries[0].tmdbID, null);
});

test("reads SeriesGuide films", () => {
  const [format, entries] = read(`
    [{ "tmdb_id": 438631, "imdb_id": "tt1160419", "title": "Dune", "released_utc_ms": 1631664000000,
       "runtime_min": 155, "in_collection": true, "in_watchlist": false, "watched": true, "plays": 1 }]
  `);
  assert.equal(format, "SeriesGuide");
  assert.equal(entries[0].title, "Dune");
  assert.equal(entries[0].kind, "movies");
  // Android only, kept here: a film the file says was watched carries the
  // word the importer files a film as Watched on. iOS files it To Watch.
  assert.equal(entries[0].status, "watched");
});

test("keeps an unwatched SeriesGuide film on its list", () => {
  const [, entries] = read(`
    [{ "tmdb_id": 1, "title": "Later", "in_collection": false, "in_watchlist": true, "watched": false },
     { "tmdb_id": 2, "title": "Nothing", "in_collection": false, "in_watchlist": false, "watched": false }]
  `);
  assert.deepEqual(entries.map((e) => e.title), ["Later"]);
  assert.equal(entries[0].status, "watchlist");
});

// ---- Sofa Time ----

test("reads a Sofa Time export", () => {
  const data = bytes(trimIndent(`
    [{"genres":["Animation"],"imdb":"tt2861424","runtime":24,"tmdb":60625,
      "addedDate":"2013-12-01T16:00:00Z","title":"Rick and Morty",
      "release_date":"2013-12-01T16:00:00Z","type":"tv",
      "seasons":[{"number":1,"episodes":[{"number":1,"addedDate":"2013-12-01T16:00:00Z"},
                                         {"number":2,"addedDate":"2013-12-08T16:00:00Z","rating":9}]}]}]
  `));
  const format = recogniseJsonFormat(data);
  // Sofa's shows carry `seasons` as SeriesGuide's do; the ids tell them apart.
  assert.equal(format, "Sofa Time");
  const entries = jsonEntries(format!, data, "watchedShow_(2026_09_18_12_36_46).json");
  assert.equal(entries.filter(isEpisode).length, 2);
  const first = entries[0];
  assert.equal(first.title, "Rick and Morty");
  assert.equal(first.kind, "shows");
  assert.equal(first.tmdbID, 60625);
  assert.equal(first.imdbID, "tt2861424");
  assert.equal(first.status, "watched");
  assert.equal(find(entries, (e) => e.episode === 2).rating, 9);
});

test("does not take a Sofa Time watchlist for a history", () => {
  const data = bytes(trimIndent(`
    [{"imdb":"tt43700444","runtime":48,"tmdb":1739206,"addedDate":"2026-09-18T04:36:36Z",
      "title":"Untold Mr. T: I Pity the Fool","release_date":"2026-09-07T16:00:00Z","type":"movie"}]
  `));
  const format = recogniseJsonFormat(data)!;
  const planned = jsonEntries(format, data, "watchlistMovie_(2026_09_18_12_36_46).json");
  assert.equal(planned[0].status, "watchlist");
  assert.equal(planned[0].watchedAt, null);
  assert.equal(planned[0].kind, "movies");
  const watched = jsonEntries(format, data, "watchedMovie_(2026_09_18_12_36_46).json");
  assert.equal(watched[0].status, "watched");
  assert.notEqual(watched[0].watchedAt, null);
});

// ---- Showly ----

test("reads a Showly backup", () => {
  const [format, entries] = read(`
    {"createdAt":"2026-09-19T04:04:48Z","platform":"ios","version":2,"lists":{"l":[]},
     "movies":{"cH":[{"a":"2026-05-15T18:00:00Z","id":903398,"t":"In the Grey","tmId":1122573}],
               "cW":[{"a":"2026-09-19T04:04:20Z","id":763652,"t":"The Invite","tmId":950028}],
               "rM":[{"id":903398,"r":5,"rA":"2026-09-19T04:04:33Z","tmId":1122573}]},
     "shows":{"cH":[{"a":"2026-09-19T04:03:19Z","id":228595,"t":"MobLand","tmId":247718}],
              "cW":[{"a":"2026-09-19T04:03:49Z","id":155534,"t":"Slow Horses","tmId":95480}],
              "pEp":[{"a":"2025-03-30T18:00:00Z","eN":1,"id":11566670,"sId":228595,"sN":1,"stmId":247718},
                     {"a":"2026-09-19T04:03:56Z","eN":3,"id":6765667,"sId":155534,"sN":2,"stmId":95480}],
              "rS":[{"id":155534,"r":7,"rA":"2026-09-19T04:04:01Z","tmId":95480}]}}
  `);
  assert.equal(format, "Showly");
  const episode = find(entries, (e) => e.season === 2 && e.episode === 3);
  assert.equal(episode.title, "Slow Horses");
  assert.equal(episode.tmdbID, 95480);
  assert.notEqual(episode.watchedAt, null);
  assert.ok(entries.some((e) => e.title === "MobLand" && e.status === "watching"));
  assert.ok(entries.some((e) => e.title === "Slow Horses" && e.rating === 7));
  const planned = find(entries, (e) => e.title === "The Invite");
  assert.equal(planned.kind, "movies");
  assert.equal(planned.watchedAt, null);
  assert.notEqual(find(entries, (e) => e.title === "In the Grey" && e.status === "watched").watchedAt, null);
});

// ---- Not one of these ----

test("does not claim a CSV", () => {
  assert.equal(recogniseJsonFormat(bytes("Date,Name,Year\n2024-01-01,Heat,1995")), null);
});

test("never claims a Kodigo archive", () => {
  assert.equal(recogniseJsonFormat(bytes(`{"exported":"2026-01-01T00:00:00Z","version":14,"device":"x","shows":[],"watched":[]}`)), null);
});

// ---- LibraryArchiveTests: recognising our own files ----

test("our files are recognised by their three keys", () => {
  assert.ok(looksLikeOurs(bytes(`{"exported":"2026-08-05T12:00:00Z","version":14,"device":"Test","shows":[]}`)));
  assert.ok(looksLikeOurs(bytes(`{"exported":null,"version":1,"device":"x"}`)));
});

test("other files are not", () => {
  assert.equal(looksLikeOurs(bytes(`{"exported":"2026-08-05T12:00:00Z","device":"x"}`)), false);
  assert.equal(looksLikeOurs(bytes(`[{"exported":1,"version":1,"device":"x"}]`)), false);
  assert.equal(looksLikeOurs(bytes("not json")), false);
});

void run("import-json.test.ts");
