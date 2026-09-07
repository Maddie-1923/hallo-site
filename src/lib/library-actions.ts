"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { CURRENT_VERSION, isArchive, type LibraryArchive, type Movie, type MovieStatus, type Show, type WatchStatus } from "./archive";

// Every change the website makes to a library goes through here, and each one
// follows the rules the app's merge relies on: the record that changed gets a
// fresh `modified`, a removal leaves a tombstone, an episode's checkbox moves
// its `watchedStamps` entry, and the row's `changed_at` moves so the phone's
// three-way comparison sees that the other side moved. Get any of those wrong
// and the next sync from a phone quietly undoes what was done here.

const DEVICE = "Kodigo web";

// Swift's .iso8601 decoder refuses fractional seconds, so `toISOString()` as
// it comes would make the whole archive undecodable on the phone.
function now() {
  return new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
}

function emptyArchive(): LibraryArchive {
  return {
    version: CURRENT_VERSION,
    exported: now(),
    device: DEVICE,
    shows: [],
    movies: [],
    watched: [],
    watchedMovies: [],
    movieWatchedDates: {},
    watchedDates: {},
    watchedStamps: {},
    showTombstones: [],
    movieTombstones: [],
  };
}

async function withArchive(mutate: (a: LibraryArchive, stamp: string) => void): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in to track titles." };

  const { data } = await supabase.from("libraries").select("archive").eq("user_id", user.id).maybeSingle();
  const archive: LibraryArchive = data && isArchive(data.archive) ? (data.archive as LibraryArchive) : emptyArchive();

  const stamp = now();
  try {
    mutate(archive, stamp);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Couldn't make that change." };
  }
  archive.exported = stamp;
  archive.device = DEVICE;

  const { error } = await supabase.from("libraries").upsert({
    user_id: user.id,
    archive,
    version: archive.version,
    changed_at: stamp,
    device: DEVICE,
  });
  if (error) return { error: error.message };
  revalidatePath("/app", "layout");
  return {};
}

function dropTombstone(list: { id: number; removed: string }[] | undefined, id: number) {
  return (list ?? []).filter((t) => t.id !== id);
}

// ---- Shows ----

export async function trackShow(show: Show, status: WatchStatus = "Watching") {
  return withArchive((a, stamp) => {
    const existing = a.shows.find((s) => s.show.id === show.id);
    if (existing) {
      existing.status = status;
      existing.modified = stamp;
    } else {
      a.shows.push({ show, status, modified: stamp, added: stamp });
    }
    // Re-adding a show the tombstone still remembers has to clear it, or the
    // merge reads "removed after the add" and takes it straight back out.
    a.showTombstones = dropTombstone(a.showTombstones, show.id);
  });
}

export async function untrackShow(id: number) {
  return withArchive((a, stamp) => {
    a.shows = a.shows.filter((s) => s.show.id !== id);
    a.showTombstones = [...dropTombstone(a.showTombstones, id), { id, removed: stamp }];
  });
}

export async function setEpisodeWatched(showID: number, season: number, episode: number, watched: boolean) {
  const key = `${showID}-${season}-${episode}`;
  return withArchive((a, stamp) => {
    const set = new Set(a.watched);
    a.watchedDates ??= {};
    a.watchedStamps ??= {};
    if (watched) {
      set.add(key);
      // First viewing date is never rewritten — the app's rule, kept here.
      a.watchedDates[key] ??= stamp;
    } else {
      set.delete(key);
      delete a.watchedDates[key];
    }
    // The stamp moves either way. Present in stamps and absent from watched is
    // how an uncheck survives a merge.
    a.watchedStamps[key] = stamp;
    a.watched = [...set];
    const tracked = a.shows.find((s) => s.show.id === showID);
    if (tracked) tracked.modified = stamp;
  });
}

// ---- Movies ----

export async function trackMovie(movie: Movie, status: MovieStatus = "To Watch") {
  return withArchive((a, stamp) => {
    const existing = a.movies.find((m) => m.movie.id === movie.id);
    if (existing) {
      existing.status = status;
      existing.modified = stamp;
    } else {
      a.movies.push({ movie, status, modified: stamp, added: stamp });
    }
    a.movieTombstones = dropTombstone(a.movieTombstones, movie.id);
    a.watchedMovies ??= [];
    a.movieWatchedDates ??= {};
    if (status === "Watched") {
      if (!a.watchedMovies.includes(movie.id)) a.watchedMovies.push(movie.id);
      a.movieWatchedDates[String(movie.id)] ??= stamp;
    }
  });
}

