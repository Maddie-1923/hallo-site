import assert from "node:assert/strict";
import { zipSync } from "fflate";
import type { LibraryArchive } from "../../archive";
import { applyImportPlan } from "../apply";
import { cleanArchiveMoods, readMoodTags } from "../moods";
import { recognisePreset } from "../presets";
import { cleanArchiveNotes } from "../reviews";
import { ImportTable } from "../table";
import type { ImportDeps, ImportFile } from "../types";
import { describeImportFile, runUniversalImport } from "../universal";
import { archive, bytes, FakeCatalog, FakeEpisodes, movie, NOW, nowText, run, show, test, trackedMovie, trimIndent } from "./harness";

// Reviews, notes and moods from more places — docs/reviews-import.md,
// section 5: Refract's reviews (a private one becoming a note) and vibes,
// Bingers' emotions, any file with review, note, spoiler and mood columns,
// and a title's own note and moods never overwritten.

const zip = (...entries: [string, string][]) => zipSync(Object.fromEntries(entries.map(([name, body]) => [name, bytes(body)])));

const deps = (catalog: FakeCatalog, library: LibraryArchive): ImportDeps => ({ catalog, episodes: new FakeEpisodes(), library, now: () => NOW });

async function universal(catalog: FakeCatalog, library: LibraryArchive, files: ImportFile[]) {
  const out = await runUniversalImport(files, deps(catalog, library));
  return { result: out.result, plan: out.plan, library: applyImportPlan(library, out.plan, NOW) };
}

// ---- Moods ----

test("tags are matched by what they say, in words or emoji", () => {
  assert.deepEqual(readMoodTags("Loved it, ON EDGE; mind-blown | let down / Cried"), { moods: ["lovedIt", "onEdge", "shocked", "disappointed", "sad"], unknown: 0 });
  assert.deepEqual(readMoodTags("😍😭, ❤️, 🤯"), { moods: ["lovedIt", "sad", "shocked"], unknown: 0 });
  assert.deepEqual(readMoodTags("😵‍💫 / 🔥 / 😱(shock)"), { moods: ["confused", "hot", "shocked"], unknown: 0 });
  // The raw values themselves, as a Kodigo file would hold them.
  assert.deepEqual(readMoodTags("hatedIt,likedIt,boring,frustrated,scared"), { moods: ["hatedIt", "likedIt", "boring", "frustrated", "scared"], unknown: 0 });
  assert.deepEqual(readMoodTags("cozy, sad, sad, 🍕"), { moods: ["sad"], unknown: 2 });
  assert.deepEqual(readMoodTags(""), { moods: [], unknown: 0 });
});

test("moods from the browser are checked before they're saved", () => {
  assert.deepEqual(
    cleanArchiveMoods({ "movie:1": ["sad", "nope", "sad", "hot", "scared", "boring"], "show:2": ["cozy"], "user:3": ["sad"], "episode:4-1-2": "sad" }),
    { "movie:1": ["sad", "hot", "scared"] },
  );
  assert.equal(cleanArchiveMoods(null), undefined);
  assert.deepEqual(cleanArchiveNotes({ "movie:1": "  Mine.  ", "movie:2": "   ", "list:3": "No.", "show:4": 5, "episode:5-1-1": "x".repeat(10_050) }), {
    "movie:1": "Mine.",
    "episode:5-1-1": "x".repeat(10_000),
  });
});

// ---- Refract ----

const REVIEWS_HEADER = "title,year,media_type,tmdb_id,target_type,target_id,season,episode,body,is_spoiler,visibility,source,imported,created_at,edited_at";
const VIBES_HEADER = "title,year,media_type,tmdb_id,target_type,target_id,mood_tags,created_at,updated_at";

