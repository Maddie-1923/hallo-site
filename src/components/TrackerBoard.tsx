"use client";

import { useState } from "react";
import { addWatch, today } from "@/lib/live-watches";
import type { CalendarEvent, ComingFilm, ComingShow, TrackerPage } from "@/lib/tracker";
import type { ProfileTitle, TrackerShow } from "@/lib/public-profile";
import { CheckGlyph, code, HOLD, MoreGlyph, progress, RecapGlyph, Row, SkipGlyph, type Key } from "./TrackerRow";
import { HeadingPill } from "./TitleParts";
import { TrackerCalendar } from "./TrackerCalendar";

// The full tracker, as the app's Shows and Movies tabs: Shows or Movies, then
// the watch list or what's coming, each pile under its heading in rows of
// the app's list view, two or three across on a wide screen and one on a
// phone. Checking off works on the page as it does on the profile's mini
// tracker: it moves the row on and lands in Recent activity for the visit,
// and saving it comes with accounts.
export function TrackerBoard({ data }: { data: TrackerPage }) {
  const [kind, setKind] = useState<"show" | "movie">("show");
  const [view, setView] = useState<"list" | "coming">("list");
  const [seen, setSeen] = useState<Record<string, string[]>>({});
  const [skipped, setSkipped] = useState<string[]>([]);
  const [watchedFilms, setWatchedFilms] = useState<string[]>([]);

  const seenOf = (s: TrackerShow) => [...s.seen, ...(seen[s.key] ?? [])];

  // The calendar's keys: an aired episode can be set aside or checked off,
  // a film out already checked off, each the same state as the rows below.
  const known = new Map([...data.shows.upNext, ...data.shows.readyToStart, ...data.shows.onHold, ...data.shows.theVoid].map((s) => [s.key, s]));
  const todayISO = today();
  const keysFor = (e: CalendarEvent): Key[] | null => {
    const out = e.date <= todayISO;
    if (e.episode) {
      const k = e.episode;
      const done = [...(known.get(e.t.key)?.seen ?? []), ...(seen[e.t.key] ?? [])].includes(k);
      const aside = skipped.includes(`${e.t.key}:${k}`);
      return [
        { icon: <MoreGlyph />, label: `More for ${e.t.title}` },
        { icon: <RecapGlyph />, label: "Recap", off: true },
        {
          icon: <SkipGlyph />,
          label: `Watch ${code(k)} of ${e.t.title} later`,
          on: aside,
          off: !out || done,
          confirm: aside ? undefined : HOLD,
          run: () => setSkipped((x) => (aside ? x.filter((y) => y !== `${e.t.key}:${k}`) : [...x, `${e.t.key}:${k}`])),
        },
        {
          icon: <CheckGlyph />,
          label: done ? `${code(k)} of ${e.t.title} watched` : `Mark ${code(k)} of ${e.t.title} watched`,
          on: done,
          onFill: "var(--accent-fill)",
          onInk: "var(--on-accent)",
          off: !out,
          confirm: done ? undefined : "var(--accent-fill)",
          run: done ? undefined : () => {
            setSeen((m) => ({ ...m, [e.t.key]: [...(m[e.t.key] ?? []), k] }));
            const [se, ep] = k.split("-");
            addWatch({ key: `${e.t.key}-${k}-${Date.now()}`, date: today(), t: e.t, detail: `S${se} E${ep}` });
          },
        },
      ];
    }
    const done = watchedFilms.includes(e.t.key);
    return [
      { icon: <MoreGlyph />, label: `More for ${e.t.title}` },
      {
        icon: <CheckGlyph />,
        label: done ? `${e.t.title} watched` : `Mark ${e.t.title} watched`,
        on: done,
        onFill: "var(--accent-fill)",
        onInk: "var(--on-accent)",
        off: !out,
        confirm: done ? undefined : "var(--accent-fill)",
        run: done ? undefined : () => {
          setWatchedFilms((w) => [...w, e.t.key]);
          addWatch({ key: `${e.t.key}-${Date.now()}`, date: today(), t: e.t });
        },
      },
    ];
  };

  const showRow = (s: TrackerShow) => {
    const p = progress(s, seenOf(s));
    const skippedHere = p.next ? skipped.includes(`${s.key}:${p.next.key}`) : false;
    return (
      <Row
        key={s.key}
        t={s}
        lines={p.next ? [code(p.next.key), s.episodeNames?.[p.next.key] ?? ""] : [p.total ? "All caught up" : "Not started", ""]}
        bar={p.total ? { done: p.done, total: p.total } : null}
        keys={[
          { icon: <MoreGlyph />, label: `More for ${s.title}` },
          { icon: <RecapGlyph />, label: "Recap", off: true },
          {
            icon: <SkipGlyph />,
            label: p.next ? `Watch ${code(p.next.key)} later` : "Skip",
            on: skippedHere,
            off: !p.next,
            confirm: skippedHere ? undefined : HOLD,
            run: p.next ? () => setSkipped((k) => (skippedHere ? k.filter((x) => x !== `${s.key}:${p.next!.key}`) : [...k, `${s.key}:${p.next!.key}`])) : undefined,
          },
          {
            icon: <CheckGlyph />,
            label: p.next ? `Mark ${code(p.next.key)} of ${s.title} watched` : "Watched",
            off: !p.next,
            confirm: "var(--accent-fill)",
            run: p.next
              ? () => {
                  const n = p.next!;
                  setSeen((m) => ({ ...m, [s.key]: [...(m[s.key] ?? []), n.key] }));
                  const [se, ep] = n.key.split("-");
                  addWatch({ key: `${s.key}-${n.key}-${Date.now()}`, date: today(), t: s, detail: `S${se} E${ep}` });
                }
              : undefined,
          },
        ]}
      />
    );
  };

  const filmRow = (f: ProfileTitle) => (
    <Row
      key={f.key}
      t={f}
      lines={[f.year, "On the watch list"]}
      bar={null}
      keys={[
        { icon: <MoreGlyph />, label: `More for ${f.title}` },
        {
          icon: <CheckGlyph />,
          label: `Mark ${f.title} watched`,
          confirm: "var(--accent-fill)",
          run: () => {
            setWatchedFilms((w) => [...w, f.key]);
            addWatch({ key: `${f.key}-${Date.now()}`, date: today(), t: f });
          },
        },
      ]}
    />
  );
  const films = (list: ProfileTitle[]) => list.filter((f) => !watchedFilms.includes(f.key));

  const piles =
    kind === "show"
      ? [
          { id: "up-next", title: "Up next", rows: data.shows.upNext.map(showRow) },
          { id: "ready", title: "Ready to start", rows: data.shows.readyToStart.map(showRow) },
          { id: "on-hold", title: "On hold", rows: data.shows.onHold.map(showRow) },
          { id: "void", title: "Entering the void", rows: data.shows.theVoid.map(showRow) },
        ]
      : [
          { id: "to-watch", title: "To watch", rows: films(data.films.toWatch).map(filmRow) },
          { id: "on-hold", title: "On hold", rows: films(data.films.onHold).map(filmRow) },
          { id: "void", title: "Entering the void", rows: films(data.films.theVoid).map(filmRow) },
        ];

  const coming: (ComingShow | ComingFilm)[] = kind === "show" ? data.shows.coming : data.films.coming;
  const buckets = [
    { id: "today", title: "Today", from: 0, to: 0 },
    { id: "tomorrow", title: "Tomorrow", from: 1, to: 1 },
    { id: "week", title: "This week", from: 2, to: 7 },
    { id: "later", title: "Later", from: 8, to: Infinity },
  ].map((b) => ({ ...b, items: coming.filter((c) => c.inDays >= b.from && c.inDays <= b.to) }));

  const shown = view === "list" ? piles.filter((p) => p.rows.length > 0) : buckets.filter((b) => b.items.length > 0);

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-8">
      {/* The calendar first, under the carousel on the left; the switches
          and the piles below it. */}
      <TrackerCalendar events={data.calendar} keysFor={keysFor} />
      <div className="flex flex-wrap items-center gap-2">
        <Switch value={kind} onChange={setKind} options={[["show", "Shows"], ["movie", "Movies"]]} label="Shows or movies" />
        <Switch value={view} onChange={setView} options={[["list", "Watch list"], ["coming", "Coming soon"]]} label="Watch list or coming soon" />
      </div>

      {shown.length === 0 && (
        <p className="m-0 rounded-shell bg-card p-3 text-[12.5px] text-dim">
          {view === "list" ? (kind === "show" ? "No shows on the go. Add one from any show's page." : "No films waiting. Add one from any film's page.") : kind === "show" ? "Nothing announced yet from your shows." : "No film you're waiting on has a date yet."}
        </p>
      )}

      {view === "list"
        ? (shown as typeof piles).map((p) => (
            <Pile key={p.id} title={p.title} count={p.rows.length}>
              {p.rows}
            </Pile>
          ))
        : (shown as typeof buckets).map((b) => (
            <Pile key={b.id} title={b.title} count={b.items.length}>
              {b.items.map((c) =>
                "episode" in c ? (
                  <Row key={`${c.t.key}${c.episode}`} t={c.t} lines={[when(c), `${code(c.episode)}${c.name ? ` · ${c.name}` : ""}`]} bar={null} keys={null} />
                ) : (
                  <Row key={c.t.key} t={c.t} lines={[when(c), "Release"]} bar={null} keys={null} />
                ),
              )}
            </Pile>
          ))}
    </div>
  );
}

function Pile({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <section className="grid gap-2">
      <div>
        <HeadingPill small>{`${title} · ${count}`}</HeadingPill>
      </div>
      <div className="rounded-shell bg-card p-2 border-[0.5px] border-t-[color:var(--lit-edge)] border-x-piece border-b-well shadow-[0_4px_9px_rgba(0,0,0,.35)]">
        <ul className="m-0 p-0 list-none grid gap-2 md:grid-cols-2 2xl:grid-cols-3">{children}</ul>
      </div>
    </section>
  );
}

/** A switch lettered as the tab bars: two choices on a pill. */
function Switch<T extends string>({ value, onChange, options, label }: { value: T; onChange: (v: T) => void; options: [T, string][]; label: string }) {
  return (
    <div role="tablist" aria-label={label} className="inline-flex items-center gap-1 p-1 rounded-full bg-card border border-hair">
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

function when(c: { date: string; inDays: number }) {
  if (c.inDays === 0) return "Today";
  if (c.inDays === 1) return "Tomorrow";
  const [y, m, d] = c.date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", ...(c.inDays > 300 ? { year: "numeric" } : {}), timeZone: "UTC" });
}
