"use client";

import Link from "next/link";
import { ConfirmKey } from "./ConfirmKey";
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
export function Row({ t, lines, bar, keys, onPick, picked = false }: { t: ProfileTitle; lines: [string, string]; bar: { done: number; total: number } | null; keys: Key[] | null; onPick?: () => void; picked?: boolean }) {
  return (
    <li className={`rounded-shell bg-well p-1.5 grid gap-1.5 border-[0.5px] border-t-[color:var(--lit-edge)] border-x-piece border-b-well shadow-[0_4px_9px_rgba(0,0,0,.55)] ${picked ? "ring-[1.5px] ring-accent-fill" : ""}`}>
      <div className="h-[56px] rounded-[10px] bg-piece flex gap-2.5 overflow-hidden">
        <To href={t.href} onPick={onPick} picked={picked} className="w-[100px] shrink-0 h-full rounded-[10px] overflow-hidden border border-hair bg-card">
          {(t.backdrop ?? t.poster) && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={(t.backdrop ?? t.poster)!} alt="" className="w-full h-full object-cover" />
          )}
        </To>
        <div className="min-w-0 flex-1 flex flex-col py-1.5 pr-2.5">
          <To href={t.href} onPick={onPick} picked={picked} className="block w-full text-[12.5px] leading-[16px] font-semibold text-ink truncate no-underline hover:text-accent">
            {t.title}
          </To>
          {/* The code and the name share a line at this size. */}
          <div className="text-[12.5px] leading-[15px] truncate">
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

/** The row's picture and name: a link to the title, or, on a page that
    shows the picked row beside the list, a button picking it. */
function To({ href, onPick, picked, className, children }: { href: string; onPick?: () => void; picked?: boolean; className: string; children: React.ReactNode }) {
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
export function KeyButton({ k }: { k: Key }) {
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
      className={`${k.wide ? "flex-[2]" : "flex-1"} h-7 flex items-center justify-center ${k.on ? "" : "bg-piece text-dim enabled:hover:text-ink"}`}
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