const refractReviews = [
  REVIEWS_HEADER,
  `Heat,1995,movie,949,movie,aaa,,,"<p>The diner scene.</p>",false,public,refract,false,2024-01-01T10:00:00.000Z,2024-01-03T10:00:00.000Z`,
  `Barry,2018,tv,1437,episode,bbb,1,2,"That ending.`,
  `Still thinking about it.",true,followers,refract,false,2024-02-01T10:00:00.000Z,`,
  `Barry,2018,tv,1437,show,ccc,,,Only for me.,false,private,refract,false,2024-03-01T10:00:00.000Z,`,
  `Barry,2018,tv,1437,season,ddd,2,,The best of it.,false,,refract,false,2024-04-01T10:00:00.000Z,`,
].join("\n");

const refractVibes = [
  VIBES_HEADER,
  `Heat,1995,movie,949,movie,aaa,"tense, cozy, mind-blown, 😍, sad",2024-01-01T10:00:00.000Z,`,
  `Barry,2018,tv,1437,episode,bbb,,2024-01-01T10:00:00.000Z,`,
  `Arrival,2016,movie,329865,movie,eee,"cozy",2024-01-01T10:00:00.000Z,`,
].join("\n");

const refractCatalog = () => {
  const catalog = new FakeCatalog();
  catalog.movies.push(movie(949, "Heat"), movie(329865, "Arrival"));
  catalog.shows.push(show(1437, "Barry"));
  return catalog;
};

test("Refract's reviews, vibes and comments are recognised", () => {
  const table = (text: string) => ImportTable.read(bytes(text))!;
  assert.equal(recognisePreset("readable/reviews.csv", table(REVIEWS_HEADER))?.id, "refract.reviews");
  assert.equal(recognisePreset("readable/vibes.csv", table(VIBES_HEADER))?.id, "refract.vibes");
  assert.equal(recognisePreset("readable/comments.csv", table("target_type,target_id,body,is_spoiler,created_at,edited_at"))?.id, "refract.comments");
  // Its ratings carry mood_tags and a target_type too, and stay ratings.
  assert.equal(
    recognisePreset("readable/ratings.csv", table("title,year,media_type,tmdb_id,target_type,target_id,season,episode,value,visibility,mood_tags,watch_context,completed_on,source,imported,created_at"))?.id,
    "refract.ratings",
  );
});

test("Refract reviews land on films, episodes and shows; a private one is a note", async () => {
  const { result, plan, library: s } = await universal(refractCatalog(), archive(), [{ name: "refract.zip", data: zip(["readable/reviews.csv", refractReviews]) }]);
  assert.equal(result.reviewsAdded, 3);
  assert.equal(result.notesAdded, 1);
  // A review says nothing about watching: nothing is added or ticked.
  assert.equal(s.movies.length + s.shows.length + s.watched.length, 0);
  assert.deepEqual(s.reviews, {
    // Dated by the edit, which came later.
    "movie:949": { text: "The diner scene.", modified: "2024-01-03T10:00:00Z", source: "refract" },
    "episode:1437-1-2": { text: "That ending.\nStill thinking about it.", spoilers: true, modified: "2024-02-01T10:00:00Z", source: "refract" },
    "show:1437": { text: "Season 2: The best of it.", modified: "2024-04-01T10:00:00Z", source: "refract" },
  });
  assert.deepEqual(plan.notes, { "show:1437": "Only for me." });
  assert.deepEqual(s.notes, { "show:1437": "Only for me." });
  assert.equal(plan.archive.notes, undefined);
});

test("Refract vibes become moods: unknown tags skipped, three at most, and Loved it brings the heart", async () => {
  const { result, library: s } = await universal(refractCatalog(), archive(), [{ name: "refract.zip", data: zip(["readable/vibes.csv", refractVibes]) }]);
  // Arrival's only tag means nothing here, and Barry's row has none.
  assert.equal(result.moodsAdded, 1);
  assert.deepEqual(s.moods, { "movie:949": ["onEdge", "shocked", "lovedIt"] });
  assert.equal(s.reactions?.["movie:949"], "loved");
  assert.equal(s.movies.length, 0);
});

