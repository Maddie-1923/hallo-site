"use client";

import Link from "next/link";
import { useEffect, useLayoutEffect, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import type { Movie, Show } from "@/lib/archive";
import type { ListOption } from "@/lib/marks";
import { createList, setOnList, setRating, trackMovie, trackShow, untrackMovie, untrackShow } from "@/lib/library-actions";
import type { MarkState } from "./MarkButtons";
import { HeartRating } from "./HeartRating";

type Target = { kind: "show"; show: Show } | { kind: "movie"; movie: Movie };

// The panel behind the list mark — Letterboxd's "•••" in Kodigo's words. Ten
// hearts across the top (the app's rating, no label), then the rows: Recent
// activity, Review & catalogue, the watchlist for this kind, Your lists (the
// person's own, plus a field to start one), Other lists, Where to watch.
// Everything writes through the same actions the app's merge understands.
export function MarkMenu({
  target,
  state,
  lists,
  onClose,
  onLog,
  anchor,
}: {
  target: Target;
  state: MarkState;
  lists: ListOption[];
  onClose: () => void;
  /** Opens the log dialog. It belongs to `MarkButtons` rather than to this
      menu: the menu closes on any click outside its own box, and a dialog
      portalled to the body is outside it, so a dialog owned here died on its
      own first click. */
  onLog: () => void;
  /** The button the menu hangs off. Rendered in a portal, positioned from its rect, so no rail or card can clip it. */
  anchor: HTMLElement | null;
}) {
  const router = useRouter();
  const root = useRef<HTMLDivElement>(null);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string>();
  const [showLists, setShowLists] = useState(false);
  const [newName, setNewName] = useState("");
  const [rating, setRatingShown] = useState<number | null>(state.rating);
  const [onLists, setOnLists] = useState<Set<string>>(new Set(state.listIDs));
  const title = target.kind === "show" ? target.show.name : target.movie.title;
  const href = target.kind === "show" ? `/show/${target.show.id}` : `/movie/${target.movie.id}`;
  const [pos, setPos] = useState<{ top?: number; bottom?: number; right: number } | null>(null);

  // Above the button when there's room, below when there isn't; right-aligned
  // to it. Re-measured on scroll and resize so it stays attached.
  useLayoutEffect(() => {
    if (!anchor) return;
    const place = () => {
      const r = anchor.getBoundingClientRect();
      const right = Math.max(8, window.innerWidth - r.right);
      if (r.top > 360) setPos({ bottom: window.innerHeight - r.top + 8, right });
      else setPos({ top: r.bottom + 8, right });
    };
    place();
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => {
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    };
  }, [anchor]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!root.current?.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  function run(action: () => Promise<{ error?: string }>, after?: () => void) {
    setError(undefined);
    start(async () => {
      const r = await action();
      if (r.error) {
        if (r.error.startsWith("Sign in")) {
          router.push(`/login?next=${encodeURIComponent(window.location.pathname)}`);
          return;
        }
        setError(r.error);
        return;
      }
      after?.();
      router.refresh();
    });
  }

  const row = "w-full text-left px-3.5 py-2 text-[13px] hover:bg-card-hi cursor-pointer disabled:opacity-50 disabled:cursor-default text-ink no-underline block";

  if (!pos || typeof document === "undefined") return null;
  return createPortal(
    <div
      ref={root}
      role="menu"
      aria-label={`More for ${title}`}
      onClick={(e) => {
        e.stopPropagation();
      }}
      style={{ position: "fixed", ...pos }}
      className="z-[70] w-[232px] rounded-2xl border border-hair bg-card shadow-[0_20px_50px_rgba(0,0,0,.6)] overflow-hidden text-left font-normal"
    >
      <div className="px-1.5 pt-2 pb-1.5 border-b border-hair">
        <HeartRating
          value={rating}
          label={`Rate ${title} out of ten`}
          disabled={pending}
          onChange={(next) => {
            setRatingShown(next);
            run(() => setRating(target, next));
          }}
        />
        {rating !== null && (
          <div className="flex justify-between items-center px-1 pt-1">
            <span className="text-xs text-dim">{rating} / 10</span>
            <button
              type="button"
              className="text-xs text-dim hover:text-ink cursor-pointer"
              disabled={pending}
              onClick={() => {
                setRatingShown(null);
                run(() => setRating(target, null));
              }}
            >
              Clear
            </button>
          </div>
        )}
      </div>

      <Link href={`${href}#activity`} className={row} onClick={onClose}>
        Recent activity
      </Link>
      {/* Opens over whatever you were looking at rather than jumping to a
          section further down the title page — writing two sentences should
          not cost you your place. */}
      <button type="button" className={row} onClick={onLog}>
        Review &amp; catalogue
      </button>

      {/* The watchlist for this kind: Watching for a show, To Watch for a
          film. Once it's there the row reads as a tick and clicking takes it
          back out. */}
      <button
        type="button"
        className={row}
        disabled={pending}
        onClick={() =>
          run(
            () =>
              state.tracked
                ? target.kind === "movie" ? untrackMovie(target.movie.id) : untrackShow(target.show.id)
                : target.kind === "movie" ? trackMovie(target.movie, "To Watch") : trackShow(target.show, "Watching"),
            onClose,
          )
        }
      >
        {state.tracked ? "✓ " : "+ "}
        {target.kind === "movie" ? "Movies watchlist" : "Shows watchlist"}
      </button>

      <button type="button" className={`${row} flex items-center justify-between`} onClick={() => setShowLists((v) => !v)} aria-expanded={showLists}>
        <span>+ Your lists</span>
        <span className="text-dim text-xs">{showLists ? "▴" : "▾"}</span>
      </button>
      {showLists && (
        <div className="px-3 pb-3 bg-card-hi/60">
          {lists.length === 0 && <p className="text-xs text-dim px-1 pt-2 m-0">No lists yet. Start one below.</p>}
          <ul className="m-0 p-0 list-none">
            {lists.map((l) => {
              const on = onLists.has(l.id);
              return (
                <li key={l.id}>
                  <label className="flex items-center gap-2 px-1 py-1.5 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      className="accent-[var(--accent-fill)]"
                      checked={on}
                      disabled={pending}
                      onChange={(e) => {
                        const next = e.target.checked;
                        setOnLists((s) => {
                          const c = new Set(s);
                          if (next) c.add(l.id);
                          else c.delete(l.id);
                          return c;
                        });
                        run(() => setOnList(l.id, target, next));
                      }}
                    />
                    <span className="truncate">{l.name}</span>
                  </label>
                </li>
              );
            })}
          </ul>
          <form
            className="flex gap-1.5 mt-1"
            onSubmit={(e) => {
              e.preventDefault();
              const name = newName.trim();
              if (!name) return;
              run(
                async () => {
                  const r = await createList(name);
                  if (r.error || !r.id) return { error: r.error ?? "Couldn't make the list." };
                  return setOnList(r.id, target, true);
                },
                () => setNewName(""),
              );
            }}
          >
            <input className="field !py-1.5 !px-2.5 text-sm" placeholder="New list…" value={newName} maxLength={60} onChange={(e) => setNewName(e.target.value)} />
            <button type="submit" className="btn !py-1.5 !px-3 text-sm" disabled={pending || !newName.trim()}>Add</button>
          </form>
        </div>
      )}

      <span className={`${row} text-dim cursor-default hover:bg-transparent`} aria-disabled="true" title="Lists from other people, once sharing exists">
        Other lists
      </span>
      <a
        href={target.kind === "movie" ? `https://www.themoviedb.org/movie/${target.movie.id}/watch` : `https://www.themoviedb.org/tv/${target.show.id}/watch`}
        target="_blank"
        rel="noopener"
        className={`${row} border-t border-hair`}
        onClick={onClose}
      >
        Where to watch ↗
      </a>

      {error && <p className="px-4 pb-3 text-xs m-0" style={{ color: "var(--movies)" }} role="alert">{error}</p>}

    </div>,
    document.body,
  );
}
