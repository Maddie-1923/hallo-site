"use client";

import Link from "next/link";
import { HeadingPill } from "./TitleParts";
import { useState } from "react";
import { addWatch, today } from "@/lib/live-watches";
import { CheckGlyph, code, HOLD, MoreGlyph, progress, RecapGlyph, Row, SkipGlyph } from "./TrackerRow";
import type { ProfileTitle, TrackerShow } from "@/lib/public-profile";

// The profile's mini tracker: what they're watching now, at a glance. Series
// in progress with what's up next and how far along they are, or films on the
// watchlist. It is a dashboard, not the tracker itself: the full tracker has
// its own page, and "Open tracker" goes there.
//
// The owner gets a check on each row: mark the next episode watched, or mark
// a film watched. Until accounts and the database exist this changes only the
// page being looked at, to show how it behaves; nothing is saved.

export function MiniTracker({ shows, films, owner }: { shows: TrackerShow[]; films: ProfileTitle[]; owner: boolean }) {
  const [tab, setTab] = useState<"show" | "movie">("show");
  const [seen, setSeen] = useState<Record<string, string[]>>(() => Object.fromEntries(shows.map((s) => [s.key, s.seen])));
  const [watchedFilms, setWatchedFilms] = useState<string[]>([]);
  // Episodes set aside for later with the skip key, as "show:season-episode".
  const [skipped, setSkipped] = useState<string[]>([]);

  const filmsLeft = films.filter((f) => !watchedFilms.includes(f.key));

  return (
    <div className="flex-1 rounded-shell bg-card border border-hair p-2 flex flex-col">
      {/* Headed like Favourites beside it: the card's name, then the
          section's in small capitals, "Up next" as the app calls it. */}
      <div className="flex items-center justify-between gap-2">
        <HeadingPill small>Tracker</HeadingPill>
        <div className="inline-flex p-1 rounded-full bg-piece">
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
              className={`px-4 py-2 rounded-full text-[10.5px] leading-none font-bold uppercase tracking-[.12em] cursor-pointer transition-colors ${tab === k ? "bg-ink text-page" : "text-dim hover:text-ink"}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3 mb-2 px-1 text-[10.5px] font-bold tracking-[.12em] uppercase text-dim">Up next</div>

      {/* The list scrolls inside the card rather than making it taller: it is
          laid over the space the card has, so its length never counts toward
          the card's height, which Favourites beside it sets. */}
      <div className="relative flex-1 min-h-[240px] -mx-1">
        <ul className="soft-scroll absolute inset-0 overflow-y-auto overscroll-contain m-0 px-1 pb-1 list-none grid gap-2 content-start rounded-shell">
          {tab === "show" &&
            (shows.length === 0 ? (
              <li className="text-[12.5px] text-dim py-3">Not in the middle of anything.</li>
            ) : (
              shows.map((s) => {
                const p = progress(s, seen[s.key] ?? []);
                const skippedHere = p.next ? skipped.includes(`${s.key}:${p.next.key}`) : false;
                return (
                  <Row
                    key={s.key}
                    t={s}
                    lines={p.next ? [code(p.next.key), s.episodeNames?.[p.next.key] ?? ""] : [p.total ? "All caught up" : "In progress", ""]}
                    bar={p.total ? { done: p.done, total: p.total } : null}
                    keys={
                      owner
                        ? [
                            { icon: <MoreGlyph />, label: `More for ${s.title}` },
                            { icon: <RecapGlyph />, label: "Recap", off: true },
                            {
                              icon: <SkipGlyph />,
                              label: p.next ? `Watch ${code(p.next.key)} later` : "Skip",
                              on: skippedHere,
                              off: !p.next,
                              // Setting it aside plays the confirmation in the
                              // hold's amber; taking it back doesn't.
                              confirm: skippedHere ? undefined : HOLD,
                              run: p.next ? () => setSkipped((k) => (skippedHere ? k.filter((x) => x !== `${s.key}:${p.next!.key}`) : [...k, `${s.key}:${p.next!.key}`])) : undefined,
                            },
                            {
                              icon: <CheckGlyph />,
                              label: p.next ? `Mark ${code(p.next.key)} of ${s.title} watched` : "Watched",
                              off: !p.next,
                              confirm: "var(--accent-fill)",
                              run: p.next
                                ? () => {
                                    const n = p.next!;
                                    setSeen((m) => ({ ...m, [s.key]: [...(m[s.key] ?? []), n.key] }));
                                    const [se, ep] = n.key.split("-");
                                    addWatch({ key: `${s.key}-${n.key}-${Date.now()}`, date: today(), t: s, detail: `S${se} E${ep}` });
                                  }
                                : undefined,
                            },
                          ]
                        : null
                    }
                  />
                );
              })
            ))}
          {tab === "movie" &&
            (filmsLeft.length === 0 ? (
              <li className="text-[12.5px] text-dim py-3">Nothing on the watchlist.</li>
            ) : (
              filmsLeft.map((f) => (
                <Row
                  key={f.key}
                  t={f}
                  lines={[f.year, "On the watchlist"]}
                  bar={null}
                  keys={
                    owner
                      ? [
                          { icon: <MoreGlyph />, label: `More for ${f.title}` },
                          {
                            icon: <CheckGlyph />,
                            label: `Mark ${f.title} watched`,
                            confirm: "var(--accent-fill)",
                            run: () => {
                              setWatchedFilms((w) => [...w, f.key]);
                              addWatch({ key: `${f.key}-${Date.now()}`, date: today(), t: f });
                            },
                          },
                        ]
                      : null
                  }
                />
              ))
            ))}
        </ul>
      </div>

      {owner && (
        <div className="mt-2 pt-1.5 border-t border-hair text-right">
          <Link href="/tracker" className="text-[12.5px] font-semibold text-accent no-underline hover:underline">
            Open tracker →
          </Link>
        </div>
      )}
    </div>
  );
}