test("Refract's JSON Lines are read only where the CSV is missing", () => {
  const line = (body: string) => JSON.stringify({ item: { title: "Heat", year: 1995, mediaType: "movie", tmdbId: 949 }, targetType: "movie", seasonNumber: null, episodeNumber: null, body, isSpoiler: false, visibility: "public", createdAt: "2024-01-01T10:00:00.000Z" });
  const vibe = JSON.stringify({ item: { title: "Barry", mediaType: "tv", tmdbId: 1437 }, targetType: "episode", seasonNumber: 1, episodeNumber: 2, moodTags: ["scary", "weird"] });
  const both = describeImportFile({ name: "refract.zip", data: zip(["data/reviews.jsonl", line("From the data.")], ["readable/reviews.csv", refractReviews]) });
  assert.deepEqual(both.map((p) => p.name), ["readable/reviews.csv"]);

  const onlyData = describeImportFile({ name: "refract.zip", data: zip(["data/reviews.jsonl", `${line("From the data.")}\n\n${line("Again.")}\n`], ["data/vibes.jsonl", vibe]) });
  assert.deepEqual(onlyData.map((p) => [p.name, p.format, p.entries.length]), [["data/reviews.jsonl", "Refract reviews", 2], ["data/vibes.jsonl", "Refract vibes", 1]]);
  const [first] = onlyData[0].entries;
  assert.equal(first.tmdbID, 949);
  assert.equal(first.kind, "movies");
  assert.equal(first.review?.text, "From the data.");
  const [barry] = onlyData[1].entries;
  assert.deepEqual([barry.tmdbID, barry.season, barry.episode, barry.moods], [1437, 1, 2, ["scared", "confused"]]);
});

// ---- Bingers ----

test("Bingers emotions become moods on the title or episode they were given", async () => {
  const catalog = new FakeCatalog();
  catalog.shows.push(show(66732, "Stranger Things"));
  catalog.movies.push(movie(675, "Order of the Phoenix"));
  const ratings = trimIndent(`
    type,title,tvdb_id,tmdb_id,season_number,episode_number,rating,favorite_character,emotions
    episode,Stranger Things,305288,66732,1,3,4,Hopper,"Scared, 😭"
    movie,Order of the Phoenix,,675,,,5,Luna,Loved it
    show,Stranger Things,305288,66732,,,3,Eleven,
  `);
  const { result, plan, library: s } = await universal(catalog, archive(), [{ name: "bingers.zip", data: zip(["ratings.csv", ratings]) }]);
  assert.equal(result.moodsAdded, 2);
  assert.deepEqual(s.moods, { "episode:66732-1-3": ["scared", "sad"], "movie:675": ["lovedIt"] });
  // Rated rows still rate and add, as before.
  assert.equal(plan.ratings["movie:675"], 10);
  assert.equal(s.reactions?.["movie:675"], "loved");
  assert.deepEqual(s.movies.map((m) => m.movie.id), [675]);
});

// ---- Any other file ----

const generic = trimIndent(`
  Title,Year,Type,Watched Date,Review,Notes,Spoiler,Mood
  Heat,1995,movie,2023-05-01,"Great <b>heist</b>.",Rewatch with Dad,yes,"tense, wow"
  Arrival,2016,movie,,Quietly enormous.,,no,sad
  Barry,2018,show,,,Season 3 dragged.,,
`);

test("a file nobody recognised brings its review, note, spoiler and mood columns", async () => {
  const { result, plan, library: s } = await universal(refractCatalog(), archive(), [{ name: "my-films.csv", data: bytes(generic) }]);
  assert.equal(result.reviewsAdded, 2);
  assert.equal(result.notesAdded, 2);
  assert.equal(result.moodsAdded, 2);
  assert.deepEqual(s.reviews, {
    "movie:949": { text: "Great heist.", watchedOn: "2023-05-01", spoilers: true, modified: nowText },
    "movie:329865": { text: "Quietly enormous.", modified: nowText },
  });
  assert.deepEqual(plan.notes, { "movie:949": "Rewatch with Dad", "show:1437": "Season 3 dragged." });
  assert.deepEqual(s.moods, { "movie:949": ["onEdge", "shocked"], "movie:329865": ["sad"] });
  // Heat has a watch date and is added; Arrival and Barry have only a take.
  assert.deepEqual(s.movies.map((m) => m.movie.id), [949]);
  assert.equal(s.shows.length, 0);
});

