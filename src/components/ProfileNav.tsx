"use client";

import { useEffect, useState } from "react";

export interface ProfileSection {
  id: string;
  label: string;
  count?: number;
  content: React.ReactNode;
}

// The profile's sections as tabs: one section shows at a time and a tab
// swaps it in place, with no new page and no jump down the page. The choice
// is written into the address (…/u/name#diary) without scrolling, so a
// reload or a shared link opens on the same tab.
// `aside`, when given, stands beside the section's shell on a wide screen,
// its top level with the shell's rather than with the tabs, on the same
// column widths as the profile's grid above so the edges line up; it stays
// in view while a long section scrolls past. On a phone it comes before the
// tabs.
export function ProfileSections({ sections, className = "mt-10", aside }: { sections: ProfileSection[]; className?: string; aside?: React.ReactNode }) {
  const [current, setCurrent] = useState(sections[0].id);

  useEffect(() => {
    const fromHash = () => {
      const id = window.location.hash.slice(1);
      if (sections.some((s) => s.id === id)) setCurrent(id);
    };
    fromHash();
    window.addEventListener("hashchange", fromHash);
    return () => window.removeEventListener("hashchange", fromHash);
  }, [sections]);

  function choose(id: string) {
    setCurrent(id);
    history.replaceState(null, "", `#${id}`);
  }

  const shown = sections.find((s) => s.id === current) ?? sections[0];

  return (
    <section className={`${className} ${aside ? "grid gap-x-5 gap-y-4 lg:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)]" : ""}`}>
      {aside && (
        <div className="lg:col-start-2 lg:row-start-2 lg:self-start lg:sticky lg:top-24 h-[min(720px,calc(100svh-8rem))] min-h-[420px] flex flex-col">{aside}</div>
      )}
      <div className="lg:col-start-1 lg:row-start-1 min-w-0">
      <div
        role="tablist"
        aria-label="Profile sections"
        className="inline-flex max-w-full overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden items-center gap-1 p-1 rounded-full bg-card border border-hair"
      >
        {sections.map((s) => {
          const on = s.id === shown.id;
          return (
            <button
              key={s.id}
              type="button"
              role="tab"
              id={`tab-${s.id}`}
              aria-selected={on}
              aria-controls={`panel-${s.id}`}
              onClick={() => choose(s.id)}
              className={`shrink-0 inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[13px] font-semibold cursor-pointer transition-colors ${on ? "bg-ink text-page" : "text-dim hover:text-ink"}`}
            >
              {s.label}
              {s.count != null && <span className={`text-[11.5px] font-normal ${on ? "opacity-70" : "opacity-60"}`}>{s.count}</span>}
            </button>
          );
        })}
      </div>
      </div>

      {/* The section sits in a shell like every other box on the profile. */}
      <div
        role="tabpanel"
        id={`panel-${shown.id}`}
        aria-labelledby={`tab-${shown.id}`}
        className={`${aside ? "" : "mt-4"} min-w-0 lg:col-start-1 lg:row-start-2 min-h-[240px] rounded-[24px] bg-card border border-hair px-[clamp(14px,2vw,28px)] py-[clamp(14px,1.6vw,22px)]`}
      >
        {shown.content}
      </div>
    </section>
  );
}

// Back to the top of the profile: a round chevron in the bottom-right corner
// of the window, there once the page has been scrolled a screen down.
export function BackToTop() {
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const onScroll = () => setShown(window.scrollY > window.innerHeight * 0.8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <button
      type="button"
      aria-label="Back to the top of the profile"
      title="Back to top"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className={`fixed z-40 right-[clamp(16px,3.2vw,64px)] bottom-[clamp(16px,3vw,36px)] w-11 h-11 rounded-full bg-card border border-hair text-ink shadow-[0_8px_24px_rgba(0,0,0,.35)] flex items-center justify-center cursor-pointer transition-[opacity,transform,color,border-color] duration-200 hover:text-accent hover:border-accent ${
        shown ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3 pointer-events-none"
      }`}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M5 15l7-7 7 7" />
      </svg>
    </button>
  );
}
