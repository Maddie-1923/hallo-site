"use client";

import type { WhereToWatch } from "@/lib/tmdb";
import { useSettings } from "@/lib/settings";
import { ElsewhereSheet } from "./ElsewhereSheet";

/** Where to watch beside the keys, a shell of its own drawn like the
    keys' box and exactly as tall, with the same space on every side of
    each piece in it (its contents are laid over it, so
    they never push it taller): its heading on a piece, and under it the
    services' piece, two here (or, when it streams nowhere here, from
    elsewhere), the second a "+N" when there are more, and the arrow level
    with them. Always the same size: the whole square opens the full list,
    every service anywhere, theirs first. */
// A title TMDB has no services for anywhere (a film still in cinemas) still
// gets the tile, saying so, so the top of every title page keeps one shape.
const NOWHERE: WhereToWatch = { subscription: [], free: [], link: null, elsewhere: [] };

export function WhereToWatchTile({ watch = NOWHERE }: { watch?: WhereToWatch | null }) {
  watch ??= NOWHERE;
  // The services they pay for (Settings, Where you watch) come first and
  // wear the accent; with "Only what's on my services" on, only theirs show.
  const [settings] = useSettings();
  const mine = new Set(settings.services);
  const all = [...watch.subscription, ...watch.free.filter((f) => !watch.subscription.some((s) => s.id === f.id))];
  const yours = all.filter((p) => mine.has(p.id));
  const here = settings.onlyMyServices && mine.size ? yours : [...yours, ...all.filter((p) => !mine.has(p.id))];
  const notOnYours = settings.onlyMyServices && mine.size > 0 && yours.length === 0;
  const pool = here.length ? here : notOnYours ? [] : watch.elsewhere.map((e) => e.provider);
  const shown = pool.length > 2 ? pool.slice(0, 1) : pool;
  const more = pool.length - shown.length;
  // As tall as the piece leaves them, 12px in from every side of it.
  const tile = "shrink-0 h-full aspect-square rounded-[9px] overflow-hidden border border-hair bg-card";
  return (
    <div className="relative shrink-0 w-[15.6667rem] max-sm:w-auto max-sm:h-[10rem] self-stretch rounded-shell bg-card border-[0.5px] border-t-[color:var(--lit-edge)] border-x-piece border-b-well shadow-[0_4px_9px_rgba(0,0,0,.35)]">
      <div className="absolute inset-0 p-2 flex flex-col gap-2">
        <h2 className="shrink-0 h-[2.8333rem] px-1 rounded-[12px] bg-piece flex items-center justify-center text-center ![font-family:var(--font-body)] !font-bold !text-[0.875rem] !leading-none !tracking-[.12em] uppercase text-ink">Where to watch</h2>
        <div className="flex-1 min-h-0 rounded-[12px] bg-piece p-3 flex items-stretch gap-1.5">
          {shown.map((p) => (
            <span key={p.id} title={mine.has(p.id) ? `${p.name} · yours` : p.name} className={`${tile} ${mine.has(p.id) ? "!border-transparent ring-2 ring-accent-fill" : ""}`}>
              {p.logo && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.logo} alt={p.name} className="w-full h-full object-cover" />
              )}
            </span>
          ))}
          {more > 0 && <span className={`${tile} flex items-center justify-center text-[1.0417rem] font-semibold text-dim`}>+{more}</span>}
          {pool.length === 0 && <span className="self-center text-[1.0417rem] leading-[1.4] text-dim">{notOnYours ? "Not on your services" : "Nowhere yet"}</span>}
          {watch.elsewhere.length > 0 && (
            // The arrow to every service anywhere; over it, when what's shown
            // streams only in other countries, a globe saying so.
            <span className="ml-auto shrink-0 self-stretch flex flex-col items-center justify-between">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="text-accent">
                <path d="M4 12h15M13 6l6 6-6 6" />
              </svg>
              {!here.length && pool.length > 0 && (
                <span title="Streaming in other countries" className="text-dim">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" role="img" aria-label="Streaming in other countries">
                    <circle cx="12" cy="12" r="9" />
                    <path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z" />
                  </svg>
                </span>
              )}
            </span>
          )}
        </div>
      </div>
      <ElsewhereSheet entries={watch.elsewhere} cover mine={settings.services} hint={!here.length && pool.length > 0 ? "Streaming in other countries" : undefined} />
    </div>
  );
}
