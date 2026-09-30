"use client";

import { useEffect, useState } from "react";
import { Menu } from "./Menu";
import { APPEARANCE_KEY, DEFAULT_THEME, THEMES, THEME_KEY, applyTheme, type Appearance } from "@/lib/theme";
import { saveAccountTheme } from "@/lib/account-settings";

// The paintbrush beside the day/night pill: a drop-down of the app's accent
// themes. Same store as the pill and the About page's theme row, so a pick
// here follows the visitor to every page and the next visit.
//
// The brush sits in a circle the pill's height, and is drawn in the accent
// fill, the colour the pill's lit half is showing, so the two read as a pair.
export function ThemeMenu({ onPicture = false }: { onPicture?: boolean }) {
  const [theme, setTheme] = useState(DEFAULT_THEME);

  useEffect(() => {
    // The theme in force, as the pre-paint script settled it. Read from the
    // page rather than storage so a retired theme someone had saved (Poppy,
    // Bloom) still shows the tick on the theme they are actually seeing.
    const t = document.documentElement.dataset.theme;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (t && THEMES.some((x) => x.id === t)) setTheme(t);
  }, []);

  function choose(id: string) {
    let appearance: Appearance = "system";
    try {
      const a = localStorage.getItem(APPEARANCE_KEY);
      if (a === "light" || a === "dark") appearance = a;
      localStorage.setItem(THEME_KEY, id);
      // Signed in, the account keeps it too (nothing happens signed out).
      void saveAccountTheme(id).catch(() => {});
    } catch {}
    applyTheme(id, appearance);
    setTheme(id);
  }

  const shell = onPicture ? "bg-black/35 border-white/25 backdrop-blur-md" : "bg-card border-hair";

  return (
    <Menu
      label="Theme colour"
      width={230}
      button={
        <span className={`w-9 h-9 rounded-full border flex items-center justify-center text-accent-fill hover:brightness-110 transition-[filter] ${shell}`}>
          <Brush />
        </span>
      }
    >
      <div className="px-4 pt-3 pb-2 text-[11px] font-bold tracking-[.14em] uppercase text-dim">Theme</div>
      <ul className="m-0 p-0 pb-2 list-none">
        {THEMES.map((t) => {
          const on = t.id === theme;
          return (
            <li key={t.id}>
              <button
                type="button"
                onClick={() => choose(t.id)}
                aria-pressed={on}
                className="w-full flex items-center gap-3 px-4 py-2 text-sm hover:bg-card-hi cursor-pointer text-ink"
              >
                <span
                  className="tone w-5 h-5 rounded-full border border-hair"
                  style={{ ["--tone-day" as string]: t.day, ["--tone-night" as string]: t.night }}
                  aria-hidden
                />
                <span className="flex-1 text-left">{t.name}</span>
                {on && (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-label="Selected">
                    <path d="M5 12l5 5L20 7" />
                  </svg>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </Menu>
  );
}

function Brush() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {/* The handle, running up to the top right. */}
      <path d="M20.5 3.5a1.8 1.8 0 0 0-2.5 0l-8.3 8.3 2.5 2.5 8.3-8.3a1.8 1.8 0 0 0 0-2.5z" />
      {/* The bristles, with a curl of paint. */}
      <path d="M9.7 11.8c-2 0-3.6 1.6-3.6 3.6 0 1.6-1 2.6-2.6 3.1 1.1 1.3 2.8 2 4.6 2 3 0 5.3-2.3 5.3-5.3" />
    </svg>
  );
}
