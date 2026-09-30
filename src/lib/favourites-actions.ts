"use server";

import { image, searchTitles } from "./tmdb";
import type { ProfileTitle } from "./public-profile";

/** Search for the Favourites picker: films or series only, as profile titles.
    Runs on the server so the TMDB key never reaches the browser. */
export async function searchForFavourites(query: string, kind: "movie" | "show"): Promise<ProfileTitle[]> {
  const q = query.trim().slice(0, 100);
  if (q.length < 2) return [];
  const hits = await searchTitles(q);
  const out: ProfileTitle[] = [];
  for (const h of hits) {
    if (h.kind !== kind) continue;
    const t = h.kind === "show" ? h.show : h.movie;
    if (!t.poster_path) continue;
    out.push({
      key: `${h.kind === "show" ? "s" : "m"}${t.id}`,
      kind: h.kind,
      title: h.kind === "show" ? h.show.name : h.movie.title,
      href: `/${h.kind}/${t.id}`,
      poster: image.poster(t.poster_path, "w780"),
      backdrop: image.backdrop(t.backdrop_path),
      year: ((h.kind === "show" ? h.show.first_air_date : h.movie.release_date) ?? "").slice(0, 4),
    });
  }
  return out.slice(0, 18);
}
