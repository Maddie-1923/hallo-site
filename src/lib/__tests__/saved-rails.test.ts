import assert from "node:assert/strict";
import type { LibraryArchive } from "../archive";
import {
  applyCreateRails,
  applyDeleteRail,
  applyRenameRail,
  applySetRailFilter,
  cleanFilter,
  discoverQuery,
  emptyFilter,
  encodeFilter,
  orderedRails,
  RAIL_LIMIT,
  readFilter,
  suggestedName,
  type DiscoverFilter,
} from "../saved-rails";

// Custom categories as the apps keep them: the TMDB question a rail asks
// (TMDB.swift's discoverQuery), the name it starts with, and the JSON a new
// one is written as — the part that would stop the app opening the archive
// if it came out wrong.
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
const base = (extra: Partial<LibraryArchive> = {}): LibraryArchive => ({
  version: 12,
  exported: "2026-09-30T10:00:00Z",
  device: "test",
  shows: [],
  movies: [],
  watched: [],
  ...extra,
});
const filter = (patch: Partial<DiscoverFilter>): DiscoverFilter => ({ ...emptyFilter(), ...patch });
const STAMP = "2026-09-30T12:00:00Z";

test("a shows query mirrors discoverShows", () => {
  const f = filter({
    genreKeys: ["crime", "horror", "drama"],
    yearFrom: 2010,
    yearTo: 2019,
    providerIDs: [337, 8],
    providerNames: { "8": "Netflix", "337": "Disney Plus" },
    originCountry: "KR",
    originalLanguage: "ko",
    runtime: "medium",
    statuses: [0, 3],
    types: [4],
    ratingFrom: 6.5,
    ratingTo: 8,
    sort: "newest",
  });
  const { path, params } = discoverQuery(f, "Shows", "PH", 2);
  assert.equal(path, "/discover/tv");
  assert.deepEqual(params, {
    sort_by: "first_air_date.desc",
    "vote_average.gte": "6.5",
    "vote_average.lte": "8.0",
    "vote_count.gte": "200",
    with_watch_providers: "8|337",
    watch_region: "PH",
    with_origin_country: "KR",
    with_original_language: "ko",
    "with_runtime.gte": "30",
    "with_runtime.lte": "60",
    // Horror has no series id and drops out.
    with_genres: "80|18",
    with_status: "0|3",
    with_type: "4",
    "first_air_date.gte": "2010-01-01",
    "first_air_date.lte": "2019-12-31",
    page: "2",
  });
});

test("a movies query uses film dates and leaves TV-only parts out", () => {
  const { path, params } = discoverQuery(filter({ genreKeys: ["sciFiFantasy", "kids"], statuses: [0], types: [2], yearFrom: 1999, sort: "alphabetical", runtime: "short" }), "Movies", "US");
  assert.equal(path, "/discover/movie");
  assert.deepEqual(params, {
    sort_by: "title.asc",
    "with_runtime.lte": "29",
    with_genres: "878",
    "primary_release_date.gte": "1999-01-01",
    page: "1",
  });
});

test("the rated sort brings the vote floor; popular with nothing else is bare", () => {
  assert.equal(discoverQuery(filter({ sort: "rated" }), "Movies", "US").params["vote_count.gte"], "200");
  assert.deepEqual(discoverQuery(filter({}), "Shows", "US").params, { sort_by: "popularity.desc", page: "1" });
  // No region without services.
  assert.equal(discoverQuery(filter({ runtime: "long" }), "Shows", "GB").params.watch_region, undefined);
});

test("suggestedName takes the first section with something to say", () => {
  assert.equal(suggestedName(filter({ genreKeys: ["thriller", "crime", "drama"] })), "Crime & Drama");
  assert.equal(suggestedName(filter({ providerIDs: [337, 8, 9], providerNames: { "8": "Netflix", "9": "Prime Video", "337": "Disney Plus" } })), "Netflix & Prime Video");
  assert.equal(suggestedName(filter({ originCountry: "KR", originalLanguage: "ja" })), "South Korea");
  assert.equal(suggestedName(filter({ originalLanguage: "ja" })), "Japanese");
  assert.equal(suggestedName(filter({ yearFrom: 1990, yearTo: 1999 })), "1990–1999");
  assert.equal(suggestedName(filter({ yearTo: 1999 })), "1999");
  assert.equal(suggestedName(filter({ sort: "rated", runtime: "short" })), "Highest Rated");
  assert.ok(suggestedName(filter({ providerIDs: [1, 2], providerNames: { "1": "A very long streaming name", "2": "Another" } })).length <= 26);
});

