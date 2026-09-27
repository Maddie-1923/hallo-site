"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { CategoryEntry } from "@/lib/public-profile";
import { Menu } from "./Menu";

// The profile's Categories: the eight the app ships, in its order, then the
// person's own lists. A tile each, with one wide picture flush with the card
// at the top and rounded at the foot, the name in the display face under it
// and the count below in the muted tone. A tile opens its contents in a
// sheet over the page.
//
// The picture is the title added last, unless the owner has chosen another
// from what's in the category (the pencil on the tile). Until accounts exist
// the choice is kept in this browser, as the Watchlog's month pictures are.
// (The app still draws a four-poster collage; this is to try on the web
// first and carry over after.)
//
// The order menu is the app's (`ProfileShelfSort`) less Custom, which is the
// owner's drag order and lives on their phone; its place is taken by the
// app's own order. A reader's choice is kept in this browser.
export function ProfileCategories({ categories, owner = false, username = "" }: { categories: CategoryEntry[]; owner?: boolean; username?: string }) {
  const [sort, setSort] = useState<SortId>("app");
  const [open, setOpen] = useState<CategoryEntry | null>(null);
  const [pictures, setPictures] = useState<Record<string, string>>({});
  const [choosing, setChoosing] = useState<CategoryEntry | null>(null);
  const pictureKey = `kodigo.category-pictures.${username}`;

  useEffect(() => {
    if (!owner) return;
    try {
      // This browser's saved choices, read after mount: the server can't see them.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPictures(JSON.parse(localStorage.getItem(pictureKey) ?? "{}"));
    } catch {}
  }, [owner, pictureKey]);
  function choosePicture(id: string, titleKey: string | null) {
    const next = { ...pictures };
    if (titleKey) next[id] = titleKey;
    else delete next[id];
    setPictures(next);
    try {
      localStorage.setItem(pictureKey, JSON.stringify(next));
    } catch {}
    setChoosing(null);
  }

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
      <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(220px,1fr))]">
        {arranged(categories, sort).map((c) => (
          <CategoryTile key={c.id} c={c} picture={pictureFor(c, pictures[c.id])} onOpen={() => setOpen(c)} onChoose={owner ? () => setChoosing(c) : undefined} />
        ))}
      </div>
      {open && <CategorySheet c={open} onClose={() => setOpen(null)} />}
      {choosing && <PicturePicker c={choosing} current={pictures[choosing.id] ?? null} onChoose={(key) => choosePicture(choosing.id, key)} onClose={() => setChoosing(null)} />}
    </div>
  );
}

/** The wide picture for a tile: the owner's pick in this browser, else the
    one chosen in the app, else the title added last; a still where there is
    one, the poster where not. */
function pictureFor(c: CategoryEntry, picked: string | undefined) {
  const find = (key: string | null | undefined) => (key ? c.titles.find((t) => t.key === key) : undefined);
  const t = find(picked) ?? find(c.chosen) ?? find(c.latest) ?? c.titles.find((x) => x.backdrop) ?? c.titles[0];
  return t ? (t.backdrop ?? t.poster) : null;
}

function CategoryTile({ c, picture, onOpen, onChoose }: { c: CategoryEntry; picture: string | null; onOpen: () => void; onChoose?: () => void }) {
  return (
    <div className="relative group">
      <button type="button" onClick={onOpen} className="w-full text-left rounded-[20px] bg-card-hi overflow-hidden cursor-pointer">
        <span className="block aspect-video rounded-b-[8px] overflow-hidden bg-card">
          {picture && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={picture} alt="" loading="lazy" className="w-full h-full object-cover" />
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
      {onChoose && (
        <button
          type="button"
          onClick={onChoose}
          aria-label={`Choose the picture for ${c.name}`}
          title="Choose the picture"
          className="absolute top-3 right-3 w-7 h-7 rounded-full bg-black/55 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity cursor-pointer [@media(hover:none)]:opacity-100"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M4 20h4L19 9l-4-4L4 16v4zM13.5 6.5l4 4" />
          </svg>
        </button>
      )}
    </div>
  );
}

// Choosing a category's picture from the titles in it, or going back to the
// automatic one (the title added last).
function PicturePicker({ c, current, onChoose, onClose }: { c: CategoryEntry; current: string | null; onChoose: (key: string | null) => void; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  const titles = c.titles.filter((t) => t.backdrop);
  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={`Picture for ${c.name}`} className="fixed inset-0 z-[100] bg-black/70 flex items-center justify-center p-4" onClick={onClose}>
      <div className="w-full max-w-[720px] max-h-[82vh] flex flex-col rounded-[28px] bg-card border border-hair shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="p-4 border-b border-hair flex items-center justify-between gap-3">
          <div className="display text-[24px] leading-none">Picture for {c.name}</div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => onChoose(null)} className={`text-[12.5px] cursor-pointer ${current ? "text-dim hover:text-ink" : "text-accent font-semibold"}`}>
              Last added
            </button>
            <button type="button" onClick={onClose} aria-label="Close" className="w-9 h-9 rounded-full bg-card-hi hover:bg-hair text-ink flex items-center justify-center cursor-pointer">
              <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden className="block">
                <path d="M1.5 1.5l9 9M10.5 1.5l-9 9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>
        <div className="p-4 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 gap-3">
          {titles.map((t) => (
            <button key={t.key} type="button" onClick={() => onChoose(t.key)} className="text-left cursor-pointer group">
              <span className={`block aspect-video rounded-[10px] overflow-hidden bg-card-hi border transition-colors ${t.key === current ? "border-accent" : "border-hair group-hover:border-accent"}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={t.backdrop!} alt="" className="w-full h-full object-cover" />
              </span>
              <span className="block mt-1 text-[12px] text-ink truncate">{t.title}</span>
            </button>
          ))}
        </div>
      </div>
    </div>,
    document.body,
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
