import assert from "node:assert/strict";
import type { LibraryArchive, Movie } from "../../archive";
import { applyImportPlan } from "../apply";
import { importedEntry } from "../table";
import { runTvTimeImport } from "../tvtime";
import { NothingReadable, type ImportDeps, type ImportRun, type TvTimeImportResult, type UniversalImportResult } from "../types";
import { movieStatus, runUniversalImport, showStatus } from "../universal";
import {
  archive,
  bytes,
  episodesOf,
  FakeCatalog,
  FakeEpisodes,
  movie as fixtureMovie,
  NOW,
  nowText,
  run,
  show,
  Skip,
  test,
  trimIndent,
  tvTimeSample,
} from "./harness";

// The two importers end to end — matching against a TMDB the test answers
// for, then landing the plan on a library — Android's ImportRunTests.kt:
// the matching and writing, the status tables, the rule that an import fills
// gaps and never overwrites, and that running one twice lands nothing new.
//
// Where Android reads its live store after a run, these apply the run's plan
// to the library they started from and read that.

const movie = (id: number, title: string, year: string): Movie => ({ ...fixtureMovie(id, title), release_date: `${year}-01-01` });

const deps = (catalog: FakeCatalog, library: LibraryArchive, episodes = new FakeEpisodes()): ImportDeps => ({ catalog, episodes, library, now: () => NOW });

/** Runs a universal import of one file and lands its plan, as Android's run writes into its store. */
async function universal(catalog: FakeCatalog, library: LibraryArchive, name: string, text: string, episodes = new FakeEpisodes()) {
  const out: ImportRun<UniversalImportResult> = await runUniversalImport([{ name, data: bytes(text) }], deps(catalog, library, episodes));
  return { result: out.result, library: applyImportPlan(library, out.plan, NOW) };
}

async function tvTime(catalog: FakeCatalog, library: LibraryArchive, name: string, data: Uint8Array, episodes = new FakeEpisodes()) {
  const out: ImportRun<TvTimeImportResult> = await runTvTimeImport([{ name, data }], deps(catalog, library, episodes));
  return { result: out.result, library: applyImportPlan(library, out.plan, NOW) };
}

const movieStatusOf = (a: LibraryArchive, id: number) => a.movies.find((m) => m.movie.id === id)?.status;
const showStatusOf = (a: LibraryArchive, id: number) => a.shows.find((s) => s.show.id === id)?.status;

const letterboxdDiary = trimIndent(`
  Date,Name,Year,Letterboxd URI,Rating,Rewatch,Tags,Watched Date
  2021-04-29,Blade Runner 2049,2017,https://boxd.it/1Pjsv7,4.5,,,2017-10-05
  2020-08-31,Midsommar,2019,https://boxd.it/1kqPxb,3,Yes,,2019-09-01
  2020-09-01,A Film Nobody Has Heard Of,2019,https://boxd.it/x,3,,,2019-09-02
`);

test("a Letterboxd diary lands as watched films with their nights and verdicts", async () => {
  const catalog = new FakeCatalog();
  catalog.movies.push(movie(1, "Blade Runner 2049", "2017"), movie(2, "Midsommar", "2019"));
  const { result, library: s } = await universal(catalog, archive(), "diary.csv", letterboxdDiary);

  assert.deepEqual(result.files, [{ name: "diary.csv", format: "Letterboxd diary", rows: 3 }]);
  assert.equal(result.moviesAdded, 2);
  assert.equal(result.ratingsApplied, 2);
  assert.deepEqual(result.unmatched, ["A Film Nobody Has Heard Of"]);
  assert.equal(movieStatusOf(s, 1), "Watched");
  assert.ok(s.watchedMovies?.includes(1));
  assert.equal(s.movieWatchedDates?.["1"], "2017-10-05T00:00:00Z");
  assert.equal(s.ratings?.["movie:1"], 9);
  assert.equal(s.ratings?.["movie:2"], 6);
});