test("a new category is written the way Swift reads it", () => {
  const a = base();
  let n = 0;
  const out = applyCreateRails(a, "  Korean crime  ", filter({ genreKeys: ["crime"], originCountry: "KR", providerIDs: [8], providerNames: { "8": "Netflix" } }), STAMP, () => `0000000${++n}-AAAA-4BBB-8CCC-DDDDDDDDDDDD`);
  assert.deepEqual(out.refused, []);
  assert.equal(a.savedRails!.length, 2);
  const [shows, movies] = a.savedRails!;
  assert.equal(shows.catalogue, "Shows");
  assert.equal(movies.catalogue, "Movies");
  assert.equal(shows.name, "Korean crime");
  assert.deepEqual((shows.filter as DiscoverFilter).kinds, ["Shows"]);
  assert.deepEqual((movies.filter as DiscoverFilter).kinds, ["Movies"]);
  assert.deepEqual(Object.keys(shows.filter as object), ["kinds", "genreKeys", "providerIDs", "providerNames", "originCountry", "statuses", "types", "sort"]);
  assert.deepEqual((shows.filter as DiscoverFilter).providerNames, { "8": "Netflix" });
  assert.deepEqual(a.savedRailOrder, out.created);
  for (const r of a.savedRails!) {
    assert.deepEqual(Object.keys(r).sort(), ["catalogue", "created", "filter", "id", "name"]);
    assert.match(r.created!, /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$/);
  }
});

test("real ids are uppercase UUIDs", () => {
  const a = base();
  applyCreateRails(a, "", filter({ kinds: ["Movies"], genreKeys: ["horror"] }), STAMP);
  assert.match(a.savedRails![0].id, /^[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/);
  // An empty name falls back to the suggestion.
  assert.equal(a.savedRails![0].name, "Horror");
});

test("a full tab refuses its half and keeps the other", () => {
  const rails = Array.from({ length: RAIL_LIMIT }, (_, i) => ({ id: `R${i}`, name: `r${i}`, catalogue: "Movies", filter: {}, created: STAMP }));
  const a = base({ savedRails: [...rails] });
  const out = applyCreateRails(a, "x", filter({ genreKeys: ["drama"] }), STAMP);
  assert.deepEqual(out.refused, ["Movies"]);
  assert.equal(out.created.length, 1);
  // The order didn't exist, so it is made from the rails there, new one last.
  assert.deepEqual(a.savedRailOrder, [...rails.map((r) => r.id), out.created[0]]);
  assert.throws(() => applyCreateRails(a, "x", filter({}), STAMP), /Narrow something/);
});

test("rename, edit and delete keep what they don't touch", () => {
  const id = "3F2504E0-4F89-11D3-9A0C-0305E82C3301";
  const other = "3F2504E0-4F89-11D3-9A0C-0305E82C3302";
  const a = base({
    savedRails: [
      { id, name: "Old", catalogue: "Shows", filter: { kinds: ["Shows"], genreKeys: ["drama"], futureField: 1 }, created: STAMP, pinned: true },
      { id: other, name: "Other", catalogue: "Movies", filter: {}, created: STAMP },
    ],
    savedRailOrder: [other, id],
  });
  applyRenameRail(a, id.toLowerCase(), "  New name that is far too long to fit  ");
  assert.equal(a.savedRails![0].name, "New name that is far too l");
  assert.throws(() => applyRenameRail(a, id, "   "));
  applySetRailFilter(a, id, filter({ kinds: ["Movies"], genreKeys: ["comedy"] }));
  const f = a.savedRails![0].filter as Record<string, unknown>;
  assert.deepEqual(f.kinds, ["Shows"]);
  assert.deepEqual(f.genreKeys, ["comedy"]);
  assert.equal(f.futureField, 1);
  assert.equal(a.savedRails![0].pinned, true);
  assert.deepEqual(orderedRails(a).map((r) => r.id), [other, id]);
  assert.deepEqual(orderedRails(a, "Shows").map((r) => r.id), [id]);
  applyDeleteRail(a, id.toLowerCase());
  assert.deepEqual(a.savedRails!.map((r) => r.id), [other]);
  assert.deepEqual(a.savedRailOrder, [other]);
});

test("reading a stored filter is as forgiving as the app's decoder", () => {
  const f = readFilter({ kinds: ["Tapes"], providerID: 8, providerName: "Netflix", runtime: "epic", statuses: [0, 9], sort: "random" });
  assert.deepEqual(f.kinds, ["Shows", "Movies"]);
  assert.deepEqual(f.providerIDs, [8]);
  assert.equal(f.runtime, undefined);
  assert.deepEqual(f.statuses, [0]);
  assert.equal(f.sort, "popular");
  // An id with no name is dropped, and so is a name with no id.
  assert.deepEqual(readFilter({ providerIDs: [8, 9], providerNames: { "8": "Netflix", "10": "Hulu" } }).providerIDs, [8]);
  // What the browser sends is tidied: unknown genres out, ranges the right way round.
  const c = cleanFilter({ kinds: ["Shows"], genreKeys: ["drama", "nope", "action"], yearFrom: 2020, yearTo: 2001, ratingFrom: 9, ratingTo: 2, originCountry: "korea" });
  assert.deepEqual(c.genreKeys, ["action", "drama"]);
  assert.deepEqual([c.yearFrom, c.yearTo, c.ratingFrom, c.ratingTo], [2001, 2020, 2, 9]);
  assert.equal(c.originCountry, undefined);
  assert.deepEqual(readFilter(encodeFilter(c)), c);
});

console.log(`saved-rails.test.ts: ${failed ? `${failed} failed` : "all passed"}`);
if (failed) process.exitCode = 1;
