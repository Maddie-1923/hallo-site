"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Movie, Show } from "@/lib/archive";
import { trackMovie, trackShow } from "@/lib/library-actions";

// The "+" in a card's corner, the app's one-tap add. Adds straight from the
// rail; signed out, the action says so and the button sends them to sign in
// with a way back to the page they were on.
export function QuickAdd(props: { kind: "show"; show: Show; tracked: boolean } | { kind: "movie"; movie: Movie; tracked: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [done, setDone] = useState(props.tracked);
  const label = props.kind === "show" ? props.show.name : props.movie.title;

  if (done) {
    return (
      <span
        aria-label={`${label} is in your library`}
        className="w-8 h-8 rounded-full bg-accent-fill text-graphite flex items-center justify-center shrink-0"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M5 12l5 5L20 7" />
        </svg>
      </span>
    );
  }

  return (
    <button
      type="button"
      aria-label={`Add ${label} to your library`}
      disabled={pending}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        start(async () => {
          const r = props.kind === "show" ? await trackShow(props.show) : await trackMovie(props.movie);
          if (r.error) {
            router.push(`/login?next=${encodeURIComponent(window.location.pathname)}`);
            return;
          }
          setDone(true);
          router.refresh();
        });
      }}
      className="w-8 h-8 rounded-full bg-ink/15 text-ink flex items-center justify-center shrink-0 hover:bg-accent-fill hover:text-graphite transition-colors cursor-pointer disabled:opacity-50"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden>
        <path d="M12 5v14M5 12h14" />
      </svg>
    </button>
  );
}
