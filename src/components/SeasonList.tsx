"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { loadSeason, type SeasonEpisode } from "@/lib/title-actions";
import { Glyph } from "./Glyph";

type Season = { number: number; name: string; count: number };
type Episode = SeasonEpisode;

// All episodes, as the app's season list (ShowDetailView): a panel a season,
// one open at a time, each with its name and chevron, the count watched of
// those there are, and a band key to check the season off; a progress bar
// under the header; and when open, the season's episodes as bands, each with
// its code and air date over its name, and the skip and watched keys on the
// right. An episode not yet aired shows how many days to go instead.
//
// A season's episodes are fetched when it is opened. Checking off from the
// website comes with accounts; until then the keys show the library's state
// and the page says so when pressed.
// With `onPick`, a row shows its episode beside the list (the small episode
// page) rather than going to the episode's own page; the one shown is marked,
// and when a season opens with nothing shown yet, its first episode not yet
// watched is.
// `start` is the episode to show first; `scroll` lays the list over the
// space its card has, so it scrolls inside rather than setting the height.
export function SeasonList({ showID, seasons, watched, open: initial, picked, onPick, start: first, scroll = false }: { showID: number; seasons: Season[]; watched: string[]; open: number; picked?: string | null; onPick?: (e: Episode) => void; start?: { season: number; episode: number }; scroll?: boolean }) {
  const [open, setOpen] = useState<number | null>(initial);
  const [episodes, setEpisodes] = useState<Record<number, Episode[]>>({});
  const [pending, start] = useTransition();
  const [note, setNote] = useState(false);
  const seen = new Set(watched);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open == null || episodes[open]) return;
    start(async () => {
      const eps = await loadSeason(showID, open);
      setEpisodes((m) => ({ ...m, [open]: eps }));
    });
  }, [open, episodes, showID]);

  const today = new Date().toISOString().slice(0, 10);
  useEffect(() => {
    if (!onPick || picked || open == null) return;
    const eps = episodes[open];
    if (!eps?.length) return;
    const e = (first && eps.find((x) => x.season === first.season && x.episode === first.episode)) ?? eps[0];
    onPick(e);
    // Bring that episode into view in the list (the list alone, not the page).
    requestAnimationFrame(() => {
      const box = listRef.current;
      const row = box?.querySelector<HTMLElement>(`[data-ep="${showID}-${e.season}-${e.episode}"]`);
      if (box && row && scroll) box.scrollTop += row.getBoundingClientRect().top - box.getBoundingClientRect().top - 40;
    });
  }, [episodes, open, picked, onPick]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div ref={listRef} className={`grid gap-2 content-start ${scroll ? "soft-scroll absolute inset-2 overflow-y-auto overscroll-contain pr-1" : ""}`}>
      {note && <p className="m-0 px-1 text-[12.5px] text-dim">Checking off episodes on the website opens with accounts. Until then, check them off in the app.</p>}
      {seasons.map((s) => {
        const done = Array.from({ length: s.count }, (_, i) => `${showID}-${s.number}-${i + 1}`).filter((k) => seen.has(k)).length;
        const isOpen = open === s.number;
        const eps = episodes[s.number];
        return (
          <div key={s.number} className="rounded-shell bg-piece p-3">
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => setOpen(isOpen ? null : s.number)} aria-expanded={isOpen} className="flex items-center gap-2 text-[12.5px] font-semibold text-ink cursor-pointer">
                {s.number === 0 ? "Specials" : `Season ${s.number}`}
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden className={`text-dim transition-transform ${isOpen ? "rotate-180" : ""}`}>
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </button>
              <span className="ml-auto text-[12.5px] text-dim tabular-nums">
                {done}/{s.count}
              </span>
              <button type="button" onClick={() => setNote(true)} aria-label={`Mark ${s.name} watched`} className={`w-[34px] h-7 rounded-[9px] flex items-center justify-center cursor-pointer ${done === s.count && s.count > 0 ? "bg-accent-fill text-on-accent" : "bg-hair text-ink"}`}>
                <Glyph name="check" size={14} />
              </button>
            </div>
            <div className="mt-2 h-1 rounded-full bg-track overflow-hidden">
              <div className="h-full bg-accent-fill" style={{ width: s.count ? `${(done / s.count) * 100}%` : 0 }} />
            </div>
            {isOpen && (
              <div className="mt-2 grid gap-1">
                {!eps && <p className="m-0 py-2 text-[12.5px] text-dim">{pending ? "Loading episodes…" : ""}</p>}
                {eps?.length === 0 && <p className="m-0 py-2 text-[12.5px] text-dim">No episodes have aired yet.</p>}
                {eps?.map((e) => {
                  const key = `${showID}-${e.season}-${e.episode}`;
                  const aired = !!e.airDate && e.airDate <= today;
                  const days = e.airDate ? Math.ceil((Date.parse(e.airDate) - Date.parse(today)) / 86400000) : null;
                  return (
                    <div key={key} data-ep={key} className={`rounded-[10px] bg-[color:var(--quiet)] px-2.5 py-2.5 flex items-center gap-3 ${aired ? "" : "opacity-70"} ${picked === key ? "ring-[1.5px] ring-inset ring-accent-fill" : ""}`}>
                      {/* The episode's own page, as a tap on the row opens it in the app. */}
                      {onPick ? (
                        <button type="button" onClick={() => onPick(e)} aria-pressed={picked === key} className="min-w-0 flex-1 grid gap-[3px] text-left text-ink group cursor-pointer">
                        <div className="text-[12.5px] leading-none">
                          <span className="font-semibold text-ink">{code(e.season, e.episode)}</span>
                          {e.airDate && <span className="ml-1.5 text-dim">{shortDate(e.airDate)}</span>}
                        </div>
                        <div className="text-[12.5px] leading-[16px] text-dim truncate group-hover:text-accent transition-colors">{e.name}</div>
                        </button>
                      ) : (
                        <Link href={`/show/${showID}/season/${e.season}/episode/${e.episode}`} className="min-w-0 flex-1 grid gap-[3px] no-underline text-ink group">
                        <div className="text-[12.5px] leading-none">
                          <span className="font-semibold text-ink">{code(e.season, e.episode)}</span>
                          {e.airDate && <span className="ml-1.5 text-dim">{shortDate(e.airDate)}</span>}
                        </div>
                        <div className="text-[12.5px] leading-[16px] text-dim truncate group-hover:text-accent transition-colors">{e.name}</div>
                        </Link>
                      )}
                      {aired ? (
                        <div className="flex gap-1.5">
                          <button type="button" onClick={() => setNote(true)} aria-label={`Skip ${code(e.season, e.episode)}`} className="w-[34px] h-7 rounded-[9px] bg-hair text-dim flex items-center justify-center cursor-pointer">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" aria-hidden>
                              <path d="M5 5.5v13l10-6.5z" />
                              <path d="M18.5 5.5v13" strokeLinecap="round" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            onClick={() => setNote(true)}
                            aria-label={`Mark ${code(e.season, e.episode)} watched`}
                            aria-pressed={seen.has(key)}
                            className={`w-[34px] h-7 rounded-[9px] flex items-center justify-center cursor-pointer ${seen.has(key) ? "bg-accent-fill text-on-accent" : "bg-hair text-ink"}`}
                          >
                            <Glyph name="check" size={14} />
                          </button>
                        </div>
                      ) : (
                        <div className="min-w-[22px] text-center leading-none">
                          {days != null && days > 0 ? (
                            <>
                              <div className="text-[17px] font-bold text-ink">{days}</div>
                              <div className="text-[9px] font-bold tracking-[.04em] text-dim">DAYS</div>
                            </>
                          ) : (
                            <div className="text-[12.5px] font-bold text-dim">TBA</div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/** "S01 | E05", or "SP | 03" for a special, as the app writes it. */
function code(s: number, e: number) {
  const ep = String(e).padStart(2, "0");
  return s === 0 ? `SP | ${ep}` : `S${String(s).padStart(2, "0")} | E${ep}`;
}

/** "Mar 4, 2024". */
function shortDate(d: string) {
  const [y, m, day] = d.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, day)).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
}
