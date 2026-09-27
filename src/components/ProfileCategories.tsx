"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { CategoryEntry } from "@/lib/public-profile";
import { Menu } from "./Menu";

// The profile's Categories, as the app's profile grid draws them: a square
// tile each, four posters in a two-by-two collage (or the list's own cover),
// flush with the card at the top and rounded at the foot, with the name in
// the display face underneath and the count below it in the muted tone. The
// eight the app ships come first in its order, then the person's own lists.
// A tile opens its contents in a sheet over the page.
//
// The order menu is the app's (`ProfileShelfSort`) less Custom, which is the
// owner's drag order and lives on their phone; its place is taken by the
// app's own order. A reader's choice is kept in this browser.
export function ProfileCategories({ categories }: { categories: CategoryEntry[] }) {
  const [sort, setSort] = useState<SortId>("app");
  const [open, setOpen] = useState<CategoryEntry | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(SORT_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (saved && SORTS.some((s) => s.id === saved)) setSort(saved as SortId);
    } catch {}
  }, []);
  function chooseSort(id: SortId) {
    setSort(id);
    try {
      localStorage.setItem(SORT_KEY, id);
    } catch {}
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-4">
        <span className="text-[12.5px] text-dim">
          {categories.length} {categories.length === 1 ? "category" : "categories"}
        </span>
        <SortMenu sort={sort} onChoose={chooseSort} />
      </div>
      <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(170px,1fr))]">
        {arranged(categories, sort).map((c) => (
          <CategoryTile key={c.id} c={c} onOpen={() => setOpen(c)} />
        ))}
      </div>
      {open && <CategorySheet c={open} onClose={() => setOpen(null)} />}
    </div>
  );
}

function CategoryTile({ c, onOpen }: { c: CategoryEntry; onOpen: () => void }) {
  const four = c.titles.slice(0, 4);
  return (
    <button type="button" onClick={onOpen} className="group text-left rounded-[20px] bg-card-hi overflow-hidden cursor-pointer">
      {/* The collage stays underneath a cover, so a cover that fails to load
          uncovers the posters rather than a hole (as in the app). Every
          poster is anchored at its top, where its title and faces are. */}
      <span className="relative block aspect-square rounded-b-[8px] overflow-hidden">
        <span className="absolute inset-0 grid grid-cols-2 grid-rows-2 gap-[2px]">
          {Array.from({ length: 4 }, (_, i) => (
            <span key={i} className="block bg-card overflow-hidden">
              {four[i]?.poster && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={four[i].poster!} alt="" loading="lazy" className="w-full h-full object-cover object-top" />
              )}
            </span>
          ))}
        </span>
        {c.cover && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={c.cover} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover object-top" />
        )}
      </span>
      <span className="block px-3 pt-2.5 pb-3">
        <span className="block display text-[22px] leading-none tracking-[.02em] uppercase truncate group-hover:text-accent transition-colors">{c.name}</span>
        <span className="flex items-center gap-1.5 mt-1 text-[12.5px] text-dim">
          {c.titles.length} {c.titles.length === 1 ? "title" : "titles"}
          {/* On Hold and Stopped Watching reach only the owner's own page;
              the lock tells them nobody else sees these. */}
          {c.ownerOnly && (
            <span className="inline-flex items-center gap-1" title="Only you can see this">
              <span aria-hidden>·</span>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <rect x="5" y="11" width="14" height="10" rx="2" />
                <path d="M8 11V8a4 4 0 0 1 8 0v3" />
              </svg>
              Only you
            </span>
          )}
        </span>
      </span>
    </button>
  );
}