export async function untrackMovie(id: number) {
  return withArchive((a, stamp) => {
    a.movies = a.movies.filter((m) => m.movie.id !== id);
    a.movieTombstones = [...dropTombstone(a.movieTombstones, id), { id, removed: stamp }];
  });
}

// ---- Reactions ----

/**
 * The heart. `loved` is what the app's Favorites shelf reads, keyed
 * "show:ID" / "movie:ID" (see ReactionTarget in Models.swift). Setting it on
 * a title that isn't tracked yet adds the title first — a favorite with no
 * record under it would have nowhere to show.
 */
export async function setLoved(target: { kind: "show"; show: Show } | { kind: "movie"; movie: Movie }, loved: boolean) {
  return withArchive((a, stamp) => {
    const key = target.kind === "show" ? `show:${target.show.id}` : `movie:${target.movie.id}`;
    a.reactions ??= {};
    if (loved) a.reactions[key] = "loved";
    else delete a.reactions[key];
    // The heart and the Loved it mood are the same statement, so setting one
    // sets the other. Without this a title could be a favorite while its
    // moods said nothing, and the log dialog — which draws the heart from the
    // mood — would open looking unloved.
    a.moods ??= {};
    const current = a.moods[key] ?? [];
    if (loved) {
      if (!current.includes("lovedIt")) a.moods[key] = [...current, "lovedIt"].slice(0, 3);
    } else {
      const without = current.filter((m) => m !== "lovedIt");
      if (without.length) a.moods[key] = without;
      else delete a.moods[key];
    }
    if (target.kind === "show") {
      const t = a.shows.find((s) => s.show.id === target.show.id);
      if (t) t.modified = stamp;
      else if (loved) {
        a.shows.push({ show: target.show, status: "Watching", modified: stamp, added: stamp });
        a.showTombstones = dropTombstone(a.showTombstones, target.show.id);
      }
    } else {
      const t = a.movies.find((m) => m.movie.id === target.movie.id);
      if (t) t.modified = stamp;
      else if (loved) {
        a.movies.push({ movie: target.movie, status: "To Watch", modified: stamp, added: stamp });
        a.movieTombstones = dropTombstone(a.movieTombstones, target.movie.id);
      }
    }
  });
}

// ---- Rating ----

/** Out of ten in half steps, the app's scale (0.5–10). Null clears it — never a stored zero. */
export async function setRating(target: { kind: "show"; show: Show } | { kind: "movie"; movie: Movie }, score: number | null) {
  return withArchive((a, stamp) => {
    const key = target.kind === "show" ? `show:${target.show.id}` : `movie:${target.movie.id}`;
    a.ratings ??= {};
    if (score === null) delete a.ratings[key];
    else a.ratings[key] = Math.max(0.5, Math.min(10, Math.round(score * 2) / 2));
    touch(a, target, stamp);
  });
}

// ---- Custom lists ----

const LIST_LIMIT = 20; // Library.customListLimit

export async function createList(name: string) {
  const trimmed = name.trim().slice(0, 60);
  if (!trimmed) return { error: "Give the list a name." as string | undefined, id: "" };
  // Swift encodes UUIDs uppercase; matching that keeps a diff of the archive
  // readable, though the decoder accepts either case.
  const id = crypto.randomUUID().toUpperCase();
  const r = await withArchive((a, stamp) => {
    a.customLists ??= [];
    if (a.customLists.length >= LIST_LIMIT) throw new Error(`Kodigo keeps to ${LIST_LIMIT} lists.`);
    a.customLists.push({ id, name: trimmed, showIDs: [], movieIDs: [], created: stamp });
    a.customListOrder = [...(a.customListOrder ?? []), id];
  });
  return { ...r, id };
}

export async function setOnList(listID: string, target: { kind: "show"; show: Show } | { kind: "movie"; movie: Movie }, on: boolean) {
  return withArchive((a, stamp) => {
    const list = a.customLists?.find((l) => l.id === listID);
    if (!list) throw new Error("That list is gone.");
    const key = target.kind === "show" ? "showIDs" : "movieIDs";
    const id = target.kind === "show" ? target.show.id : target.movie.id;
    const ids = new Set(list[key] ?? []);
    if (on) ids.add(id);
    else ids.delete(id);
    list[key] = [...ids];
    // A listed title needs a record under it, the same way a favorite does.
    if (on) ensureTracked(a, target, stamp);
    else touch(a, target, stamp);
  });
}