test("running the same import twice lands nothing new", async () => {
  const catalog = new FakeCatalog();
  catalog.movies.push(movie(1, "Blade Runner 2049", "2017"), movie(2, "Midsommar", "2019"));
  const first = (await universal(catalog, archive(), "diary.csv", letterboxdDiary)).library;

  const again = await universal(catalog, first, "diary.csv", letterboxdDiary);
  assert.equal(again.result.moviesAdded, 0);
  assert.equal(again.result.moviesAlreadyTracked, 2);
  // Nothing new landed, so the verdicts aren't visited at all — iOS walks
  // them only after a merge that brought something in.
  assert.equal(again.result.ratingsApplied, 0);
  assert.equal(again.result.ratingsKept, 0);
  assert.deepEqual(again.library.movies, first.movies);
  assert.deepEqual(again.library.ratings, first.ratings);
  assert.deepEqual(again.library.movieWatchedDates, first.movieWatchedDates);
});

test("a show already tracked keeps its status, dates and verdict and gains only what it lacked", async () => {
  const severance = show(10, "Severance");
  // Tracked On Hold, its first episode ticked tonight, rated four.
  const library = archive({
    shows: [{ show: severance, status: "Stopped", modified: nowText, added: nowText }],
    watched: ["10-1-1"],
    watchedDates: { "10-1-1": nowText },
    watchedStamps: { "10-1-1": nowText },
    ratings: { "show:10": 4 },
  });
  const ownNight = library.watchedDates!["10-1-1"];
  const csv = trimIndent(`
    series_name,season_number,episode_number,watched_date,rating,status
    Severance,1,1,2020-01-01 20:00:00,,watching
    Severance,1,2,2020-01-02 20:00:00,,watching
    Severance,,,,9,watching
  `);
  const catalog = new FakeCatalog();
  catalog.shows.push(severance);
  const { result, library: s } = await universal(catalog, library, "history.csv", csv);

  assert.equal(result.showsAdded, 0);
  assert.equal(result.showsAlreadyTracked, 1);
  assert.equal(result.episodesAdded, 1);
  assert.equal(result.ratingsKept, 1);
  assert.equal(showStatusOf(s, 10), "Stopped");
  assert.equal(s.watchedDates?.["10-1-1"], ownNight);
  assert.equal(s.watchedDates?.["10-1-2"], "2020-01-02T20:00:00Z");
  assert.equal(s.ratings?.["show:10"], 4);
});

test("a finished run is ticked from the listings, and episode ratings wait for them", async () => {
  const json = trimIndent(`
    {"shows": [{"last_watched_at": "2026-09-19T03:27:37Z", "status": "completed",
       "watched_episodes_count": 5, "total_episodes_count": 5,
       "show": {"title": "The Mentalist", "ids": {"simkl": 9089, "tmdb": "5920"}}}],
     "movies": []}
  `);
  const catalog = new FakeCatalog();
  catalog.shows.push(show(5920, "The Mentalist"));
  const episodes = new FakeEpisodes();
  episodes.byShow.set(5920, episodesOf(5920, 3, 2));
  const { result, library: s } = await universal(catalog, archive(), "SimklBackup.json", json, episodes);

  assert.equal(result.showsAdded, 1);
  assert.equal(result.episodesAdded, 5);
  assert.equal(episodes.loads, 1);
  assert.deepEqual(new Set(s.watched), new Set(["5920-1-1", "5920-1-2", "5920-1-3", "5920-2-1", "5920-2-2"]));
  // Undated: the file has no nights to give.
  assert.deepEqual(s.watchedDates ?? {}, {});
});

