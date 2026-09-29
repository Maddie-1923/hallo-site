"use client";

import Link from "next/link";
import type { ProfileTitle } from "@/lib/public-profile";
import { useLiveWatches } from "@/lib/live-watches";
import { Day } from "./Day";

export type ActivityItem = { key: string; date: string; t: ProfileTitle; verb: string; detail?: string; rating?: number | null; loved?: boolean };

// Recent activity: the profile's watches and reviews, newest first, plus
// anything just marked watched in the tracker on this page, which goes on
// top as it lands.
export function ActivityFeed({ items }: { items: ActivityItem[] }) {
  const live = useLiveWatches();
  const all: ActivityItem[] = [...live.map((w): ActivityItem => ({ key: `live-${w.key}`, date: w.date, t: w.t, verb: "Watched", detail: w.detail })), ...items].slice(0, 10);
  if (all.length === 0) return <p className="text-[12.5px] text-dim m-0">Nothing yet.</p>;
  return (
    // Each entry in its own rounded shell, as in the Watchlog.
    <ul className="m-0 p-0 list-none grid gap-2">
      {all.map((it) => (
        <li key={it.key} className="rounded-shell bg-card-hi">
          <Link href={it.t.href} className="group flex items-center gap-4 px-3 py-2 no-underline text-ink">
            <span className="w-[72px] aspect-video rounded-[6px] overflow-hidden bg-card shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {it.t.backdrop && <img src={it.t.backdrop} alt="" className="w-full h-full object-cover" />}
            </span>
            <span className="min-w-0 flex-1 text-[12.5px]">
              <span className="text-dim">{it.verb} </span>
              <span className="font-semibold group-hover:text-accent transition-colors">{it.t.title}</span>
              {it.detail && <span className="text-dim"> · {it.detail}</span>}
            </span>
            <span className="flex items-center gap-2.5 shrink-0 text-[12.5px]">
              {it.rating != null && (
                <span className="whitespace-nowrap text-accent font-semibold text-[12.5px]">♥ {Number.isInteger(it.rating) ? it.rating : it.rating.toFixed(1)}</span>
              )}
              {it.loved && <span className="text-loved">♥</span>}
              <span className="text-dim w-[92px] text-right"><Day iso={it.date} style="short" /></span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
