"use client";

import { useOptimistic, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setEpisodeWatched } from "@/lib/library-actions";
import type { RawEpisode } from "@/lib/tmdb";

// The per-season checklist. Optimistic so a tick lands the instant it's
// clicked; the server action confirms it and the router refresh reconciles.
// `canTrack` is false for a show that isn't in the library yet — the boxes
// still draw, greyed, so the page reads the same either way.
export function EpisodeList({
  showID,
  episodes,
  watched,
  canTrack,
}: {
  showID: number;
  episodes: RawEpisode[];
  watched: string[];
  canTrack: boolean;
}) {
  const router = useRouter();
  const [, start] = useTransition();
  const [optimistic, setOptimistic] = useOptimistic(new Set(watched), (set: Set<string>, change: { key: string; on: boolean }) => {
    const next = new Set(set);
    if (change.on) next.add(change.key);
    else next.delete(change.key);
    return next;
  });
  const today = new Date().toISOString().slice(0, 10);

  return (
    <ul className="m-0 p-0 list-none divide-y divide-hair">
      {episodes.map((ep) => {
        const key = `${showID}-${ep.season_number}-${ep.episode_number}`;
        const on = optimistic.has(key);
        const aired = !!ep.air_date && ep.air_date <= today;
        return (
          <li key={ep.id} className="flex items-center gap-4 py-3">
            <input
              type="checkbox"
              className="w-5 h-5 accent-[var(--accent)] shrink-0"
              checked={on}
              disabled={!canTrack}
              aria-label={`Watched ${ep.name}`}
              onChange={(e) => {
                const next = e.target.checked;
                start(async () => {
                  setOptimistic({ key, on: next });
                  await setEpisodeWatched(showID, ep.season_number, ep.episode_number, next);
                  router.refresh();
                });
              }}
            />
            <div className="min-w-0 flex-1">
              <div className={`text-[15px] font-semibold leading-tight ${aired ? "" : "text-dim"}`}>
                <span className="text-dim font-normal mr-2">{ep.episode_number}</span>
                {ep.name}
              </div>
              <div className="text-xs text-dim mt-0.5">
                {ep.air_date ?? "Unscheduled"}
                {ep.runtime ? ` · ${ep.runtime} min` : ""}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
