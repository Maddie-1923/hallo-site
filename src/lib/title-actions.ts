"use server";

import { image, seasonEpisodes } from "./tmdb";

/** One season's episodes, for the season list on a show's page, fetched when
    the season is opened: enough of each for the list's rows and for the
    small episode page beside the list. */
export async function loadSeason(showID: number, season: number) {
  const eps = await seasonEpisodes(showID, season);
  return eps.map((e) => ({
    season: e.season_number,
    episode: e.episode_number,
    name: e.name,
    airDate: e.air_date ?? null,
    overview: e.overview || null,
    still: image.backdrop(e.still_path),
    runtime: e.runtime ?? null,
    vote: e.vote_average || null,
    directors: (e.crew ?? []).filter((c) => c.job === "Director").map((c) => ({ id: c.id, name: c.name })),
  }));
}

export type SeasonEpisode = Awaited<ReturnType<typeof loadSeason>>[number];
