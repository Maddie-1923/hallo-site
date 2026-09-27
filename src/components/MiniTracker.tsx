"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { addWatch, today } from "@/lib/live-watches";
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
    <div className="flex-1 rounded-[24px] bg-card border border-hair px-[clamp(14px,1.6vw,20px)] py-3.5 flex flex-col">
      {/* Headed like Favourites beside it: the card's name, then the
          section's in small capitals, "Up next" as the app calls it. */}
      <div className="h-7 flex items-center justify-between gap-3">
        <h2 className="!text-[clamp(22px,2vw,28px)] leading-none">Tracker</h2>
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

      <div className="mt-3 mb-2 text-[11px] font-bold tracking-[.14em] uppercase text-dim">Up next</div>

      {/* The list scrolls inside the card rather than making it taller: it is
          laid over the space the card has, so its length never counts toward
          the card's height, which Favourites beside it sets. */}
      <div className="relative flex-1 min-h-[240px] -mx-1">
        <ul className="soft-scroll absolute inset-0 overflow-y-auto overscroll-contain m-0 px-1 pb-1 list-none grid gap-3 content-start rounded-[16px]">
          {tab === "show" &&
            (shows.length === 0 ? (
              <li className="text-sm text-dim py-3">Not in the middle of anything.</li>
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
              <li className="text-sm text-dim py-3">Nothing on the watchlist.</li>
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
          <span className="text-[12.5px] font-semibold text-dim" title="The full tracker page comes with accounts on the web">
            Open tracker →
          </span>
        </div>
      )}
    </div>
  );
}

/** "S01 | E03" for "1-3", as the app writes an episode. */
function code(key: string) {
  const [s, e] = key.split("-").map(Number);
  return `S${String(s).padStart(2, "0")} | E${String(e).padStart(2, "0")}`;
}

/** A key: its glyph, what it says, what it does, whether it is set or
    unavailable, and, for a key that records something, the colour its
    confirmation fills with; that key does its work when the confirmation
    ends, as the app's do. */
type Key = { icon: React.ReactNode; label: string; run?: () => void; on?: boolean; off?: boolean; confirm?: string };

// The app's hold amber (`kodigoHoldFill`), for a key that sets something aside.
const HOLD = "#D9BC52";

// One row of the app's list view (`WatchNextRow`): a card, and in it a
// panel with the title's wide picture flush down its left and the show's
// name, the episode's code and name, and the progress bar with its count;
// under the panel, the owner's keys in a strip, sharing the width. Visitors
// get the panel alone. The app's night colours: the card `kodigoWell`, the
// panel and keys `kodigoRowPiece`, a lit top edge and a soft shadow.
function Row({ t, lines, bar, keys }: { t: ProfileTitle; lines: [string, string]; bar: { done: number; total: number } | null; keys: Key[] | null }) {
  return (
    <li className="rounded-[14px] bg-well p-1.5 grid gap-1.5 border-[0.5px] border-t-[color:var(--lit-edge)] border-x-piece border-b-well shadow-[0_4px_9px_rgba(0,0,0,.55)]">
      <div className="h-[56px] rounded-[10px] bg-piece flex gap-2.5 overflow-hidden">
        <Link href={t.href} className="w-[100px] shrink-0 h-full rounded-[10px] overflow-hidden border border-hair bg-card">
          {(t.backdrop ?? t.poster) && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={(t.backdrop ?? t.poster)!} alt="" className="w-full h-full object-cover" />
          )}
        </Link>
        <div className="min-w-0 flex-1 flex flex-col py-1.5 pr-2.5">
          <Link href={t.href} className="block text-[13px] leading-[16px] font-semibold text-ink truncate no-underline hover:text-accent">
            {t.title}
          </Link>
          {/* The code and the name share a line at this size. */}
          <div className="text-[12px] leading-[15px] truncate">
            <span className="text-mid-tone">{lines[0]}</span>
            {lines[1] && <span className="text-dim"> · {lines[1]}</span>}
          </div>
          {bar && (
            <div className="mt-auto flex items-center gap-2">
              <span className="flex-1 h-[2px] rounded-full bg-track overflow-hidden">
                <span className="block h-full rounded-full bg-accent-fill" style={{ width: `${Math.round((bar.done / bar.total) * 100)}%` }} />
              </span>
              <span className="text-[11px] leading-none text-dim whitespace-nowrap tabular-nums">
                {bar.done}/{bar.total}
              </span>
            </div>
          )}
        </div>
      </div>
      {keys && (
        <div className="flex gap-1.5">
          {keys.map((k) => (
            <KeyButton key={k.label} k={k} />
          ))}
        </div>
      )}
    </li>
  );
}

