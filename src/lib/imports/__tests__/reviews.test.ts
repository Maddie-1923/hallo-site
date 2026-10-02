import assert from "node:assert/strict";
import { zipSync } from "fflate";
import type { LibraryArchive, Review } from "../../archive";
import { applyImportPlan } from "../apply";
import { jsonEntries, recogniseJsonFormat } from "../json";
import { mergeArchives } from "../merge";
import { recognisePreset } from "../presets";
import { chooseImportRoute } from "../route";
import { cleanArchiveReviews, cleanReviewText, combineReviews, REVIEW_LIMIT, type ImportedReview } from "../reviews";
import { ImportTable } from "../table";
import { readTvTime } from "../tvtime-reader";
import { runTvTimeImport } from "../tvtime";
import type { ImportDeps, ImportFile } from "../types";
import { runUniversalImport } from "../universal";
import { archive, bytes, day, FakeCatalog, FakeEpisodes, movie, NOW, nowText, run, show, test, trackedMovie, trimIndent } from "./harness";

// Reviews kept, merged and imported — docs/reviews-import.md, section 4: the
// archive keeps `reviews` and `importedAt` through a round trip and a merge,
// the text is cleaned, each of the three readers finds its reviews, several
// texts for one title become one review, and a title already reviewed here
// keeps its own.

const zip = (...entries: [string, string][]) => zipSync(Object.fromEntries(entries.map(([name, body]) => [name, bytes(body)])));

const deps = (catalog: FakeCatalog, library: LibraryArchive): ImportDeps => ({ catalog, episodes: new FakeEpisodes(), library, now: () => NOW });

async function universal(catalog: FakeCatalog, library: LibraryArchive, files: ImportFile[]) {
  const out = await runUniversalImport(files, deps(catalog, library));
  return { result: out.result, plan: out.plan, library: applyImportPlan(library, out.plan, NOW) };
}

async function tvTime(catalog: FakeCatalog, library: LibraryArchive, files: ImportFile[]) {
  const out = await runTvTimeImport(files, deps(catalog, library));
  return { result: out.result, library: applyImportPlan(library, out.plan, NOW) };
}

const review = (text: string, modified: string, more: Partial<Review> = {}): Review => ({ text, modified, ...more });

// ---- The archive ----

test("reviews and importedAt survive a round trip and a merge", () => {
  const reviews = { "movie:1": review("Mine.", day(-3), { watchedOn: "2026-07-30", spoilers: true, source: "letterboxd" }) };
  const library = archive({ reviews, importedAt: day(-1) });
  const back = JSON.parse(JSON.stringify(library)) as LibraryArchive;
  assert.deepEqual(back.reviews, reviews);
  assert.equal(back.importedAt, day(-1));

  const merged = mergeArchives(archive({ device: "Phone" }), back, NOW);
  assert.deepEqual(merged.reviews, reviews);
  assert.equal(merged.importedAt, day(-1));
});

test("a merge keeps the later importedAt, from either side", () => {
  const older = archive({ importedAt: day(-5) });
  const newer = archive({ importedAt: day(-1) });
  assert.equal(mergeArchives(older, newer, NOW).importedAt, day(-1));
  assert.equal(mergeArchives(newer, older, NOW).importedAt, day(-1));
  assert.equal(mergeArchives(archive(), archive(), NOW).importedAt, undefined);
  assert.ok(!("importedAt" in mergeArchives(archive(), archive(), NOW)));
});

test("a merge keeps the later review of a title, the incoming one on a tie", () => {
  const mine = archive({ reviews: { "movie:1": review("Newer.", day(-1)), "movie:2": review("Incoming.", day(-2)) } });
  const theirs = archive({ reviews: { "movie:1": review("Older.", day(-3)), "movie:2": review("Here.", day(-2)), "show:3": review("Only here.", day(-9)) } });
  const out = mergeArchives(mine, theirs, NOW).reviews!;
  assert.equal(out["movie:1"].text, "Newer.");
  assert.equal(out["movie:2"].text, "Incoming.");
  assert.equal(out["show:3"].text, "Only here.");
});

test("every import stamps importedAt, a plan with nothing new included", () => {
  const out = applyImportPlan(archive({ importedAt: day(-30) }), { archive: archive({ device: "Import" }), ratings: {}, loved: [] }, NOW);
  assert.equal(out.importedAt, nowText);
});

