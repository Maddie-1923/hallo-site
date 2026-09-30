import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { LibraryArchive } from "../../archive";
import { applyImportPlan } from "../apply";
import { chooseImportRoute } from "../route";
import { runTvTimeImport } from "../tvtime";
import type { ImportDeps, ImportFile } from "../types";
import { runUniversalImport } from "../universal";
import { archive, bytes, episodesOf, FakeCatalog, FakeEpisodes, movie, NOW, run, show, test } from "./harness";

// Every app's export goes to the reader that can read it, whichever import
// row was tapped and whichever phone made it. The samples in
// fixtures/exports (scripts/make-import-fixtures.py) are laid out exactly as
// each app's real export is, with made-up titles; the iOS and Android suites
// run the same files through their ImportRoute.

const sample = (name: string): ImportFile => ({ name, data: new Uint8Array(readFileSync(resolve(__dirname, "fixtures/exports", name))) });

const EXPECTED: [string, "tvtime" | "universal" | "unreadable"][] = [
  ["tvtime.zip", "tvtime"],
  ["simkl.zip", "universal"],
  ["refract.zip", "universal"],
  ["sofatime.zip", "universal"],
  ["bingers.zip", "universal"],
  ["letterboxd.zip", "universal"],
  ["not-an-export.zip", "unreadable"],
];

for (const [name, kind] of EXPECTED) {
  test(`${name} goes to the ${kind} reader`, () => {
    assert.equal(chooseImportRoute([sample(name)]).kind, kind);
  });
}

test("Simkl's and Refract's backups aren't stopped by TV Time's guesses at its rarer formats", () => {
  // TV Time's reader takes these for "TV Time Out" and "Liberator" files.
  for (const name of ["simkl.zip", "refract.zip"]) {
    const route = chooseImportRoute([sample(name)]);
    assert.equal(route.kind, "universal", name);
  }
});

test("a file nothing reads isn't given TV Time's message unless TV Time named a format", () => {
  const route = chooseImportRoute([sample("not-an-export.zip")]);
  assert.ok(route.kind === "unreadable" && route.tvTime === null);
});

test("a Kodigo backup goes to the backup reader, whatever else is picked with it", () => {
  const backup = { name: "Kodigo Backup.json", data: bytes(JSON.stringify(archive({ exported: "2026-09-18T12:00:00Z", device: "iPhone" }))) };
  assert.equal(chooseImportRoute([backup]).kind, "backup");
  assert.equal(chooseImportRoute([sample("letterboxd.zip"), backup]).kind, "backup");
});

test("a lone table of titles, seasons and episodes is read by its columns", () => {
  const file = { name: "my-shows.csv", data: bytes("title,season,episode\nBreaking Bad,1,1\nBreaking Bad,1,2\n") };
  assert.equal(chooseImportRoute([file]).kind, "universal");
});

// ---- End to end: each sample lands its titles ----

function catalog() {
  const c = new FakeCatalog();
  const breakingBad = { ...show(1396, "Breaking Bad"), first_air_date: "2008-01-20" };
  const severance = { ...show(95396, "Severance"), first_air_date: "2022-02-18" };
  c.shows.push(breakingBad, severance);
  c.tvdb.set(81189, breakingBad);
  const arrival = { ...movie(329865, "Arrival"), release_date: "2016-11-11" };
  c.movies.push(arrival, { ...movie(496243, "Parasite"), release_date: "2019-05-30" }, { ...movie(693134, "Dune: Part Two"), release_date: "2024-02-27" });
  c.imdb.set("tt2543164", arrival);
  c.imdb.set("tt0903747", breakingBad as never);
  return c;
}

async function importSample(name: string): Promise<LibraryArchive> {
  const episodes = new FakeEpisodes();
  episodes.byShow.set(1396, episodesOf(1396, 7, 13));
  episodes.byShow.set(95396, episodesOf(95396, 9));
  const deps: ImportDeps = { catalog: catalog(), episodes, library: archive(), now: () => NOW };
  const files = [sample(name)];
  const route = chooseImportRoute(files);
  const out = route.kind === "tvtime" ? await runTvTimeImport(files, deps) : await runUniversalImport(files, deps);
  return applyImportPlan(archive(), out.plan, NOW);
}

const watched = (a: LibraryArchive, id: string) => a.watched.includes(id);
const hasShow = (a: LibraryArchive, id: number) => a.shows.some((t) => t.show.id === id);
const hasMovie = (a: LibraryArchive, id: number) => a.movies.some((t) => t.movie.id === id);

for (const name of ["simkl.zip", "refract.zip", "sofatime.zip", "bingers.zip"]) {
  test(`${name} lands Breaking Bad with S1 E1 and E2 watched, and Arrival`, async () => {
    const a = await importSample(name);
    assert.ok(hasShow(a, 1396), "Breaking Bad tracked");
    assert.ok(watched(a, "1396-1-1") && watched(a, "1396-1-2"), `episodes watched: ${a.watched.join(", ")}`);
    assert.ok(hasMovie(a, 329865), "Arrival tracked");
  });
}

test("letterboxd.zip lands its films", async () => {
  const a = await importSample("letterboxd.zip");
  assert.ok(hasMovie(a, 329865) && hasMovie(a, 496243) && hasMovie(a, 693134), a.movies.map((m) => m.movie.title).join(", "));
});

void run("import-route.test.ts");
