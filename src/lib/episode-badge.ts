// The app's episode badges (`Library.badge(for:)` and `EpisodeBadge` in the
// iOS repo): PREMIERE, MID-SEASON FINALE, FINALE, AIRS TODAY and NEW, one per
// episode, drawn as a band across the foot of its picture.
//
// Split in two because the badge hangs on the calendar day. The server knows
// what TMDB says about an episode (its date, how an editor marked it, whether
// it opens a season still airing) and sends those facts; the browser, which
// knows what day it is where the person is sitting, decides the badge. A
// badge worked out on the server would be a day out for half the world
// around midnight.

import type { RawEpisode } from "./tmdb";

/** What TMDB says about one episode, as far as a badge cares. Absent where
    it says nothing, which draws no badge rather than a guess. */
export type EpisodeFacts = {
  /** "YYYY-MM-DD", where TMDB has dated it. */
  date?: string;
  /** TMDB's `episode_type` where an editor has marked a finale. */
  turn?: "finale" | "mid_season";
  /** Episode 1 of the show's latest season: the last date that season has,
      or null while it still has undated episodes or none dated at all
      (announced but unscheduled, which can't be over). */
  opener?: { runsTo: string | null };
};

export type EpisodeBadge = {
  text: string;
  tone: "starting" | "pausing";
  /** A season marker that also airs today: the band splits, TODAY in the
      starting colour on its second half. */
  today?: boolean;
  /** What the band says aloud. */
  label: string;
};

/** The badge for an episode on `today` ("YYYY-MM-DD", the viewer's day), in
    the app's order: a season marker first, then the calendar. */
export function episodeBadge(f: EpisodeFacts | undefined, today: string): EpisodeBadge | null {
  if (!f) return null;
  const airsToday = f.date === today;
  // The opener of the current season, held for as long as that season is
  // still airing: a season whose last dated episode is still to come.
  if (f.opener && (f.opener.runsTo === null || f.opener.runsTo > today)) {
    return { text: "PREMIERE", tone: "starting", today: airsToday, label: "Season premiere" };
  }
  // An editor's marking, and only on an episode TMDB has dated: one it hasn't
  // is one it hasn't finished describing.
  if (f.date && f.turn === "finale") return { text: "FINALE", tone: "pausing", today: airsToday, label: "Season finale" };
  if (f.date && f.turn === "mid_season") return { text: "MID-SEASON FINALE", tone: "pausing", today: airsToday, label: "Mid-season finale" };
  if (airsToday) return { text: "AIRS TODAY", tone: "starting", label: "Airs today" };
  // NEW for a week: the app counts seven days from the air date's midnight,
  // which a date alone leaves at one to six days back.
  if (f.date) {
    const ago = Math.round((Date.parse(today) - Date.parse(f.date)) / 86_400_000);
    if (ago >= 1 && ago <= 6) return { text: "NEW", tone: "starting", label: "New episode" };
  }
  return null;
}

/** The latest season a show has episodes in, as the app counts it: specials
    aside, and an announced season with nothing listed yet doesn't count. */
export function latestSeason(seasons: { season_number: number; episode_count: number }[]) {
  return Math.max(0, ...seasons.filter((s) => s.season_number > 0 && s.episode_count > 0).map((s) => s.season_number));
}

/** Facts for a season's episodes, keyed "season-episode", keeping only those
    that could wear a badge within a few days of `today` (the server's day; the
    window is wide enough for any viewer's), so the page carries a handful per
    show rather than every episode of two seasons. */
export function seasonFacts(episodes: RawEpisode[], latest: number, today: string): Record<string, EpisodeFacts> {
  const out: Record<string, EpisodeFacts> = {};
  const days = (d: string) => Math.round((Date.parse(d) - Date.parse(today)) / 86_400_000);
  const dated = episodes.map((e) => e.air_date).filter((d): d is string => !!d);
  const runsTo = dated.length === 0 || dated.length < episodes.length ? null : dated.reduce((a, b) => (a > b ? a : b));
  for (const e of episodes) {
    const f: EpisodeFacts = {};
    if (e.air_date) f.date = e.air_date;
    if (e.air_date && (e.episode_type === "finale" || e.episode_type === "mid_season")) f.turn = e.episode_type;
    // An opener whose season ended more than a day ago can't be badged anywhere.
    if (e.season_number === latest && e.episode_number === 1 && (runsTo === null || days(runsTo) >= -1)) f.opener = { runsTo };
    const near = f.date ? days(f.date) >= -8 && days(f.date) <= 2 : false;
    if (f.turn || f.opener || near) out[`${e.season_number}-${e.episode_number}`] = f;
  }
  return out;
}
