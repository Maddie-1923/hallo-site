"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import type { Service } from "@/lib/tmdb";
import { createRails, setRailFilter } from "@/lib/saved-rail-actions";
import {
  activeCount,
  CATALOGUES,
  COUNTRIES,
  countryName,
  emptyFilter,
  GENRES,
  LANGUAGES,
  languageName,
  RAIL_LIMIT,
  RAIL_NAME_LIMIT,
  RATING_BANDS,
  RUNTIMES,
  SORTS,
  STATUSES,
  suggestedName,
  TYPES,
  filterParam,
  type Catalogue,
  type DiscoverFilter,
} from "@/lib/saved-rails";

// The app's filter sheet as a dialog: build a filter and keep it as a custom
// category, a row of its own on Explore (and on the phone, after a sync).
// `browse` is the same sheet behind Explore's Filter button: no name, and
// its button shows what matches rather than saving anything.
// The same dialog edits a category's filter, with the catalogue fixed, since
// a category belongs to one tab and remaking it would send it to the bottom.

/** The panel every category dialog sits in, in ReviewDialog's manner:
    over the page, closing on Escape or a click outside, the page behind
    held still. */
export function Sheet({ label, title, onClose, footer, children, width = 720 }: { label: string; title: string; onClose: () => void; footer: React.ReactNode; children: React.ReactNode; width?: number }) {
  const box = useRef<HTMLDivElement>(null);
  // Held in a ref so a parent passing a fresh closure each render doesn't
  // re-run the effect below, which would pull focus out of a field mid-word.
  const close = useRef(onClose);
  useEffect(() => {
    close.current = onClose;
  }, [onClose]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close.current();
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    box.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, []);
  if (typeof document === "undefined") return null;
  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={box}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
        className="w-full max-h-[90vh] flex flex-col rounded-shell border border-hair bg-card shadow-[0_40px_120px_rgba(0,0,0,.7)] outline-none"
        style={{ maxWidth: width }}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-hair shrink-0">
          <div className="text-[15px] font-semibold tracking-[.02em] text-ink">{title}</div>
          <button type="button" onClick={onClose} aria-label="Close" className="text-dim hover:text-ink text-xl leading-none cursor-pointer px-2">
            ✕
          </button>
        </div>
        <div className="p-5 overflow-y-auto min-h-0">{children}</div>
        <div className="flex items-center justify-end gap-4 px-5 py-4 border-t border-hair shrink-0">{footer}</div>
      </div>
    </div>,
    document.body,
  );
}

// Laid out as the app's Browse sheet is: cards with a plain heading each —
// Type, Sort by, Genres, a "Narrow by" list of rows, and Series — rather than
// a wall of pills under spaced capitals. Built to be easy to read: sentence
// case, no letter-spacing, 15px type with room between lines, everything
// left-aligned, and a chosen pill marked with a tick as well as a colour.

