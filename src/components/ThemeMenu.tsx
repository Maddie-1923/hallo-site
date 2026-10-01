"use client";

import { useEffect, useState } from "react";
import { APPEARANCE_KEY, DEFAULT_THEME, THEMES, THEME_KEY, applyTheme, type Appearance } from "@/lib/theme";
import { saveAccountTheme } from "@/lib/account-settings";

// Keeps the pick in this browser and, signed in, with the account, then
// repaints the page in it under the current day or night.
function chooseTheme(id: string) {
  let appearance: Appearance = "system";
  try {
    const a = localStorage.getItem(APPEARANCE_KEY);
    if (a === "light" || a === "dark") appearance = a;
    localStorage.setItem(THEME_KEY, id);
    // Signed in, the account keeps it too (nothing happens signed out).
    void saveAccountTheme(id).catch(() => {});
  } catch {}
  applyTheme(id, appearance);
}

// The theme colours in the profile menu, as a row of the themes' colours:
// the one in force ringed, each name on hover. Same store as the day/night
// pill and the About page's theme row, so a pick follows the visitor to
// every page. Picking one keeps the menu open, so the page can be seen
// changing.
export function ThemeSwatches() {
  const [theme, setTheme] = useState(DEFAULT_THEME);

  useEffect(() => {
    // The theme in force, as the pre-paint script settled it. Read from the
    // page rather than storage so a retired theme someone had saved still
    // rings the theme they are actually seeing.
    const t = document.documentElement.dataset.theme;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (t && THEMES.some((x) => x.id === t)) setTheme(t);
  }, []);

  return (
    <div className="px-4 pt-2.5 pb-3">
      <div className="text-[11px] font-bold tracking-[.14em] uppercase text-dim">Theme colour</div>
      <div role="radiogroup" aria-label="Theme colour" className="mt-2.5 flex items-center justify-between">
        {THEMES.map((t) => {
          const on = t.id === theme;
          return (
            <button
              key={t.id}
              type="button"
              role="radio"
              aria-checked={on}
              aria-label={t.name}
              title={t.name}
              onClick={() => {
                chooseTheme(t.id);
                setTheme(t.id);
              }}
              className={`w-7 h-7 rounded-full flex items-center justify-center cursor-pointer border-2 transition-colors ${on ? "border-ink" : "border-transparent hover:border-hair"}`}
            >
              <span
                className="tone w-5 h-5 rounded-full border border-hair"
                style={{ ["--tone-day" as string]: t.day, ["--tone-night" as string]: t.night }}
                aria-hidden
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}
