"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Menu } from "./Menu";
import { useSettings } from "@/lib/settings";
import type { LibrarySort } from "@/lib/settings-shape";
import type { LibraryItem } from "@/lib/library-view";
import { saveOrder } from "@/lib/library-actions";
import { servicesFor } from "@/lib/library-tool-actions";

// The Library (/library): everything tracked, with the app's tools. Shows or
// Movies; a tab for each status with its count; then search, genre, sort,
// Hide watched, Only my services, and grid or list. The sort, layout and
// Hide watched are remembered with the settings, so they follow the account.
//
// My order is the app's drag order (showOrder / movieOrder): in that sort the
// grid's tiles can be picked up and dropped where they go, with a pointer or
// a finger, and the new order is saved to the library, so the app has it
// too. `live`: the person's own library; without it the preview, where the
// order is kept for the visit only.
const SHELL = "rounded-shell bg-card p-2 border-[0.5px] border-t-[color:var(--lit-edge)] border-x-piece border-b-well shadow-[0_4px_9px_rgba(0,0,0,.35)]";

const TABS: Record<"show" | "movie", [string, string, string[]][]> = {
  show: [
    ["all", "All", []],
    ["watching", "Watching", ["Watching"]],
    ["finished", "Finished", ["Finished"]],
    ["onhold", "On Hold", ["Stopped"]],
    ["stopped", "Stopped Watching", ["Dropped"]],
  ],
  movie: [
    ["all", "All", []],
    ["towatch", "To Watch", ["To Watch"]],
    ["watched", "Watched", ["Watched"]],
    ["onhold", "On Hold", ["On Hold"]],
    ["dnf", "Did Not Finish", ["Dropped"]],
  ],
};
const STATUS_WORD: Record<string, string> = { Watching: "Watching", Finished: "Finished", Stopped: "On Hold", Dropped: "Stopped", "To Watch": "To Watch", Watched: "Watched", "On Hold": "On Hold" };
const SORTS: [LibrarySort, string, string][] = [
  ["standard", "Default", "Recently watched first."],
  ["az", "A–Z", "By title, A to Z."],
  ["added", "Recently added", "Newest first."],
  ["year", "Release year", "Newest release first, undated last."],
  ["mine", "My order", "Yours, dragged into place."],
];

