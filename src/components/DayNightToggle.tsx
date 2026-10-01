"use client";

import { useEffect, useState } from "react";
import { APPEARANCE_KEY, DEFAULT_THEME, THEMES, THEME_KEY, applyTheme } from "@/lib/theme";

// The day/night switch in the top right: a pill with a sun and a moon, the
// one in force lit. Two choices rather than the old menu's three: somebody
// reaching for it wants the page lighter or darker now, and "Auto" is simply
// what a visitor gets until they touch it (the pill then lights whichever
// side their system chose).
//
// The accent themes that used to share that menu are in the paintbrush menu
// in the profile menu (ThemeSwatches), which writes the same keys.
export function DayNightToggle({ onPicture = false }: { onPicture?: boolean }) {
  // Unknown until mounted: the server can't see this browser's choice, and
  // guessing would light the wrong half for a frame.
  const [dark, setDark] = useState<boolean | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDark(document.documentElement.dataset.scheme !== "light");
  }, []);

  function choose(next: boolean) {
    let theme = DEFAULT_THEME;
    try {
      const t = localStorage.getItem(THEME_KEY);
      if (t && THEMES.some((x) => x.id === t)) theme = t;
      localStorage.setItem(APPEARANCE_KEY, next ? "dark" : "light");
    } catch {}
    applyTheme(theme, next ? "dark" : "light");
    setDark(next);
  }

  // Over the billboard the pill sits on a photograph, so it takes a smoky
  // glass of its own rather than the page's card colour.
  const shell = onPicture
    ? "bg-black/35 border-white/25 backdrop-blur-md"
    : "bg-card border-hair";
  const idle = onPicture ? "text-white/70 hover:text-white" : "text-dim hover:text-ink";

  return (
    <div role="group" aria-label="Day or night" className={`inline-flex items-center p-[3px] rounded-full border ${shell}`}>
      {[false, true].map((isDark) => {
        const on = dark === isDark;
        return (
          <button
            key={String(isDark)}
            type="button"
            onClick={() => choose(isDark)}
            aria-pressed={on}
            aria-label={isDark ? "Night" : "Day"}
            title={isDark ? "Night" : "Day"}
            className={`w-8 h-7 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
              on ? "bg-accent-fill text-on-accent" : idle
            }`}
          >
            {isDark ? <Moon /> : <Sun />}
          </button>
        );
      })}
    </div>
  );
}

const stroke = { width: 16, height: 16, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2.2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };

function Sun() {
  return (
    <svg {...stroke}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  );
}

function Moon() {
  return (
    <svg {...stroke}>
      <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" />
    </svg>
  );
}
