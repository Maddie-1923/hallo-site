"use client";

import Link from "next/link";
import { useState } from "react";
import type { ProfileTitle, TrackerShow } from "@/lib/public-profile";

// The profile's mini tracker: what they're watching now, at a glance. Series
// in progress with what's up next and how far along they are, or films on the
// watchlist. It is a dashboard, not the tracker itself: the full tracker has
// its own page, and "Open tracker" goes there.
//
// The owner gets a check on each row: mark the next episode watched, or mark
// a film watched. Until accounts and the database exist this changes only the
// page being looked at, to show how it behaves; nothing is saved.
// Five rows, kept low so they fit beside the Favourites card; the rest is in
// the full tracker.
const SHOWN = 5;

export function MiniTracker({ shows, films, owner }: { shows: TrackerShow[]; films: ProfileTitle[]; owner: boolean }) {
  const [tab, setTab] = useState<"show" | "movie">("show");
  const [seen, setSeen] = useState<Record<string, string[]>>(() => Object.fromEntries(shows.map((s) => [s.key, s.seen])));
  const [watchedFilms, setWatchedFilms] = useState<string[]>([]);

  const filmsLeft = films.filter((f) => !watchedFilms.includes(f.key));

  return (
    <div className="flex-1 rounded-[24px] bg-card border border-hair px-[clamp(14px,1.6vw,20px)] py-3.5 flex flex-col">
      <div className="flex items-center justify-between gap-3 mb-1">
        <div className="text-[11px] font-bold tracking-[.14em] uppercase text-dim">Watching now</div>
        <div className="inline-flex p-[3px] rounded-full bg-page border border-hair">
          {(
            [
              ["show", "Shows"],
              ["movie", "Films"],
            ] as const
          ).map(([k, label]) => (
            <button
              key={k}
              type="button"
              aria-pressed={tab === k}
              onClick={() => setTab(k)}
              className={`px-3 py-0.5 rounded-full text-[12px] font-semibold cursor-pointer transition-colors ${tab === k ? "bg-ink text-page" : "text-dim hover:text-ink"}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <ul className="m-0 p-0 list-none flex-1">
        {tab === "show" &&
          (shows.length === 0 ? (
            <li className="text-sm text-dim py-3">Not in the middle of anything.</li>
          ) : (
            shows.slice(0, SHOWN).map((s, i) => {
              const p = progress(s, seen[s.key] ?? []);
              return (
                <Row
                  key={s.key}
                  first={i === 0}
                  t={s}
                  line={`${p.next ? `Up next ${p.next.label}` : p.total ? "All caught up" : "In progress"}${p.total ? ` · ${p.done} of ${p.total}` : ""}`}
                  bar={p.total ? { done: p.done, total: p.total } : null}
                  action={
                    owner && p.next
                      ? {
                          label: `Mark ${p.next.label} of ${s.title} watched`,
                          run: () => setSeen((m) => ({ ...m, [s.key]: [...(m[s.key] ?? []), p.next!.key] })),
                        }
                      : null
                  }
                />
              );
            })
          ))}
        {tab === "movie" &&
          (filmsLeft.length === 0 ? (
            <li className="text-sm text-dim py-3">Nothing on the watchlist.</li>
          ) : (
            filmsLeft.slice(0, SHOWN).map((f, i) => (
              <Row
                key={f.key}
                first={i === 0}
                t={f}
                line={f.year ? `On the watchlist · ${f.year}` : "On the watchlist"}
                bar={null}
                action={owner ? { label: `Mark ${f.title} watched`, run: () => setWatchedFilms((w) => [...w, f.key]) } : null}
              />
            ))
          ))}
      </ul>

      {owner && (
        <div className="pt-1.5 border-t border-hair text-right">
          <span className="text-[12.5px] font-semibold text-dim" title="The full tracker page comes with accounts on the web">
            Open tracker →
          </span>
        </div>
      )}
    </div>
  );
}

function Row({
  t,
  line,
  bar,
  action,
  first,
}: {
  t: ProfileTitle;
  line: string;
  bar: { done: number; total: number } | null;
  action: { label: string; run: () => void } | null;
  first: boolean;
}) {
  return (
    <li className={`flex items-center gap-3 py-[3px] ${first ? "" : "border-t border-hair"}`}>
      <Link href={t.href} className="w-[52px] aspect-video rounded-[5px] overflow-hidden bg-card-hi shrink-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {(t.backdrop ?? t.poster) && <img src={(t.backdrop ?? t.poster)!} alt="" className="w-full h-full object-cover" />}
      </Link>
      <div className="min-w-0 flex-1">
        <Link href={t.href} className="block text-[13px] leading-[17px] font-semibold text-ink truncate no-underline hover:text-accent">
          {t.title}
        </Link>
        <div className="text-[11.5px] leading-[15px] text-dim truncate">{line}</div>
        {bar && (
          <span className="block mt-[3px] h-[3px] rounded-full bg-card-hi overflow-hidden">
            <span className="block h-full rounded-full bg-accent-fill" style={{ width: `${Math.round((bar.done / bar.total) * 100)}%` }} />
          </span>
        )}
      </div>
      {action && (
        <button
          type="button"
          onClick={action.run}
          aria-label={action.label}
          title={action.label}
          className="w-6 h-6 rounded-full border border-hair text-dim hover:bg-accent-fill hover:text-on-accent hover:border-accent-fill flex items-center justify-center cursor-pointer transition-colors shrink-0"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M5 12l5 5L20 7" />
          </svg>
        </button>
      )}
    </li>
  );
}

// Where they are in a series: episodes seen of those aired, and the next one
// to watch, which is the first unseen episode after the last one they saw
// (an older gap they skipped is only offered once nothing is left after it).
function progress(s: TrackerShow, seen: string[]) {
  if (!s.aired) return { done: 0, total: 0, next: null as null | { key: string; label: string } };
  const all: [number, number][] = [];
  s.aired.forEach((n, i) => {
    for (let e = 1; e <= n; e++) all.push([i + 1, e]);
  });
  const set = new Set(seen);
  const done = all.filter(([a, b]) => set.has(`${a}-${b}`)).length;
  let lastIdx = -1;
  all.forEach(([a, b], i) => {
    if (set.has(`${a}-${b}`)) lastIdx = i;
  });
  const unseen = all.map((x, i) => [x, i] as const).filter(([[a, b]]) => !set.has(`${a}-${b}`));
  const pick = unseen.find(([, i]) => i > lastIdx) ?? unseen[0];
  const next = pick ? { key: `${pick[0][0]}-${pick[0][1]}`, label: `S${pick[0][0]} E${pick[0][1]}` } : null;
  return { done, total: all.length, next };
}
