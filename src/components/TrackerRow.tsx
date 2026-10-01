"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { ConfirmKey } from "./ConfirmKey";
import { today } from "@/lib/live-watches";
import type { EpisodeBadge } from "@/lib/episode-badge";
import type { ProfileTitle, TrackerShow } from "@/lib/public-profile";

// The app's list-view row (WatchNextRow) and its keys, shared by the
// profile's mini tracker and the full tracker page.

/** "S01 | E03" for "1-3", as the app writes an episode. */
export function code(key: string) {
  const [s, e] = key.split("-").map(Number);
  return `S${String(s).padStart(2, "0")} | E${String(e).padStart(2, "0")}`;
}

/** A key: its glyph, what it says, what it does, whether it is set or
    unavailable, and, for a key that records something, the colour its
    confirmation fills with; that key does its work when the confirmation
    ends, as the app's do. */
export type Key = { icon: React.ReactNode; label: string; run?: () => void; on?: boolean; off?: boolean; confirm?: string; /** The colour it stays when on (the hold amber unless said). */ onFill?: string; onInk?: string; /** Twice the others' width (the wide card's Watched). */ wide?: boolean };

// The app's hold amber (`kodigoHoldFill`), for a key that sets something aside.
export const HOLD = "#D9BC52";

// One row of the app's list view (`WatchNextRow`): a card, and in it a
// panel with the title's wide picture flush down its left and the show's
// name, the episode's code and name, and the progress bar with its count;
// under the panel, the owner's keys in a strip, sharing the width. Visitors
// get the panel alone. The app's night colours: the card `kodigoWell`, the
// panel and keys `kodigoRowPiece`, a lit top edge and a soft shadow.
// With `onPick`, the picture and the name pick the row (the calendar page's
// list shows the picked one beside it) instead of going to the title's page;
// `picked` outlines it.
// `band` is the episode's badge along the foot of the picture; `countdown`,
// on a Coming soon row, the days until it airs, level with the name at the
// row's right edge as the app's EpisodeRow sits it.
export function Row({ t, lines, bar, keys, onPick, picked = false, rowKey, band = null, countdown = null }: { t: ProfileTitle; lines: [string, string]; bar: { done: number; total: number } | null; keys: Key[] | null; onPick?: () => void; picked?: boolean; /** Marks the row so the tracker can find it on the page. */ rowKey?: string; band?: EpisodeBadge | null; countdown?: number | null }) {
  return (
    <li data-picked={picked || undefined} data-row={rowKey} className={`rounded-shell bg-well p-1.5 grid gap-1.5 border-[0.5px] shadow-[0_4px_9px_rgba(0,0,0,.55)] ${picked ? "border-transparent ring-2 ring-accent-fill" : "border-t-[color:var(--lit-edge)] border-x-piece border-b-well"}`}>
      <div className="h-[80px] rounded-[10px] bg-piece flex gap-2.5 overflow-hidden">
        <To href={t.href} onPick={onPick} picked={picked} className="relative w-[142px] shrink-0 h-full rounded-[10px] overflow-hidden border border-hair bg-card">
          {(t.backdrop ?? t.poster) && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={(t.backdrop ?? t.poster)!} alt="" className="w-full h-full object-cover" />
          )}
          <ArtworkBand badge={band} />
        </To>
        <div className="min-w-0 flex-1 flex flex-col py-1.5 pr-2.5">
          <To href={t.href} onPick={onPick} picked={picked} className="block w-full text-[12.5px] leading-[16px] font-semibold text-ink truncate no-underline hover:text-accent">
            {t.title}
          </To>
          {/* As the app's row: the code on its own line in the mid tone,
              the episode's name under it, quieter. */}
          <div className="mt-0.5 text-[12.5px] leading-[16px] text-mid-tone truncate">{lines[0]}</div>
          {lines[1] && <div className="text-[12.5px] leading-[16px] text-dim truncate">{lines[1]}</div>}
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
        <Countdown days={countdown} film={t.kind === "movie"} className="pt-1.5 pr-2.5 -ml-1" />
      </div>
      {keys && (
        <div className="flex justify-end gap-1.5">
          {keys.map((k) => (
            <KeyButton key={k.label} k={k} />
          ))}
        </div>
      )}
    </li>
  );
}

/** Today in the viewer's own day, "YYYY-MM-DD"; null on the server, which
    can't know it, so the badges that hang on it draw once the page is up. */
export function useToday() {
  return useSyncExternalStore(
    () => () => {},
    () => today(),
    () => null,
  );
}

