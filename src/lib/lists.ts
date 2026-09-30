import "server-only";
import type { ProfileTitle } from "./public-profile";
import { publicList, publicLists } from "./public-reads";
import { accountsOpen } from "./accounts";
import { optionalLibrary } from "./library";

// Lists: each person's own lists (the app's custom categories), gathered for
// the Lists hub and given a page each at /u/<name>/list/<id>.
export interface ListView {
  owner: string;
  ownerName: string;
  /** The list's id, without the "list:" the categories carry. */
  id: string;
  name: string;
  detail: string | null;
  titles: ProfileTitle[];
  likes: number;
  /** Likes in the last seven days, for Popular this week. */
  likesWeek?: number;
  /** The genre most of its titles share, for the Lists page's topic rows. */
  topic?: string | null;
  /** Picked by a moderator for the top of the Lists page. */
  featured?: boolean;
}

export async function allLists(): Promise<ListView[]> {
  return publicLists();
}

export async function listFor(owner: string, id: string) {
  return publicList(owner, id);
}

/** The titles the signed-in viewer has watched, by key, for "you've watched
    7 of 20": films marked watched, and series finished. */
export async function watchedKeys(): Promise<string[]> {
  const a = accountsOpen ? (await optionalLibrary()).archive : null;
  if (!a) return [];
  const films = new Set([...(a.watchedMovies ?? []), ...Object.keys(a.movieWatchedDates ?? {}).map(Number), ...a.movies.filter((t) => t.status === "Watched").map((t) => t.movie.id)]);
  return [...[...films].map((id) => `m${id}`), ...a.shows.filter((t) => t.status === "Finished").map((t) => `s${t.show.id}`)];
}
