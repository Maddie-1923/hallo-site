"use client";

import { useEffect, useState } from "react";
import { Menu } from "./Menu";
import { APPEARANCES, APPEARANCE_KEY, DEFAULT_THEME, THEMES, THEME_KEY, applyTheme, type Appearance } from "@/lib/theme";

// The moon in the nav. Its glyph is the appearance in force — a monitor for
// Auto, a sun for Day, a moon for Night — and the panel under it holds the
// three appearances and the nine accents. Everything it does is local: the
// choice lives in this browser, and the pre-paint script in the head reads
// the same keys so the next page load opens in it.
export function AppearanceMenu() {
  const [appearance, setAppearance] = useState<Appearance>("system");
  const [theme, setTheme] = useState(DEFAULT_THEME);

  useEffect(() => {
    try {
      const a = localStorage.getItem(APPEARANCE_KEY) as Appearance | null;
      const t = localStorage.getItem(THEME_KEY);
      // Reading storage after mount is the one place a set-in-effect is the
      // honest answer: the server can't know this browser's choice.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (a === "system" || a === "light" || a === "dark") setAppearance(a);
      if (t && THEMES.some((x) => x.id === t)) setTheme(t);
    } catch {}
  }, []);

  // Auto follows the OS; if it flips while the page is open, follow it.
  useEffect(() => {
    if (appearance !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const on = () => applyTheme(theme, "system");
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, [appearance, theme]);

  function choose(a: Appearance, t: string) {
    setAppearance(a);
    setTheme(t);
    applyTheme(t, a);
    try {
      localStorage.setItem(APPEARANCE_KEY, a);
      localStorage.setItem(THEME_KEY, t);
    } catch {}
  }

  return (
    <Menu label="Appearance and theme" width={280} button={<AppearanceIcon appearance={appearance} />}>
      <div className="px-4 pt-3 pb-2 text-[11px] font-bold tracking-[.14em] uppercase text-dim">Appearance</div>
      <div className="px-3 pb-3 flex gap-1 p-1">
        {APPEARANCES.map((a) => {
          const on = a.id === appearance;
          return (
            <button
              key={a.id}
              type="button"
              onClick={() => choose(a.id, theme)}
              aria-pressed={on}
              className={`flex-1 flex flex-col items-center gap-1 py-2 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
                on ? "border-accent-fill bg-accent-fill text-graphite" : "border-hair text-dim hover:text-ink"
              }`}
            >
              <AppearanceIcon appearance={a.id} size={18} />
              {a.name}
            </button>
          );
        })}
      </div>
      <div className="px-4 pt-2 pb-2 text-[11px] font-bold tracking-[.14em] uppercase text-dim border-t border-hair">Theme</div>
      <ul className="m-0 p-0 pb-2 list-none">
        {THEMES.map((t) => {
          const on = t.id === theme;
          return (
            <li key={t.id}>
              <button
                type="button"
                onClick={() => choose(appearance, t.id)}
                aria-pressed={on}
                className="w-full flex items-center gap-3 px-4 py-2 text-sm hover:bg-card-hi cursor-pointer text-ink"
              >
                <span className="w-5 h-5 rounded-full border border-hair" style={{ background: t.accent }} aria-hidden />
                <span className="flex-1 text-left">{t.name}</span>
                {on && (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
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

function AppearanceIcon({ appearance, size = 22 }: { appearance: Appearance; size?: number }) {
  const common = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };
  if (appearance === "light") {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
      </svg>
    );
  }
  if (appearance === "dark") {
    return (
      <svg {...common}>
        <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <rect x="3" y="4" width="18" height="12" rx="2" />
      <path d="M8 20h8M12 16v4" />
    </svg>
  );
}
