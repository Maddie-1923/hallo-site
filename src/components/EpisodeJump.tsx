"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Menu } from "./Menu";
import { SpoilerName } from "./Spoiler";
import { loadSeason, type SeasonEpisode } from "@/lib/title-actions";

// The episode's code under the show's name, opening a small menu to go to any
// other episode: the season it's in first, each episode a row with a tick
// once watched and the one on the page marked; at the top, the way back to
// every season, each with its count watched and a thin bar, or a tick once
// it's done. Drawn like the profile menu: the card, its hairlines, its rows.

const code = (s: number, e: number) => `S${String(s).padStart(2, "0")} | E${String(e).padStart(2, "0")}`;
const HAIRLINE = "[&>li+li]:border-t [&>li+li]:border-[color:color-mix(in_srgb,var(--ink)_12%,transparent)]";
const ROW = "flex items-center gap-2.5 px-4 py-2 text-[1.0417rem] no-underline text-ink hover:bg-card-hi transition-colors";

function Tick({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-accent" aria-label="Watched">
      <path d="M5 12l5 5L20 7" />
    </svg>
  );
}

export function EpisodeJump({ showID, season, episode, seasons, watched }: { showID: number; season: number; episode: number; seasons: { number: number; name: string; count: number }[]; /** "showID-season-episode" keys watched. */ watched: string[] }) {
  const seen = new Set(watched);
  const [view, setView] = useState<number | "all">(season);
  const [episodes, setEpisodes] = useState<Record<number, SeasonEpisode[]>>({});
  const shown = view === "all" ? null : episodes[view];

  useEffect(() => {
    if (view === "all" || episodes[view]) return;
    let live = true;
    loadSeason(showID, view).then((eps) => live && setEpisodes((m) => ({ ...m, [view]: eps })));
    return () => {
      live = false;
    };
  }, [view, episodes, showID]);

  // The episode on the page in view whenever its season's list appears (the
  // menu draws its rows afresh each time it opens).
  const centred = useRef<HTMLUListElement | null>(null);
  const list = (ul: HTMLUListElement | null) => {
    const here = ul?.querySelector<HTMLElement>('[aria-current="page"]');
    if (ul && here && centred.current !== ul) {
      centred.current = ul;
      ul.scrollTop = here.offsetTop - ul.clientHeight / 2 + here.offsetHeight / 2;
    }
  };

  const done = (n: number) => [...seen].filter((k) => k.startsWith(`${showID}-${n}-`)).length;
  const name = (n: number) => seasons.find((s) => s.number === n)?.name ?? (n === 0 ? "Specials" : `Season ${n}`);

  return (
    <Menu
      label={`Go to another episode (now ${code(season, episode)})`}
      align="left"
      width={300}
      button={
        <span className="inline-flex items-center gap-1.5 text-[1.0417rem] font-semibold tracking-[.06em] text-mid-tone hover:text-ink transition-colors">
          {code(season, episode)}
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M6 9l6 6 6-6" />
          </svg>
        </span>
      }
    >
      {view === "all" ? (
        <>
          <div className="px-4 pt-3 pb-2 text-[0.875rem] font-bold uppercase tracking-[.12em] text-dim border-b border-hair">Seasons</div>
          <ul className={`m-0 p-0 list-none max-h-[22rem] overflow-y-auto soft-scroll ${HAIRLINE}`}>
            {seasons.map((s) => {
              const d = Math.min(done(s.number), s.count);
              const complete = s.count > 0 && d >= s.count;
              return (
                <li key={s.number}>
                  <button type="button" onClick={() => setView(s.number)} className={`${ROW} w-full text-left cursor-pointer ${s.number === season ? "font-semibold" : ""}`}>
                    <span className="min-w-0 flex-1 truncate">{s.name}</span>
                    {s.count === 0 ? (
                      // Announced, nothing listed yet.
                      <span className="shrink-0 text-[0.9167rem] text-dim">Coming</span>
                    ) : complete ? (
                      <Tick />
                    ) : (
                      <span className="shrink-0 flex items-center gap-2">
                        <span className="w-10 h-[3px] rounded-full bg-track overflow-hidden" aria-hidden>
                          <span className="block h-full bg-accent-fill" style={{ width: `${s.count ? (d / s.count) * 100 : 0}%` }} />
                        </span>
                        <span className="text-[0.9167rem] text-dim tabular-nums">
                          {d}/{s.count}
                        </span>
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      ) : (
        <>
          <div className="flex items-center gap-2 px-4 pt-3 pb-2 border-b border-hair">
            <button type="button" onClick={() => setView("all")} className="text-[0.875rem] font-bold uppercase tracking-[.12em] text-accent cursor-pointer hover:underline">
              ‹ All seasons
            </button>
            <span className="ml-auto text-[0.9167rem] text-dim truncate">{name(view)}</span>
          </div>
          <ul ref={list} className={`relative m-0 p-0 list-none max-h-[22rem] overflow-y-auto soft-scroll ${HAIRLINE}`}>
            {!shown && <li className="px-4 py-2 text-[1.0417rem] text-dim">Loading episodes…</li>}
            {shown?.map((e) => {
              const k = `${showID}-${e.season}-${e.episode}`;
              const here = e.season === season && e.episode === episode;
              return (
                <li key={k}>
                  <Link href={`/show/${showID}/season/${e.season}/episode/${e.episode}`} aria-current={here ? "page" : undefined} className={`${ROW} ${here ? "bg-card-hi font-semibold" : ""}`}>
                    <span className="shrink-0 w-[2.5rem] text-dim tabular-nums">E{String(e.episode).padStart(2, "0")}</span>
                    <span className="min-w-0 flex-1 truncate">
                      <SpoilerName name={e.name} watched={seen.has(k)} />
                    </span>
                    {seen.has(k) && <Tick />}
                  </Link>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </Menu>
  );
}
