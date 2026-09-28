"use server";

import { seasonEpisodes } from "./tmdb";

/** One season's episodes, for the season list on a show's page, fetched when
    the season is opened. */
export async function loadSeason(showID: number, season: number) {
  const eps = await seasonEpisodes(showID, season);
  return eps.map((e) => ({ season: e.season_number, episode: e.episode_number, name: e.name, airDate: e.air_date ?? null }));
}
