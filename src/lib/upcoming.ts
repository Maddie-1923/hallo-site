import "server-only";
import type { LibraryArchive, Show } from "./archive";
import { orderedShows } from "./archive";
import { showDetail, type RawEpisode } from "./tmdb";

export interface Upcoming {
  show: Show;
  episode: RawEpisode;
  /** Days from today: 0 is today, 1 tomorrow. */
  inDays: number;
}

// What the bell holds: the next episode of each show being watched, when it
// lands inside the coming week. One detail request per show, cached an hour
// by the TMDB client, and capped so a three-hundred-show library doesn't turn
// the nav into three hundred requests.
export async function upcomingEpisodes(archive: LibraryArchive | null, days = 7, limit = 40): Promise<Upcoming[]> {
  if (!archive) return [];
  const watching = orderedShows(archive)
    .filter((t) => t.status === "Watching")
    .slice(0, limit);
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const details = await Promise.all(watching.map((t) => showDetail(t.show.id)));
  const out: Upcoming[] = [];
  for (const d of details) {
    const ep = d?.nextEpisode;
    if (!d || !ep?.air_date) continue;
    const inDays = Math.round((new Date(ep.air_date).getTime() - today.getTime()) / 86_400_000);
    if (inDays < 0 || inDays > days) continue;
    out.push({ show: d.show, episode: ep, inDays });
  }
  return out.sort((a, b) => a.inDays - b.inDays || a.show.name.localeCompare(b.show.name));
}

export function whenLabel(inDays: number) {
  if (inDays === 0) return "Today";
  if (inDays === 1) return "Tomorrow";
  return `In ${inDays} days`;
}
