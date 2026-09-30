"use server";

import type { Review } from "./archive";
import { markLookup } from "./marks";
import { optionalLibrary } from "./library";
import { searchTitles, type SearchHit } from "./tmdb";

// "+ Log" in the bar (components/LogButton.tsx): find a title from anywhere,
// then the review dialog every title page opens, filled in with what's
// already logged for it.

/** Films and series matching what's typed, most popular first. */
export async function logSearch(query: string): Promise<SearchHit[]> {
  const q = query.trim().slice(0, 80);
  if (q.length < 2) return [];
  return (await searchTitles(q)).slice(0, 8);
}

/** What the signed-in person has already logged for a title, to start the dialog from. */
export async function logState(kind: "show" | "movie", id: number): Promise<{ review: Review | null; rating: number | null; moods: string[] } | null> {
  const { signedIn, archive } = await optionalLibrary();
  if (!signedIn || !Number.isInteger(id)) return null;
  const marks = markLookup(archive);
  const state = kind === "show" ? marks.show(id) : marks.movie(id);
  return { review: state.review, rating: state.rating, moods: state.moods };
}
