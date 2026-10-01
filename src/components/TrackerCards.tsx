"use client";

import Link from "next/link";
import type { EpisodeBadge } from "@/lib/episode-badge";
import type { ProfileTitle } from "@/lib/public-profile";
import { ArtworkBand, Countdown, EpisodePill, KeyButton, To, pickFromShell, type Key } from "./TrackerRow";

// The tracker's two other ways of drawing an entry, beside the list's Row:
// the wide card (the app's card layout) and the poster tile (its grid and
// rails). They take what a Row takes, so the board builds an entry once and
// draws it whichever way the layout asks.

type Entry = {
  t: ProfileTitle;
  lines: [string, string];
  bar: { done: number; total: number } | null;
  keys: Key[] | null;
  /** The episode's badge, along the foot of the picture. */
  band?: EpisodeBadge | null;
  /** A Coming soon entry's days to go; absent on the watch list. */
  countdown?: number;
};

/** The progress line under an entry: the bar, and how far along it is. */
function Progress({ bar, count }: { bar: { done: number; total: number }; count: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="flex-1 h-[2px] rounded-full bg-track overflow-hidden">
        <span className="block h-full rounded-full bg-accent-fill" style={{ width: `${Math.round((bar.done / bar.total) * 100)}%` }} />
      </span>
      <span className="text-[11px] leading-none text-dim whitespace-nowrap tabular-nums">{count}</span>
    </div>
  );
}

/** "12 left" once a series is under way, and "3/10" before it starts or
    once it's caught up, where "left" would be all of it or nothing. */
export function countLine(bar: { done: number; total: number }) {
  const left = bar.total - bar.done;
  return bar.done > 0 && left > 0 ? `${left} left` : `${bar.done}/${bar.total}`;
}