export function LibraryPage({ items, order: savedOrder, live, region, initialKind }: { items: LibraryItem[]; order: { show: number[]; movie: number[] }; live: boolean; region: string; initialKind: "show" | "movie" }) {
  const router = useRouter();
  const [s, set] = useSettings();
  const [kind, setKind] = useState<"show" | "movie">(initialKind);
  const [tab, setTab] = useState("all");
  const [query, setQuery] = useState("");
  const [genre, setGenre] = useState<string | null>(null);
  const [order, setOrder] = useState(savedOrder);
  const [problem, setProblem] = useState<string | null>(null);
  const sort = kind === "show" ? s.showSort : s.movieSort;
  const setSort = (v: LibrarySort) => set(kind === "show" ? { showSort: v } : { movieSort: v });

  // Where each title streams, fetched when Only my services is first used.
  const [streams, setStreams] = useState<Record<string, number[]> | null>(null);
  const [loadingStreams, setLoadingStreams] = useState(false);
  const mine = useMemo(() => new Set(s.services), [s.services]);
  const region2 = s.region ?? region;
  useEffect(() => {
    if (!s.onlyMyServices || mine.size === 0) return;
    let stale = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoadingStreams(true);
    servicesFor(items.map((i) => ({ kind: i.kind, id: i.id })), region2)
      .then((r) => !stale && setStreams(r))
      .catch(() => {})
      .finally(() => !stale && setLoadingStreams(false));
    return () => {
      stale = true;
    };
  }, [s.onlyMyServices, mine.size, region2, items]);

  const ofKind = items.filter((i) => i.kind === kind);
  const tabs = TABS[kind];
  const current = tabs.find((t) => t[0] === tab) ?? tabs[0];
  const done = (i: LibraryItem) => i.status === "Finished" || i.status === "Watched";
  const genres = useMemo(() => [...new Set(ofKind.flatMap((i) => i.genres))].sort(), [ofKind]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = ofKind.filter(
      (i) =>
        (current[2].length === 0 || current[2].includes(i.status)) &&
        // Hide watched keeps finished things out of All (their own tab still shows them).
        !(s.hideWatched && current[0] === "all" && done(i)) &&
        (!q || i.title.toLowerCase().includes(q)) &&
        (!genre || i.genres.includes(genre)) &&
        (!s.onlyMyServices || mine.size === 0 || !streams || (streams[i.key] ?? []).some((p) => mine.has(p))),
    );
    const by = {
      standard: (a: LibraryItem, b: LibraryItem) => (b.lastWatched ?? "").localeCompare(a.lastWatched ?? "") || (b.added ?? "").localeCompare(a.added ?? ""),
      az: (a: LibraryItem, b: LibraryItem) => a.title.localeCompare(b.title),
      added: (a: LibraryItem, b: LibraryItem) => (b.added ?? "").localeCompare(a.added ?? ""),
      year: (a: LibraryItem, b: LibraryItem) => (b.year || "0").localeCompare(a.year || "0"),
      mine: null,
    }[sort];
    if (by) list = [...list].sort(by);
    else {
      // My order: the saved order first, then everything not in it yet, newest first.
      const rank = new Map(order[kind].map((id, n) => [id, n]));
      list = [...list].sort((a, b) => (rank.get(a.id) ?? 1e9) - (rank.get(b.id) ?? 1e9) || (b.added ?? "").localeCompare(a.added ?? ""));
    }
    return list;
  }, [ofKind, current, s.hideWatched, query, genre, s.onlyMyServices, mine, streams, sort, order, kind]);

  // Dragging, in My order.
  const canDrag = sort === "mine" && !query && !genre && current[0] === "all" && !s.hideWatched && !s.onlyMyServices;
  const [dragging, setDragging] = useState<number | null>(null);
  const [draft, setDraft] = useState<number[] | null>(null);
  const gridRef = useRef<HTMLOListElement>(null);
  const visible = draft ? draft.map((id) => shown.find((i) => i.id === id)!).filter(Boolean) : shown;

  function startDrag(id: number, e: React.PointerEvent) {
    if (!canDrag || e.button !== 0) return;
    e.preventDefault();
    setDragging(id);
    setDraft(shown.map((i) => i.id));
    const move = (ev: PointerEvent) => {
      const el = document.elementFromPoint(ev.clientX, ev.clientY)?.closest<HTMLElement>("[data-lib-id]");
      const over = el ? Number(el.dataset.libId) : null;
      if (over == null || over === id) return;
      setDraft((d) => {
        if (!d) return d;
        const from = d.indexOf(id);
        const to = d.indexOf(over);
        if (from < 0 || to < 0) return d;
        const next = [...d];
        next.splice(from, 1);
        next.splice(to, 0, id);
        return next;
      });
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      setDragging(null);
      setDraft((d) => {
        if (d) commit(d);
        return null;
      });
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

  /** Moves a tile one step with the keyboard, in My order. */
  function nudge(id: number, step: number) {
    const ids = shown.map((i) => i.id);
    const from = ids.indexOf(id);
    const to = from + step;
    if (from < 0 || to < 0 || to >= ids.length) return;
    ids.splice(from, 1);
    ids.splice(to, 0, id);
    commit(ids);
  }

  function commit(ids: number[]) {
    const before = order;
    const next = { ...order, [kind]: ids };
    setOrder(next);
    if (!live) return;
    void saveOrder(kind, ids)
      .then((r) => {
        if (r.error) {
          setOrder(before);
          say(r.error);
        } else router.refresh();
      })
      .catch(() => {
        setOrder(before);
        say("That didn't save. Try again.");
      });
  }
  function say(text: string) {
    setProblem(text);
    setTimeout(() => setProblem(null), 4000);
  }

  const count = (t: [string, string, string[]]) => ofKind.filter((i) => (t[2].length === 0 || t[2].includes(i.status)) && !(s.hideWatched && t[0] === "all" && done(i))).length;
  const chip = (on: boolean) => `inline-flex items-center gap-1.5 h-8 px-3.5 rounded-full text-[12.5px] font-semibold cursor-pointer transition-colors ${on ? "bg-accent-fill text-on-accent" : "bg-piece text-ink hover:text-accent"}`;

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-8">
      {problem && (
        <div role="alert" className="fixed z-50 bottom-6 left-1/2 -translate-x-1/2 max-w-[90vw] rounded-full bg-card-hi border border-hair px-4 py-2 text-[12.5px] text-ink shadow-lg">
          {problem}
        </div>
      )}
      <div className={SHELL}>
        <div className="grid gap-2">
          {/* Shows or Movies, then the statuses. */}
          <div className="flex flex-wrap items-center gap-2">
            <Switch
              value={kind}
              onChange={(k) => {
                setKind(k);
                setTab("all");
                setGenre(null);
              }}
              options={[
                ["show", "Shows"],
                ["movie", "Movies"],
              ]}
              label="Shows or movies"
            />
            <div role="tablist" aria-label="Status" className="flex flex-wrap gap-1 p-1 rounded-[18px] bg-piece max-w-full">
              {tabs.map((t) => (
                <button
                  key={t[0]}
                  type="button"
                  role="tab"
                  aria-selected={t[0] === current[0]}
                  onClick={() => setTab(t[0])}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[10.5px] leading-none font-bold uppercase tracking-[.12em] cursor-pointer transition-colors ${t[0] === current[0] ? "bg-ink text-page" : "text-dim hover:text-ink"}`}
                >
                  {t[1]}
                  <span className="tabular-nums opacity-70">{count(t)}</span>
                </button>
              ))}
            </div>
          </div>

          {/* The tools. */}
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2 h-8 px-3 rounded-full bg-piece min-w-[180px] flex-1 max-w-[320px]">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden className="text-dim shrink-0">
                <circle cx="11" cy="11" r="7" />
                <path d="M20 20l-3.5-3.5" />
              </svg>
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={`Search your ${kind === "show" ? "shows" : "movies"}`} aria-label="Search your library" className="flex-1 min-w-0 bg-transparent text-[12.5px] text-ink placeholder:text-dim focus:outline-none" />
            </label>

            <Menu
              label="Genre"
              width={220}
              align="left"
              button={
                <span className={chip(!!genre)}>
                  {genre ?? "Genre"}
                  <Caret />
                </span>
              }
            >
              <div className="py-1.5 max-h-[320px] overflow-y-auto">
                {[null, ...genres].map((g) => (
                  <button key={g ?? "all"} type="button" data-menu-close onClick={() => setGenre(g)} aria-pressed={genre === g} className={`w-full text-left px-4 py-2 text-[12.5px] cursor-pointer hover:bg-card-hi ${genre === g ? "text-accent font-semibold" : "text-ink"}`}>
                    {g ?? "Every genre"}
                  </button>
                ))}
              </div>
            </Menu>

            <Menu
              label="Sort"
              width={240}
              align="left"
              button={
                <span className={chip(false)}>
                  {SORTS.find((x) => x[0] === sort)?.[1]}
                  <Caret />
                </span>
              }
            >
              <div className="py-1.5">
                {SORTS.map(([v, label, detail]) => (
                  <button key={v} type="button" data-menu-close onClick={() => setSort(v)} aria-pressed={sort === v} className="w-full text-left px-4 py-2 cursor-pointer hover:bg-card-hi">
                    <span className={`block text-[12.5px] ${sort === v ? "text-accent font-semibold" : "text-ink"}`}>{label}</span>
                    <span className="block text-[12px] text-dim">{detail}</span>
                  </button>
                ))}
              </div>
            </Menu>

            <button type="button" aria-pressed={s.hideWatched} onClick={() => set({ hideWatched: !s.hideWatched })} className={chip(s.hideWatched)}>
              Hide watched
            </button>
            <button type="button" aria-pressed={s.onlyMyServices} onClick={() => set({ onlyMyServices: !s.onlyMyServices })} className={chip(s.onlyMyServices)}>
              Only my services
            </button>

            <div className="ml-auto">
              <Switch
                value={s.libraryLayout}
                onChange={(v) => set({ libraryLayout: v })}
                options={[
                  ["grid", "Grid"],
                  ["list", "List"],
                ]}
                label="Layout"
              />
            </div>
          </div>

          {/* What the tools are doing, when it isn't obvious. */}
          {s.onlyMyServices && (
            <p className="m-0 px-1 text-[12.5px] text-dim">
              {mine.size === 0 ? (
                <>
                  Choose your services in{" "}
                  <Link href="/settings#watch" className="text-accent no-underline hover:underline">
                    Settings → Where you watch
                  </Link>{" "}
                  to use this.
                </>
              ) : loadingStreams ? (
                "Checking where everything streams…"
              ) : (
                "Only titles streaming on your services."
              )}
            </p>
          )}
          {sort === "mine" && (
            <p className="m-0 px-1 text-[12.5px] text-dim">
              {canDrag ? "Drag a title to where it goes. The app gets the same order." : "Drag to reorder in All, with no search, genre or filter on."}
            </p>
          )}

          {/* The titles. */}
          <div className="rounded-shell bg-piece p-2 min-h-[240px]">
            {visible.length === 0 ? (
              <p className="m-0 p-3 text-[12.5px] text-dim">{ofKind.length === 0 ? `No ${kind === "show" ? "series" : "films"} in your library yet.` : "Nothing matches."}</p>
            ) : s.libraryLayout === "grid" ? (
              <ol ref={gridRef} className="m-0 p-0 list-none grid gap-2 grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8">
                {visible.map((i) => (
                  <li
                    key={i.key}
                    data-lib-id={i.id}
                    onPointerDown={(e) => startDrag(i.id, e)}
                    onKeyDown={(e) => {
                      if (!canDrag) return;
                      const step = e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : 0;
                      if (!step) return;
                      e.preventDefault();
                      nudge(i.id, step);
                    }}
                    className={`min-w-0 ${canDrag ? "cursor-grab touch-none select-none" : ""} ${dragging === i.id ? "opacity-60 scale-[.97]" : ""} transition-transform`}
                  >
                    <Link href={i.href} draggable={false} onClick={(e) => dragging != null && e.preventDefault()} className="group block no-underline text-ink">
                      <span className="relative block aspect-[2/3] rounded-[10px] overflow-hidden bg-card border border-hair group-hover:border-accent transition-colors">
                        {i.poster && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={i.poster} alt="" draggable={false} className="w-full h-full object-cover" loading="lazy" />
                        )}
                      </span>
                      <span className="block mt-1.5 text-[12.5px] leading-[16px] truncate group-hover:text-accent transition-colors">{i.title}</span>
                      <span className="block text-[12.5px] leading-[16px] text-dim truncate">{subline(i)}</span>
                    </Link>
                  </li>
                ))}
              </ol>
            ) : (
              <ul className="m-0 p-0 list-none divide-y divide-hair">
                {visible.map((i) => (
                  <li key={i.key}>
                    <Link href={i.href} className="group flex items-center gap-3 py-2 px-1 no-underline text-ink">
                      <span className="w-10 shrink-0 aspect-[2/3] rounded-[6px] overflow-hidden bg-card border border-hair">
                        {i.poster && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={i.poster} alt="" className="w-full h-full object-cover" loading="lazy" />
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[12.5px] font-semibold truncate group-hover:text-accent transition-colors">{i.title}</span>
                        <span className="block text-[12.5px] text-dim truncate">{[i.year, i.genres.slice(0, 2).join(", ")].filter(Boolean).join(" · ")}</span>
                      </span>
                      <span className="hidden sm:block text-[12.5px] text-dim text-right shrink-0">{subline(i)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Under a title: its status, and for a series how far in. */
function subline(i: LibraryItem) {
  const status = STATUS_WORD[i.status] ?? i.status;
  if (i.kind === "show" && i.episodes) return `${status} · ${i.episodes} ep${i.episodes === 1 ? "" : "s"}`;
  return [status, i.year].filter(Boolean).join(" · ");
}

function Caret() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

function Switch<T extends string>({ value, onChange, options, label }: { value: T; onChange: (v: T) => void; options: [T, string][]; label: string }) {
  return (
    <div role="tablist" aria-label={label} className="inline-flex items-center gap-1 p-1 rounded-full bg-piece">
      {options.map(([v, text]) => (
        <button
          key={v}
          type="button"
          role="tab"
          aria-selected={value === v}
          onClick={() => onChange(v)}
          className={`px-4 py-2 rounded-full text-[10.5px] leading-none font-bold uppercase tracking-[.12em] cursor-pointer transition-colors ${value === v ? "bg-ink text-page" : "text-dim hover:text-ink"}`}
        >
          {text}
        </button>
      ))}
    </div>
  );
}