test("a tags column is read as moods only when every tag is one", () => {
  const read = (rows: string) => describeImportFile({ name: "list.csv", data: bytes(`Title,Year,Tags\n${rows}`) })[0].entries.map((e) => e.moods);
  assert.deepEqual(read("Heat,1995,scary\nArrival,2016,😭 / wow"), [["scared"], ["sad", "shocked"]]);
  assert.deepEqual(read("Heat,1995,scary\nArrival,2016,to rewatch"), [[], []]);
});

test("a list's note on an entry is the list's, never the title's note", () => {
  // Refract's list_items.csv, as in the real export, with entries in it.
  const refract = describeImportFile({
    name: "refract.zip",
    data: zip(["readable/list_items.csv", "list_id,list_title,title,year,media_type,tmdb_id,sort_order,note,added_at\nl1,Heists,Heat,1995,movie,949,1,The best one on here,2024-01-01T00:00:00Z"]),
  });
  assert.equal(refract[0].entries.length, 1);
  assert.equal(refract[0].entries[0].note, null);
  assert.equal(refract[0].entries[0].review, null);
  // Any file the guesser reads with a list column; its moods are still the title's.
  for (const header of ["list", "List Title", "list_id"]) {
    const [part] = describeImportFile({ name: "lists.csv", data: bytes(`${header},Title,Year,Notes,Review,Mood\nFavourites,Heat,1995,Top of the list,Ranked first,tense`) });
    assert.equal(part.format, null);
    assert.deepEqual(part.entries.map((e) => [e.note, e.review, e.moods]), [[null, null, ["onEdge"]]], header);
  }
});

// ---- Never overwriting ----

test("a title's own note and moods stand, and a second run changes nothing", async () => {
  const library = archive({ notes: { "movie:949": "My own note." }, moods: { "movie:949": ["boring"] }, reactions: { "movie:329865": "notForMe" } });
  const files = [{ name: "my-films.csv", data: bytes(generic) }];
  const first = await universal(refractCatalog(), library, files);
  assert.equal(first.result.notesAdded, 1);
  assert.equal(first.result.moodsAdded, 1);
  assert.equal(first.library.notes?.["movie:949"], "My own note.");
  assert.deepEqual(first.library.moods?.["movie:949"], ["boring"]);
  assert.equal(first.library.notes?.["show:1437"], "Season 3 dragged.");

  const again = await universal(refractCatalog(), first.library, files);
  assert.equal(again.result.notesAdded + again.result.moodsAdded + again.result.reviewsAdded, 0);
  assert.equal(again.plan.notes, undefined);
  assert.equal(again.plan.moods, undefined);
  assert.deepEqual(again.library.notes, first.library.notes);
  assert.deepEqual(again.library.moods, first.library.moods);
});

test("a plan's notes and moods fill gaps when it lands, whatever was there when it was made", () => {
  // Written here after the import read the library, before it landed.
  const library = archive({ notes: { "movie:1": "Written since." }, moods: { "movie:1": ["hot"] } });
  const plan = { archive: archive({ device: "Import" }), ratings: {}, loved: [], notes: { "movie:1": "Imported.", "movie:2": "New." }, moods: { "movie:1": ["sad"], "movie:2": ["sad"] } };
  const out = applyImportPlan(library, plan, NOW);
  assert.deepEqual(out.notes, { "movie:1": "Written since.", "movie:2": "New." });
  assert.deepEqual(out.moods, { "movie:1": ["hot"], "movie:2": ["sad"] });
  // A backup's own notes still merge as the app merges them.
  const backup = applyImportPlan(library, { archive: archive({ movies: [trackedMovie(5)], notes: { "movie:1": "From the backup." } }), ratings: {}, loved: [] }, NOW);
  assert.equal(backup.notes?.["movie:1"], "From the backup.");
});

void run("moods-notes.test.ts");