// The card layout: the title's wide picture across the whole card, its
// poster, name, episode and progress laid over the foot of it on a shade,
// and the keys in a strip under it, as the list's rows carry them. A title
// with no wide picture falls back to its poster, cropped.
export function BackdropCard({ t, lines, bar, keys, onPick, picked = false, rowKey, band = null, countdown }: Entry & { onPick?: () => void; picked?: boolean; rowKey?: string }) {
  const wide = t.backdrop ?? t.poster;
  return (
    <li data-picked={picked || undefined} data-row={rowKey} onClick={onPick && pickFromShell(onPick)} className={`${onPick ? "cursor-pointer " : ""}rounded-shell bg-well p-1.5 grid gap-1.5 border-[0.5px] shadow-[0_4px_9px_rgba(0,0,0,.55)] ${picked ? "border-transparent ring-2 ring-accent-fill" : "border-t-[color:var(--lit-edge)] border-x-piece border-b-well"}`}>
      <CardFace href={t.href} onPick={onPick} picked={picked} className="group/card relative block w-full aspect-[16/9] rounded-[10px] overflow-hidden bg-piece no-underline">
        {wide && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={wide} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover/card:scale-[1.03]" />
        )}
        <span aria-hidden className="absolute inset-0 bg-[linear-gradient(to_top,rgba(0,0,0,.85),rgba(0,0,0,.35)_45%,transparent_70%)]" />
        <span className="absolute inset-x-0 bottom-0 flex items-end gap-3 p-3">
          {t.poster &&
            (onPick ? (
              // Picking the card shows its episode; the poster on it opens
              // the title's page, as the artwork does in the app.
              <Link href={t.href} aria-label={`Open ${t.title}`} onClick={(e) => e.stopPropagation()} className="shrink-0 rounded-[8px] hover:ring-2 hover:ring-white/70">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={t.poster} alt="" loading="lazy" className="block w-[56px] sm:w-[68px] aspect-[2/3] rounded-[8px] object-cover border border-white/15 shadow-[0_4px_12px_rgba(0,0,0,.5)]" />
              </Link>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={t.poster} alt="" loading="lazy" className="w-[56px] sm:w-[68px] aspect-[2/3] shrink-0 rounded-[8px] object-cover border border-white/15 shadow-[0_4px_12px_rgba(0,0,0,.5)]" />
            ))}
          <span className="min-w-0 flex-1 grid gap-1">
            <span className="flex items-start gap-2">
              <span className="min-w-0 flex-1 display text-[24px] leading-none tracking-[.03em] uppercase text-white truncate">{t.title}</span>
              <Countdown days={countdown} film={t.kind === "movie"} light />
            </span>
            {countdown !== undefined ? (
              // Coming soon's three lines, as its list rows have them: the
              // code on its own, the episode's name under it.
              <>
                <CodeLine code={lines[0]} band={band} />
                {lines[1] && <span className="text-[12.5px] leading-[16px] text-white/65 truncate">{lines[1]}</span>}
              </>
            ) : (
              <span className="flex items-center gap-2">
                <span className="min-w-0 flex-1 text-[12.5px] leading-[16px] text-white/85 truncate">
                  {lines[0]}
                  {lines[1] && <span className="text-white/65"> · {lines[1]}</span>}
                </span>
                <EpisodePill badge={band} />
              </span>
            )}
            {bar && (
              <span className="block mt-0.5 [&_.text-dim]:text-white/70">
                <Progress bar={bar} count={`${bar.done}/${bar.total}`} />
              </span>
            )}
          </span>
        </span>
      </CardFace>
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

// The episode's code on a card, its badge pill level with it at the right,
// as the list's rows and the panel have it.
function CodeLine({ code, band }: { code: string; band: EpisodeBadge | null | undefined }) {
  return (
    <span className="flex items-center gap-2">
      <span className="min-w-0 flex-1 text-[12.5px] leading-[16px] text-white/85 truncate">{code}</span>
      <EpisodePill badge={band ?? null} />
    </span>
  );
}

// The card's face: a link to the title, or, beside the episode panel, a
// face that picks the card. Not a button there, as it holds the poster's
// own link, and a link can't sit inside a button.
function CardFace({ href, onPick, picked, className, children }: { href: string; onPick?: () => void; picked?: boolean; className: string; children: React.ReactNode }) {
  if (!onPick) return <To href={href} className={className}>{children}</To>;
  return (
    <div
      role="button"
      tabIndex={0}
      aria-pressed={picked}
      onClick={onPick}
      onKeyDown={(e) => {
        if (e.target !== e.currentTarget || (e.key !== "Enter" && e.key !== " ")) return;
        e.preventDefault();
        onPick();
      }}
      className={`${className} text-left cursor-pointer`}
    >
      {children}
    </div>
  );
}

// The grid's and the rails' tile: the poster on its piece with the title,
// the episode it's on, how far along, and the bar, then the keys sharing the
// tile's width. With no panel beside these layouts, the poster opens the
// title's page.
export function PosterTile({ t, lines, bar, keys, className = "", as: Tag = "li", band = null, countdown }: Entry & { className?: string; /** "div" inside a rail, which isn't a list. */ as?: "li" | "div" }) {
  return (
    <Tag className={`p-2 rounded-[16px] bg-well flex flex-col gap-2 border border-hair/40 shadow-[0_4px_9px_rgba(0,0,0,.35)] ${className}`}>
      <To href={t.href} className="group/card block rounded-[12px] bg-piece no-underline overflow-hidden">
        <div className="relative aspect-[2/3] rounded-t-[12px] rounded-b-[8px] overflow-hidden bg-card">
          {t.poster ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={t.poster} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover/card:scale-[1.04]" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center p-3 text-center text-xs text-dim">{t.title}</div>
          )}
          <ArtworkBand badge={band} />
          <span aria-hidden className="pointer-events-none absolute inset-0 z-[3] rounded-t-[12px] rounded-b-[8px] ring-0 group-hover/card:ring-2 ring-accent-fill ring-inset transition-[box-shadow]" />
        </div>
        <div className="px-2.5 pt-2.5 pb-2 grid gap-0.5">
          <div className="text-[12.5px] font-semibold leading-tight text-ink truncate">{t.title}</div>
          <div className="text-[12px] leading-tight text-mid-tone truncate">{lines[0] || " "}</div>
          {/* Under a Coming soon poster, the wait rather than the name, as
              the app's tiles have it: "5 days", or nothing under two days,
              where the heading has said Today or Tomorrow. */}
          <div className="text-[12px] leading-tight text-dim truncate">{bar ? countLine(bar) : countdown !== undefined ? (countdown >= 2 ? `${countdown} days` : " ") : lines[1] || " "}</div>
          {bar && (
            <span className="mt-1 block h-[2px] rounded-full bg-track overflow-hidden">
              <span className="block h-full rounded-full bg-accent-fill" style={{ width: `${Math.round((bar.done / bar.total) * 100)}%` }} />
            </span>
          )}
        </div>
      </To>
      {keys && keys.length > 0 && (
        <div className="flex gap-1">
          {keys.map((k) => (
            <KeyButton key={k.label} k={k} fill />
          ))}
        </div>
      )}
    </Tag>
  );
}