test("an episode rating TMDB has no episode for is counted", async () => {
  const csv = trimIndent(`
    type,title,tvdb_id,tmdb_id,season_number,episode_number,rating,favorite_character,emotions
    episode,Stranger Things,305288,66732,1,3,4,,
    episode,Stranger Things,305288,66732,9,9,5,,
  `);
  const catalog = new FakeCatalog();
  catalog.shows.push(show(66732, "Stranger Things"));
  const episodes = new FakeEpisodes();
  episodes.byShow.set(66732, episodesOf(66732, 8));
  const { result, library: s } = await universal(catalog, archive(), "ratings.csv", csv, episodes);
  assert.equal(result.ratingsApplied, 1);
  assert.equal(result.ratingsUnplaced, 1);
  assert.equal(s.ratings?.["episode:66732-1-3"], 8);
});

test("a heart is set only where there is none and never taken off", async () => {
  const catalog = new FakeCatalog();
  catalog.movies.push(movie(1, "Heat", "1995"), movie(2, "Ran", "1985"));
  const library = archive({
    movies: [{ movie: catalog.movies[0], status: "To Watch", modified: nowText, added: nowText }],
    reactions: { "movie:1": "loved" },
  });
  const csv = "Date,Name,Year,Letterboxd URI\n2026-09-19,Heat,1995,https://boxd.it/a\n2026-09-19,Ran,1985,https://boxd.it/b";
  const { library: s } = await universal(catalog, library, "likes/films.csv", csv);
  assert.equal(s.reactions?.["movie:1"], "loved");
  assert.equal(s.reactions?.["movie:2"], "loved");
  // A heart is not a viewing: liked films wait on To Watch.
  assert.equal(movieStatusOf(s, 2), "To Watch");
});

test("a SeriesGuide film that was watched lands as watched", async () => {
  // The iOS bug the Android spec flags: the reader never read `watched`, so
  // every film arrived on To Watch. Fixed on Android, and here.
  const json = `[{ "tmdb_id": 438631, "title": "Dune", "in_collection": true, "in_watchlist": false, "watched": true }]`;
  const catalog = new FakeCatalog();
  catalog.movies.push(movie(438631, "Dune", "2021"));
  const { library: s } = await universal(catalog, archive(), "seriesguide.json", json);
  assert.equal(movieStatusOf(s, 438631), "Watched");
  // Watched without a night: the file never had one.
  assert.equal(s.movieWatchedDates?.["438631"], undefined);
});

test("an old IMDb film lands as watched on its rating date", async () => {
  // The second iOS bug the Android spec flags: the C-style date didn't
  // parse, so the film landed on To Watch carrying a rating.
  const csv = trimIndent(`
    "position","const","created","modified","description","Title","Title type","Directors","You rated","IMDb Rating","Runtime (mins)","Year","Genres","Num. Votes","Release Date (month/day/year)","URL"
    "1","tt2872718","Sat Dec 31 00:00:00 2016","","","Nightcrawler","Feature Film","Dan Gilroy","8","7.9","117","2014","crime","311885","2014-09-05","http://www.imdb.com/title/tt2872718/"
  `);
  const catalog = new FakeCatalog();
  catalog.imdb.set("tt2872718", movie(242582, "Nightcrawler", "2014"));
  const { library: s } = await universal(catalog, archive(), "ratings.csv", csv);
  assert.equal(movieStatusOf(s, 242582), "Watched");
  assert.equal(s.movieWatchedDates?.["242582"], "2016-12-31T00:00:00Z");
  assert.equal(s.ratings?.["movie:242582"], 8);
  assert.deepEqual(catalog.asked, ["imdb:tt2872718"]);
});

test("a file with no rows fails naming its files", async () => {
  await assert.rejects(
    runUniversalImport([{ name: "notes.csv", data: bytes("runtime,genres\n142,Drama") }], deps(new FakeCatalog(), archive())),
    (e: unknown) => {
      assert.ok(e instanceof NothingReadable);
      assert.deepEqual(e.files, [{ name: "notes.csv", format: null, rows: 0 }]);
      return true;
    },
  );
});

// ---- The status tables, which iOS never tested ----

