"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { loadSeason, type SeasonEpisode } from "@/lib/title-actions";
import { setEpisodeSkipped, setEpisodeWatched } from "@/lib/library-actions";
import { CheckGlyph, HOLD, KeyButton, SkipGlyph } from "./TrackerRow";
import { SpoilerName } from "./Spoiler";
import { Day } from "./Day";

type Season = { number: number; name: string; count: number };
type Episode = SeasonEpisode;

// All episodes, as the app's season list (ShowDetailView): a panel a season,
// one open at a time, each with its name and chevron, the count watched of
// those there are, and a band key to check the season off; a progress bar
// under the header; and when open, the season's episodes as bands, each with
// its code and air date over its name, and the skip and watched keys on the
// right. An episode not yet aired shows how many days to go instead.
//
// A season's episodes are fetched when it is opened. The keys are the
// Tracker's (KeyButton): hairline-outlined, and the stroke runs round one
// before it takes. Signed in (`live`), they check episodes off, set them
// aside, or check off a whole season's aired episodes, saved as they're
// pressed and put back if the save fails; signed out, a press says to sign in.
// With `onPick`, a row shows its episode beside the list (the small episode
// page) rather than going to the episode's own page; the one shown is marked,
// and when a season opens with nothing shown yet, its first episode not yet
// watched is.
// `start` is the episode to show first; `scroll` lays the list over the
// space its card has, so it scrolls inside rather than setting the height.
export function SeasonList({ showID, seasons, watched, skipped = [], live = false, open: initial, picked, onPick, start: first, scroll = false }: { showID: number; seasons: Season[]; watched: string[]; skipped?: string[]; live?: boolean; open: number; picked?: string | null; onPick?: (e: Episode) => void; start?: { season: number; episode: number }; scroll?: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState<number | null>(initial);
  const [episodes, setEpisodes] = useState<Record<number, Episode[]>>({});
  const [pending, start] = useTransition();
  const [note, setNote] = useState<string | null>(null);
  const [seenList, setSeen] = useState(watched);
  const [asideList, setAside] = useState(skipped);
  const seen = new Set(seenList);
  const aside = new Set(asideList);
  const listRef = useRef<HTMLDivElement>(null);

  // A change shows at once and is saved behind it; if the save fails (signed
  // out, or no Pro), it's put back and the reason shows over the list.
  function say(text: string) {
    setNote(text);
    setTimeout(() => setNote(null), 5000);
  }
  function change(apply: () => void, undo: () => void, save: () => Promise<{ error?: string }>) {
    if (!live) return say("Sign in to check off episodes.");
    apply();
    void save().then((r) => {
      if (r.error) {
        undo();
        say(r.error);
      } else router.refresh();
    });
  }
  const without = (list: string[], k: string) => list.filter((x) => x !== k);
  function toggleSeen(season: number, episode: number) {
    const k = `${showID}-${season}-${episode}`;
    const was = seen.has(k);
    const wasAside = aside.has(k);
    change(
      () => {
        setSeen((l) => (was ? without(l, k) : [...l, k]));
        if (!was) setAside((l) => without(l, k));
      },
      () => {
        setSeen((l) => (was ? [...l, k] : without(l, k)));
        if (wasAside) setAside((l) => [...without(l, k), k]);
      },
      () => setEpisodeWatched(showID, season, episode, !was),
    );
  }
  function toggleAside(season: number, episode: number) {
    const k = `${showID}-${season}-${episode}`;
    const was = aside.has(k);
    change(
      () => setAside((l) => (was ? without(l, k) : [...l, k])),
      () => setAside((l) => (was ? [...l, k] : without(l, k))),
      () => setEpisodeSkipped(showID, season, episode, !was),
    );
  }
  // A season's key checks off every aired episode in it not yet watched,
  // one save after another so each lands on the last.
  async function checkSeason(n: number) {
    if (!live) return say("Sign in to check off episodes.");
    const eps = episodes[n] ?? (await loadSeason(showID, n));
    const todo = eps.filter((e) => e.airDate && e.airDate <= today && !seen.has(`${showID}-${e.season}-${e.episode}`));
    if (!todo.length) return;
    const keys = todo.map((e) => `${showID}-${e.season}-${e.episode}`);
    setSeen((l) => [...l, ...keys]);
    for (const e of todo) {
      const r = await setEpisodeWatched(showID, e.season, e.episode, true);
      if (r.error) {
        setSeen((l) => l.filter((x) => !keys.includes(x)));
        return say(r.error);
      }
    }
    router.refresh();
  }

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
      {note && (
        <p className="m-0 px-1 text-[1.0417rem] text-dim" role="status">
          {note === "Sign in to check off episodes." ? (
            <>
              <Link href="/login" className="text-accent no-underline hover:underline">Sign in</Link> to check off episodes.
            </>
          ) : (
            note
          )}
        </p>
      )}
      {seasons.map((s) => {
        const done = Array.from({ length: s.count }, (_, i) => `${showID}-${s.number}-${i + 1}`).filter((k) => seen.has(k)).length;
        const isOpen = open === s.number;
        const eps = episodes[s.number];
        return (
          <div key={s.number} className="rounded-shell bg-piece p-3">
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => setOpen(isOpen ? null : s.number)} aria-expanded={isOpen} className="flex items-center gap-2 text-[1.0417rem] font-semibold text-ink cursor-pointer">
                {s.number === 0 ? "Specials" : `Season ${s.number}`}
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden className={`text-dim transition-transform ${isOpen ? "rotate-180" : ""}`}>
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </button>
              <span className="ml-auto text-[1.0417rem] text-dim tabular-nums">
                {done}/{s.count}
              </span>
              <KeyButton
                k={{
                  icon: <CheckGlyph />,
                  label: done === s.count && s.count > 0 ? `${s.name} watched` : `Mark ${s.name} watched`,
                  on: done === s.count && s.count > 0,
                  onFill: "var(--accent-fill)",
                  onInk: "var(--on-accent)",
                  confirm: done === s.count ? undefined : "var(--accent-fill)",
                  run: done === s.count ? undefined : () => void checkSeason(s.number),
                }}
              />
            </div>
            <div className="mt-2 h-1 rounded-full bg-track overflow-hidden">
              <div className="h-full bg-accent-fill" style={{ width: s.count ? `${(done / s.count) * 100}%` : 0 }} />
            </div>
            {isOpen && (
              <div className="mt-2 grid gap-1">
                {!eps && <p className="m-0 py-2 text-[1.0417rem] text-dim">{pending ? "Loading episodes…" : ""}</p>}
                {eps?.length === 0 && <p className="m-0 py-2 text-[1.0417rem] text-dim">No episodes have aired yet.</p>}
                {eps?.map((e) => {
                  const key = `${showID}-${e.season}-${e.episode}`;
                  const aired = !!e.airDate && e.airDate <= today;
                  const days = e.airDate ? Math.ceil((Date.parse(e.airDate) - Date.parse(today)) / 86400000) : null;
                  return (
                    <div key={key} data-ep={key} className={`rounded-[10px] bg-[color:var(--raised)] px-2.5 py-2.5 flex items-center gap-3 ${aired ? "" : "opacity-70"} ${picked === key ? "ring-[1.5px] ring-inset ring-accent-fill" : ""}`}>
                      {/* The episode's own page, as a tap on the row opens it in the app. */}
                      {onPick ? (
                        <button type="button" onClick={() => onPick(e)} aria-pressed={picked === key} className="min-w-0 flex-1 grid gap-[0.25rem] text-left text-ink group cursor-pointer">
                        <div className="text-[1.0417rem] leading-none">
                          <span className="font-semibold text-ink">{code(e.season, e.episode)}</span>
                          {e.airDate && <span className="ml-1.5 text-dim"><Day iso={e.airDate} style="short" /></span>}
                        </div>
                        <div className="text-[1.0417rem] leading-[1.3333rem] text-dim truncate group-hover:text-accent transition-colors">
                          <SpoilerName name={e.name} watched={seen.has(key)} />
                        </div>
                        </button>
                      ) : (
                        <Link href={`/show/${showID}/season/${e.season}/episode/${e.episode}`} className="min-w-0 flex-1 grid gap-[0.25rem] no-underline text-ink group">
                        <div className="text-[1.0417rem] leading-none">
                          <span className="font-semibold text-ink">{code(e.season, e.episode)}</span>
                          {e.airDate && <span className="ml-1.5 text-dim"><Day iso={e.airDate} style="short" /></span>}
                        </div>
                        <div className="text-[1.0417rem] leading-[1.3333rem] text-dim truncate group-hover:text-accent transition-colors">
                          <SpoilerName name={e.name} watched={seen.has(key)} />
                        </div>
                        </Link>
                      )}
                      {aired ? (
                        <div className="flex gap-1.5">
                          <KeyButton
                            k={{
                              icon: <SkipGlyph />,
                              label: aside.has(key) ? `${code(e.season, e.episode)} set aside` : `Watch ${code(e.season, e.episode)} later`,
                              on: aside.has(key),
                              off: seen.has(key),
                              confirm: aside.has(key) ? undefined : HOLD,
                              run: () => toggleAside(e.season, e.episode),
                            }}
                          />
                          <KeyButton
                            k={{
                              icon: <CheckGlyph />,
                              label: seen.has(key) ? `${code(e.season, e.episode)} watched` : `Mark ${code(e.season, e.episode)} watched`,
                              on: seen.has(key),
                              onFill: "var(--accent-fill)",
                              onInk: "var(--on-accent)",
                              confirm: seen.has(key) ? undefined : "var(--accent-fill)",
                              run: () => toggleSeen(e.season, e.episode),
                            }}
                          />
                        </div>
                      ) : (
                        <div className="min-w-[1.8333rem] text-center leading-none">
                          {days != null && days > 0 ? (
                            <>
                              <div className="text-[1.4167rem] font-bold text-ink">{days}</div>
                              <div className="text-[0.75rem] font-bold tracking-[.04em] text-dim">DAYS</div>
                            </>
                          ) : (
                            <div className="text-[1.0417rem] font-bold text-dim">TBA</div>
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