/** A choice that is on or off. */
function Chip({ on, onClick, children, disabled = false }: { on: boolean; onClick: () => void; children: React.ReactNode; disabled?: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full border text-[14px] font-semibold cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-default ${
        on ? "border-transparent bg-accent-fill text-on-accent" : "border-hair text-ink hover:border-ink"
      }`}
    >
      {on && (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M5 12.5l4.5 4.5L19 7.5" />
        </svg>
      )}
      {children}
    </button>
  );
}

/** One card of the sheet, its heading in plain words. */
function Card({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[14px] bg-piece/60 border border-hair/70 px-4 py-4">
      <div role="heading" aria-level={3} className="text-[15px] font-semibold text-ink">
        {title}
      </div>
      {note && <p className="m-0 mt-1 text-[13.5px] leading-[1.5] text-dim">{note}</p>}
      <div className="mt-3">{children}</div>
    </section>
  );
}

/** A one-of-several choice drawn as the app's segmented track. */
function Segments<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: [T, string][]; onChange: (v: T) => void }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-1 p-1 rounded-full bg-card border border-hair w-fit max-w-full">
      {options.map(([v, text]) => (
        <button
          key={v}
          type="button"
          role="radio"
          aria-checked={value === v}
          onClick={() => onChange(v)}
          className={`h-9 px-4 rounded-full text-[14px] font-semibold cursor-pointer transition-colors ${value === v ? "bg-accent-fill text-on-accent" : "text-ink hover:bg-piece"}`}
        >
          {text}
        </button>
      ))}
    </div>
  );
}

/** A "Narrow by" row: what it narrows on the left, the choice on the right.
    A menu of one value is a native select; a set of several opens a list of
    ticks under the row. */
function Row({ label, first, children }: { label: string; first?: boolean; children: React.ReactNode }) {
  return (
    <div className={`flex items-center justify-between gap-4 min-h-12 py-1.5 ${first ? "" : "border-t border-hair/70"}`}>
      <span className="text-[15px] text-ink">{label}</span>
      <div className="flex items-center gap-2 text-[14px] text-dim">{children}</div>
    </div>
  );
}

function MultiRow({ label, summary, first, children }: { label: string; summary: string; first?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={first ? "" : "border-t border-hair/70"}>
      <button type="button" aria-expanded={open} onClick={() => setOpen((o) => !o)} className="w-full flex items-center justify-between gap-4 min-h-12 py-1.5 text-left cursor-pointer">
        <span className="text-[15px] text-ink">{label}</span>
        <span className="flex items-center gap-2 text-[14px] text-dim min-w-0">
          <span className="truncate max-w-[260px]">{summary}</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden className={`shrink-0 transition-transform ${open ? "rotate-180" : ""}`}>
            <path d="M6 9l6 6 6-6" />
          </svg>
        </span>
      </button>
      {open && <div className="pb-3 flex flex-wrap gap-2">{children}</div>}
    </div>
  );
}

const toggle = <T,>(xs: T[], x: T) => (xs.includes(x) ? xs.filter((y) => y !== x) : [...xs, x]);
const thisYear = new Date().getFullYear();
// The app's picker: 1950 to next year, newest first.
const YEARS = Array.from({ length: thisYear + 1 - 1950 + 1 }, (_, i) => thisYear + 1 - i);

export function CategoryDialog({
  services,
  counts,
  kinds = [...CATALOGUES],
  edit,
  initial,
  browse = false,
  canSave = false,
  onClose,
}: {
  /** The visitor's country's services, biggest first. */
  services: Service[];
  /** How many categories each catalogue holds already. */
  counts: Record<Catalogue, number>;
  /** Which catalogues a new category starts with: the tab it was opened on. */
  kinds?: Catalogue[];
  /** A category being edited, rather than one being made. */
  edit?: { id: string; name: string; catalogue: Catalogue; filter: DiscoverFilter };
  /** A filter to start from: the one on screen when Filter or Save is pressed on a results page. */
  initial?: DiscoverFilter;
  browse?: boolean;
  /** Browse for a signed-in visitor: the "Save as a category" box. */
  canSave?: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string>();
  const [f, setF] = useState<DiscoverFilter>(() => (edit ? { ...edit.filter, kinds: [edit.catalogue] } : initial ? { ...initial } : emptyFilter(kinds)));
  // The name follows the suggestion until somebody types in it.
  const [typed, setTyped] = useState<string | null>(null);
  const [allServices, setAllServices] = useState(false);
  const set = (patch: Partial<DiscoverFilter>) => setF((x) => ({ ...x, ...patch }));
  const unset = (key: keyof DiscoverFilter) =>
    setF((x) => {
      const next = { ...x };
      delete next[key];
      return next;
    });

  const name = typed ?? suggestedName(f);
  const shows = f.kinds.includes("Shows");
  const full = edit ? [] : f.kinds.filter((c) => counts[c] >= RAIL_LIMIT);
  const narrowed = activeCount(f) > 0;
  const blocked = !narrowed || (!edit && full.length === f.kinds.length);
  const note = !narrowed
    ? "Narrow something to save it."
    : full.length === f.kinds.length && !edit
      ? `${full.join(" and ")} already ${full.length > 1 ? "have" : "has"} ${RAIL_LIMIT} saved categories. Remove one to make room.`
      : full.length
        ? `${full[0]} already has ${RAIL_LIMIT} saved categories, so only the ${f.kinds.find((k) => !full.includes(k))} one will be saved.`
        : null;

  // Services picked on the phone in another country are kept on the list,
  // so editing a category never quietly drops one.
  const picked = f.providerIDs.filter((id) => !services.some((s) => s.id === id)).map((id) => ({ id, name: f.providerNames[String(id)] ?? `#${id}`, logo: null }));
  const serviceList = [...picked, ...services];
  const shown = allServices ? serviceList : serviceList.slice(0, Math.max(18, picked.length));

  function toggleService(s: Service) {
    const on = f.providerIDs.includes(s.id);
    const names = { ...f.providerNames };
    if (on) delete names[String(s.id)];
    else names[String(s.id)] = s.name;
    set({ providerIDs: on ? f.providerIDs.filter((x) => x !== s.id) : [...f.providerIDs, s.id].sort((a, b) => a - b), providerNames: names });
  }

  function setRating(from?: number, to?: number) {
    setF((x) => {
      const next = { ...x };
      if (from === undefined) delete next.ratingFrom;
      else next.ratingFrom = from;
      if (to === undefined) delete next.ratingTo;
      else next.ratingTo = to;
      return next;
    });
  }

  function save() {
    setError(undefined);
    start(async () => {
      // A category of shows keeps only what the shows side can ask; the
      // status and type picks would do nothing on films.
      const filter = shows ? f : { ...f, statuses: [], types: [] };
      const r = edit ? await setRailFilter(edit.id, filter) : await createRails(name, filter);
      if (r.error) {
        setError(r.error);
        return;
      }
      router.refresh();
      onClose();
    });
  }

  // Browse can keep what it shows: tick the box, name it, and the one
  // button saves the category on the way to the results.
  const [keep, setKeep] = useState(false);
  function show() {
    const filter = shows ? f : { ...f, statuses: [], types: [] };
    const go = () => {
      router.push(`/explore/filter?f=${filterParam(filter)}`);
      onClose();
    };
    if (!keep) return go();
    setError(undefined);
    start(async () => {
      const r = await createRails(name, filter);
      if (r.error) {
        setError(r.error);
        return;
      }
      go();
    });
  }

  const select = "field !w-auto !h-10 !py-0 !pl-3 !pr-8 !text-[14px] !text-ink";
  return (
    <Sheet
      label={browse ? "Browse" : edit ? `Edit ${edit.name}` : "New category"}
      title={browse ? "Browse" : edit ? `Edit ${edit.name}` : "New category"}
      onClose={onClose}
      footer={
        browse ? (
          <>
            <button type="button" className="text-[15px] font-semibold text-dim hover:text-ink cursor-pointer mr-auto" onClick={() => setF(emptyFilter(f.kinds))}>
              Clear
            </button>
            <button type="button" className="text-[15px] font-semibold text-dim hover:text-ink cursor-pointer" onClick={onClose}>
              Cancel
            </button>
            <button type="button" className="btn !py-2.5 !px-6 !text-[15px]" disabled={pending || (keep && blocked)} onClick={show}>
              {pending ? "Saving…" : keep ? "Save and show results" : "Show results"}
            </button>
          </>
        ) : (
        <>
          {(error || note) && (
            <span className="text-sm mr-auto" style={error ? { color: "var(--movies)" } : undefined} role={error ? "alert" : undefined}>
              <span className={error ? "" : "text-dim"}>{error ?? note}</span>
            </span>
          )}
          <button type="button" className="text-[15px] font-semibold text-dim hover:text-ink cursor-pointer" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn !py-2.5 !px-6 !text-[15px]" disabled={pending || blocked} onClick={save}>
            {pending ? "Saving…" : edit ? "Save" : "Save as category"}
          </button>
        </>
        )
      }
    >
      <div className="flex flex-col gap-3 text-[15px] leading-[1.5]">
        {!edit && !browse && (
          <Card title="Name" note={`${Array.from(name).length} of ${RAIL_NAME_LIMIT} letters`}>
            <input className="field !text-[15px]" aria-label="Category name" value={name} maxLength={RAIL_NAME_LIMIT} placeholder={suggestedName(f)} onChange={(e) => setTyped(e.target.value)} />
          </Card>
        )}

        {!edit && (
          // All is both catalogues. Saving both makes two categories, one on
          // each tab — the app's rule, since a row can't be half and half.
          <Card title="Type" note={f.kinds.length > 1 && !browse ? "Saving makes one category for shows and one for movies." : undefined}>
            <Segments
              label="Type"
              value={f.kinds.length > 1 ? "all" : f.kinds[0] === "Shows" ? "shows" : "movies"}
              options={[
                ["all", "All"],
                ["shows", `Shows${!browse && counts.Shows >= RAIL_LIMIT ? " (full)" : ""}`],
                ["movies", `Movies${!browse && counts.Movies >= RAIL_LIMIT ? " (full)" : ""}`],
              ]}
              onChange={(v) => set({ kinds: v === "all" ? [...CATALOGUES] : v === "shows" ? ["Shows"] : ["Movies"] })}
            />
          </Card>
        )}

        <Card title="Sort by">
          <Segments label="Sort by" value={f.sort} options={SORTS} onChange={(v) => set({ sort: v })} />
        </Card>

        <Card title="Genres" note="Pick any number. Titles in any of them are shown.">
          <div className="flex flex-wrap gap-2">
            {GENRES.map((g) => (
              <Chip key={g.key} on={f.genreKeys.includes(g.key)} onClick={() => set({ genreKeys: GENRES.map((x) => x.key).filter((k) => (k === g.key ? !f.genreKeys.includes(k) : f.genreKeys.includes(k))) })}>
                {g.label}
              </Chip>
            ))}
          </div>
        </Card>

        <Card title="Narrow by">
          {serviceList.length > 0 && (
            <MultiRow first label="Streaming on" summary={f.providerIDs.length ? f.providerIDs.map((id) => serviceList.find((s) => s.id === id)?.name ?? f.providerNames[String(id)]).join(", ") : "Any service"}>
              {shown.map((s) => (
                <Chip key={s.id} on={f.providerIDs.includes(s.id)} onClick={() => toggleService(s)}>
                  {s.name}
                </Chip>
              ))}
              {serviceList.length > shown.length && (
                <button type="button" onClick={() => setAllServices(true)} className="h-9 px-2 text-[14px] font-semibold text-accent hover:underline cursor-pointer">
                  Show all {serviceList.length}
                </button>
              )}
            </MultiRow>
          )}
          <Row first={serviceList.length === 0} label="Made in">
            <select className={select} aria-label="Made in" value={f.originCountry ?? ""} onChange={(e) => (e.target.value ? set({ originCountry: e.target.value }) : unset("originCountry"))}>
              <option value="">Anywhere</option>
              {COUNTRIES.map((c) => [c, countryName(c)] as const)
                .sort((x, y) => x[1].localeCompare(y[1]))
                .map(([c, n]) => (
                  <option key={c} value={c}>
                    {n}
                  </option>
                ))}
            </select>
          </Row>
          <Row label="Original language">
            <select className={select} aria-label="Original language" value={f.originalLanguage ?? ""} onChange={(e) => (e.target.value ? set({ originalLanguage: e.target.value }) : unset("originalLanguage"))}>
              <option value="">Any language</option>
              {LANGUAGES.map((c) => [c, languageName(c)] as const)
                .sort((x, y) => x[1].localeCompare(y[1]))
                .map(([c, n]) => (
                  <option key={c} value={c}>
                    {n}
                  </option>
                ))}
            </select>
          </Row>
          <Row label={shows && f.kinds.length === 1 ? "Episode length" : "Length"}>
            <select className={select} aria-label="Length" value={f.runtime ?? ""} onChange={(e) => (e.target.value ? set({ runtime: e.target.value as DiscoverFilter["runtime"] }) : unset("runtime"))}>
              <option value="">Any length</option>
              {RUNTIMES.map((r) => (
                <option key={r.band} value={r.band}>
                  {r.label}
                </option>
              ))}
            </select>
          </Row>
          <Row label="Years">
            <select className={select} aria-label="From year" value={f.yearFrom ?? ""} onChange={(e) => (e.target.value ? set({ yearFrom: Number(e.target.value) }) : unset("yearFrom"))}>
              <option value="">Any</option>
              {YEARS.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
            <span>to</span>
            <select className={select} aria-label="To year" value={f.yearTo ?? ""} onChange={(e) => (e.target.value ? set({ yearTo: Number(e.target.value) }) : unset("yearTo"))}>
              <option value="">Any</option>
              {YEARS.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </Row>
          <Row label="Rating on TMDB">
            <select
              className={select}
              aria-label="Rating"
              value={RATING_BANDS.findIndex((b) => b.from === f.ratingFrom && b.to === f.ratingTo)}
              onChange={(e) => {
                const band = RATING_BANDS[Number(e.target.value)];
                if (band) setRating(band.from, band.to);
              }}
            >
              {RATING_BANDS.findIndex((b) => b.from === f.ratingFrom && b.to === f.ratingTo) < 0 && (
                <option value={-1}>
                  {f.ratingFrom ?? 0}–{f.ratingTo ?? 10} out of 10
                </option>
              )}
              {RATING_BANDS.map((b, i) => (
                <option key={b.label} value={i}>
                  {b.label === "Any" ? "Any rating" : b.label}
                </option>
              ))}
            </select>
          </Row>
        </Card>

        {shows && (
          <Card title="Series" note={f.kinds.length > 1 ? "Status and show type narrow series only. Movies aren't affected by them." : undefined}>
            <MultiRow first label="Status" summary={f.statuses.length ? STATUSES.filter(([n]) => f.statuses.includes(n)).map(([, l]) => l).join(", ") : "Any status"}>
              {STATUSES.map(([n, label]) => (
                <Chip key={n} on={f.statuses.includes(n)} onClick={() => set({ statuses: toggle(f.statuses, n).sort((x, y) => x - y) })}>
                  {label}
                </Chip>
              ))}
            </MultiRow>
            <MultiRow label="Show type" summary={f.types.length ? TYPES.filter(([n]) => f.types.includes(n)).map(([, l]) => l).join(", ") : "Any type"}>
              {TYPES.map(([n, label]) => (
                <Chip key={n} on={f.types.includes(n)} onClick={() => set({ types: toggle(f.types, n).sort((x, y) => x - y) })}>
                  {label}
                </Chip>
              ))}
            </MultiRow>
          </Card>
        )}

        {browse && canSave && (
          <Card title="Save">
            <label className="flex items-center gap-3 min-h-10 cursor-pointer">
              <input type="checkbox" className="w-5 h-5 accent-[var(--accent-fill)] cursor-pointer" checked={keep} onChange={(e) => setKeep(e.target.checked)} />
              <span className="text-[15px] text-ink">Save as a category on Explore</span>
            </label>
            {keep && (
              <div className="mt-3">
                <label className="block">
                  <span className="text-[14px] text-dim">
                    Name · {Array.from(name).length} of {RAIL_NAME_LIMIT} letters
                  </span>
                  <input className="field !text-[15px] mt-1.5" aria-label="Category name" value={name} maxLength={RAIL_NAME_LIMIT} placeholder={suggestedName(f)} onChange={(e) => setTyped(e.target.value)} />
                </label>
                {f.kinds.length > 1 && <p className="m-0 mt-2 text-[13.5px] text-dim">Saving makes one category for shows and one for movies.</p>}
                {(error || note) && (
                  <p className="m-0 mt-2 text-[13.5px]" style={error ? { color: "var(--movies)" } : undefined} role={error ? "alert" : undefined}>
                    <span className={error ? "" : "text-dim"}>{error ?? note}</span>
                  </p>
                )}
              </div>
            )}
          </Card>
        )}
      </div>
    </Sheet>
  );
}

/** Explore's Browse: the app's Browse sheet, open to everyone. It leads to
    the titles that match; `counts` (signed in) adds the box that keeps the
    choices as a category on the way. */
export function FilterButton({ services, kinds, initial, count = 0, counts }: { services: Service[]; kinds: Catalogue[]; initial?: DiscoverFilter; count?: number; counts?: Record<Catalogue, number> }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={PILL}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden>
          <path d="M4 7h10M18 7h2M4 17h4M12 17h8" />
          <circle cx="16" cy="7" r="2" />
          <circle cx="10" cy="17" r="2" />
        </svg>
        Browse{count > 0 ? ` · ${count}` : ""}
      </button>
      {open && <CategoryDialog browse canSave={!!counts} services={services} counts={counts ?? { Shows: 0, Movies: 0 }} kinds={kinds} initial={initial} onClose={() => setOpen(false)} />}
    </>
  );
}

const PILL = "inline-flex items-center gap-1.5 h-[38px] px-4 rounded-full bg-card border border-hair text-[13px] font-bold text-dim hover:text-ink cursor-pointer transition-colors";
