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

/** A choice that is on or off, drawn as the dialog's pills. */
function Chip({ on, onClick, children, disabled = false }: { on: boolean; onClick: () => void; children: React.ReactNode; disabled?: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      disabled={disabled}
      onClick={onClick}
      className={`h-8 px-3.5 rounded-full border text-[12.5px] font-semibold cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-default ${
        on ? "border-transparent bg-accent-fill text-on-accent" : "border-hair text-dim hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}

function Section({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-baseline gap-3">
        <div className="eyebrow">{title}</div>
        {note && <span className="text-xs text-dim">{note}</span>}
      </div>
      <div className="flex flex-wrap gap-1.5 mt-2">{children}</div>
    </div>
  );
}

const toggle = <T,>(xs: T[], x: T) => (xs.includes(x) ? xs.filter((y) => y !== x) : [...xs, x]);
const thisYear = new Date().getFullYear();
// The app's picker: 1950 to next year, newest first.
const YEARS = Array.from({ length: thisYear + 1 - 1950 + 1 }, (_, i) => thisYear + 1 - i);
const SCORES = Array.from({ length: 21 }, (_, i) => i / 2);

export function CategoryDialog({
  services,
  counts,
  kinds = [...CATALOGUES],
  edit,
  initial,
  browse = false,
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

  function show() {
    router.push(`/explore/filter?f=${filterParam(shows ? f : { ...f, statuses: [], types: [] })}`);
    onClose();
  }

  const select = "field !w-auto !h-8 !py-0 !px-2.5 !text-[12.5px]";
  return (
    <Sheet
      label={browse ? "Filter" : edit ? `Edit ${edit.name}` : "New category"}
      title={browse ? "Filter" : edit ? `Edit ${edit.name}` : "New category"}
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
            <button type="button" className="btn !py-2.5 !px-6 !text-[15px]" onClick={show}>
              Show results
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
      <div className="flex flex-col gap-5">
        {!edit && !browse && (
          <label className="block">
            <div className="flex items-baseline gap-3">
              <div className="eyebrow">Name</div>
              <span className="text-xs text-dim">
                {Array.from(name).length}/{RAIL_NAME_LIMIT}
              </span>
            </div>
            <input className="field mt-2" value={name} maxLength={RAIL_NAME_LIMIT} placeholder={suggestedName(f)} onChange={(e) => setTyped(e.target.value)} />
          </label>
        )}

        {!edit && (
          // Both makes two categories, one on each tab — the app's rule, since
          // a row can't be half on Shows and half on Movies.
          <Section title="Show me" note={f.kinds.length > 1 && !browse ? "Makes one category for each" : undefined}>
            {CATALOGUES.map((c) => (
              <Chip
                key={c}
                on={f.kinds.includes(c)}
                onClick={() => {
                  // Never neither: a filter that asks nothing finds nothing.
                  const next = CATALOGUES.filter((k) => (k === c ? !f.kinds.includes(k) : f.kinds.includes(k)));
                  if (next.length) set({ kinds: next });
                }}
              >
                {c}
                {!browse && counts[c] >= RAIL_LIMIT ? " (full)" : ""}
              </Chip>
            ))}
          </Section>
        )}

        <Section title="Genres" note="Any of these">
          {GENRES.map((g) => (
            <Chip key={g.key} on={f.genreKeys.includes(g.key)} onClick={() => set({ genreKeys: GENRES.map((x) => x.key).filter((k) => (k === g.key ? !f.genreKeys.includes(k) : f.genreKeys.includes(k))) })}>
              {g.label}
            </Chip>
          ))}
        </Section>

        <div className="flex flex-wrap gap-x-8 gap-y-5">
          <div>
            <div className="eyebrow">Years</div>
            <div className="flex items-center gap-2 mt-2 text-[12.5px] text-dim">
              <select className={select} aria-label="From year" value={f.yearFrom ?? ""} onChange={(e) => (e.target.value ? set({ yearFrom: Number(e.target.value) }) : unset("yearFrom"))}>
                <option value="">Any</option>
                {YEARS.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
              to
              <select className={select} aria-label="To year" value={f.yearTo ?? ""} onChange={(e) => (e.target.value ? set({ yearTo: Number(e.target.value) }) : unset("yearTo"))}>
                <option value="">Any</option>
                {YEARS.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <div className="eyebrow">Made in</div>
            <select className={`${select} mt-2`} aria-label="Country of origin" value={f.originCountry ?? ""} onChange={(e) => (e.target.value ? set({ originCountry: e.target.value }) : unset("originCountry"))}>
              <option value="">Anywhere</option>
              {COUNTRIES.map((c) => [c, countryName(c)] as const)
                .sort((a, b) => a[1].localeCompare(b[1]))
                .map(([c, n]) => (
                  <option key={c} value={c}>
                    {n}
                  </option>
                ))}
            </select>
          </div>
          <div>
            <div className="eyebrow">Original language</div>
            <select className={`${select} mt-2`} aria-label="Original language" value={f.originalLanguage ?? ""} onChange={(e) => (e.target.value ? set({ originalLanguage: e.target.value }) : unset("originalLanguage"))}>
              <option value="">Any</option>
              {LANGUAGES.map((c) => [c, languageName(c)] as const)
                .sort((a, b) => a[1].localeCompare(b[1]))
                .map(([c, n]) => (
                  <option key={c} value={c}>
                    {n}
                  </option>
                ))}
            </select>
          </div>
        </div>

        {serviceList.length > 0 && (
          <div>
            <Section title="Streaming on" note="Any of these">
              {shown.map((s) => (
                <Chip key={s.id} on={f.providerIDs.includes(s.id)} onClick={() => toggleService(s)}>
                  {s.name}
                </Chip>
              ))}
            </Section>
            {serviceList.length > shown.length && (
              <button type="button" onClick={() => setAllServices(true)} className="mt-2 text-[12.5px] font-semibold text-accent hover:underline cursor-pointer">
                All {serviceList.length} services
              </button>
            )}
          </div>
        )}

        <Section title={shows ? "Length (episode)" : "Length"}>
          <Chip on={!f.runtime} onClick={() => unset("runtime")}>
            Any
          </Chip>
          {RUNTIMES.map((r) => (
            <Chip key={r.band} on={f.runtime === r.band} onClick={() => set({ runtime: r.band })}>
              {r.label}
            </Chip>
          ))}
        </Section>

        <div>
          <Section title="Rating">
            {RATING_BANDS.map((b) => (
              <Chip key={b.label} on={f.ratingFrom === b.from && f.ratingTo === b.to} onClick={() => setRating(b.from, b.to)}>
                {b.label}
              </Chip>
            ))}
          </Section>
          <div className="flex items-center gap-2 mt-2 text-[12.5px] text-dim">
            <select className={select} aria-label="Rated from" value={f.ratingFrom ?? ""} onChange={(e) => setRating(e.target.value ? Number(e.target.value) : undefined, f.ratingTo)}>
              <option value="">Any</option>
              {SCORES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            to
            <select className={select} aria-label="Rated to" value={f.ratingTo ?? ""} onChange={(e) => setRating(f.ratingFrom, e.target.value ? Number(e.target.value) : undefined)}>
              <option value="">Any</option>
              {SCORES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <span>out of 10, on TMDB</span>
          </div>
        </div>

        {shows && (
          <>
            <Section title="Status" note={f.kinds.length > 1 ? "Shows only" : undefined}>
              {STATUSES.map(([n, label]) => (
                <Chip key={n} on={f.statuses.includes(n)} onClick={() => set({ statuses: toggle(f.statuses, n).sort((a, b) => a - b) })}>
                  {label}
                </Chip>
              ))}
            </Section>
            <Section title="Type" note={f.kinds.length > 1 ? "Shows only" : undefined}>
              {TYPES.map(([n, label]) => (
                <Chip key={n} on={f.types.includes(n)} onClick={() => set({ types: toggle(f.types, n).sort((a, b) => a - b) })}>
                  {label}
                </Chip>
              ))}
            </Section>
          </>
        )}

        <Section title="Sort by">
          {SORTS.map(([s, label]) => (
            <Chip key={s} on={f.sort === s} onClick={() => set({ sort: s })}>
              {label}
            </Chip>
          ))}
        </Section>
      </div>
    </Sheet>
  );
}

/** "+ New category" on Explore, for a signed-in visitor; on a results page
    it starts from the filter on screen. */
export function NewCategoryButton({ services, counts, kinds, initial, label = "New category" }: { services: Service[]; counts: Record<Catalogue, number>; kinds: Catalogue[]; initial?: DiscoverFilter; label?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={PILL}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden>
          <path d="M12 5v14M5 12h14" />
        </svg>
        {label}
      </button>
      {open && <CategoryDialog services={services} counts={counts} kinds={kinds} initial={initial} onClose={() => setOpen(false)} />}
    </>
  );
}

/** Explore's Filter: the app's Browse sheet, open to everyone. It leads to
    the titles that match, where a signed-in visitor can keep the filter as
    a category. */
export function FilterButton({ services, kinds, initial, count = 0 }: { services: Service[]; kinds: Catalogue[]; initial?: DiscoverFilter; count?: number }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={PILL}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden>
          <path d="M4 7h10M18 7h2M4 17h4M12 17h8" />
          <circle cx="16" cy="7" r="2" />
          <circle cx="10" cy="17" r="2" />
        </svg>
        Filter{count > 0 ? ` · ${count}` : ""}
      </button>
      {open && <CategoryDialog browse services={services} counts={{ Shows: 0, Movies: 0 }} kinds={kinds} initial={initial} onClose={() => setOpen(false)} />}
    </>
  );
}

const PILL = "inline-flex items-center gap-1.5 h-[38px] px-4 rounded-full bg-card border border-hair text-[13px] font-bold text-dim hover:text-ink cursor-pointer transition-colors";
