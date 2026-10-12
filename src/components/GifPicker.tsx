"use client";

import { useEffect, useRef, useState } from "react";
import { searchGifs } from "@/lib/social-actions";
import type { Gif } from "@/lib/klipy";

// The GIF picker under a comment box (docs/gif-plan.md): trending until
// something is typed, then KLIPY's search, in the order KLIPY returns it —
// their terms ask that results aren't reordered or filtered here. The field
// says "Search KLIPY" and the foot carries their attribution, both conditions
// of the key.
export function GifPicker({ onPick, onClose }: { onPick: (gif: Gif) => void; onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [gifs, setGifs] = useState<Gif[] | null>(null);
  const field = useRef<HTMLInputElement>(null);

  useEffect(() => field.current?.focus(), []);
  useEffect(() => {
    // A pause after typing stops before asking, so a word isn't a search
    // per letter against the key's allowance.
    let stale = false;
    const wait = setTimeout(
      () => {
        searchGifs(query)
          .then((r) => !stale && setGifs(r))
          .catch(() => !stale && setGifs([]));
      },
      query ? 350 : 0,
    );
    return () => {
      stale = true;
      clearTimeout(wait);
    };
  }, [query]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div role="dialog" aria-label="Choose a GIF" className="rounded-[18px] bg-card border border-hair p-2 grid gap-2">
      <div className="flex items-center gap-2">
        <input
          ref={field}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value.slice(0, 100))}
          placeholder="Search KLIPY"
          aria-label="Search KLIPY"
          className="flex-1 min-w-0 h-9 rounded-full bg-page border border-hair px-4 text-[1.0417rem] text-ink placeholder:text-dim focus:outline-none focus:border-accent"
        />
        <button type="button" onClick={onClose} aria-label="Close the GIF picker" className="shrink-0 w-9 h-9 rounded-full text-dim hover:text-ink cursor-pointer">
          ✕
        </button>
      </div>
      <div className="max-h-[22rem] overflow-y-auto">
        {gifs === null ? (
          <p className="m-0 p-3 text-[1.0417rem] text-dim">Loading…</p>
        ) : gifs.length === 0 ? (
          <p className="m-0 p-3 text-[1.0417rem] text-dim">{query ? "No GIFs for that. Try other words." : "GIFs aren't available right now."}</p>
        ) : (
          <div className="columns-3 gap-1.5 [&>*]:mb-1.5">
            {gifs.map((g) => (
              <button key={g.slug} type="button" onClick={() => onPick(g)} aria-label={g.title || "GIF"} className="block w-full rounded-[8px] overflow-hidden bg-page cursor-pointer focus:outline-2 focus:outline-accent">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={g.url} alt="" loading="lazy" width={g.width} height={g.height} className="block w-full h-auto" />
              </button>
            ))}
          </div>
        )}
      </div>
      <p className="m-0 text-right text-[.875rem] font-semibold tracking-[.04em] text-dim">Powered by KLIPY</p>
    </div>
  );
}

/**
 * A comment's GIF in a thread: at its own shape, no wider than the column,
 * its title read out to screen readers. With Reduce Motion on it shows its
 * first frame until tapped; a tap pauses or plays it either way.
 */
export function CommentGif({ gif }: { gif: Gif }) {
  const [playing, setPlaying] = useState(true);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) setPlaying(false);
  }, []);
  const src = playing || !gif.still ? gif.url : gif.still;
  return (
    <button
      type="button"
      onClick={() => setPlaying((p) => !p)}
      aria-label={`${gif.title || "GIF"}. ${playing ? "Pause" : "Play"}`}
      className="relative block mt-1.5 max-w-[16rem] rounded-[10px] overflow-hidden bg-card cursor-pointer"
      style={{ aspectRatio: `${gif.width} / ${gif.height}` }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" width={gif.width} height={gif.height} loading="lazy" className="block w-full h-full object-cover" />
      {!playing && (
        <span aria-hidden className="absolute inset-0 flex items-center justify-center">
          <span className="w-10 h-10 rounded-full bg-black/55 text-white flex items-center justify-center text-[1.1rem]">▶</span>
        </span>
      )}
    </button>
  );
}