test("a plan bringing only reviews still lands them", () => {
  const plan = { archive: archive({ device: "Import", reviews: { "movie:1": review("Imported.", day(-400), { source: "trakt" }) } }), ratings: {}, loved: [] };
  const out = applyImportPlan(archive(), plan, NOW);
  assert.equal(out.reviews?.["movie:1"].text, "Imported.");
  assert.equal(out.importedAt, nowText);
});

test("reviews from the browser are checked before they're saved", () => {
  const out = cleanArchiveReviews({
    "movie:1": { text: "  Fine.  ", modified: "2026-01-02T03:04:05.250Z", spoilers: true, rewatch: "yes", watchedOn: "yesterday", source: 7, extra: "dropped" },
    "movie:2": { text: "x".repeat(REVIEW_LIMIT + 50), modified: nowText },
    "movie:3": { text: "No date." },
    "movie:4": { text: "   ", modified: nowText },
    "user:5": { text: "Wrong key.", modified: nowText },
    "show:6": "not a review",
  })!;
  assert.deepEqual(Object.keys(out), ["movie:1", "movie:2"]);
  assert.deepEqual(out["movie:1"], { text: "Fine.", spoilers: true, modified: "2026-01-02T03:04:05Z" });
  assert.equal(out["movie:2"].text.length, REVIEW_LIMIT);
  assert.equal(cleanArchiveReviews(undefined), undefined);
});

// ---- Cleaning the text ----

test("reviews come out as plain text", () => {
  assert.deepEqual(cleanReviewText("<p>One &amp; two.</p><p>Three<br />four &#8212; &#x2014; &quot;five&quot; &#39;six&#39;</p>"), {
    text: "One & two.\n\nThree\nfour — — \"five\" 'six'",
    spoilers: false,
  });
  // Entities are decoded after the tags go, so written-out markup stays text.
  assert.equal(cleanReviewText("Use &lt;b&gt; for <b>bold</b>, and a < b > c.").text, "Use <b> for bold, and a < b > c.");
  assert.equal(cleanReviewText("One\r\n\r\n\r\n\r\nTwo   \n\n\n\nThree").text, "One\n\nTwo\n\nThree");
  assert.equal(cleanReviewText("  <p></p> &nbsp; ").text, "");
});

test("a spoiler tag goes, its contents stay, and the review is marked", () => {
  assert.deepEqual(cleanReviewText("Good. [spoiler]He dies.[/spoiler] Very good."), { text: "Good. He dies. Very good.", spoilers: true });
  assert.equal(cleanReviewText("[SPOILER]x[/Spoiler]").spoilers, true);
});

// ---- Several texts for one title ----

const imported = (text: string, writtenAt: string | null, more: Partial<ImportedReview> = {}): ImportedReview => ({
  text, writtenAt: writtenAt === null ? null : new Date(writtenAt), spoilers: false, rewatch: false, source: "tvtime", ...more,
});

test("several texts for one title become one review, oldest first", () => {
  const out = combineReviews(
    [
      { review: imported("Second.", "2024-02-01T10:00:00Z", { rewatch: true }), watchedAt: new Date("2024-01-31T00:00:00Z") },
      { review: imported("First.", "2023-01-01T10:00:00Z", { spoilers: true }), watchedAt: new Date("2022-12-31T00:00:00Z") },
      { review: imported("First.", "2023-06-01T10:00:00Z"), watchedAt: null },
    ],
    nowText,
  );
  assert.deepEqual(out, { text: "First.\n\nSecond.", watchedOn: "2024-01-31", rewatch: true, spoilers: true, modified: "2024-02-01T10:00:00Z", source: "tvtime" });
});

test("an undated review is dated by the import, and a long thread is cut", () => {
  const out = combineReviews([{ review: imported("a".repeat(6000), null), watchedAt: null }, { review: imported("b".repeat(6000), null), watchedAt: null }], nowText);
  assert.equal(out.modified, nowText);
  assert.equal(out.text.length, REVIEW_LIMIT);
  assert.ok(out.text.startsWith("aaa") && out.text.endsWith("bbb"));
  assert.equal(out.watchedOn, undefined);
});

// ---- Letterboxd ----

const LETTERBOXD_HEADER = "Date,Name,Year,Letterboxd URI,Rating,Rewatch,Review,Tags,Watched Date";

