"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { loadSeason, type SeasonEpisode } from "@/lib/title-actions";
import { ExpandableText } from "./ExpandableText";
import { addWatch, today } from "@/lib/live-watches";
import type { CalendarEvent, ComingFilm, ComingShow, TrackerPage } from "@/lib/tracker";
import type { ProfileTitle, TrackerShow } from "@/lib/public-profile";
import { CheckGlyph, code, HOLD, KeyButton, MoreGlyph, progress, RecapGlyph, Row, SkipGlyph, type Key } from "./TrackerRow";
import { HeadingPill } from "./TitleParts";
import { TrackerCalendar } from "./TrackerCalendar";

// The full tracker, as the app's Shows and Movies tabs: Shows or Movies, then
// the watch list or what's coming, each pile under its heading in the app's
// list-view rows on the left, and beside them the picked title's next
// episode. Checking off works on the page as it does on the profile's mini
// tracker: it moves the row on and lands in Recent activity for the visit,
// and saving it comes with accounts.
export function TrackerBoard({ data }: { data: TrackerPage }) {
  const [kind, setKind] = useState<"show" | "movie">("show");
  const [view, setView] = useState<"list" | "coming">("list");
  const [seen, setSeen] = useState<Record<string, string[]>>({});
  const [skipped, setSkipped] = useState<string[]>([]);
  const [watchedFilms, setWatchedFilms] = useState<string[]>([]);
  // The entry shown beside the list; the first one until another is picked.
  const [pickKey, setPickKey] = useState<string | null>(null);

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

  // The keys a series carries for its next episode, and a film on the list.
  const showKeys = (s: TrackerShow): Key[] => {
    const p = progress(s, seenOf(s));
    const skippedHere = p.next ? skipped.includes(`${s.key}:${p.next.key}`) : false;
    return [
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
    ];
  };
  const filmKeys = (f: ProfileTitle): Key[] => [
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
  ];
  const films = (list: ProfileTitle[]) => list.filter((f) => !watchedFilms.includes(f.key));

  // Every entry the list can show, one type for all: a series (its next
  // episode), a film, or, under Coming soon, a dated episode or release.
  const showItem = (s: TrackerShow): Item => {
    const p = progress(s, seenOf(s));
    return { key: s.key, t: s, show: s, episode: p.next?.key, lines: p.next ? [code(p.next.key), s.episodeNames?.[p.next.key] ?? ""] : [p.total ? "All caught up" : "Not started", ""], bar: p.total ? { done: p.done, total: p.total } : null, keys: showKeys(s) };
  };
  const filmItem = (f: ProfileTitle): Item => ({ key: f.key, t: f, lines: [f.year, "On the watch list"], bar: null, keys: filmKeys(f) });

  const groups: { id: string; title: string; items: Item[] }[] =
    view === "list"
      ? kind === "show"
        ? [
            { id: "up-next", title: "Up next", items: data.shows.upNext.map(showItem) },
            { id: "ready", title: "Ready to start", items: data.shows.readyToStart.map(showItem) },
            { id: "on-hold", title: "On hold", items: data.shows.onHold.map(showItem) },
            { id: "void", title: "Entering the void", items: data.shows.theVoid.map(showItem) },
          ]
        : [
            { id: "to-watch", title: "To watch", items: films(data.films.toWatch).map(filmItem) },
            { id: "on-hold", title: "On hold", items: films(data.films.onHold).map(filmItem) },
            { id: "void", title: "Entering the void", items: films(data.films.theVoid).map(filmItem) },
          ]
      : [
          { id: "today", title: "Today", from: 0, to: 0 },
          { id: "tomorrow", title: "Tomorrow", from: 1, to: 1 },
          { id: "week", title: "This week", from: 2, to: 7 },
          { id: "later", title: "Later", from: 8, to: Infinity },
        ].map((b) => ({
          id: b.id,
          title: b.title,
          items: ((kind === "show" ? data.shows.coming : data.films.coming) as (ComingShow | ComingFilm)[])
            .filter((c) => c.inDays >= b.from && c.inDays <= b.to)
            .map((c): Item =>
              "episode" in c
                ? { key: `${c.t.key}${c.episode}`, t: c.t, episode: c.episode, date: c.date, lines: [when(c), `${code(c.episode)}${c.name ? ` · ${c.name}` : ""}`], bar: null, keys: null }
                : { key: c.t.key, t: c.t, date: c.date, lines: [when(c), "Release"], bar: null, keys: null },
            ),
        }));
  const shown = groups.filter((g) => g.items.length > 0);
  const all = shown.flatMap((g) => g.items);
  const picked = all.find((i) => i.key === pickKey) ?? all[0] ?? null;

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-8">
      {/* The calendar first, under the carousel on the left. */}
      <TrackerCalendar events={data.calendar} keysFor={keysFor} />
      {/* One bento: the switches, then the list on the left and, beside it,
          the picked title's next episode, as a show page lays out its
          seasons and the small episode page. */}
      <div className="rounded-shell bg-card p-2 border-[0.5px] border-t-[color:var(--lit-edge)] border-x-piece border-b-well shadow-[0_4px_9px_rgba(0,0,0,.35)] grid grid-cols-[minmax(0,1fr)] gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Switch value={kind} onChange={setKind} options={[["show", "Shows"], ["movie", "Movies"]]} label="Shows or movies" />
          <Switch value={view} onChange={setView} options={[["list", "Watch list"], ["coming", "Coming soon"]]} label="Watch list or coming soon" />
        </div>

        {shown.length === 0 ? (
          <p className="m-0 rounded-shell bg-piece p-3 text-[12.5px] text-dim">
            {view === "list" ? (kind === "show" ? "No shows on the go. Add one from any show's page." : "No films waiting. Add one from any film's page.") : kind === "show" ? "Nothing announced yet from your shows." : "No film you're waiting on has a date yet."}
          </p>
        ) : (
          <div className="grid gap-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            {/* The list, as tall as the panel beside it, scrolling inside. */}
            <div className="relative max-lg:h-[520px] lg:min-h-[420px]">
              <div className="absolute inset-0 soft-scroll overflow-y-auto overscroll-contain pr-1 grid gap-2 content-start">
                {shown.map((g) => (
                  <section key={g.id} className="grid gap-2">
                    <div>
                      <HeadingPill small>{`${g.title} · ${g.items.length}`}</HeadingPill>
                    </div>
                    <ul className="m-0 p-0 list-none grid gap-2">
                      {g.items.map((i) => (
                        <Row key={i.key} t={i.t} lines={i.lines} bar={i.bar} keys={i.keys} onPick={() => setPickKey(i.key)} picked={picked?.key === i.key} />
                      ))}
                    </ul>
                  </section>
                ))}
              </div>
            </div>
            {picked && <EpisodePanel item={picked} keysFor={keysFor} />}
          </div>
        )}
      </div>
    </div>
  );
}

