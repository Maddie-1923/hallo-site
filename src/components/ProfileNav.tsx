"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { usePrivacy } from "@/lib/privacy";

export interface ProfileSection {
  id: string;
  label: string;
  count?: number;
  content: React.ReactNode;
  /** Drawn straight on the page rather than in the section's shell (a rail
      of cards that are shells of their own). */
  bare?: boolean;
}

// The profile's sections as tabs, lettered like the tables' column headings
// (10.5px bold capitals, widely spaced): one section shows at a time and a tab
// swaps it in place, with no new page and no jump down the page. The choice
// is written into the address (…/u/name#diary) without scrolling, so a
// reload or a shared link opens on the same tab.
// `aside`, when given, stands beside the section's shell on a wide screen,
// its top level with the shell's rather than with the tabs, on the same
// column widths as the profile's grid above so the edges line up, and as
// tall as the shell, so the two end on the same line whichever tab is open
// (its own list scrolls inside; a short tab still leaves it room for a few
// rows). On a phone it comes before the tabs, at a fixed height.
// `flat`: inside a card already (a title's credits in its bento), so the
// tab bar sits on the card's panel colour, and the sections share one inner
// shell under it that fills what height is left and scrolls inside.
// `owner`: on their own profile, their privacy choices (Settings, Privacy)
// apply: a section hidden from others carries a lock for them, and is gone
// when they look as others do; a private profile shows others only a notice.
// `privateProfile`: someone else's private profile, which a visitor sees only
// the card of (until follows let approved followers in).
// `hiddenSections`: on someone else's profile, the tabs they've turned off.
export function ProfileSections({ sections: all, className = "mt-10", aside, label = "Profile sections", flat = false, owner = false, privateProfile = false, hiddenSections = [] }: { sections: ProfileSection[]; className?: string; aside?: React.ReactNode; label?: string; flat?: boolean; owner?: boolean; privateProfile?: boolean; hiddenSections?: string[] }) {
  const privacy = usePrivacy(owner);
  const hidden = new Set<string>(privacy ? [!privacy.showActivity && "activity", !privacy.showWatchlog && "watchlog", !privacy.showWatchlist && "watchlist", !privacy.showWatching && "watching"].filter(Boolean) as string[] : hiddenSections);
  const sections = privacy?.others || !owner ? all.filter((s) => !hidden.has(s.id)) : all;
  const closed = privateProfile || (!!privacy?.others && !privacy.publicProfile);
  const [current, setCurrent] = useState(sections[0].id);

  useEffect(() => {
    const fromHash = (e?: Event) => {
      const id = window.location.hash.slice(1);
      if (!sections.some((s) => s.id === id)) return;
      setCurrent(id);
      // A link on the page to one of the tabs (a title's Released date to
      // Releases) brings the tabs into view as well as opening it.
      if (e) root.current?.scrollIntoView({ behavior: "smooth", block: "start" });
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

  // The tab bar's width, handed to the page as --tabs-w, so the person's
  // card above can be exactly as wide as the bar (whatever size the browser
  // sets its lettering at).
  const bar = useRef<HTMLDivElement>(null);
  const root = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    const el = bar.current;
    if (!el) return;
    const set = () => document.documentElement.style.setProperty("--tabs-w", `${el.offsetWidth}px`);
    set();
    const ro = new ResizeObserver(set);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  if (closed)
    return (
      <section className={`${className} rounded-shell bg-card border border-hair p-2`}>
        <div className="rounded-shell bg-piece p-6 grid justify-items-center gap-2 text-center">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="text-dim">
            <rect x="5" y="11" width="14" height="9" rx="2" />
            <path d="M8 11V8a4 4 0 0 1 8 0v3" />
          </svg>
          <div className="text-[12.5px] font-semibold text-ink">This profile is private</div>
          <div className="text-[12.5px] text-dim max-w-[40ch]">Only people they let follow them can see their reviews, lists and what they watch.</div>
        </div>
      </section>
    );

  return (
    <section ref={root} className={`scroll-mt-24 ${className} ${flat ? "flex flex-col gap-2" : ""} ${aside ? "grid gap-2 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]" : ""}`}>
      {aside && (
        <div className="lg:col-start-2 lg:row-start-2 max-lg:h-[640px] lg:min-h-[480px] flex flex-col">{aside}</div>
      )}
      <div className="lg:col-start-1 lg:row-start-1 min-w-0">
      <div
        ref={bar}
        role="tablist"
        aria-label={label}
        // Flat, in a narrower column: the bar fills it, and the tabs share a
        // second line rather than any hiding off its end.
        className={`${flat ? "flex w-full flex-wrap rounded-shell bg-piece" : "inline-flex max-w-full overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden rounded-full bg-card border border-hair"} items-center gap-1 p-1`}
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
              className={`shrink-0 inline-flex items-center gap-1.5 ${flat ? "grow justify-center px-2 tracking-[.07em]" : "px-4 tracking-[.12em]"} py-2 rounded-full text-[10.5px] leading-none font-bold uppercase cursor-pointer transition-colors ${on ? "bg-ink text-page" : "text-dim hover:text-ink"}`}
            >
              {s.label}
              {hidden.has(s.id) && (
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-label="Only you can see this">
                  <rect x="5" y="11" width="14" height="9" rx="2" />
                  <path d="M8 11V8a4 4 0 0 1 8 0v3" />
                </svg>
              )}
              {s.count != null && !flat && <span className={`font-normal tracking-normal ${on ? "opacity-70" : "opacity-60"}`}>{s.count}</span>}
            </button>
          );
        })}
      </div>
      </div>

      {/* The section sits in a shell like every other box on the profile,
          with the Tracker's side padding so the two read as a pair. */}
      <div
        role="tabpanel"
        id={`panel-${shown.id}`}
        aria-labelledby={`tab-${shown.id}`}
        className={`${aside || flat ? "" : "mt-2"} min-w-0 lg:col-start-1 lg:row-start-2 ${flat ? "flex-1 min-h-0 overflow-y-auto soft-scroll [scrollbar-gutter:stable] rounded-shell bg-piece p-3 pr-[1px]" : shown.bare ? "" : "min-h-[240px] rounded-shell bg-card border border-hair p-2"}`}
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