const letterboxdReviews = [
  LETTERBOXD_HEADER,
  `2024-03-02,Past Lives,2023,https://boxd.it/a,4.5,Yes,"<p>It stays with you.</p>`,
  `<p>Days later &amp; still <i>thinking</i> about ""In-Yun"".</p>",,2024-03-01`,
  `2023-08-10,Aftersun,2022,https://boxd.it/b,5,,Quietly devastating.,,2023-08-09`,
  `2023-09-10,Aftersun,2022,https://boxd.it/b,5,Yes,Even more so the second time.,,2023-09-09`,
].join("\n");

test("Letterboxd's reviews.csv brings its reviews, and nothing from deleted or other people's files", async () => {
  const catalog = new FakeCatalog();
  catalog.movies.push(movie(1, "Past Lives"), movie(2, "Aftersun"), movie(3, "Gone Film"), movie(4, "Their Film"));
  // Aftersun is already here: it gains its review all the same.
  const library = archive({ movies: [trackedMovie(2, "Aftersun", "Watched")] });
  const data = zip(
    ["reviews.csv", letterboxdReviews],
    ["deleted/reviews.csv", `${LETTERBOXD_HEADER}\n2022-01-01,Gone Film,2020,https://boxd.it/c,3,,Deleted review.,,2021-12-31`],
    ["likes/reviews.csv", `${LETTERBOXD_HEADER}\n2022-01-01,Their Film,2020,https://boxd.it/d,3,,Somebody else's.,,2021-12-31`],
    ["comments.csv", "Date,Content,Comment,Letterboxd URI\n2022-01-01,Their Film,Nice one!,https://boxd.it/e"],
  );
  const { result, library: s } = await universal(catalog, library, [{ name: "letterboxd-export.zip", data }]);

  assert.equal(result.moviesAdded, 1);
  assert.equal(result.moviesAlreadyTracked, 1);
  assert.equal(result.reviewsAdded, 2);
  assert.equal(result.reviewsKept, 0);
  assert.deepEqual(s.movies.map((m) => m.movie.id).sort(), [1, 2]);
  assert.deepEqual(Object.keys(s.reviews ?? {}).sort(), ["movie:1", "movie:2"]);
  assert.deepEqual(s.reviews!["movie:1"], {
    text: "It stays with you.\n\nDays later & still thinking about \"In-Yun\".",
    watchedOn: "2024-03-01",
    rewatch: true,
    modified: "2024-03-02T00:00:00Z",
    source: "letterboxd",
  });
  // A film reviewed twice: both, oldest first, dated by the second.
  assert.deepEqual(s.reviews!["movie:2"], {
    text: "Quietly devastating.\n\nEven more so the second time.",
    watchedOn: "2023-09-09",
    rewatch: true,
    modified: "2023-09-10T00:00:00Z",
    source: "letterboxd",
  });
});

test("likes/reviews.csv isn't taken for the diary", () => {
  const table = ImportTable.read(bytes(`${LETTERBOXD_HEADER}\n2022-01-01,Their Film,2020,https://boxd.it/d,3,,Theirs.,,2021-12-31`))!;
  assert.equal(recognisePreset("reviews.csv", table)?.id, "letterboxd.diary");
  assert.equal(recognisePreset("likes/reviews.csv", table), null);
  assert.equal(recognisePreset("deleted/reviews.csv", table), null);
});

// ---- Trakt ----

const BARRY = `"show": {"title": "Barry", "year": 2018, "ids": {"trakt": 1, "tmdb": 1437}}`;
const HEAT = `"movie": {"title": "Heat", "year": 1995, "ids": {"trakt": 1, "imdb": "tt0113277", "tmdb": 949}}`;

const traktFiles = (): ImportFile[] => [
  {
    name: "trakt-export.zip",
    data: zip(
      ["comments-movies.json", trimIndent(`
        [{"type": "movie", ${HEAT},
          "comment": {"id": 1, "comment": "The diner scene. [spoiler]Nobody walks away.[/spoiler]", "spoiler": false, "review": false, "parent_id": 0, "created_at": "2020-05-01T10:00:00.000Z"}},
         {"type": "movie", ${HEAT},
          "comment": {"id": 2, "comment": "Agreed with you there.", "spoiler": false, "review": false, "parent_id": 55, "created_at": "2020-05-02T10:00:00.000Z"}}]
      `)],
      ["comments-seasons.json", trimIndent(`
        [{"type": "season", "season": {"number": 2, "ids": {"trakt": 5}}, ${BARRY},
          "comment": {"id": 3, "comment": "The best of it.", "spoiler": true, "review": false, "parent_id": 0, "created_at": "2021-01-01T00:00:00.000Z"}}]
      `)],
      ["comments-episodes.json", trimIndent(`
        [{"type": "episode", "episode": {"season": 1, "number": 2, "title": "Chapter Two", "ids": {"tmdb": 1}}, ${BARRY},
          "comment": {"id": 4, "comment": "<p>That ending.</p>", "spoiler": false, "review": false, "parent_id": 0, "created_at": "2021-02-01T00:00:00.000Z"}}]
      `)],
      ["comments-lists.json", `[{"type": "list", "list": {"name": "Favourites", "ids": {"trakt": 3}}, "comment": {"id": 5, "comment": "My list.", "parent_id": 0}}]`],
    ),
  },
];

