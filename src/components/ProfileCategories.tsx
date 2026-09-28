"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { CategoryEntry, ProfileTitle } from "@/lib/public-profile";
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
// The owner decides who sees each category with the button on its tile: an
// eye, everyone; a lock, only them. Everything starts public except On
// Hold and Stopped Watching, which start private. Kept in this browser until
// accounts exist; then it is stored with the library and the server leaves
// private categories out of everyone else's page.
//
// The owner also gets a New category tile at the end, the app's "Create
// Custom List": a name, a line about it, and titles picked from their
// library. Until accounts exist, what they make is kept in this browser.
//
// The order menu is the app's (`ProfileShelfSort`): My order, the owner's
// own arrangement, then by name or by size; the button is just its icon.
// The owner's Edit beside it is where the categories are arranged, made
// public or private, given a picture and (their own ones) deleted. In Edit
// a tile is picked up and dragged where it should go, and the others make
// room as it passes. It is done with pointer events rather than the
// browser's own drag and drop, so a finger on a phone drags the same as a
// mouse. From the keyboard, the arrow keys move the focused tile a step.
// Until accounts exist all of this is kept in this browser; a reader's
// choice of order is kept in theirs.
export function ProfileCategories({ categories: given, owner = false, username = "", library = [] }: { categories: CategoryEntry[]; owner?: boolean; username?: string; library?: ProfileTitle[] }) {
  const [made, setMade] = useState<MadeCategory[]>([]);
  const [creating, setCreating] = useState(false);
  const madeKey = `kodigo.made-categories.${username}`;
  useEffect(() => {
    if (!owner) return;
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMade(JSON.parse(localStorage.getItem(madeKey) ?? "[]"));
    } catch {}
  }, [owner, madeKey]);
  function saveMade(next: MadeCategory[]) {
    setMade(next);
    try {
      localStorage.setItem(madeKey, JSON.stringify(next));
    } catch {}
  }
  const byKey = new Map(library.map((t) => [t.key, t]));
  const categories: CategoryEntry[] = [
    ...given,
    ...made.map((m) => {
      const titles = m.keys.map((k) => byKey.get(k)).filter((t): t is ProfileTitle => !!t);
      return { id: m.id, name: m.name, detail: m.detail, custom: true, titles, latest: titles.at(-1)?.key ?? null };
    }),
  ];
  const [sort, setSort] = useState<SortId>("custom");
  const [order, setOrder] = useState<string[]>([]);
  const [arranging, setArranging] = useState(false);
  const [dragging, setDragging] = useState<string | null>(null);
  const [deleted, setDeleted] = useState<string[]>([]);
  const deletedKey = `kodigo.deleted-categories.${username}`;
  useEffect(() => {
    if (!owner) return;
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDeleted(JSON.parse(localStorage.getItem(deletedKey) ?? "[]"));
    } catch {}
  }, [owner, deletedKey]);
  // Only the person's own categories can go; the eight built in stay. The
  // app's wording: a category is a way of grouping titles, not a place they
  // live, so nothing tracked is lost.
  function remove(c: CategoryEntry) {
    if (!confirm(`Delete ${c.name}? Everything in it stays tracked.`)) return;
    if (made.some((m) => m.id === c.id)) saveMade(made.filter((m) => m.id !== c.id));
    else {
      const next = [...deleted, c.id];
      setDeleted(next);
      try {
        localStorage.setItem(deletedKey, JSON.stringify(next));
      } catch {}
    }
  }
  const orderKey = `kodigo.category-order.${username}`;
  useEffect(() => {
    if (!owner) return;
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOrder(JSON.parse(localStorage.getItem(orderKey) ?? "[]"));
    } catch {}
  }, [owner, orderKey]);
  const [open, setOpen] = useState<CategoryEntry | null>(null);
  const [pictures, setPictures] = useState<Record<string, string>>({});
  const [choosing, setChoosing] = useState<CategoryEntry | null>(null);
  const pictureKey = `kodigo.category-pictures.${username}`;
  const [privacy, setPrivacy] = useState<Record<string, boolean>>({});
  const privacyKey = `kodigo.category-private.${username}`;
  useEffect(() => {
    if (!owner) return;
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPrivacy(JSON.parse(localStorage.getItem(privacyKey) ?? "{}"));
    } catch {}
  }, [owner, privacyKey]);
  const isPrivate = (c: CategoryEntry) => privacy[c.id] ?? !!c.ownerOnly;
  function togglePrivate(c: CategoryEntry) {
    const next = { ...privacy, [c.id]: !isPrivate(c) };
    setPrivacy(next);
    try {
      localStorage.setItem(privacyKey, JSON.stringify(next));
    } catch {}
  }

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

  // Arranging always works on the custom order, whatever the menu says.
  const visible = categories.filter((c) => !deleted.includes(c.id));
  const shown = arranged(visible, arranging ? "custom" : sort, order);
  function move(from: string, to: number) {
    const ids = shown.map((c) => c.id).filter((id) => id !== from);
    ids.splice(Math.max(0, Math.min(to, ids.length)), 0, from);
    setOrder(ids);
    try {
      localStorage.setItem(orderKey, JSON.stringify(ids));
    } catch {}
  }

  // While a tile is held, the page follows the pointer rather than the tile:
  // reordering moves the tile's element, which would lose a pointer captured
  // on it. Whatever tile is under the pointer, the held one takes its place
  // and the rest shift along.
  const latest = useRef({ shown, move });
  useEffect(() => {
    latest.current = { shown, move };
  });
  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: PointerEvent) => {
      const over = (document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null)?.closest<HTMLElement>("[data-cat]")?.dataset.cat;
      const { shown, move } = latest.current;
      if (over && over !== dragging) move(dragging, shown.findIndex((x) => x.id === over));
    };
    const onUp = () => setDragging(null);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [dragging]);

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-4">
        <span className="text-[12.5px] text-dim">
          {arranging ? "Drag to rearrange. Tap the eye to make one private." : `${visible.length} ${visible.length === 1 ? "category" : "categories"}`}
        </span>
        <div className="flex items-center gap-2">
          {!arranging && <SortMenu sort={sort} onChoose={chooseSort} />}
          {owner && (
            <button
              type="button"
              onClick={() => {
                if (!arranging) chooseSort("custom");
                setArranging(!arranging);
              }}
              className={`h-9 px-4 rounded-full text-[12.5px] font-semibold cursor-pointer transition-colors ${arranging ? "bg-accent-fill text-on-accent" : "bg-page border border-hair text-dim hover:text-ink"}`}
            >
              {arranging ? "Done" : "Edit"}
            </button>
          )}
        </div>
      </div>
      <div className="grid gap-2 grid-cols-2 md:grid-cols-3">
        {shown.map((c, i) =>
          arranging ? (
            <div
              key={c.id}
              data-cat={c.id}
              role="button"
              tabIndex={0}
              aria-label={`${c.name}. Drag to move it, or use the arrow keys.`}
              onPointerDown={(e) => {
                e.preventDefault();
                setDragging(c.id);
              }}
              onKeyDown={(e) => {
                if (e.key === "ArrowLeft" || e.key === "ArrowUp") move(c.id, i - 1);
                else if (e.key === "ArrowRight" || e.key === "ArrowDown") move(c.id, i + 1);
                else return;
                e.preventDefault();
              }}
              className={`relative rounded-shell outline-2 outline-dashed outline-accent outline-offset-2 touch-none select-none transition-transform ${dragging === c.id ? "z-10 scale-[1.04] shadow-[0_18px_40px_rgba(0,0,0,.45)] cursor-grabbing" : "cursor-grab"}`}
            >
              {/* The tile can't be opened while editing; the wrapper takes
                  every press except those on the controls. */}
              <div className="pointer-events-none">
                <CategoryTile
                  c={c}
                  picture={pictureFor(c, pictures[c.id])}
                  hidden={isPrivate(c)}
                  editing
                  onToggleHidden={() => togglePrivate(c)}
                  onChoose={() => setChoosing(c)}
                  onDelete={c.custom ? () => remove(c) : undefined}
                />
              </div>
            </div>
          ) : (
            <CategoryTile key={c.id} c={c} picture={pictureFor(c, pictures[c.id])} onOpen={() => setOpen(c)} hidden={isPrivate(c)} showLock={owner} />
          ),
        )}
        {owner && !arranging && <NewCategoryTile onClick={() => setCreating(true)} />}
      </div>
      {open && (
        <CategorySheet
          c={open}
          onClose={() => setOpen(null)}
          onDelete={
            made.some((m) => m.id === open.id)
              ? () => {
                  saveMade(made.filter((m) => m.id !== open.id));
                  setOpen(null);
                }
              : undefined
          }
        />
      )}
      {creating && (
        <NewCategorySheet
          library={library}
          onCreate={(m) => {
            saveMade([...made, m]);
            setCreating(false);
          }}
          onClose={() => setCreating(false)}
        />
      )}
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

