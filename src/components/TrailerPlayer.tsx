"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { Video } from "@/lib/tmdb";

// A trailer played on the page: the window darkens and blurs behind it, the
// video plays in the middle (YouTube's privacy-enhanced player, which sets
// no cookies until it plays), and a press outside it, the ×, or Escape
// closes it. Drawn on the page's body, so no card around the button (the
// title bento's shadow, say) can hold it inside itself.
export function TrailerModal({ id, onClose }: { id: string; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [onClose]);

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label="Trailer" className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="relative w-full max-w-[1100px] aspect-video rounded-shell overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`}
          title="Trailer"
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
          className="absolute inset-0 w-full h-full border-0"
        />
      </div>
      <button type="button" onClick={onClose} aria-label="Close trailer" className="absolute top-5 right-5 w-10 h-10 rounded-full bg-white/15 hover:bg-white/25 text-white text-xl cursor-pointer">
        ×
      </button>
    </div>,
    document.body,
  );
}

/** A trailer's card on a title's page: its YouTube picture with a play mark
    and its name under it, opening the trailer over the page. */
export function TrailerCard({ video }: { video: Video }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-label={`Play ${video.name}`} className="group block w-full min-w-0 text-left text-ink cursor-pointer">
        <span className="relative block aspect-video rounded-shell overflow-hidden border border-white/15 shadow-[0_10px_18px_rgba(0,0,0,.34)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`https://img.youtube.com/vi/${video.key}/hqdefault.jpg`} alt="" className="w-full h-full object-cover" />
          <span className="absolute inset-0 flex items-center justify-center">
            <svg width="54" height="54" viewBox="0 0 24 24" aria-hidden className="drop-shadow-[0_4px_8px_rgba(0,0,0,.5)] group-hover:scale-105 transition-transform">
              <circle cx="12" cy="12" r="11" fill="white" />
              <path d="M10 8.2v7.6L16 12z" fill="#1a1a19" />
            </svg>
          </span>
        </span>
        <span className="flex mt-2 px-1 pb-0.5 text-[12.5px] min-w-0">
          <span className="font-semibold truncate group-hover:text-accent transition-colors">{video.name}</span>
          <span className="shrink-0 text-dim">&nbsp;· YouTube</span>
        </span>
      </button>
      {open && <TrailerModal id={video.key} onClose={() => setOpen(false)} />}
    </>
  );
}