test("Trakt comments are read as reviews, replies left out", () => {
  const data = bytes(`[{"type": "movie", ${HEAT}, "comment": {"comment": "Mine.", "parent_id": 0, "created_at": "2020-05-01T10:00:00.000Z"}},
    {"type": "movie", ${HEAT}, "comment": {"comment": "A reply.", "parent_id": 9}}]`);
  assert.equal(recogniseJsonFormat(data), "Trakt");
  const entries = jsonEntries("Trakt", data);
  assert.equal(entries.length, 1);
  assert.equal(entries[0].tmdbID, 949);
  assert.equal(entries[0].reviewOnly, true);
  assert.equal(entries[0].watchedAt, null);
  assert.equal(entries[0].review?.text, "Mine.");
  assert.equal(entries[0].review?.source, "trakt");
});

test("Trakt comments land as reviews and add nothing else", async () => {
  const catalog = new FakeCatalog();
  catalog.movies.push(movie(949, "Heat"));
  catalog.shows.push(show(1437, "Barry"));
  const { result, library: s } = await universal(catalog, archive(), traktFiles());

  assert.equal(result.reviewsAdded, 3);
  assert.equal(result.moviesAdded + result.showsAdded + result.episodesAdded + result.moviesAlreadyTracked + result.showsAlreadyTracked, 0);
  assert.equal(s.movies.length + s.shows.length + s.watched.length, 0);
  assert.deepEqual(s.reviews, {
    "episode:1437-1-2": { text: "That ending.", modified: "2021-02-01T00:00:00Z", source: "trakt" },
    "movie:949": { text: "The diner scene. Nobody walks away.", spoilers: true, modified: "2020-05-01T10:00:00Z", source: "trakt" },
    // A season's comment, on the show, saying which season.
    "show:1437": { text: "Season 2: The best of it.", spoilers: true, modified: "2021-01-01T00:00:00Z", source: "trakt" },
  });
});

// ---- Never overwriting ----

test("a title already reviewed here keeps its review, and a second run changes nothing", async () => {
  const catalog = new FakeCatalog();
  catalog.movies.push(movie(949, "Heat"));
  catalog.shows.push(show(1437, "Barry"));
  const mine = review("My own words.", day(-2000));
  const first = await universal(catalog, archive({ reviews: { "movie:949": mine } }), traktFiles());
  assert.equal(first.result.reviewsAdded, 2);
  assert.equal(first.result.reviewsKept, 1);
  assert.deepEqual(first.library.reviews!["movie:949"], mine);

  const again = await universal(catalog, first.library, traktFiles());
  assert.equal(again.result.reviewsAdded, 0);
  assert.equal(again.result.reviewsKept, 3);
  assert.equal(again.plan.archive.reviews, undefined);
  assert.deepEqual(again.library.reviews, first.library.reviews);
});

// ---- TV Time ----

const tvTimeExport = () =>
  zip(
    ["tracking-prod-records.csv", "series_name,s_id,season_number,episode_number,created_at\nBreaking Bad,81189,1,1,2022-03-10 20:30:00"],
    ["episode_comment.csv", trimIndent(`
      tv_show_id,tv_show_name,episode_season_number,episode_number,comment,created_at,spoiler_count
      81189,Breaking Bad,1,1,"Chemistry teacher, huh.",2022-03-11 09:00:00,0
      81189,Breaking Bad,1,1,Still great the second time.,2023-01-02 10:00:00,2
    `)],
    ["show_comment.csv", trimIndent(`
      tv_show_id,tv_show_name,comment,created_at,spoiler_count
      81189,Breaking Bad,<b>Best</b> show &amp; then some,2022-05-01 12:00:00,0
      999,Never Tracked,A show I only talked about.,2022-06-01 12:00:00,0
    `)],
    ["comments-prod-comments.csv", trimIndent(`
      text,type,entity_type,series_id,series_name,movie_name,season_number,episode_number,created_at,is_spoiler,likes_count
      Loved it.,comment,movie,,,Inception,,,2021-01-01 10:00:00,true,3
      Liked this one.,like,episode,81189,Breaking Bad,,1,2,2021-01-01 10:00:00,false,0
    `)],
  );