// The episode's badge as the app draws it on the artwork (KodigoArtworkBand):
// a band across the foot of the picture, under the picture's own clip so it
// follows its two bottom corners, where a progress bar would sit on it. A
// season marker that also airs today splits in two, the marker and TODAY,
// each in its own colour. The parent is positioned and clips.
export function ArtworkBand({ badge }: { badge: EpisodeBadge | null }) {
  if (!badge) return null;
  const halves: [string, EpisodeBadge["tone"]][] = badge.today ? [[badge.text, badge.tone], ["TODAY", "starting"]] : [[badge.text, badge.tone]];
  return (
    <span role="img" aria-label={badge.today ? `${badge.label}, today` : badge.label} className="absolute inset-x-0 bottom-0 z-[2] flex">
      {halves.map(([text, tone]) => (
        <span
          key={text}
          aria-hidden
          className="flex-1 min-w-0 px-1 py-[2px] text-center text-[10px] leading-[11px] font-bold uppercase tracking-[.04em]"
          style={{ background: `var(--band-${tone})`, color: `var(--band-${tone}-ink)` }}
        >
          {text}
        </span>
      ))}
    </span>
  );
}

/** The days until a Coming soon entry lands, the number over DAYS, as the
    app's KodigoDayCountdown: nothing under two days, where the heading above
    has already said Today or Tomorrow. */
export function Countdown({ days, film = false, light = false, className = "" }: { days: number | null | undefined; /** Said as a film's: it opens, where an episode airs. */ film?: boolean; light?: boolean; className?: string }) {
  if (days == null || days < 2) return null;
  return (
    <span role="img" aria-label={`${film ? "Opens" : "Airs"} in ${days} days`} className={`shrink-0 min-w-[46px] flex flex-col items-center ${className}`}>
      <span aria-hidden className={`text-[20px] leading-[22px] font-bold tabular-nums ${light ? "text-white" : "text-ink"}`}>{days}</span>
      <span aria-hidden className={`text-[9px] leading-[11px] font-semibold ${light ? "text-white/70" : "text-dim"}`}>DAYS</span>
    </span>
  );
}

/** The row's picture and name: a link to the title, or, on a page that
    shows the picked row beside the list, a button picking it. The tracker's
    cards and tiles open the same way. */
export function To({ href, onPick, picked, className, children }: { href: string; onPick?: () => void; picked?: boolean; className: string; children: React.ReactNode }) {
  return onPick ? (
    <button type="button" onClick={onPick} aria-pressed={picked} className={`${className} text-left cursor-pointer`}>
      {children}
    </button>
  ) : (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}

// A key in the strip, with the app's confirmation (ConfirmKey).
/** One key, the same size wherever it sits (64 by 36), as the app keeps
    its keys a fixed size rather than stretching them across whatever room
    there is. `fill` is the exception, for a poster tile narrower than four
    such keys: there they share its width instead. */
export function KeyButton({ k, fill = false }: { k: Key; fill?: boolean }) {
  return (
    <ConfirmKey
      label={k.label}
      on={k.on}
      onFill={k.onFill ?? HOLD}
      onInk={k.onInk}
      confirm={k.confirm}
      off={k.off}
      radius={8}
      run={k.run}
      className={`${fill ? "flex-1 min-w-0" : "w-16 shrink-0"} h-9 flex items-center justify-center ${k.on ? "" : "bg-piece text-dim enabled:hover:text-ink"}`}
    >
      {k.icon}
    </ConfirmKey>
  );
}

// The keys' glyphs, drawn to match the SF Symbols the app uses (SF Symbols
// are licensed for Apple platforms only): ellipsis, captions.bubble,
// forward.end and checkmark.
export function MoreGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <circle cx="5" cy="12" r="1.8" />
      <circle cx="12" cy="12" r="1.8" />
      <circle cx="19" cy="12" r="1.8" />
    </svg>
  );
}
export function RecapGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 5h16a1.5 1.5 0 0 1 1.5 1.5v9A1.5 1.5 0 0 1 20 17h-9l-4.5 3.5V17H4a1.5 1.5 0 0 1-1.5-1.5v-9A1.5 1.5 0 0 1 4 5z" />
      <path d="M6.5 10h4M13 10h4.5M6.5 13h7M15.5 13h2" />
    </svg>
  );
}
export function SkipGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" aria-hidden>
      <path d="M5 5.5v13l10-6.5z" />
      <path d="M18.5 5.5v13" strokeLinecap="round" />
    </svg>
  );
}
export function CheckGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4.5 12.5l5 5L19.5 7" />
    </svg>
  );
}

// Where they are in a series: episodes seen of those aired, and the next one
// to watch, which is the first unseen episode after the last one they saw
// (an older gap they skipped is only offered once nothing is left after it).
export function progress(s: TrackerShow, seen: string[]) {
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
