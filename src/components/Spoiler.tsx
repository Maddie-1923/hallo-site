"use client";

import { useSettings } from "@/lib/settings";

// Spoiler protection (Settings, Spoilers), as the app does it: an episode
// not yet watched has its name read "Hidden", its description "Hidden until
// you've watched it.", and its picture blurred under an eye and a band
// reading NO SPOILERS. Each is its own switch, and nothing watched is hidden.

export function useSpoilers() {
  const [s] = useSettings();
  return { names: s.hideTitles, descriptions: s.hideDescriptions, images: s.hideImages };
}

export const MASKED_NAME = "Hidden";
export const MASKED_OVERVIEW = "Hidden until you've watched it.";

/** An episode's name, or "Hidden". */
export function SpoilerName({ name, watched }: { name: string; watched: boolean }) {
  const hide = useSpoilers().names && !watched;
  return <>{hide ? MASKED_NAME : name}</>;
}

/** Laid over an episode's picture (its parent positioned): when hidden, it
    blurs what's under it and says so. */
export function SpoilerCover({ watched, small = false }: { watched: boolean; small?: boolean }) {
  const hide = useSpoilers().images && !watched;
  if (!hide) return null;
  return (
    <span aria-label="Hidden to avoid spoilers" role="img" className="absolute inset-0 z-[1] backdrop-blur-xl bg-black/35 flex items-center justify-center">
      <span className={`flex flex-col items-center ${small ? "gap-1" : "gap-2"} text-white`}>
        <svg width={small ? 16 : 26} height={small ? 16 : 26} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M3 3l18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M9.4 5.2A10.4 10.4 0 0 1 12 5c5 0 9 4.5 10 7-.4 1-1.3 2.4-2.6 3.7M6.3 6.3C4 7.8 2.5 10 2 12c1 2.5 5 7 10 7 1.7 0 3.3-.5 4.6-1.3" />
        </svg>
        {!small && <span className="px-2.5 py-1 rounded-full bg-black/45 text-[0.875rem] font-bold uppercase tracking-[.12em]">No spoilers</span>}
      </span>
    </span>
  );
}
