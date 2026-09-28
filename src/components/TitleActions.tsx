"use client";

import { useState } from "react";
import { Glyph } from "./Glyph";

// What can be done with a title, in a card of its own at the head of the
// page's right column: the app's keys, each with its name under it. A film
// has the watchlist, Watched, the heart, Rewatch (once it's watched), Add to
// list and Share; a series has Track, the heart, the alarm, Stop watching,
// Add to list and Share. Set keys fill with their colours, as in the app.
//
// Share works now (the phone's share sheet, or the link copied). The rest
// save to the library, which opens with accounts; until then a press says so.
type Key = { icon: Parameters<typeof Glyph>[0]["name"]; label: string; on?: boolean; fill?: string; ink?: string; off?: boolean };

export function TitleActions({ kind, title, tracked, watched = false, loved, stopped = false }: { kind: "movie" | "show"; title: string; tracked: boolean; watched?: boolean; loved: boolean; stopped?: boolean }) {
  const [said, setSaid] = useState<string | null>(null);
  function say(text: string) {
    setSaid(text);
    setTimeout(() => setSaid(null), 3200);
  }
  async function share() {
    const url = location.href.split("#")[0];
    if (navigator.share) {
      try {
        await navigator.share({ url, title: `${title} on Kodigo` });
      } catch {}
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      say("Link copied");
    } catch {}
  }

  const keys: Key[] =
    kind === "movie"
      ? [
          { icon: tracked ? "bookmark" : "plus", label: tracked ? "On watchlist" : "Watchlist", on: tracked && !watched, fill: "var(--list-fill)" },
          { icon: "check", label: "Watched", on: watched, fill: "var(--accent-fill)", ink: "var(--on-accent)" },
          { icon: loved ? "heart-fill" : "heart", label: "Favourite", on: loved, fill: "#CF8DB5" },
          { icon: "repeat", label: "Rewatch", off: !watched },
          { icon: "list", label: "Add to list" },
          { icon: "share", label: "Share" },
        ]
      : [
          { icon: tracked ? "bookmark" : "plus", label: tracked ? "Tracking" : "Track", on: tracked, fill: "var(--list-fill)" },
          { icon: loved ? "heart-fill" : "heart", label: "Favourite", on: loved, fill: "#CF8DB5" },
          { icon: "bell", label: "Alerts", on: tracked, fill: "#D9BC52", ink: "#5A4200", off: !tracked },
          { icon: "pause", label: "Stop", on: stopped, fill: "#D69570", off: !tracked },
          { icon: "list", label: "Add to list" },
          { icon: "share", label: "Share" },
        ];

  return (
    <div className="rounded-[20px] bg-card p-2 border-[0.5px] border-t-[color:var(--lit-edge)] border-x-piece border-b-well shadow-[0_4px_9px_rgba(0,0,0,.35)]">
      <div className="grid grid-cols-3 gap-2">
        {keys.map((k) => (
          <button
            key={k.label}
            type="button"
            disabled={k.off}
            onClick={() => (k.icon === "share" ? share() : say("Saving on the website opens with accounts. Until then, use the app."))}
            className="h-[58px] rounded-[12px] bg-piece text-dim flex flex-col items-center justify-center gap-1 cursor-pointer enabled:hover:text-ink transition-colors disabled:opacity-35 disabled:cursor-default"
            style={k.on ? { background: k.fill, color: k.ink ?? "#F0EFE9" } : undefined}
          >
            <Glyph name={k.icon} size={18} />
            <span className="text-[11px] font-semibold leading-none">{k.label}</span>
          </button>
        ))}
      </div>
      {said && <p className="m-0 mt-2 text-center text-[12px] text-dim">{said}</p>}
    </div>
  );
}