// A category opened: its posters in a grid, each going to its title page.
// Laid out like the review sheet: one 16px inset, closing the same ways.
function CategorySheet({ c, onClose }: { c: CategoryEntry; onClose: () => void }) {
  useEffect(() => {
    const onKey = (k: KeyboardEvent) => k.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [onClose]);
  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={c.name} className="fixed inset-0 z-[100] bg-black/70 flex items-end sm:items-center justify-center sm:p-4" onClick={onClose}>
      <div className="w-full sm:max-w-[760px] max-h-[88vh] flex flex-col overflow-hidden rounded-t-[28px] sm:rounded-[28px] bg-card border border-hair shadow-2xl" onClick={(x) => x.stopPropagation()}>
        <div className="p-4 flex items-start justify-between gap-4 border-b border-hair">
          <div className="min-w-0">
            <h3 className="!text-[clamp(26px,3vw,34px)] !leading-[.95]">{c.name}</h3>
            <div className="mt-2 text-[12.5px] leading-none text-dim">
              {c.titles.length} {c.titles.length === 1 ? "title" : "titles"}
            </div>
            {c.detail && <p className="m-0 mt-3 text-[13.5px] leading-[1.5] text-bone">{c.detail}</p>}
          </div>
          <button type="button" onClick={onClose} aria-label="Close" autoFocus className="shrink-0 w-9 h-9 rounded-full bg-card-hi hover:bg-hair text-ink flex items-center justify-center cursor-pointer">
            <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden className="block">
              <path d="M1.5 1.5l9 9M10.5 1.5l-9 9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <div className="p-4 overflow-y-auto grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(104px,1fr))]">
          {c.titles.map((t) => (
            <Link key={t.key} href={t.href} className="group block no-underline text-ink">
              <span className="block aspect-[2/3] rounded-[10px] overflow-hidden bg-card-hi border border-hair group-hover:border-accent transition-colors">
                {t.poster ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={t.poster} alt="" loading="lazy" className="w-full h-full object-cover" />
                ) : (
                  <span className="w-full h-full flex items-center justify-center p-2 text-center text-xs text-dim">{t.title}</span>
                )}
              </span>
              <span className="block mt-1.5 text-[12px] leading-tight truncate group-hover:text-accent transition-colors">{t.title}</span>
              {t.year && <span className="block text-[11.5px] leading-tight text-dim">{t.year}</span>}
            </Link>
          ))}
        </div>
      </div>
    </div>,
    document.body,
  );
}

// The app's orders for the grid (`ProfileShelfSort`), with its own order in
// place of Custom. Newest and oldest aren't offered: the eight built-ins have
// no age, only lists do, and the app files the eight as oldest of all.
const SORTS = [
  { id: "app", label: "As in the app", short: "As in the app" },
  { id: "name-az", label: "Name, A to Z", short: "Name, A to Z" },
  { id: "name-za", label: "Name, Z to A", short: "Name, Z to A" },
  { id: "most", label: "Most titles", short: "Most titles" },
  { id: "fewest", label: "Fewest titles", short: "Fewest titles" },
] as const;
type SortId = (typeof SORTS)[number]["id"];
const SORT_KEY = "kodigo.categories-sort";

function arranged(cs: CategoryEntry[], sort: SortId) {
  const name = (a: CategoryEntry, b: CategoryEntry) => a.name.localeCompare(b.name);
  switch (sort) {
    case "app":
      return cs;
    case "name-az":
      return [...cs].sort(name);
    case "name-za":
      return [...cs].sort((a, b) => name(b, a));
    case "most":
      return [...cs].sort((a, b) => b.titles.length - a.titles.length || name(a, b));
    case "fewest":
      return [...cs].sort((a, b) => a.titles.length - b.titles.length || name(a, b));
  }
}

function SortMenu({ sort, onChoose }: { sort: SortId; onChoose: (id: SortId) => void }) {
  const current = SORTS.find((s) => s.id === sort)!;
  return (
    <Menu
      label={`Order the categories: ${current.short}`}
      width={210}
      button={
        <span className="h-9 inline-flex items-center gap-2 pl-3 pr-3.5 rounded-full bg-page border border-hair text-[12.5px] font-semibold text-dim hover:text-ink transition-colors">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M4 6h16M7 12h10M10 18h4" />
          </svg>
          {current.short}
        </span>
      }
    >
      <div className="py-2">
        {SORTS.map((s) => (
          <button
            key={s.id}
            type="button"
            role="menuitemradio"
            aria-checked={s.id === sort}
            data-menu-close
            onClick={() => onChoose(s.id)}
            className="w-full flex items-center gap-3 px-4 py-1.5 text-[13px] hover:bg-card-hi cursor-pointer text-ink"
          >
            <span className="flex-1 text-left">{s.label}</span>
            {s.id === sort && (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="text-accent">
                <path d="M5 12l5 5L20 7" />
              </svg>
            )}
          </button>
        ))}
      </div>
    </Menu>
  );
}