test("TV Time's comment files are read as comments, never as history", () => {
  const exported = readTvTime(tvTimeExport(), "tvtime.zip");
  const shows = new Map(exported.shows.map((s) => [s.title, s]));
  const bb = shows.get("Breaking Bad")!;
  // The one watch from the tracking file; the comment dates aren't nights.
  assert.equal(bb.episodes.length, 1);
  assert.equal(bb.onlyCommented, false);
  assert.deepEqual(bb.comments.map((c) => [c.season, c.number, c.review.text, c.review.spoilers]), [
    [1, 1, "Chemistry teacher, huh.", false],
    [1, 1, "Still great the second time.", true],
    [null, null, "Best show & then some", false],
  ]);
  assert.equal(shows.get("Never Tracked")!.onlyCommented, true);
  assert.equal(shows.get("Never Tracked")!.tvdbID, 999);
  const inception = exported.movies.find((m) => m.title === "Inception")!;
  assert.equal(inception.onlyCommented, true);
  assert.equal(inception.comments[0].spoilers, true);
  assert.ok(exported.diagnostics.filesRead.includes("episode_comment.csv"));
  // Reported, as every column the reader doesn't know is.
  assert.ok(exported.diagnostics.unrecognisedHeaders.includes("likescount"));
});

test("TV Time comments land as reviews on episodes, shows and films", async () => {
  const catalog = new FakeCatalog();
  const breakingBad = show(10, "Breaking Bad");
  const neverTracked = show(20, "Never Tracked");
  catalog.shows.push(breakingBad, neverTracked);
  catalog.tvdb.set(81189, breakingBad);
  catalog.tvdb.set(999, neverTracked);
  catalog.movies.push(movie(5, "Inception"));
  const { result, library: s } = await tvTime(catalog, archive(), [{ name: "tvtime.zip", data: tvTimeExport() }]);

  assert.equal(result.showsAdded, 1);
  assert.equal(result.moviesAdded, 0);
  assert.equal(result.reviewsAdded, 4);
  assert.deepEqual(s.shows.map((t) => t.show.id), [10]);
  assert.deepEqual(s.watched, ["10-1-1"]);
  assert.deepEqual(s.reviews, {
    // A thread on one episode, joined.
    "episode:10-1-1": { text: "Chemistry teacher, huh.\n\nStill great the second time.", spoilers: true, modified: "2023-01-02T10:00:00Z", source: "tvtime" },
    "movie:5": { text: "Loved it.", spoilers: true, modified: "2021-01-01T10:00:00Z", source: "tvtime" },
    "show:10": { text: "Best show & then some", modified: "2022-05-01T12:00:00Z", source: "tvtime" },
    "show:20": { text: "A show I only talked about.", modified: "2022-06-01T12:00:00Z", source: "tvtime" },
  });
  assert.equal(s.importedAt, nowText);

  const again = await tvTime(catalog, s, [{ name: "tvtime.zip", data: tvTimeExport() }]);
  assert.equal(again.result.reviewsAdded, 0);
  assert.equal(again.result.reviewsKept, 4);
  assert.deepEqual(again.library.reviews, s.reviews);
});

// ---- Which reader ----

test("comment files don't change which reader an export goes to", () => {
  const letterboxd = zip(["reviews.csv", letterboxdReviews], ["comments.csv", "Date,Content,Comment\n2022-01-01,https://boxd.it/e,Nice one!"]);
  assert.equal(chooseImportRoute([{ name: "letterboxd.zip", data: letterboxd }]).kind, "universal");
  assert.equal(chooseImportRoute(traktFiles()).kind, "universal");
  assert.equal(chooseImportRoute([{ name: "tvtime.zip", data: tvTimeExport() }]).kind, "tvtime");
  // TV Time's comment files on their own are still TV Time's.
  const onlyComments = zip(["show_comment.csv", "tv_show_id,tv_show_name,comment,created_at,spoiler_count\n999,Never Tracked,Words.,2022-06-01 12:00:00,0"]);
  assert.equal(chooseImportRoute([{ name: "tvtime.zip", data: onlyComments }]).kind, "tvtime");
});

void run("reviews.test.ts");
