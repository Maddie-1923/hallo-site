"use client";

import { code, progress, Row } from "./TrackerRow";
import { MASKED_NAME, useSpoilers } from "./Spoiler";
import { useDateFormat } from "./Day";
import type { TrackerShow } from "@/lib/public-profile";

// The profile's Watching now tab: every series they're partway through, last
// watched first, each as the tracker's list row: the next episode (its name
// hidden with spoilers on), when they last watched, and a bar of how far
// they are through what has aired. Read-only; the keys are the tracker's.
export function WatchingNow({ shows }: { shows: (TrackerShow & { lastWatched: string | null })[] }) {
  const hideNames = useSpoilers().names;
  const fmt = useDateFormat();
  return (
    <ul className="m-0 p-0 list-none grid gap-2 xl:grid-cols-2">
      {shows.map((s) => {
        const p = progress(s, s.seen);
        const when = s.lastWatched ? `Last watched ${fmt(s.lastWatched, "dayMonth")}` : "";
        const first = p.next ? [code(p.next.key), when].filter(Boolean).join(" · ") : p.total ? "All caught up" : when || "In progress";
        const second = p.next ? (hideNames ? MASKED_NAME : (s.episodeNames?.[p.next.key] ?? "")) : p.total ? `${p.done} of ${p.total} episodes` : "";
        return <Row key={s.key} t={s} lines={[first, second]} bar={p.total ? { done: p.done, total: p.total } : null} keys={null} />;
      })}
    </ul>
  );
}
