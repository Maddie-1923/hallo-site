"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Review } from "@/lib/archive";
import { poster, year } from "@/lib/archive";
import { logSearch, logState } from "@/lib/log-actions";
import type { SearchHit } from "@/lib/tmdb";
import { ReviewDialog } from "./ReviewDialog";

// "+ Log" in the bar, from any page: find the film or series, then the same
// review dialog a title page opens (date, rating, heart, moods, rewatch,
// review), already holding what was logged before. Saving there marks it
// watched and adds it to the library if it isn't in it yet.

type Picked = { hit: SearchHit; review: Review | null; rating: number | null; moods: string[] };

export function LogButton({ framed = false }: { framed?: boolean }) {
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<Picked | null>(null);

  // "L" opens it from anywhere that isn't a text box, as a keyboard shortcut.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (e.key.toLowerCase() !== "l" || e.metaKey || e.ctrlKey || e.altKey || t?.closest("input, textarea, select, [contenteditable]")) return;
      e.preventDefault();
      setOpen(true);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Log something you watched"
        title="Log something you watched (L)"
        className={`h-9 rounded-full flex items-center justify-center gap-1.5 px-2.5 sm:px-3.5 text-sm font-semibold cursor-pointer transition-[filter] hover:brightness-110 ${
          framed ? "bg-black/35 border border-white/25 backdrop-blur-md text-white" : "bg-accent-fill text-on-accent"
        }`}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden>
          <path d="M12 5v14M5 12h14" />
        </svg>
        <span className="hidden sm:inline">Log</span>
      </button>
      {open && !picked && <Finder onClose={() => setOpen(false)} onPick={setPicked} />}
      {picked && (
        <ReviewDialog
          target={picked.hit}
          review={picked.review}
          rating={picked.rating}
          moods={picked.moods}
          onClose={() => {
            setPicked(null);
            setOpen(false);
          }}
        />
      )}
    </>
  );
}

/** The search step: type, pick with a click or the arrow keys and Return. */
function Finder({ onClose, onPick }: { onClose: () => void; onPick: (p: Picked) => void }) {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [searched, setSearched] = useState("");
  const [active, setActive] = useState(0);
  const [loading, setLoading] = useState<number | null>(null);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    input.current?.focus();
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  // Searched a moment after typing stops; an older answer never replaces a newer one.
  useEffect(() => {
    const text = q.trim();
    if (text.length < 2) return;
    let stale = false;
    const t = setTimeout(async () => {
      const found = await logSearch(text).catch(() => []);
      if (stale) return;
      setHits(found);
      setSearched(text);
      setActive(0);
    }, 250);
    return () => {
      stale = true;
      clearTimeout(t);
    };
  }, [q]);

  const shown = q.trim().length >= 2 ? hits : [];

  async function pick(i: number) {
    const hit = shown[i];
    if (!hit || loading !== null) return;
    setLoading(i);
    const id = hit.kind === "show" ? hit.show.id : hit.movie.id;
    const state = await logState(hit.kind, id).catch(() => null);
    onPick({ hit, review: state?.review ?? null, rating: state?.rating ?? null, moods: state?.moods ?? [] });
  }

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label="Log something you watched" className="fixed inset-0 z-[100] bg-black/70 flex items-start justify-center p-4 pt-[12vh]" onClick={onClose}>
      <div className="w-full max-w-[43.3333rem] rounded-shell bg-card border border-hair shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="p-3 border-b border-hair flex items-center gap-2">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden className="text-dim shrink-0 ml-1">
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-3.5-3.5" />
          </svg>
          <input
            ref={input}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") onClose();
              else if (e.key === "ArrowDown") {
                e.preventDefault();
                setActive((a) => Math.min(a + 1, shown.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActive((a) => Math.max(a - 1, 0));
              } else if (e.key === "Enter") {
                e.preventDefault();
                void pick(active);
              }
            }}
            placeholder="What did you watch?"
            aria-label="Search for a film or series"
            className="flex-1 min-w-0 h-10 bg-transparent text-[1.25rem] text-ink placeholder:text-dim focus:outline-none"
          />
          <button type="button" onClick={onClose} aria-label="Close" className="shrink-0 w-9 h-9 rounded-full bg-card-hi hover:bg-hair text-ink flex items-center justify-center cursor-pointer">
            <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden className="block">
              <path d="M1.5 1.5l9 9M10.5 1.5l-9 9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        {shown.length > 0 ? (
          <ul role="listbox" aria-label="Results" className="m-0 p-1.5 list-none max-h-[60vh] overflow-y-auto soft-scroll">
            {shown.map((hit, i) => {
              const title = hit.kind === "show" ? hit.show.name : hit.movie.title;
              const when = year(hit.kind === "show" ? hit.show.first_air_date : hit.movie.release_date);
              const art = poster(hit.kind === "show" ? hit.show.poster_path : hit.movie.poster_path, "w185");
              return (
                <li key={`${hit.kind}${hit.kind === "show" ? hit.show.id : hit.movie.id}`} role="option" aria-selected={i === active}>
                  <button
                    type="button"
                    onMouseEnter={() => setActive(i)}
                    onClick={() => void pick(i)}
                    className={`w-full flex items-center gap-3 p-2 rounded-[10px] text-left cursor-pointer ${i === active ? "bg-card-hi" : ""}`}
                  >
                    <span className="w-9 aspect-[2/3] shrink-0 rounded-[6px] overflow-hidden bg-piece">
                      {art && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={art} alt="" className="w-full h-full object-cover" />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[1.0833rem] font-semibold text-ink truncate">{title}</span>
                      <span className="block text-[1.0417rem] text-dim">{[when, hit.kind === "show" ? "Series" : "Film"].filter(Boolean).join(" · ")}</span>
                    </span>
                    {loading === i && <span className="text-[1rem] text-dim shrink-0">Opening…</span>}
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="m-0 p-4 text-[1.0417rem] text-dim">{q.trim().length < 2 ? "Type a film or series. Press L on any page to open this." : searched === q.trim() ? `Nothing matches “${q.trim()}”.` : "Searching…"}</p>
        )}
      </div>
    </div>,
    document.body,
  );
}