function CategoryTile({
  c,
  picture,
  onOpen,
  hidden,
  showLock = false,
  editing = false,
  onChoose,
  onToggleHidden,
  onDelete,
}: {
  c: CategoryEntry;
  picture: string | null;
  onOpen?: () => void;
  hidden: boolean;
  /** The owner's own view: a private category carries a small lock. */
  showLock?: boolean;
  /** In Edit, the owner's controls sit over the picture's corner. */
  editing?: boolean;
  onChoose?: () => void;
  onToggleHidden?: () => void;
  onDelete?: () => void;
}) {
  const chip = "w-7 h-7 rounded-full bg-black/55 hover:bg-black/75 text-white flex items-center justify-center cursor-pointer";
  return (
    <div className="relative group">
      <button type="button" onClick={onOpen} tabIndex={editing ? -1 : 0} className="w-full text-left rounded-shell bg-card-hi overflow-hidden cursor-pointer">
        <span className="block aspect-video rounded-b-[8px] overflow-hidden bg-card">
          {picture && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={picture} alt="" loading="lazy" draggable={false} className="w-full h-full object-cover" />
          )}
        </span>
        <span className="block px-3 pt-2.5 pb-3">
          <span className={`block display text-[22px] leading-none tracking-[.02em] uppercase truncate transition-colors ${editing ? "" : "group-hover:text-accent"}`}>{c.name}</span>
          <span className="flex items-center gap-1.5 mt-1 text-[12.5px] text-dim">
            {c.titles.length} {c.titles.length === 1 ? "title" : "titles"}
          </span>
        </span>
      </button>
      {/* Outside Edit, the owner is told which categories only they can see. */}
      {showLock && hidden && !editing && (
        <span className={`absolute top-3 right-3 ${chip} cursor-default`} title="Private: only you can see it">
          <LockGlyph />
          <span className="sr-only">Private</span>
        </span>
      )}
      {/* In Edit: who can see it (an eye for everyone, a lock for only the
          owner), its picture, and, for the person's own categories, delete.
          A press on these doesn't pick the tile up. */}
      {editing && (
        <div className="absolute top-3 right-3 flex gap-1.5 pointer-events-auto" onPointerDown={(e) => e.stopPropagation()}>
          {onToggleHidden && (
            <button
              type="button"
              onClick={onToggleHidden}
              aria-pressed={hidden}
              aria-label={hidden ? `${c.name} is private. Make it public` : `${c.name} is public. Make it private`}
              title={hidden ? "Private: only you can see it" : "Public: everyone can see it"}
              className={chip}
            >
              {hidden ? (
                <LockGlyph />
              ) : (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </button>
          )}
          {onChoose && (
            <button type="button" onClick={onChoose} aria-label={`Choose the picture for ${c.name}`} title="Choose the picture" className={chip}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M4 20h4L19 9l-4-4L4 16v4zM13.5 6.5l4 4" />
              </svg>
            </button>
          )}
          {onDelete && (
            <button type="button" onClick={onDelete} aria-label={`Delete ${c.name}`} title="Delete" className={`${chip} hover:!bg-loved-plate`}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
              </svg>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function LockGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
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
      <div className="w-full max-w-[720px] max-h-[82vh] flex flex-col rounded-shell bg-card border border-hair shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
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
              <span className="block mt-1 text-[12.5px] text-ink truncate">{t.title}</span>
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
function CategorySheet({ c, onClose, onDelete }: { c: CategoryEntry; onClose: () => void; onDelete?: () => void }) {
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
      <div className="w-full sm:max-w-[760px] max-h-[88vh] flex flex-col overflow-hidden rounded-t-shell sm:rounded-shell bg-card border border-hair shadow-2xl" onClick={(x) => x.stopPropagation()}>
        <div className="p-4 flex items-start justify-between gap-4 border-b border-hair">
          <div className="min-w-0">
            <h3 className="!text-[clamp(26px,3vw,34px)] !leading-[.95]">{c.name}</h3>
            <div className="mt-2 text-[12.5px] leading-none text-dim">
              {c.titles.length} {c.titles.length === 1 ? "title" : "titles"}
            </div>
            {c.detail && <p className="m-0 mt-3 text-[12.5px] leading-[1.5] text-bone">{c.detail}</p>}
            {/* The app's wording: a category is a way of grouping titles, not
                a place they live, so deleting one loses nothing tracked. */}
            {onDelete && (
              <button type="button" onClick={() => confirm(`Delete ${c.name}? Everything in it stays tracked.`) && onDelete()} className="mt-3 text-[12.5px] text-dim hover:text-loved cursor-pointer">
                Delete category
              </button>
            )}
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
              <span className="block mt-1.5 text-[12.5px] leading-tight truncate group-hover:text-accent transition-colors">{t.title}</span>
              {t.year && <span className="block text-[12.5px] leading-tight text-dim">{t.year}</span>}
            </Link>
          ))}
        </div>
      </div>
    </div>,
    document.body,
  );
}

// The app's orders for the grid (`ProfileShelfSort`). Newest and oldest
// aren't offered: the eight built-ins have no age, only lists do, and the app
// files the eight as oldest of all.
const SORTS = [
  { id: "custom", label: "My order", short: "My order" },
  { id: "name-az", label: "Name, A to Z", short: "Name, A to Z" },
  { id: "name-za", label: "Name, Z to A", short: "Name, Z to A" },
  { id: "most", label: "Most titles", short: "Most titles" },
  { id: "fewest", label: "Fewest titles", short: "Fewest titles" },
] as const;
type SortId = (typeof SORTS)[number]["id"];
const SORT_KEY = "kodigo.categories-sort";

function arranged(cs: CategoryEntry[], sort: SortId, order: string[]) {
  const name = (a: CategoryEntry, b: CategoryEntry) => a.name.localeCompare(b.name);
  switch (sort) {
    case "custom": {
      // The owner's arrangement first, then anything it has never heard of
      // (a category made since) in the app's order, as the app does.
      const rank = new Map(order.map((id, i) => [id, i]));
      return [...cs].sort((a, b) => (rank.get(a.id) ?? 1e6 + cs.indexOf(a)) - (rank.get(b.id) ?? 1e6 + cs.indexOf(b)));
    }
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
        // Just the icon; the menu says what each order is, with a tick on
        // the one in force.
        <span className="w-9 h-9 inline-flex items-center justify-center rounded-full bg-page border border-hair text-dim hover:text-ink transition-colors" title={`Order: ${current.short}`}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M4 6h16M7 12h10M10 18h4" />
          </svg>
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
            className="w-full flex items-center gap-3 px-4 py-1.5 text-[12.5px] hover:bg-card-hi cursor-pointer text-ink"
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

/** A category the owner made on the web, kept in this browser for now. */
interface MadeCategory {
  id: string;
  name: string;
  detail: string | null;
  /** Title keys, in the order they were picked. */
  keys: string[];
}

// The last tile, for the owner only: the app's "Create Custom List" tile.
function NewCategoryTile({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="group text-left rounded-shell border-2 border-dashed border-hair hover:border-accent transition-colors cursor-pointer flex flex-col">
      <span className="aspect-video flex items-center justify-center text-dim group-hover:text-accent transition-colors">
        <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
          <path d="M12 5v14M5 12h14" />
        </svg>
      </span>
      <span className="block px-3 pt-2.5 pb-3">
        <span className="block display text-[22px] leading-none tracking-[.02em] uppercase group-hover:text-accent transition-colors">New category</span>
        <span className="block mt-1 text-[12.5px] text-dim">Your own shelf</span>
      </span>
    </button>
  );
}

// Making a category: its name, a line about what it's for, and the titles
// in it, picked from the owner's library with a search to narrow it.
function NewCategorySheet({ library, onCreate, onClose }: { library: ProfileTitle[]; onCreate: (m: MadeCategory) => void; onClose: () => void }) {
  const [name, setName] = useState("");
  const [detail, setDetail] = useState("");
  const [query, setQuery] = useState("");
  const [keys, setKeys] = useState<string[]>([]);
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
  const shown = library.filter((t) => t.title.toLowerCase().includes(query.trim().toLowerCase()));
  const toggle = (k: string) => setKeys((ks) => (ks.includes(k) ? ks.filter((x) => x !== k) : [...ks, k]));
  const ready = name.trim().length > 0;
  const field = "w-full rounded-[12px] bg-card-hi border border-hair px-3 py-2 text-[12.5px] text-ink placeholder:text-dim focus:outline-none focus:border-accent";
  return createPortal(
    <div role="dialog" aria-modal="true" aria-label="New category" className="fixed inset-0 z-[100] bg-black/70 flex items-end sm:items-center justify-center sm:p-4" onClick={onClose}>
      <form
        className="w-full sm:max-w-[760px] max-h-[88vh] flex flex-col overflow-hidden rounded-t-shell sm:rounded-shell bg-card border border-hair shadow-2xl"
        onClick={(x) => x.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault();
          if (ready) onCreate({ id: `list:web-${Date.now().toString(36)}`, name: name.trim(), detail: detail.trim() || null, keys });
        }}
      >
        <div className="p-4 border-b border-hair grid gap-3">
          <div className="flex items-center justify-between gap-3">
            <h3 className="!text-[clamp(26px,3vw,34px)] !leading-[.95]">New category</h3>
            <button type="button" onClick={onClose} aria-label="Close" className="shrink-0 w-9 h-9 rounded-full bg-card-hi hover:bg-hair text-ink flex items-center justify-center cursor-pointer">
              <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden className="block">
                <path d="M1.5 1.5l9 9M10.5 1.5l-9 9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </button>
          </div>
          <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" aria-label="Name" maxLength={60} className={field} />
          <input value={detail} onChange={(e) => setDetail(e.target.value)} placeholder="What this category is for (optional)" aria-label="Description" maxLength={140} className={field} />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search your library" aria-label="Search your library" className={field} />
        </div>
        <div className="p-4 overflow-y-auto grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(96px,1fr))]">
          {shown.map((t) => {
            const on = keys.includes(t.key);
            return (
              <button key={t.key} type="button" aria-pressed={on} onClick={() => toggle(t.key)} className="group text-left cursor-pointer">
                <span className={`relative block aspect-[2/3] rounded-[10px] overflow-hidden bg-card-hi border-2 transition-colors ${on ? "border-accent" : "border-transparent group-hover:border-hair"}`}>
                  {t.poster && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={t.poster} alt="" loading="lazy" className="w-full h-full object-cover" />
                  )}
                  {on && (
                    <span className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-accent-fill text-on-accent flex items-center justify-center">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                        <path d="M5 12l5 5L20 7" />
                      </svg>
                    </span>
                  )}
                </span>
                <span className="block mt-1.5 text-[12.5px] leading-tight truncate text-ink">{t.title}</span>
              </button>
            );
          })}
          {shown.length === 0 && <p className="col-span-full m-0 text-[12.5px] text-dim">Nothing in your library matches.</p>}
        </div>
        <div className="p-4 border-t border-hair flex items-center justify-between gap-3">
          <span className="text-[12.5px] text-dim">
            {keys.length} {keys.length === 1 ? "title" : "titles"} picked
          </span>
          <button type="submit" disabled={!ready} className="h-9 px-5 rounded-full bg-accent-fill text-on-accent text-[12.5px] font-semibold cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed">
            Create
          </button>
        </div>
      </form>
    </div>,
    document.body,
  );
}