test("show status words read as iOS reads them", () => {
  const status = (word: string | null, started = false) =>
    showStatus([
      importedEntry({ title: "x", status: word }),
      ...(started ? [importedEntry({ title: "x", season: 1, episode: 1, watchedAt: NOW })] : []),
    ]);
  assert.equal(status("dropped"), "Dropped");
  assert.equal(status("stopped"), "Dropped");
  assert.equal(status("stopwatching"), "Dropped");
  assert.equal(status("on_hold"), "Stopped");
  assert.equal(status("paused"), "Stopped");
  assert.equal(status("plan to watch"), "Watching");
  assert.equal(status("plan to watch", true), "Stopped");
  assert.equal(status("completed"), "Watching");
  assert.equal(status(null), "Watching");
});

test("film status words read as iOS reads them", () => {
  const status = (word: string | null) => movieStatus([importedEntry({ title: "x", status: word })], false);
  assert.equal(status("completed"), "Watched");
  assert.equal(status("watched"), "Watched");
  assert.equal(status("watchlist"), "To Watch");
  assert.equal(status("hold"), "On Hold");
  assert.equal(status("dropped"), "Dropped");
  assert.equal(status(null), "To Watch");
  assert.equal(movieStatus([], true), "Watched");
});

// ---- TV Time ----

test("the TV Time sample imports and a second run changes nothing", async () => {
  const sample = tvTimeSample();
  if (!sample) throw new Skip("No TV Time sample on this machine");
  const catalog = new FakeCatalog();
  catalog.tvdb.set(81189, show(1396, "Breaking Bad"));
  catalog.tvdb.set(73244, show(2316, "The Office"));
  catalog.tvdb.set(383203, show(97546, "Ted Lasso"));
  catalog.tvdb.set(371980, show(95396, "Severance"));
  catalog.movies.push(movie(27205, "Inception", "2010"), movie(496243, "Parasite", "2019"), movie(603, "The Matrix", "1999"));
  const episodes = new FakeEpisodes();
  const { result, library: s } = await tvTime(catalog, archive(), sample.name, sample.data, episodes);

  assert.equal(result.showsAdded, 4);
  assert.equal(result.episodesAdded, 9);
  assert.equal(result.moviesAdded, 3);
  assert.deepEqual(result.unmatchedShows, ["The Mandalorian"]);
  assert.deepEqual(result.unmatchedMovies, ["Dune"]);
  assert.equal(result.episodesWithoutNumbers, 1);
  assert.equal(showStatusOf(s, 97546), "Stopped");
  assert.equal(showStatusOf(s, 95396), "Watching");
  assert.equal(s.watchedDates?.["1396-1-1"], "2022-03-10T20:30:00Z");
  assert.equal(movieStatusOf(s, 603), "Watched");

  const again = await tvTime(catalog, s, sample.name, sample.data, episodes);
  assert.equal(again.result.showsAdded, 0);
  assert.equal(again.result.showsAlreadyTracked, 4);
  assert.equal(again.result.episodesAdded, 0);
  assert.equal(again.result.moviesAlreadyTracked, 3);
  assert.deepEqual(new Set(again.library.watched), new Set(s.watched));
  assert.deepEqual(
    again.library.shows.map((t) => [t.show.id, t.status]),
    s.shows.map((t) => [t.show.id, t.status]),
  );
});

test("a TV Time favourite and a rating land on new titles only", async () => {
  const csv = trimIndent(`
    tv_show_id,tv_show_name,active,archived,is_favorited
    305288,Stranger Things,1,0,1
  `);
  const catalog = new FakeCatalog();
  catalog.tvdb.set(305288, show(66732, "Stranger Things"));
  const { library: s } = await tvTime(catalog, archive(), "followed_tv_show.csv", bytes(csv));
  // A followed show with nothing watched lands, but nothing "landed" by iOS's
  // measure until it adds a show — which it does here.
  assert.ok(s.shows.some((t) => t.show.id === 66732));
  assert.equal(s.reactions?.["show:66732"], "loved");
  assert.ok(!(s.hiddenShows ?? []).includes(66732));
});

void run("import-run.test.ts");
