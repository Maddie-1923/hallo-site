"use client";

import { useState } from "react";
import { Glyph } from "./Glyph";
import { ConfirmKey } from "./ConfirmKey";

// What can be done with a title, in a card of its own at the head of the
// page's right column: the app's keys, each with its name under it, in two
// rows. A film: Watched, Like, Rewatch (once it's watched); then Watchlist,
// Add to list, Share. A series: Track, Like, Alerts; then Stop, Add to list,
// Share. Switching a key on plays the app's confirmation (ConfirmKey) and
// leaves it filled in its colour; switching it off is at once.
//
// Share works now (the phone's share sheet, or the link copied). The rest
// change only this page until accounts exist, when they save to the library;
// the first press says so.
type Key = { id: string; icon: Parameters<typeof Glyph>[0]["name"]; iconOn?: Parameters<typeof Glyph>[0]["name"]; label: string; labelOn?: string; fill?: string; ink?: string; off?: boolean; toggle?: boolean };

export function TitleActions({ kind, title, tracked, watched = false, loved, stopped = false }: { kind: "movie" | "show"; title: string; tracked: boolean; watched?: boolean; loved: boolean; stopped?: boolean }) {
  const [state, setState] = useState<Record<string, boolean>>({
    watched,
    like: loved,
    watchlist: tracked && !watched,
    track: tracked,
    alerts: tracked,
    stop: stopped,
  });
  const [said, setSaid] = useState<string | null>(null);
  const [told, setTold] = useState(false);
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
  function flip(id: string) {
    setState((s) => ({ ...s, [id]: !s[id] }));
    if (!told) {
      say("This page only, for now: saving to your library opens with accounts.");
      setTold(true);
    }
  }

  const LIKE = "#CF8DB5";
  const keys: Key[] =
    kind === "movie"
      ? [
          { id: "watched", icon: "check", label: "Watched", fill: "var(--accent-fill)", ink: "var(--on-accent)", toggle: true },
          { id: "like", icon: "heart", iconOn: "heart-fill", label: "Like", labelOn: "Liked", fill: LIKE, toggle: true },
          { id: "rewatch", icon: "repeat", label: "Rewatch", fill: "var(--accent-fill)", ink: "var(--on-accent)", off: !state.watched },
          { id: "watchlist", icon: "plus", iconOn: "bookmark", label: "Watchlist", labelOn: "On watchlist", fill: "var(--list-fill)", toggle: true },
          { id: "list", icon: "list", label: "Add to list" },
          { id: "share", icon: "share", label: "Share" },
        ]
      : [
          { id: "track", icon: "plus", iconOn: "bookmark", label: "Track", labelOn: "Tracking", fill: "var(--list-fill)", toggle: true },
          { id: "like", icon: "heart", iconOn: "heart-fill", label: "Like", labelOn: "Liked", fill: LIKE, toggle: true },
          { id: "alerts", icon: "bell", label: "Alerts", fill: "#D9BC52", ink: "#5A4200", off: !state.track, toggle: true },
          { id: "stop", icon: "pause", label: "Stop", fill: "#D69570", off: !state.track, toggle: true },
          { id: "list", icon: "list", label: "Add to list" },
          { id: "share", icon: "share", label: "Share" },
        ];

  return (
    <div className="rounded-[20px] bg-card p-2 border-[0.5px] border-t-[color:var(--lit-edge)] border-x-piece border-b-well shadow-[0_4px_9px_rgba(0,0,0,.35)]">
      <div className="grid grid-cols-3 gap-2">
        {keys.map((k) => {
          const on = !!(k.toggle && state[k.id]);
          return (
            <ConfirmKey
              key={k.id}
              label={on && k.labelOn ? k.labelOn : k.label}
              on={on}
              onFill={k.fill}
              onInk={k.ink}
              // Switching on confirms in the key's colour; off, or an act
              // that isn't a switch, happens at once.
              confirm={k.fill && !on ? k.fill : undefined}
              off={k.off}
              radius={12}
              run={() => (k.id === "share" ? share() : k.id === "list" ? say("Lists open with accounts.") : k.id === "rewatch" ? say("Rewatch recorded on this page.") : flip(k.id))}
              className={`h-[58px] pb-[2px] flex flex-col items-center justify-center gap-1 ${on ? "" : "bg-piece text-dim enabled:hover:text-ink"}`}
            >
              {/* 2px more below than above: the label's line keeps room under
                  its letters, so this centres what is drawn. */}
              <Glyph name={on && k.iconOn ? k.iconOn : k.icon} size={18} />
              <span className="text-[11px] font-semibold leading-none">{on && k.labelOn ? k.labelOn : k.label}</span>
            </ConfirmKey>
          );
        })}
      </div>
      {said && <p className="m-0 mt-2 text-center text-[12px] text-dim">{said}</p>}
    </div>
  );
}
