"use client";

import Link from "next/link";
import { HeadingPill } from "./TitleParts";
import { useEffect, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import type { ProfileTitle } from "@/lib/public-profile";
import { searchForFavourites } from "@/lib/favourites-actions";

type Kind = "movie" | "show";

// The profile's Favourites: top five films and top five shows, filled
// automatically (hearts, then ratings) until the owner chooses their own.
//
// The owner gets an Edit button. In edit mode each poster has a remove mark,
// an empty slot opens a picker (their library first, then a search of every
// film or show), and posters drag to reorder. Reset goes back to automatic.
//
// Where the choice is kept: until accounts exist it is this browser's
// localStorage, keyed by the profile, so the preview keeps it across
// reloads. With accounts it moves to the profile's row in the database, and
// every visitor sees it.
export function FavouritesCard({
  username,
  autoFilms,
  autoShows,
  owner,
}: {
  username: string;
  autoFilms: ProfileTitle[];
  autoShows: ProfileTitle[];
  owner?: { films: ProfileTitle[]; shows: ProfileTitle[] };
}) {
  const storeKey = `kodigo.favourites.${username}`;
  const [picked, setPicked] = useState<{ movie: ProfileTitle[] | null; show: ProfileTitle[] | null }>({ movie: null, show: null });
  const [editing, setEditing] = useState(false);
  const [picker, setPicker] = useState<{ kind: Kind; slot: number } | null>(null);

  useEffect(() => {
    if (!owner) return;
    try {
      const saved = JSON.parse(localStorage.getItem(storeKey) ?? "null");
      // Reading this browser's saved choice after mount: the server can't see it.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (saved && typeof saved === "object") setPicked({ movie: saved.movie ?? null, show: saved.show ?? null });
    } catch {}
  }, [owner, storeKey]);

  function save(next: typeof picked) {
    setPicked(next);
    try {
      if (next.movie || next.show) localStorage.setItem(storeKey, JSON.stringify(next));
      else localStorage.removeItem(storeKey);
    } catch {}
  }

  const films = picked.movie ?? autoFilms;
  const shows = picked.show ?? autoShows;
  const list = (k: Kind) => (k === "movie" ? films : shows);

  function setList(k: Kind, titles: ProfileTitle[]) {
    save({ ...picked, [k]: titles.slice(0, 5) });
  }

  function remove(k: Kind, i: number) {
    setList(k, list(k).filter((_, j) => j !== i));
  }

  function move(k: Kind, from: number, to: number) {
    const next = [...list(k)];
    const [t] = next.splice(from, 1);
    next.splice(Math.min(to, next.length), 0, t);
    setList(k, next);
  }

  function choose(t: ProfileTitle) {
    if (!picker) return;
    const next = [...list(picker.kind)].filter((x) => x.key !== t.key);
    next.splice(Math.min(picker.slot, next.length), 0, t);
    setList(picker.kind, next);
    setPicker(null);
  }

  const custom = picked.movie != null || picked.show != null;

  return (
    <div className="flex-1 rounded-shell bg-card border border-hair p-2 pb-3.5 flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <HeadingPill small>Favourites</HeadingPill>
        {owner && (
          <div className="flex items-center gap-2">
            {editing && custom && (
              <button type="button" onClick={() => save({ movie: null, show: null })} className="text-[1rem] text-dim hover:text-ink cursor-pointer">
                Reset to automatic
              </button>
            )}
            <button
              type="button"
              onClick={() => setEditing((e) => !e)}
              className={`px-3 h-7 rounded-full text-[1.0417rem] font-semibold cursor-pointer transition-colors ${editing ? "bg-accent-fill text-on-accent" : "border border-hair text-ink hover:border-accent hover:text-accent"}`}
            >
              {editing ? "Done" : "Edit"}
            </button>
          </div>
        )}
      </div>

      {/* A visitor sees only what's there: no empty slots, and no row with
          nothing in it. */}
      {(owner || films.length > 0) && <Row label="Top 5 films" kind="movie" titles={films} editing={editing} owner={!!owner} onRemove={remove} onMove={move} onAdd={(slot) => setPicker({ kind: "movie", slot })} />}
      {(owner || shows.length > 0) && <Row label="Top 5 shows" kind="show" titles={shows} editing={editing} owner={!!owner} onRemove={remove} onMove={move} onAdd={(slot) => setPicker({ kind: "show", slot })} />}
      {!owner && films.length + shows.length === 0 && <p className="m-0 px-1 text-[1.0417rem] text-dim">Nothing here yet.</p>}

      {picker && owner && (
        <Picker
          kind={picker.kind}
          library={(picker.kind === "movie" ? owner.films : owner.shows).filter((t) => !list(picker.kind).some((x) => x.key === t.key))}
          onChoose={choose}
          onClose={() => setPicker(null)}
        />
      )}
    </div>
  );
}

function Row({
  label,
  kind,
  titles,
  editing,
  owner,
  onRemove,
  onMove,
  onAdd,
}: {
  label: string;
  kind?: Kind;
  titles: ProfileTitle[];
  editing: boolean;
  owner: boolean;
  onRemove?: (k: Kind, i: number) => void;
  onMove?: (k: Kind, from: number, to: number) => void;
  onAdd?: (slot: number) => void;
}) {
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  return (
    <div>
      <div className="px-1 text-[0.9167rem] font-bold tracking-[.14em] uppercase text-dim mb-2">{label}</div>
      <div className="grid grid-cols-5 gap-2">
        {Array.from({ length: 5 }, (_, i) => {
          const t = titles[i];
          if (!t) {
            return editing && kind ? (
              <button
                key={`empty${i}`}
                type="button"
                onClick={() => onAdd?.(titles.length)}
                aria-label={`Add to ${label}`}
                className="aspect-[2/3] rounded-[8px] border border-dashed border-accent text-accent flex items-center justify-center text-[2rem] leading-none cursor-pointer hover:bg-card-hi transition-colors"
              >
                +
              </button>
            ) : owner ? (
              <div key={`empty${i}`} aria-hidden className="aspect-[2/3] rounded-[8px] border border-dashed border-hair" />
            ) : null;
          }
          const img = t.poster ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={t.poster} alt={t.title} loading="lazy" className="w-full h-full object-cover" draggable={false} />
          ) : (
            <div className="w-full h-full flex items-center justify-center p-2 text-center text-xs text-dim">{t.title}</div>
          );
          if (!editing || !kind) {
            return (
              <Link key={t.key} href={t.href} title={t.title} className="group block no-underline">
                <div className="aspect-[2/3] overflow-hidden rounded-[8px] bg-card-hi border border-hair group-hover:border-accent transition-colors">{img}</div>
              </Link>
            );
          }
          return (
            <div
              key={t.key}
              draggable
              onDragStart={() => setDragFrom(i)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => {
                if (dragFrom != null && dragFrom !== i) onMove?.(kind, dragFrom, i);
                setDragFrom(null);
              }}
              title={`${t.title} (drag to reorder)`}
              className={`relative aspect-[2/3] overflow-hidden rounded-[8px] bg-card-hi border border-accent cursor-grab active:cursor-grabbing ${dragFrom === i ? "opacity-40" : ""}`}
            >
              {img}
              <button
                type="button"
                onClick={() => onRemove?.(kind, i)}
                aria-label={`Remove ${t.title}`}
                className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/70 text-white text-[1.1667rem] leading-none flex items-center justify-center cursor-pointer hover:bg-black"
              >
                ×
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Choosing a title for a slot: the owner's own library first (hearts and
// best-rated at the top), and a search of every film or show for anything
// they haven't logged.
function Picker({ kind, library, onChoose, onClose }: { kind: Kind; library: ProfileTitle[]; onChoose: (t: ProfileTitle) => void; onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ProfileTitle[] | null>(null);
  const [pending, start] = useTransition();
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    input.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      // Clearing the search goes back to the library suggestions.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setResults(null);
      return;
    }
    const t = setTimeout(() => start(async () => setResults(await searchForFavourites(q, kind))), 300);
    return () => clearTimeout(t);
  }, [query, kind]);

  const shown = results ?? library;
  const noun = kind === "movie" ? "film" : "show";

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={`Choose a ${noun}`} className="fixed inset-0 z-[100] bg-black/70 flex items-center justify-center p-4" onClick={onClose}>
      <div className="w-full max-w-[60rem] max-h-[82vh] flex flex-col rounded-shell bg-card border border-hair shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="p-4 border-b border-hair flex items-center gap-3">
          <input
            ref={input}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Search every ${noun}…`}
            className="field !py-2.5 !rounded-full flex-1"
          />
          <button type="button" onClick={onClose} aria-label="Close" className="w-9 h-9 rounded-full hover:bg-card-hi text-dim hover:text-ink text-xl cursor-pointer">
            ×
          </button>
        </div>
        <div className="px-4 pt-3 text-[0.9167rem] font-bold tracking-[.14em] uppercase text-dim">
          {results ? (pending ? "Searching…" : `Results for “${query.trim()}”`) : "From your library"}
        </div>
        <div className="p-4 overflow-y-auto grid grid-cols-4 sm:grid-cols-6 gap-3">
          {shown.length === 0 && <p className="col-span-full text-sm text-dim m-0">{results ? "Nothing found." : `No ${noun}s in your library yet. Search above.`}</p>}
          {shown.map((t) => (
            <button key={t.key} type="button" onClick={() => onChoose(t)} className="text-left cursor-pointer group">
              <div className="aspect-[2/3] rounded-[8px] overflow-hidden bg-card-hi border border-hair group-hover:border-accent transition-colors">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {t.poster && <img src={t.poster} alt="" className="w-full h-full object-cover" />}
              </div>
              <div className="mt-1 text-[0.9583rem] leading-tight text-ink line-clamp-2">
                {t.title} <span className="text-dim">{t.year}</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>,
    document.body,
  );
}
