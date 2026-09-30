import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { LibraryArchive, Movie, MovieStatus, Show, TrackedMovie, TrackedShow, WatchStatus } from "../../archive";
import { formatSwiftDate } from "../swift";
import { titleKey } from "../text";
import type { Episode, ImportCatalog, ImportEpisodes, ImportFindResults, ImportTitleHit } from "../types";

// Just enough of a test runner for plain `node:assert` scripts run with
// `npx tsx`: each file registers its cases with `test` and calls `run` at the
// end, which prints one line per case and exits non-zero if any failed. The
// fixtures are the Android suite's (`Fixture.kt`, `ImportRunTests`), so a case
// ported from there reads the same.

type Case = { name: string; fn: () => void | Promise<void> };
const cases: Case[] = [];

export function test(name: string, fn: () => void | Promise<void>) {
  cases.push({ name, fn });
}

/** A case that can't run here, reported rather than silently dropped — Android's `assumeTrue`. */
export class Skip extends Error {}

export async function run(file: string) {
  let passed = 0;
  let failed = 0;
  let skipped = 0;
  for (const c of cases) {
    try {
      await c.fn();
      passed++;
      console.log(`  ok    ${c.name}`);
    } catch (e) {
      if (e instanceof Skip) {
        skipped++;
        console.log(`  skip  ${c.name} (${e.message})`);
        continue;
      }
      failed++;
      console.log(`  FAIL  ${c.name}`);
      console.log(String(e instanceof Error ? (e.stack ?? e.message) : e).replace(/^/gm, "        "));
    }
  }
  console.log(`${file}: ${passed} passed, ${failed} failed, ${skipped} skipped`);
  if (failed > 0) process.exitCode = 1;
}

export const bytes = (text: string) => new TextEncoder().encode(text);

/** Kotlin's `trimIndent()`, for the multi-line fixtures. */
export function trimIndent(text: string) {
  const lines = text.split("\n");
  while (lines.length && lines[0].trim() === "") lines.shift();
  while (lines.length && lines[lines.length - 1].trim() === "") lines.pop();
  const indent = Math.min(...lines.filter((l) => l.trim()).map((l) => l.match(/^ */)![0].length));
  return lines.map((l) => l.slice(indent)).join("\n");
}

// ---- Fixture.kt ----

/** 2026-08-05T12:00:00Z. */
export const NOW_MS = 1_785_931_200_000;
export const NOW = new Date(NOW_MS);
export const iso = (ms: number) => formatSwiftDate(ms);
export const nowText = iso(NOW_MS);
export const dayMs = (offset: number, from = NOW_MS) => from + offset * 24 * 60 * 60 * 1000;
export const day = (offset: number, from = NOW_MS) => iso(dayMs(offset, from));

export function show(id: number, name = "A Show"): Show {
  return { id, name, poster_path: "/poster.jpg", first_air_date: "2020-01-01", vote_average: 8, overview: "Something happens." };
}

export function movie(id: number, title = "A Movie"): Movie {
  return { id, title, poster_path: "/poster.jpg", release_date: null, vote_average: 7, overview: "Something else happens." };
}

export function trackedShow(id: number, name = "A Show", status: WatchStatus = "Watching", modified = nowText): TrackedShow {
  return { show: show(id, name), status, modified, added: nowText };
}

export function trackedMovie(id: number, title = "A Movie", status: MovieStatus = "To Watch", modified = nowText): TrackedMovie {
  return { movie: movie(id, title), status, modified, added: nowText };
}

export function archive(fields: Partial<LibraryArchive> = {}): LibraryArchive {
  return { version: 14, exported: nowText, device: "Test", shows: [], movies: [], watched: [], ...fields };
}

// ---- ImportRunTests' fakes ----

/** A TMDB that knows a handful of titles. */
export class FakeCatalog implements ImportCatalog {
  shows: Show[] = [];
  movies: Movie[] = [];
  tvdb = new Map<number, Show>();
  imdb = new Map<string, Movie>();
  asked: string[] = [];

  async find(id: number | string): Promise<ImportFindResults> {
    if (typeof id === "number") {
      this.asked.push(`tvdb:${id}`);
      const s = this.tvdb.get(id);
      return { tvResults: s ? [s] : [] };
    }
    this.asked.push(`imdb:${id}`);
    const m = this.imdb.get(id);
    return { movieResults: m ? [m] : [] };
  }
  async show(id: number) {
    const s = this.shows.find((x) => x.id === id);
    if (!s) throw new Error("no such show");
    return s;
  }
  async movie(id: number) {
    const m = this.movies.find((x) => x.id === id);
    if (!m) throw new Error("no such movie");
    return m;
  }
  async searchShows(text: string) {
    this.asked.push(`shows:${text}`);
    return this.shows.filter((s) => titleKey(s.name).includes(titleKey(text)));
  }
  async searchMovies(text: string) {
    this.asked.push(`movies:${text}`);
    return this.movies.filter((m) => titleKey(m.title).includes(titleKey(text)));
  }
  async searchMulti(text: string): Promise<ImportTitleHit[]> {
    const films = (await this.searchMovies(text)).map((movie): ImportTitleHit => ({ kind: "movie", movie }));
    const series = (await this.searchShows(text)).map((show): ImportTitleHit => ({ kind: "show", show }));
    return [...films, ...series];
  }
}

export class FakeEpisodes implements ImportEpisodes {
  byShow = new Map<number, Episode[]>();
  loads = 0;
  async load() {
    this.loads++;
  }
  episodes(showID: number) {
    return this.byShow.get(showID) ?? [];
  }
}

/** A listing of `counts[i]` episodes in season i + 1. */
export function episodesOf(showID: number, ...counts: number[]): Episode[] {
  return counts.flatMap((count, i) =>
    Array.from({ length: count }, (_, n) => ({ id: `${showID}-${i + 1}-${n + 1}`, showID, season: i + 1, episode: n + 1, name: `E${n + 1}`, airDate: null })),
  );
}

/** The sample export Android's suite reads, kept out of both repos; its tests skip where it isn't. */
export function tvTimeSample(): { name: string; data: Uint8Array } | null {
  const candidates = [process.env.TVTIME_SAMPLE, "../kodigo-android/private/tvtime-export-sample.zip", "private/tvtime-export-sample.zip"];
  for (const candidate of candidates) {
    if (!candidate) continue;
    const path = resolve(candidate);
    if (existsSync(path)) return { name: "tvtime-export-sample.zip", data: new Uint8Array(readFileSync(path)) };
  }
  return null;
}
