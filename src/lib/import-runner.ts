"use client";

import { isArchive, type LibraryArchive } from "@/lib/archive";
import { importEpisodes, importFind, importMovie, importSearchMovies, importSearchMulti, importSearchShows, importShow, importSnapshot } from "@/lib/import-actions";
import {
  chooseImportRoute,
  NothingReadable,
  runTvTimeImport,
  runUniversalImport,
  TvTimeReadFailure,
  type Episode,
  type ImportCatalog,
  type ImportEpisodes,
  type ImportFile,
  type ImportPlan,
  type ImportProgress,
  type TvTimeImportResult,
  type UniversalImportResult,
} from "@/lib/imports";

// Running an import in the browser (Settings → Import & export): the app's
// importers (lib/imports) reading the files, TMDB reached through the site
// (lib/import-actions.ts), against a snapshot of the library. What comes back
// is a plan, which the server merges in (importIntoLibrary). A Kodigo backup
// needs no matching: it's a library already, and becomes the plan whole.

export type ImportOutcome =
  | { kind: "backup"; plan: ImportPlan; counts: { shows: number; movies: number; episodes: number; reviews: number } }
  | { kind: "tvtime"; plan: ImportPlan; result: TvTimeImportResult }
  | { kind: "universal"; plan: ImportPlan; result: UniversalImportResult };

/** TMDB through the site. A TheTVDB id comes as a number, an IMDb id as text. */
const catalog: ImportCatalog = {
  async find(id) {
    const r = await importFind(typeof id === "number" ? "tvdb" : "imdb", String(id));
    return { tvResults: r.shows, movieResults: r.movies };
  },
  show: (id) => importShow(id),
  movie: (id) => importMovie(id),
  searchShows: (text, year) => importSearchShows(text, year),
  searchMovies: (text, year) => importSearchMovies(text, year),
  searchMulti: (text, year) => importSearchMulti(text, year),
};

/** Episode listings, fetched once a series and kept for the run. */
function episodeLoader(): ImportEpisodes {
  const got = new Map<number, Episode[]>();
  return {
    async load(showIDs) {
      const wanted = showIDs.filter((id) => !got.has(id));
      for (let i = 0; i < wanted.length; i += 4) {
        await Promise.all(
          wanted.slice(i, i + 4).map(async (id) => {
            const rows = await importEpisodes(id).catch(() => []);
            got.set(
              id,
              rows.map((e) => ({ id: `${id}-${e.season}-${e.episode}`, showID: id, season: e.season, episode: e.episode, name: e.name, airDate: e.airDate })),
            );
          }),
        );
      }
    },
    episodes: (showID) => got.get(showID) ?? [],
  };
}

/** A Kodigo backup among the files, if there is one. */
async function backupIn(files: ImportFile[]): Promise<LibraryArchive | null> {
  for (const f of files) {
    if (!/\.json$/i.test(f.name)) continue;
    try {
      const parsed = JSON.parse(new TextDecoder().decode(f.data));
      if (isArchive(parsed)) return parsed;
    } catch {}
  }
  return null;
}

export class ImportRefused extends Error {}

/** Reads the files, matches them, and hands back what to merge. */
export async function runImport(picked: File[], onProgress: (p: ImportProgress) => void, signal: AbortSignal): Promise<ImportOutcome> {
  const files: ImportFile[] = await Promise.all(picked.map(async (f) => ({ name: f.name, data: new Uint8Array(await f.arrayBuffer()) })));

  // Which reader, from what's in the files (lib/imports/route.ts, the same
  // rule as the apps'), whatever the person picked them as.
  const route = chooseImportRoute(files);
  if (route.kind === "backup") {
    const backup = await backupIn(files);
    if (backup) {
      return {
        kind: "backup",
        plan: { archive: backup, ratings: {}, loved: [] },
        counts: { shows: backup.shows.length, movies: backup.movies.length, episodes: backup.watched.length, reviews: Object.keys(backup.reviews ?? {}).length },
      };
    }
  }
  if (route.kind === "unreadable" && route.tvTime) throw route.tvTime;

  const snap = await importSnapshot();
  if (!snap.ok) throw new ImportRefused(snap.reason ?? "Importing isn't open.");
  const library: LibraryArchive = snap.library ?? { version: 12, exported: "", device: "", shows: [], movies: [], watched: [] };
  const deps = { catalog, episodes: episodeLoader(), library, now: () => new Date(), onProgress, signal };

  if (route.kind === "tvtime") {
    const run = await runTvTimeImport(files, deps);
    return { kind: "tvtime", plan: run.plan, result: run.result };
  }
  // The universal importer, which also gives the "nothing readable" answer,
  // with what it made of each file, when that's where the route ended.
  const run = await runUniversalImport(files, deps);
  return { kind: "universal", plan: run.plan, result: run.result };
}

export { NothingReadable, TvTimeReadFailure };
