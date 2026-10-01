"use client";

import { episodeBadge, type EpisodeFacts } from "@/lib/episode-badge";
import { EpisodePill, useToday } from "./TrackerRow";

/** An episode's badge (FINALE, NEW and the rest) as the Tracker's pill, for a
    page drawn on the server: the facts come from TMDB there, and the badge is
    decided here, on the viewer's own day. Nothing until the page is up. */
export function EpisodeBadgePill({ facts }: { facts?: EpisodeFacts }) {
  const today = useToday();
  return <EpisodePill badge={today ? episodeBadge(facts, today) : null} />;
}
