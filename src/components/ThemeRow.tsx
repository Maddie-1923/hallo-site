"use client";

import { useEffect, useState } from "react";
import { APPEARANCE_KEY, DEFAULT_THEME, THEMES, THEME_KEY, applyTheme, type Appearance } from "@/lib/theme";

// The landing page's theme row. Same store as the moon menu in the nav, so a
// pick here follows you into the app pages and the next visit.
export function ThemeRow() {
  const [current, setCurrent] = useState(DEFAULT_THEME);

  useEffect(() => {
    try {
      // The theme in force, as the pre-paint script settled it: always one of
      // THEMES, even when what was stored is a theme since retired.
      const t = document.documentElement.dataset.theme ?? localStorage.getItem(THEME_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (t && THEMES.some((x) => x.id === t)) setCurrent(t);
    } catch {}
  }, []);

  function pick(id: string) {
    let appearance: Appearance = "system";
    try {
      const a = localStorage.getItem(APPEARANCE_KEY);
      if (a === "light" || a === "dark") appearance = a;
      localStorage.setItem(THEME_KEY, id);
    } catch {}
    applyTheme(id, appearance);
    setCurrent(id);
  }

  const name = THEMES.find((t) => t.id === current)?.name ?? "";

  return (
    <>
      <div className="flex flex-wrap gap-2 mt-9">
        {THEMES.map((t) => {
          const on = t.id === current;
          return (
            <button
              key={t.id}
              type="button"
              aria-pressed={on}
              onClick={() => pick(t.id)}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full border text-sm font-semibold transition-colors cursor-pointer"
              style={{
                borderColor: on ? "var(--accent-fill)" : "var(--hair)",
                background: on ? "var(--accent-fill)" : "transparent",
                color: on ? "var(--on-accent)" : "var(--dim)",
              }}
            >
              <i className="tone block w-[11px] h-[11px] rounded-full ring-1 ring-black/10" style={{ ["--tone-day" as string]: t.day, ["--tone-night" as string]: t.night }} />
              {t.name}
            </button>
          );
        })}
      </div>
      <p className="text-sm text-dim mt-4">Currently showing: {name}</p>
    </>
  );
}
