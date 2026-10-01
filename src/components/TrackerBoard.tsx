"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { markMovieWatched, setEpisodeSkipped, setEpisodeWatched } from "@/lib/library-actions";
import { loadSeason, type SeasonEpisode } from "@/lib/title-actions";
import { ExpandableText } from "./ExpandableText";
import { addWatch, today } from "@/lib/live-watches";
import type { CalendarEvent, ComingFilm, ComingShow, TrackerPage } from "@/lib/tracker";
import type { ProfileTitle, TrackerShow } from "@/lib/public-profile";
import { CheckGlyph, code, HOLD, KeyButton, MoreGlyph, progress, RecapGlyph, Row, SkipGlyph, type Key } from "./TrackerRow";
import { episodeBefore, TrackerMore, TrackerRecap } from "./TrackerSheets";
import { useDateFormat } from "./Day";
import { MASKED_NAME, SpoilerCover, useSpoilers } from "./Spoiler";

// The full tracker, as the app's Shows and Movies tabs: Shows or Movies, then
// the watch list or what's coming, each pile under its heading in the app's
// list-view rows on the left, and beside them the picked title's next
// episode. Checking off works on the page as it does on the profile's mini
// tracker: it moves the row on and lands in Recent activity for the visit,
// and saving it comes with accounts.
// `live`: the signed-in person's own library, so each key also saves to it
// (lib/library-actions.ts, the app's own rules); without it, the preview,
// where the keys only change the page. A save that fails is undone on the
// page and says why.
export function TrackerBoard({ data, live = false }: { data: TrackerPage; live?: boolean }) {
  const router = useRouter();
  const [problem, setProblem] = useState<string | null>(null);
  const persist = (save: () => Promise<{ error?: string }>, undo: () => void) => {
    if (!live) return;
    void save()
      .then((r) => {
        if (r.error) {
          undo();
          setProblem(r.error);
          setTimeout(() => setProblem(null), 4000);
        } else router.refresh();
      })
      .catch(() => {
        undo();
        setProblem("That didn't save. Try again.");
        setTimeout(() => setProblem(null), 4000);
      });
  };
  const idOf = (key: string) => Number(key.slice(1));
  const epOf = (k: string) => k.split("-").map(Number) as [number, number];
  const [kind, setKind] = useState<"show" | "movie">("show");
  const [view, setView] = useState<"list" | "coming">("list");
  const [seen, setSeen] = useState<Record<string, string[]>>({});
  const [skipped, setSkipped] = useState<string[]>([]);
  const [watchedFilms, setWatchedFilms] = useState<string[]>([]);
  // The entry shown beside the list; the first one until another is picked.
  const [pickKey, setPickKey] = useState<string | null>(null);
  const [groupId, setGroupId] = useState<string | null>(null);
  // The More or Recap sheet open over the page, if any.
  const [sheet, setSheet] = useState<{ kind: "more"; t: ProfileTitle } | { kind: "recap"; t: ProfileTitle; episode: string; watched: boolean } | null>(null);
  const more = (t: ProfileTitle): Key => ({ icon: <MoreGlyph />, label: `More for ${t.title}`, run: () => setSheet({ kind: "more", t }) });

  const seenOf = (s: TrackerShow) => [...s.seen, ...(seen[s.key] ?? [])];
  // Spoiler protection: every episode these lists name is one not yet
  // watched, so with the setting on its name reads "Hidden".
  const spoilers = useSpoilers();
  const fmt = useDateFormat();
  const epName = (n: string) => (spoilers.names && n ? MASKED_NAME : n);

  // The calendar's keys: an aired episode can be set aside or checked off,
  // a film out already checked off, each the same state as the rows below.
  const known = new Map([...data.shows.upNext, ...data.shows.readyToStart, ...data.shows.skipped, ...data.shows.onHold, ...data.shows.theVoid, ...data.shows.hidden].map((s) => [s.key, s]));
  const todayISO = today();
  const keysFor = (e: CalendarEvent): Key[] | null => {
    const out = e.date <= todayISO;
    if (e.episode) {
      const k = e.episode;
      const done = [...(known.get(e.t.key)?.seen ?? []), ...(seen[e.t.key] ?? [])].includes(k);
      const aside = skipped.includes(`${e.t.key}:${k}`);
      return [
        more(e.t),
        {
          icon: <SkipGlyph />,
          label: `Watch ${code(k)} of ${e.t.title} later`,
          on: aside,
          off: !out || done,
          confirm: aside ? undefined : HOLD,
          run: () => {
            const flip = () => setSkipped((x) => (x.includes(`${e.t.key}:${k}`) ? x.filter((y) => y !== `${e.t.key}:${k}`) : [...x, `${e.t.key}:${k}`]));
            flip();
            persist(() => setEpisodeSkipped(idOf(e.t.key), ...epOf(k), !aside), flip);
          },
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
            persist(() => setEpisodeWatched(idOf(e.t.key), ...epOf(k), true), () => setSeen((m) => ({ ...m, [e.t.key]: (m[e.t.key] ?? []).filter((x) => x !== k) })));
          },
        },
      ];
    }
    const done = watchedFilms.includes(e.t.key);
    return [
      more(e.t),
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
          persist(() => markMovieWatched(idOf(e.t.key)), () => setWatchedFilms((w) => w.filter((x) => x !== e.t.key)));
        },
      },
    ];
  };

  // The keys a series carries for its next episode, and a film on the list.
  const showKeys = (s: TrackerShow): Key[] => {
    const p = progress(s, seenOf(s));
    const skippedHere = p.next ? skipped.includes(`${s.key}:${p.next.key}`) : false;
    const before = p.next ? episodeBefore(s.aired, p.next.key) : null;
    return [
      more(s),
      // Recap only where there's an episode before the next one to recap;
      // otherwise no key at all, rather than a grey one.
      ...(before ? [{ icon: <RecapGlyph />, label: `Recap ${code(before)} of ${s.title}`, run: () => setSheet({ kind: "recap", t: s, episode: before, watched: seenOf(s).includes(before) }) }] : []),
      {
        icon: <SkipGlyph />,
        label: p.next ? `Watch ${code(p.next.key)} later` : "Skip",
        on: skippedHere,
        off: !p.next,
        confirm: skippedHere ? undefined : HOLD,
        run: p.next
          ? () => {
              const tag = `${s.key}:${p.next!.key}`;
              const flip = () => setSkipped((k) => (k.includes(tag) ? k.filter((x) => x !== tag) : [...k, tag]));
              flip();
              persist(() => setEpisodeSkipped(idOf(s.key), ...epOf(p.next!.key), !skippedHere), flip);
            }
          : undefined,
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
              persist(() => setEpisodeWatched(idOf(s.key), ...epOf(n.key), true), () => setSeen((m) => ({ ...m, [s.key]: (m[s.key] ?? []).filter((x) => x !== n.key) })));
            }
          : undefined,
      },
    ];
  };
  const filmKeys = (f: ProfileTitle): Key[] => [
    more(f),
    {
      icon: <CheckGlyph />,
      label: `Mark ${f.title} watched`,
      confirm: "var(--accent-fill)",
      run: () => {
        setWatchedFilms((w) => [...w, f.key]);
        addWatch({ key: `${f.key}-${Date.now()}`, date: today(), t: f });
        persist(() => markMovieWatched(idOf(f.key)), () => setWatchedFilms((w) => w.filter((x) => x !== f.key)));
      },
    },
  ];
  const films = (list: ProfileTitle[]) => list.filter((f) => !watchedFilms.includes(f.key));

  // Every entry the list can show, one type for all: a series (its next
  // episode), a film, or, under Coming soon, a dated episode or release.
  const showItem = (s: TrackerShow): Item => {
    const p = progress(s, seenOf(s));
    // A skipped episode's row is about that episode, not the next one.
    if (s.focus && !seenOf(s).includes(s.focus)) {
      return { key: `${s.key}:${s.focus}`, t: s, show: s, episode: s.focus, lines: [code(s.focus), epName(s.episodeNames?.[s.focus] ?? "Skipped")], bar: p.total ? { done: p.done, total: p.total } : null, keys: showKeys(s) };
    }
    // The panel always shows an episode, never the show's name again: the
    // next one, or the first if they haven't started, or the last aired if
    // they're caught up.
    const lastAired = (() => {
      const i = (s.aired ?? []).map((n, k) => (n > 0 ? k : -1)).filter((k) => k >= 0).pop();
      return i === undefined ? undefined : `${i + 1}-${s.aired![i]}`;
    })();
    const panelEpisode = p.next?.key ?? (p.total ? (p.done === 0 ? "1-1" : lastAired) : undefined);
    return { key: s.key, t: s, show: s, episode: p.next?.key, panelEpisode, lines: p.next ? [code(p.next.key), epName(s.episodeNames?.[p.next.key] ?? "")] : [p.total ? "All caught up" : "Not started", ""], bar: p.total ? { done: p.done, total: p.total } : null, keys: showKeys(s) };
  };
  const filmItem = (f: ProfileTitle): Item => ({ key: f.key, t: f, lines: [f.year, "On the watch list"], bar: null, keys: filmKeys(f) });

  const groups: { id: string; title: string; items: Item[] }[] =
    view === "list"
      ? kind === "show"
        ? [
            { id: "up-next", title: "Up next", items: data.shows.upNext.map(showItem) },
            { id: "ready", title: "Ready to start", items: data.shows.readyToStart.map(showItem) },
            { id: "skipped", title: "Skipped", items: data.shows.skipped.map(showItem) },
            { id: "on-hold", title: "On hold", items: data.shows.onHold.map(showItem) },
            { id: "void", title: "Entering the void", items: data.shows.theVoid.map(showItem) },
            { id: "hidden", title: "Hidden", items: data.shows.hidden.map(showItem) },
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
                ? { key: `${c.t.key}${c.episode}`, t: c.t, episode: c.episode, date: c.date, lines: [when(c, fmt), `${code(c.episode)}${c.name ? ` · ${epName(c.name)}` : ""}`], bar: null, keys: null }
                : { key: c.t.key, t: c.t, date: c.date, lines: [when(c, fmt), "Release"], bar: null, keys: null },
            ),
        }));
  // Every pile has its tab, empty or not, so the tabs never move; the one
  // shown first is the first with something in it.
  const shown = groups;
  const group = shown.find((g) => g.id === groupId) ?? shown.find((g) => g.items.length > 0) ?? shown[0] ?? null;
  const all = group?.items ?? [];
  const picked = all.find((i) => i.key === pickKey) ?? all[0] ?? null;

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4">
      {problem && (
        <div role="alert" className="fixed z-50 bottom-6 left-1/2 -translate-x-1/2 max-w-[90vw] rounded-full bg-card-hi border border-hair px-4 py-2 text-[12.5px] text-ink shadow-lg">
          {problem}
        </div>
      )}
      {sheet?.kind === "more" && <TrackerMore t={sheet.t} onClose={() => setSheet(null)} />}
      {sheet?.kind === "recap" && <TrackerRecap t={sheet.t} episode={sheet.episode} watched={sheet.watched} onClose={() => setSheet(null)} />}
      {/* One bento. Across the top, the two choices side by side from the
          left (Shows or Movies, Watch list or Coming soon); below, the piles
          over the list on the left and the picked title's episode beside it,
          as a show page lays out its seasons and the small episode page. */}
      <div className="rounded-shell bg-card p-2 border-[0.5px] border-t-[color:var(--lit-edge)] border-x-piece border-b-well shadow-[0_4px_9px_rgba(0,0,0,.35)] grid grid-cols-[minmax(0,1fr)] gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Switch value={kind} onChange={setKind} options={[["show", "Shows"], ["movie", "Movies"]]} label="Shows or movies" />
          <Switch value={view} onChange={setView} options={[["list", "Watch list"], ["coming", "Coming soon"]]} label="Watch list or coming soon" />
        </div>
        <div className="grid gap-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="flex flex-col gap-2 min-w-0">
            {/* The piles on one line over the list, as wide as it, so they
                read as one row of tabs; where even the smaller type won't fit,
                the line scrolls sideways rather than wrapping. */}
            <div role="tablist" aria-label="Piles" className="flex flex-nowrap gap-0.5 p-1 rounded-[18px] bg-piece max-w-full w-fit overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {shown.map((g) => {
                const on = g.id === group?.id;
                return (
                  <button
                    key={g.id}
                    type="button"
                    role="tab"
                    aria-selected={on}
                    onClick={() => setGroupId(g.id)}
                    className={`shrink-0 whitespace-nowrap inline-flex items-center px-2.5 py-2 rounded-full text-[9.5px] leading-none font-bold uppercase tracking-[.08em] cursor-pointer transition-colors ${on ? "bg-ink text-page" : "text-dim hover:text-ink"}`}
                  >
                    {g.title}
                  </button>
                );
              })}
            </div>
            {/* The list runs as tall as the episode panel beside it (at least
                five rows), scrolls inside, and fades out at the foot rather
                than cutting the last row off with a hard edge. */}
            <div className="relative h-[548px] lg:h-auto lg:min-h-[548px] lg:flex-1">
              <ul className="absolute inset-0 soft-scroll overflow-y-auto overscroll-contain pr-1 m-0 p-0 pb-6 list-none grid gap-2 content-start [mask-image:linear-gradient(to_bottom,black_calc(100%-28px),transparent)]">
                {all.length === 0 && (
                  <li className="rounded-shell bg-piece p-3 text-[12.5px] text-dim">
                    {view === "coming" ? "Nothing on these days from what you track." : "Nothing here right now."}
                  </li>
                )}
                {all.map((i) => (
                  <Row key={i.key} t={i.t} lines={i.lines} bar={i.bar} keys={i.keys} onPick={() => setPickKey(i.key)} picked={picked?.key === i.key} />
                ))}
              </ul>
            </div>
          </div>
          <div className="lg:pl-2 min-w-0">{picked && <EpisodePanel item={picked} keysFor={keysFor} />}</div>
        </div>
      </div>
    </div>
  );
}

