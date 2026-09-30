"use server";

import { accountsOpen } from "@/lib/accounts";
import type { LibraryArchive, Movie, Show } from "@/lib/archive";
import { optionalLibrary } from "@/lib/library";
import { hasPro } from "@/lib/pro";
import { importCatalog } from "@/lib/tmdb";

// The server's half of importing on the web (Settings → Import & export).
// The import runs in the browser (lib/imports, the app's importers), so a
// file of thousands of titles never meets a server time limit; it reaches
// TMDB through these, one question at a time, so the TMDB key stays here.
// Import is Pro (docs/social-plan.md, "Free and Pro").

async function allowed(): Promise<boolean> {
  return accountsOpen && hasPro();
}

export async function importFind(source: "imdb" | "tvdb", id: string): Promise<{ shows: Show[]; movies: Movie[] }> {
  if (!(await allowed()) || !/^[a-z0-9]{1,20}$/i.test(id)) return { shows: [], movies: [] };
  return importCatalog.find(source, id);
}

export async function importShow(id: number): Promise<Show | null> {
  return (await allowed()) && Number.isInteger(id) ? importCatalog.show(id) : null;
}

export async function importMovie(id: number): Promise<Movie | null> {
  return (await allowed()) && Number.isInteger(id) ? importCatalog.movie(id) : null;
}

export async function importSearchShows(text: string, year?: number | null): Promise<Show[]> {
  return (await allowed()) ? importCatalog.searchShows(text.slice(0, 200), year) : [];
}

export async function importSearchMovies(text: string, year?: number | null): Promise<Movie[]> {
  return (await allowed()) ? importCatalog.searchMovies(text.slice(0, 200), year) : [];
}

export async function importSearchMulti(text: string, year?: number | null) {
  return (await allowed()) ? importCatalog.searchMulti(text.slice(0, 200), year) : [];
}

export async function importEpisodes(showID: number) {
  return (await allowed()) && Number.isInteger(showID) ? importCatalog.episodes(showID) : [];
}

/** The person's library as it is now, for the importer to read (never to
    write: the result is merged on the server, into a fresh copy). */
export async function importSnapshot(): Promise<{ ok: boolean; library: LibraryArchive | null; reason?: string }> {
  if (!accountsOpen) return { ok: false, library: null, reason: "Importing on the web opens with accounts." };
  const { signedIn, archive } = await optionalLibrary();
  if (!signedIn) return { ok: false, library: null, reason: "Sign in to import." };
  if (!(await hasPro())) return { ok: false, library: null, reason: "Importing on the web comes with Kodigo Pro." };
  return { ok: true, library: archive };
}
