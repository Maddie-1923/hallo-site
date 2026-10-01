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
// The picture always opens the title's page, as tapping the artwork does in
// the app. With `onPick`, the rest of the row (name and episode lines) picks
// it, and the tracker shows the picked one's episode beside the list;
// without, it opens the title's page too. `picked` outlines it.
// `band` is the episode's badge, a pill level with its code; `countdown`,
// on a Coming soon row, the days until it airs, level with the name at the
// row's right edge as the app's EpisodeRow sits it.
export function Row({ t, lines, bar, keys, onPick, picked = false, rowKey, band = null, countdown = null }: { t: ProfileTitle; lines: [string, string]; bar: { done: number; total: number } | null; keys: Key[] | null; onPick?: () => void; picked?: boolean; /** Marks the row so the tracker can find it on the page. */ rowKey?: string; band?: EpisodeBadge | null; countdown?: number | null }) {
  return (
    <li data-picked={picked || undefined} data-row={rowKey} onClick={onPick && pickFromShell(onPick)} className={`${onPick ? "cursor-pointer " : ""}rounded-shell bg-well p-1.5 grid gap-1.5 border-[0.5px] shadow-[0_4px_9px_rgba(0,0,0,.55)] ${picked ? "border-transparent ring-2 ring-accent-fill" : "border-t-[color:var(--lit-edge)] border-x-piece border-b-well"}`}>
      <div className="h-[6.6667rem] rounded-[10px] bg-piece flex gap-2.5 overflow-hidden">
        <Link href={t.href} aria-label={`Open ${t.title}`} className="relative w-[11.8333rem] shrink-0 h-full rounded-[10px] overflow-hidden border border-hair bg-card">
          {(t.backdrop ?? t.poster) && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={(t.backdrop ?? t.poster)!} alt="" className="w-full h-full object-cover" />
          )}
        </Link>
        <To href={t.href} onPick={onPick} picked={picked} className="group/info min-w-0 flex-1 flex no-underline">
          <span className="min-w-0 flex-1 flex flex-col py-1.5 pr-2.5">
            <span className="block w-full text-[1.0417rem] leading-[1.3333rem] font-semibold text-ink truncate group-hover/info:text-accent">
              {t.title}
            </span>
            {/* As the app's row: the code on its own line in the mid tone,
                the episode's name under it, quieter. */}
            {/* The episode's badge (FINALE and the rest) level with its code,
                at the right, as the panel has it. */}
            <span className="mt-0.5 flex items-center gap-2">
              <span className="min-w-0 flex-1 text-[1.0417rem] leading-[1.3333rem] text-mid-tone truncate">{lines[0]}</span>
              <EpisodePill badge={band} />
            </span>
            {lines[1] && <span className="block text-[1.0417rem] leading-[1.3333rem] text-dim truncate">{lines[1]}</span>}
            {bar && (
              <span className="mt-auto flex items-center gap-2">
                <span className="flex-1 h-[2px] rounded-full bg-track overflow-hidden">
                  <span className="block h-full rounded-full bg-accent-fill" style={{ width: `${Math.round((bar.done / bar.total) * 100)}%` }} />
                </span>
                <span className="text-[0.9167rem] leading-none text-dim whitespace-nowrap tabular-nums">
                  {bar.done}/{bar.total}
                </span>
              </span>
            )}
          </span>
          <Countdown days={countdown} film={t.kind === "movie"} className="pt-1.5 pr-2.5 -ml-1" />
        </To>
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
          className="flex-1 min-w-0 px-1 py-[0.3333rem] text-center text-[0.8333rem] leading-[1rem] font-bold uppercase tracking-[.04em]"
          style={{ background: `var(--band-${tone})`, color: `var(--band-${tone}-ink)` }}
        >
          {text}
        </span>
      ))}
    </span>
  );
}

/** The same badge as a pill, the size of the series' RETURNING pill in the
    panel (SeriesPill, small), for the episode panel and the list's rows,
    where a band across the picture runs too long. A marker that also airs
    today is two pills. */
export function EpisodePill({ badge }: { badge: EpisodeBadge | null }) {
  if (!badge) return null;
  const halves: [string, EpisodeBadge["tone"]][] = badge.today ? [[badge.text, badge.tone], ["TODAY", "starting"]] : [[badge.text, badge.tone]];
  return (
    <span role="img" aria-label={badge.today ? `${badge.label}, today` : badge.label} className="shrink-0 flex gap-1">
      {halves.map(([text, tone]) => (
        <span key={text} aria-hidden className="inline-flex items-center min-h-[1.3333rem] py-[2px] rounded-[4px] px-[0.4167rem] text-[0.8333rem] leading-none font-bold tracking-[.04em] uppercase" style={{ background: `var(--band-${tone})`, color: `var(--band-${tone}-ink)` }}>
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
    <span role="img" aria-label={`${film ? "Opens" : "Airs"} in ${days} days`} className={`shrink-0 min-w-[3.8333rem] flex flex-col items-center ${className}`}>
      <span aria-hidden className={`text-[1.6667rem] leading-[1.8333rem] font-bold tabular-nums ${light ? "text-white" : "text-ink"}`}>{days}</span>
      <span aria-hidden className={`text-[0.75rem] leading-[0.9167rem] font-semibold ${light ? "text-white/70" : "text-dim"}`}>DAYS</span>
    </span>
  );
}

/** Beside the episode panel, a click anywhere on a row's shell that isn't
    one of its keys or its picture (the strip around the keys, the edges)
    picks it too. The keys and the picture keep their own jobs. */
export function pickFromShell(onPick: () => void) {
  return (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    // A sheet a key opened is drawn elsewhere on the page but still passes
    // its clicks up through the row; those aren't clicks on the row.
    if (!e.currentTarget.contains(target) || target.closest("a, button, [role=button]")) return;
    onPick();
  };
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
      className={`${fill ? "flex-1 min-w-0" : "w-16 shrink-0"} h-9 flex items-center justify-center border ${k.on ? "border-transparent" : "bg-piece border-hair text-dim enabled:hover:text-ink"}`}
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