type Item = { key: string; t: ProfileTitle; show?: TrackerShow; episode?: string; /** The episode the panel shows when there's no next one. */ panelEpisode?: string; date?: string; lines: [string, string]; bar: { done: number; total: number } | null; keys: Key[] | null };

// The picked title beside the list: for a series, its next episode (or the
// dated one under Coming soon) as the show page's small episode page has it,
// the still, the name, when it aired, how long it runs, its rating and what
// happens, with the Skip and Watched keys; for a film, its picture and year.
// The episode's details are fetched when first picked, a season at a time.
function EpisodePanel({ item: given, keysFor }: { item: Item; keysFor: (e: CalendarEvent) => Key[] | null }) {
  const item = given.episode || !given.panelEpisode ? given : { ...given, episode: given.panelEpisode };
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

  // The keys for this very episode (or film), without More.
  const keys = (keysFor({ date: ep?.airDate ?? item.date ?? "0000-00-00", t: item.t, label: "", episode: item.episode }) ?? [])
    .filter((k) => !k.label.startsWith("More"));
  const isFilm = item.t.kind === "movie";
  const spoilers = useSpoilers();
  const fmt = useDateFormat();
  // The panel's episode is one they haven't watched (the next, a skipped or
  // a coming one) unless the calendar's keys have just ticked it.
  const seenHere = keysFor({ date: "0000-00-00", t: item.t, label: "", episode: item.episode })?.some((k) => k.label.includes("watched") && k.on) ?? false;
  const href = item.episode ? `/show/${id}/season/${sn}/episode/${en}` : item.t.href;
  const facts = [
    !isFilm && ["Show", <Link key="s" href={item.t.href} className="text-accent no-underline hover:underline">{item.t.title}</Link>],
    ep?.airDate && ["Aired", fmt(ep.airDate)],
    ep?.runtime && ["Runtime", `${ep.runtime}m`],
    ep?.vote && ["TMDB", ep.vote.toFixed(1)],
    isFilm && item.t.year && ["Year", item.t.year],
    isFilm && item.date && ["Release", fmt(item.date)],
  ].filter(Boolean) as [string, React.ReactNode][];

  return (
    <section className="grid grid-cols-[minmax(0,1fr)] gap-2 content-start min-w-0">
      <div className="grid gap-2">
        {(ep?.still ?? item.t.backdrop) && (
          <div className="relative rounded-[8px] overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={(ep?.still ?? item.t.backdrop)!} alt="" className="block w-full aspect-video object-cover bg-piece" />
            {ep?.still && <SpoilerCover watched={seenHere} />}
          </div>
        )}
        <div className="rounded-shell bg-piece p-3">
          <div className="display text-[22px] leading-none tracking-[.03em] uppercase">{ep ? (spoilers.names && !seenHere ? MASKED_NAME : ep.name) : item.t.title}</div>
          {/* Under the name, which episode it is. */}
          {item.episode && <div className="mt-1.5 text-[12.5px] font-semibold tracking-[.06em] text-dim">{code(item.episode)}</div>}
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
              <ExpandableText text={ep.overview} watched={seenHere} />
            </div>
          )}
        </div>
        {keys.length > 0 && (
          <div className="flex justify-end gap-1.5">
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

function when(c: { date: string; inDays: number }, fmt: ReturnType<typeof useDateFormat>) {
  if (c.inDays === 0) return "Today";
  if (c.inDays === 1) return "Tomorrow";
  return fmt(c.date, c.inDays > 300 ? "short" : "weekday");
}