type Item = { key: string; t: ProfileTitle; show?: TrackerShow; episode?: string; date?: string; lines: [string, string]; bar: { done: number; total: number } | null; keys: Key[] | null };

// The picked title beside the list: for a series, its next episode (or the
// dated one under Coming soon) as the show page's small episode page has it,
// the still, the name, when it aired, how long it runs, its rating and what
// happens, with the Skip and Watched keys; for a film, its picture and year.
// The episode's details are fetched when first picked, a season at a time.
function EpisodePanel({ item, keysFor }: { item: Item; keysFor: (e: CalendarEvent) => Key[] | null }) {
  const [seasons, setSeasons] = useState<Record<string, SeasonEpisode[]>>({});
  const id = Number(item.t.key.slice(1));
  const [sn, en] = (item.episode ?? "").split("-").map(Number);
  const seasonKey = item.episode ? `${id}-${sn}` : null;
  useEffect(() => {
    if (!seasonKey || seasons[seasonKey]) return;
    let live = true;
    loadSeason(id, sn).then((eps) => live && setSeasons((m) => ({ ...m, [seasonKey]: eps })));
    return () => {
      live = false;
    };
  }, [seasonKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const ep = seasonKey ? seasons[seasonKey]?.find((e) => e.episode === en) ?? null : null;

  // The keys for this very episode (or film), without More and Recap, and
  // Watched the wide one.
  const keys = (keysFor({ date: ep?.airDate ?? item.date ?? "0000-00-00", t: item.t, label: "", episode: item.episode }) ?? [])
    .filter((k) => !k.label.startsWith("More") && k.label !== "Recap")
    .map((k, i, a) => (i === a.length - 1 ? { ...k, wide: true } : k));
  const isFilm = item.t.kind === "movie";
  const href = item.episode ? `/show/${id}/season/${sn}/episode/${en}` : item.t.href;
  const facts = [
    !isFilm && ["Show", <Link key="s" href={item.t.href} className="text-accent no-underline hover:underline">{item.t.title}</Link>],
    ep?.airDate && ["Aired", longDate(ep.airDate)],
    ep?.runtime && ["Runtime", `${ep.runtime}m`],
    ep?.vote && ["TMDB", ep.vote.toFixed(1)],
    isFilm && item.t.year && ["Year", item.t.year],
    isFilm && item.date && ["Release", longDate(item.date)],
  ].filter(Boolean) as [string, React.ReactNode][];

  return (
    <section className="lg:pl-2 grid grid-cols-[minmax(0,1fr)] gap-2 content-start min-w-0">
      <div>
        <HeadingPill small>{item.episode ? code(item.episode) : isFilm ? "Film" : item.t.title}</HeadingPill>
      </div>
      <div className="grid gap-2">
        {(ep?.still ?? item.t.backdrop) && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={(ep?.still ?? item.t.backdrop)!} alt="" className="w-full aspect-video object-cover rounded-[8px] bg-piece" />
        )}
        <div className="rounded-shell bg-piece p-3">
          <div className="display text-[22px] leading-none tracking-[.03em] uppercase">{ep?.name ?? item.t.title}</div>
          {facts.length > 0 && (
            <div className="mt-2.5 border-t border-hair">
              {facts.map(([label, value], i) => (
                <div key={label} className={`flex items-baseline justify-between gap-4 py-[8px] text-[12.5px] ${i < facts.length - 1 ? "border-b border-hair" : ""}`}>
                  <span className="text-dim">{label}</span>
                  <span className="text-right text-ink min-w-0 truncate">{value}</span>
                </div>
              ))}
            </div>
          )}
          {ep?.overview && (
            <div className="mt-[1px] pt-[9px] border-t border-hair">
              <ExpandableText text={ep.overview} />
            </div>
          )}
        </div>
        {keys.length > 0 && (
          <div className="flex gap-1.5">
            {keys.map((k) => (
              <KeyButton key={k.label} k={k} />
            ))}
          </div>
        )}
        <Link href={href} className="rounded-shell bg-piece p-3 flex items-center justify-between text-[12.5px] font-semibold text-ink no-underline hover:text-accent transition-colors">
          {item.episode ? "Open the episode's page" : isFilm ? "Open the film's page" : "Open the show's page"}
          <span aria-hidden className="text-accent">→</span>
        </Link>
      </div>
    </section>
  );
}

function longDate(d: string) {
  const [y, m, day] = d.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, day)).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}

/** A switch lettered as the tab bars: two choices on a pill. */
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

function when(c: { date: string; inDays: number }) {
  if (c.inDays === 0) return "Today";
  if (c.inDays === 1) return "Tomorrow";
  const [y, m, d] = c.date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", ...(c.inDays > 300 ? { year: "numeric" } : {}), timeZone: "UTC" });
}