/** Bumps the title's `modified` if it's tracked; a no-op otherwise. */
function touch(a: LibraryArchive, target: { kind: "show"; show: Show } | { kind: "movie"; movie: Movie }, stamp: string) {
  if (target.kind === "show") {
    const t = a.shows.find((s) => s.show.id === target.show.id);
    if (t) t.modified = stamp;
  } else {
    const t = a.movies.find((m) => m.movie.id === target.movie.id);
    if (t) t.modified = stamp;
  }
}

function ensureTracked(a: LibraryArchive, target: { kind: "show"; show: Show } | { kind: "movie"; movie: Movie }, stamp: string) {
  if (target.kind === "show") {
    const t = a.shows.find((s) => s.show.id === target.show.id);
    if (t) t.modified = stamp;
    else {
      a.shows.push({ show: target.show, status: "Watching", modified: stamp, added: stamp });
      a.showTombstones = dropTombstone(a.showTombstones, target.show.id);
    }
  } else {
    const t = a.movies.find((m) => m.movie.id === target.movie.id);
    if (t) t.modified = stamp;
    else {
      a.movies.push({ movie: target.movie, status: "To Watch", modified: stamp, added: stamp });
      a.movieTombstones = dropTombstone(a.movieTombstones, target.movie.id);
    }
  }
}

// ---- Reviews ----

export type ReviewInput = {
  text: string;
  /** Mood ids, at most three — the app's `Library.moodLimit`. */
  moods?: string[];
  /** "YYYY-MM-DD" or empty for no date. */
  watchedOn: string;
  rewatch: boolean;
  spoilers: boolean;
  rating: number | null;
  loved: boolean;
};

/**
 * "Review & catalogue" in one write: the review text, the rating, the heart,
 * and the fact of having watched it. A film goes to Watched with the given day
 * as its first-watch date (never rewritten, the app's rule); a show is tracked
 * as Watching, since a whole show isn't one tick. Empty text with no rating
 * and no heart still counts as a log — the person said they watched it.
 */
export async function saveReview(target: { kind: "show"; show: Show } | { kind: "movie"; movie: Movie }, input: ReviewInput) {
  return withArchive((a, stamp) => {
    const key = target.kind === "show" ? `show:${target.show.id}` : `movie:${target.movie.id}`;
    const text = input.text.trim().slice(0, 10_000);
    a.reviews ??= {};
    if (text || input.watchedOn) {
      a.reviews[key] = {
        text,
        watchedOn: /^\d{4}-\d{2}-\d{2}$/.test(input.watchedOn) ? input.watchedOn : undefined,
        rewatch: input.rewatch || undefined,
        spoilers: input.spoilers || undefined,
        modified: stamp,
      };
    } else {
      delete a.reviews[key];
    }

    a.ratings ??= {};
    if (input.rating === null) delete a.ratings[key];
    else a.ratings[key] = Math.max(0.5, Math.min(10, Math.round(input.rating * 2) / 2));

    a.reactions ??= {};
    if (input.loved) a.reactions[key] = "loved";
    else delete a.reactions[key];

    // Moods are keyed the same way and capped at three, so a library written
    // here decodes into the app's picker without it having to trim anything.
    a.moods ??= {};
    const moods = (input.moods ?? []).slice(0, 3);
    if (moods.length) a.moods[key] = moods;
    else delete a.moods[key];

    if (target.kind === "movie") {
      const existing = a.movies.find((m) => m.movie.id === target.movie.id);
      if (existing) {
        existing.status = "Watched";
        existing.modified = stamp;
      } else {
        a.movies.push({ movie: target.movie, status: "Watched", modified: stamp, added: stamp });
      }
      a.movieTombstones = dropTombstone(a.movieTombstones, target.movie.id);
      a.watchedMovies ??= [];
      a.movieWatchedDates ??= {};
      if (!a.watchedMovies.includes(target.movie.id)) a.watchedMovies.push(target.movie.id);
      const day = /^\d{4}-\d{2}-\d{2}$/.test(input.watchedOn) ? `${input.watchedOn}T12:00:00Z` : stamp;
      a.movieWatchedDates[String(target.movie.id)] ??= day;
    } else {
      ensureTracked(a, target, stamp);
    }
  });
}

export async function deleteReview(target: { kind: "show"; show: Show } | { kind: "movie"; movie: Movie }) {
  return withArchive((a, stamp) => {
    const key = target.kind === "show" ? `show:${target.show.id}` : `movie:${target.movie.id}`;
    if (a.reviews) delete a.reviews[key];
    touch(a, target, stamp);
  });
}