// A key in the strip, and its confirmation (the app's
// `KodigoKeyTraceConfirmation`, with its timings): the outline travels once
// round the key clockwise from its top centre (0.85s), then after a beat the
// key fills with the confirm colour and pushes forward while a ring leaves
// the glyph (0.22s), holds (0.6s), and lets go; the key does its work at the
// end, so the row moves on once the confirmation has been seen. With reduced
// motion there is no stroke: the key fills, holds and lets go.
const TRACE = 850;
const SETTLE = 100;
const FILL = 220;
const HOLD_FOR = 600;

function KeyButton({ k }: { k: Key }) {
  const ref = useRef<HTMLButtonElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [phase, setPhase] = useState<"idle" | "trace" | "lit" | "done">("idle");
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  function press() {
    if (!k.run || phase !== "idle") return;
    if (!k.confirm) return k.run();
    // Measured at the press, so the outline fits the key as it is now.
    if (ref.current) setSize({ w: ref.current.offsetWidth, h: ref.current.offsetHeight });
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const at = (ms: number, f: () => void) => timers.current.push(setTimeout(f, ms));
    const lead = reduced ? 0 : TRACE + SETTLE;
    setPhase(reduced ? "lit" : "trace");
    at(lead, () => setPhase("lit"));
    at(lead + FILL + HOLD_FOR, () => setPhase("done"));
    at(lead + FILL + HOLD_FOR + 300, () => {
      setPhase("idle");
      k.run!();
    });
  }

  // The outline: a rounded rectangle drawn from the top centre, clockwise,
  // on the key's own edge, so its length can be run out from nothing.
  const { w, h } = size;
  const r = 8;
  const path = w && h ? `M${w / 2} 0.75H${w - r}A${r - 0.75} ${r - 0.75} 0 0 1 ${w - 0.75} ${r}V${h - r}A${r - 0.75} ${r - 0.75} 0 0 1 ${w - r} ${h - 0.75}H${r}A${r - 0.75} ${r - 0.75} 0 0 1 0.75 ${h - r}V${r}A${r - 0.75} ${r - 0.75} 0 0 1 ${r} 0.75Z` : "";
  const lit = phase === "lit";
  return (
    <button
      ref={ref}
      type="button"
      onClick={press}
      disabled={k.off || !k.run}
      aria-label={k.label}
      aria-pressed={k.on}
      title={k.label}
      className={`relative flex-1 h-7 rounded-[8px] flex items-center justify-center transition-[background-color,color] duration-300 ${k.on ? "text-[#F0EFE9]" : "bg-piece text-dim enabled:hover:text-ink"} ${k.off ? "opacity-35" : ""} enabled:cursor-pointer`}
      style={{
        ...(k.on ? { background: HOLD } : {}),
        ...(lit ? { background: k.confirm, color: "#F0EFE9", transitionDuration: `${FILL}ms`, animation: `key-pop 380ms ease-out` } : {}),
      }}
    >
      {phase === "trace" && path && (
        <svg className="absolute inset-0 pointer-events-none" width={w} height={h} aria-hidden>
          <path d={path} pathLength={1} fill="none" stroke={k.confirm} strokeWidth="1.5" strokeDasharray="1" style={{ animation: `key-trace ${TRACE}ms linear forwards` }} />
        </svg>
      )}
      {lit && <span aria-hidden className="absolute left-1/2 top-1/2 -ml-[9px] -mt-[9px] w-[18px] h-[18px] rounded-full border-2 pointer-events-none" style={{ borderColor: k.confirm, animation: "key-burst 710ms linear forwards" }} />}
      {k.icon}
    </button>
  );
}

// The keys' glyphs, drawn to match the SF Symbols the app uses (SF Symbols
// are licensed for Apple platforms only): ellipsis, captions.bubble,
// forward.end and checkmark.
function MoreGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <circle cx="5" cy="12" r="1.8" />
      <circle cx="12" cy="12" r="1.8" />
      <circle cx="19" cy="12" r="1.8" />
    </svg>
  );
}
function RecapGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 5h16a1.5 1.5 0 0 1 1.5 1.5v9A1.5 1.5 0 0 1 20 17h-9l-4.5 3.5V17H4a1.5 1.5 0 0 1-1.5-1.5v-9A1.5 1.5 0 0 1 4 5z" />
      <path d="M6.5 10h4M13 10h4.5M6.5 13h7M15.5 13h2" />
    </svg>
  );
}
function SkipGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" aria-hidden>
      <path d="M5 5.5v13l10-6.5z" />
      <path d="M18.5 5.5v13" strokeLinecap="round" />
    </svg>
  );
}
function CheckGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4.5 12.5l5 5L19.5 7" />
    </svg>
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
