import type { LibraryArchive, Movie, Show, TrackedMovie, TrackedShow } from "./archive";

// The app's piles, worked out from the archive alone.
//
// `ShowPiles.swift` decides these from the tracked list, the episodes grouped
// by show, and the watch log. The website has the first and the third; it has
// no episode lists without a TMDB call per show, so the one split it cannot
// make is Up Next against Up to Date — both are "watching, and you touched it
// recently", and telling them apart means knowing whether an aired episode is
// still unwatched. The web calls that whole run Up Next, which is true of
// every show in it and never claims a show is finished when it isn't.

/** Ninety days, the app's `voidAfter`. Keep the two in step. */
export const VOID_AFTER_DAYS = 90;

function daysSince(iso: string | undefined, now: Date) {
  if (!iso) return Infinity;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return Infinity;
  return (now.getTime() - t) / 86_400_000;
}

/** The most recent check-off on this show, by the same key shape the app uses. */
function lastWatched(a: LibraryArchive, showID: number) {
  const prefix = `${showID}-`;
  let latest: string | undefined;
  for (const [key, when] of Object.entries(a.watchedDates ?? {})) {
    if (!key.startsWith(prefix)) continue;
    if (!latest || when > latest) latest = when;
  }
  return latest;
}

function hasStarted(a: LibraryArchive, showID: number) {
  const prefix = `${showID}-`;
  return a.watched.some((k) => k.startsWith(prefix));
}

export interface ShowPiles {
  upNext: TrackedShow[];
  readyToStart: TrackedShow[];
  theVoid: TrackedShow[];
}

/**
 * The three piles the Shows list stacks, in the app's order — how far each has
 * drifted from tonight. Only Watching shows land here; the settled statuses
 * have their shelves on the profile.
 */
export function showPiles(a: LibraryArchive | null, now = new Date()): ShowPiles {
  const piles: ShowPiles = { upNext: [], readyToStart: [], theVoid: [] };
  for (const t of a?.shows ?? []) {
    if (t.status !== "Watching") continue;
    const started = hasStarted(a!, t.show.id);
    // Started shows are measured from the last check-off, unstarted ones from
    // the day they were added — otherwise a series tracked last week and one
    // tracked last year both read as untouched forever.
    const since = started ? daysSince(lastWatched(a!, t.show.id) ?? t.modified, now) : daysSince(t.added ?? t.modified, now);
    if (since >= VOID_AFTER_DAYS) piles.theVoid.push(t);
    else if (started) piles.upNext.push(t);
    else piles.readyToStart.push(t);
  }
  return piles;
}

export interface MoviePiles {
  readyToStart: TrackedMovie[];
  theVoid: TrackedMovie[];
}

/** The film halves of the same two piles. A film has no middle, so there is no Up Next. */
export function moviePiles(a: LibraryArchive | null, now = new Date()): MoviePiles {
  const piles: MoviePiles = { readyToStart: [], theVoid: [] };
  for (const t of a?.movies ?? []) {
    if (t.status !== "To Watch") continue;
    if (daysSince(t.added ?? t.modified, now) >= VOID_AFTER_DAYS) piles.theVoid.push(t);
    else piles.readyToStart.push(t);
  }
  return piles;
}

export interface ShelfItem {
  key: string;
  id: number;
  kind: "show" | "movie";
  path: string | null | undefined;
  name: string;
  href: string;
}

function showItem(s: Show): ShelfItem {
  return { key: `s${s.id}`, id: s.id, kind: "show", path: s.poster_path, name: s.name, href: `/show/${s.id}` };
}
function movieItem(m: Movie): ShelfItem {
  return { key: `m${m.id}`, id: m.id, kind: "movie", path: m.poster_path, name: m.title, href: `/movie/${m.id}` };
}

export interface Shelf {
  id: string;
  name: string;
  detail?: string | null;
  /** Kodigo's own shelves against the person's lists — the profile draws them apart. */
  kind: "default" | "custom";
  items: ShelfItem[];
}

/**
 * What the profile holds: Kodigo's settled shelves — the states with nothing
 * left to act on, which is why they live here rather than on the lists — then
 * the person's own lists in their saved order.
 *
 * `ShelfStatus` in the app pairs a show status with a film one, so a series you
 * reached the end of and a film you have seen share the Finished shelf. That
 * pairing is kept here.
 */
export function profileShelves(a: LibraryArchive | null): Shelf[] {
  if (!a) return [];
  const reactions = a.reactions ?? {};
  const shows = a.shows;
  const movies = a.movies;

  const pair = (id: string, name: string, show: string, movie: string): Shelf => ({
    id,
    kind: "default",
    name,
    items: [
      ...shows.filter((t) => t.status === show).map((t) => showItem(t.show)),
      ...movies.filter((t) => t.status === movie).map((t) => movieItem(t.movie)),
    ],
  });

  const shelves: Shelf[] = [
    {
      id: "favorites",
      kind: "default",
      name: "Favorites",
      items: [
        ...shows.filter((t) => reactions[`show:${t.show.id}`] === "loved").map((t) => showItem(t.show)),
        ...movies.filter((t) => reactions[`movie:${t.movie.id}`] === "loved").map((t) => movieItem(t.movie)),
      ],
    },
    pair("finished", "Finished", "Finished", "Watched"),
    pair("onHold", "On Hold", "Stopped", "On Hold"),
    pair("dnf", "Did Not Finish", "Dropped", "Dropped"),
  ];

  const showByID = new Map(shows.map((t) => [t.show.id, t.show]));
  const movieByID = new Map(movies.map((t) => [t.movie.id, t.movie]));
  const order = a.customListOrder ?? [];
  const rank = new Map(order.map((id, i) => [id, i]));
  const lists = [...(a.customLists ?? [])].sort((x, y) => (rank.get(x.id) ?? 1e9) - (rank.get(y.id) ?? 1e9));

  for (const l of lists) {
    shelves.push({
      id: l.id,
      kind: "custom",
      name: l.name,
      detail: l.detail,
      items: [
        ...(l.showIDs ?? []).map((id) => showByID.get(id)).filter((s): s is Show => !!s).map(showItem),
        ...(l.movieIDs ?? []).map((id) => movieByID.get(id)).filter((m): m is Movie => !!m).map(movieItem),
      ],
    });
  }

  return shelves;
}
