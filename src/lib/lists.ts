import "server-only";
import { MEMBERS } from "./members";
import { loadProfile, previewArchive } from "./profile-previews";
import type { ProfileTitle } from "./public-profile";
import { publicList, publicLists } from "./public-reads";
import { accountsOpen } from "./accounts";
import { optionalLibrary } from "./library";

// Lists: each person's own lists (the app's custom categories), gathered for
// the Lists hub and given a page each at /u/<name>/list/<id>. Until accounts,
// the lists are the development preview's own and the made-up members'; the
// likes and comments on them are made up too, from a fixed seed.
export interface ListView {
  owner: string;
  ownerName: string;
  /** The list's id, without the "list:" the categories carry. */
  id: string;
  name: string;
  detail: string | null;
  titles: ProfileTitle[];
  likes: number;
  comments: { who: string; text: string; ago: string }[];
}

const REMARKS = [
  "Saving this for the long weekend.",
  "Seen six of these and every one was great. Adding the rest.",
  "The third pick is so underrated.",
  "Needed exactly this list tonight.",
  "Would add one more, but this is close to perfect.",
];

let cached: { at: number; lists: ListView[] } | null = null;

export async function allLists(): Promise<ListView[]> {
  // Real members' lists first (the public tables), then in development the
  // previews'.
  const real = await publicLists();
  if (process.env.NODE_ENV !== "development") return real;
  return [...real, ...(await previewLists())];
}

async function previewLists(): Promise<ListView[]> {
  if (cached && Date.now() - cached.at < 60_000) return cached.lists;
  const names = ["preview", "sample", ...MEMBERS.map((m) => m.username)];
  const views = await Promise.all(names.map((n) => loadProfile(n)));
  const out: ListView[] = [];
  views.forEach((v, vi) => {
    if (!v) return;
    v.categories
      .filter((c) => c.id.startsWith("list:") && c.titles.length > 0)
      .forEach((c, ci) => {
        const seed = vi * 7 + ci * 3 + c.name.length;
        out.push({
          owner: v.username,
          ownerName: v.displayName,
          id: c.id.slice(5),
          name: c.name,
          detail: c.detail ?? null,
          titles: c.titles,
          likes: v.username === "preview" ? 0 : 40 + ((seed * 97) % 900),
          comments:
            v.username === "preview"
              ? []
              : [0, 1, 2].slice(0, 1 + (seed % 3)).map((i) => ({ who: MEMBERS[(seed + i * 3) % MEMBERS.length].username, text: REMARKS[(seed + i) % REMARKS.length], ago: `${1 + ((seed + i * 5) % 20)}d ago` })),
        });
      });
  });
  cached = { at: Date.now(), lists: out };
  return out;
}

export async function listFor(owner: string, id: string) {
  return (await publicList(owner, id)) ?? (process.env.NODE_ENV === "development" ? ((await previewLists()).find((l) => l.owner === owner && l.id === id) ?? null) : null);
}

/** The titles the viewer has watched, by key, for "you've watched 7 of 20":
    films marked watched, and series finished. The preview's library until
    signed-in viewer's own library, else the preview's in development. */
export async function watchedKeys(): Promise<string[]> {
  const a = (accountsOpen ? (await optionalLibrary()).archive : null) ?? (await previewArchive());
  if (!a) return [];
  const films = new Set([...(a.watchedMovies ?? []), ...Object.keys(a.movieWatchedDates ?? {}).map(Number), ...a.movies.filter((t) => t.status === "Watched").map((t) => t.movie.id)]);
  return [...[...films].map((id) => `m${id}`), ...a.shows.filter((t) => t.status === "Finished").map((t) => `s${t.show.id}`)];
}
