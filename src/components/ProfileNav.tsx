"use client";

import { useEffect, useState } from "react";

const TABS: [string, string][] = [
  ["activity", "Recent activity"],
  ["diary", "Diary"],
  ["reviews", "Reviews"],
  ["lists", "Lists"],
  ["favourites", "Favourites"],
];

// The profile's section tabs. The lit one follows the section being read:
// the last section whose top has reached the line just under the sticky nav,
// which is where a tab's jump sets it down (the sections' scroll margin is
// 96px). A line lower down the window lit the wrong tab when two short
// sections sat inside it at once.
export function ProfileTabs() {
  const [current, setCurrent] = useState(TABS[0][0]);
  // A tab pressed is the answer until the jump it caused has settled; the
  // scroll that jump makes would otherwise relight whatever it passes, and a
  // short last section can't be scrolled up to the line at all.
  const [pressedAt, setPressedAt] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      if (Date.now() - pressedAt < 900) return;
      const line = 100;
      let lit = TABS[0][0];
      for (const [id] of TABS) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= line) lit = id;
      }
      // At the foot of the page the last section is the one being read,
      // however short it is.
      if (window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2) lit = TABS[TABS.length - 1][0];
      setCurrent(lit);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [pressedAt]);

  return (
    <nav
      aria-label="Profile sections"
      className="mt-10 inline-flex max-w-full overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden items-center gap-1 p-1 rounded-full bg-card border border-hair"
    >
      {TABS.map(([id, label]) => (
        <a
          key={id}
          href={`#${id}`}
          aria-current={current === id ? "location" : undefined}
          onClick={() => {
            setCurrent(id);
            setPressedAt(Date.now());
          }}
          className={`shrink-0 px-4 py-1.5 rounded-full text-[13px] font-semibold no-underline transition-colors ${current === id ? "bg-ink text-page" : "text-dim hover:text-ink"}`}
        >
          {label}
        </a>
      ))}
    </nav>
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
