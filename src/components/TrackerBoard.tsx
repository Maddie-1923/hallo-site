"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
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
import { Menu } from "./Menu";
import { ScrollStrip } from "./PosterRow";
import { BackdropCard, PosterTile } from "./TrackerCards";
import { GENRES } from "@/lib/saved-rails";

// The full tracker, as the app's Shows and Movies tabs: a header pinned under
// the site's bar (Shows or Movies, the watch list or what's coming, the
// docked name of the pile being read, and the genre, filter and layout
// keys), then every pile in one run down the page, each under its heading,
// drawn as list rows, wide cards, a poster grid or a rail of posters. Beside
// the rows and the cards, the picked title's next episode. Checking off
// works on the page as it does on the profile's mini tracker: it moves the
// row on and lands in Recent activity for the visit.
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
  // Each page's layout, pile and genre (Shows or Movies, by Watch list or
  // Coming soon), as this browser last left them.
  const [prefs, setPrefs] = useState<Record<string, Prefs>>({});
  useEffect(() => {
    try {
      // Read after mount: the server can't see them.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPrefs(readPrefs(JSON.parse(localStorage.getItem(PREFS_KEY) ?? "{}")));
    } catch {}
  }, []);
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

  // The piles as they stand, before the header's filters: the watch list's
  // in the app's order, or Coming soon's Today, Tomorrow and then a run per
  // day after that.
  const coming = ((kind === "show" ? data.shows.coming : data.films.coming) as (ComingShow | ComingFilm)[]).map((c): Item & { inDays: number } =>
    "episode" in c
      ? { inDays: c.inDays, key: `${c.t.key}${c.episode}`, t: c.t, episode: c.episode, date: c.date, lines: [when(c, fmt), `${code(c.episode)}${c.name ? ` · ${epName(c.name)}` : ""}`], bar: null, keys: null }
      : { inDays: c.inDays, key: c.t.key, t: c.t, date: c.date, lines: [when(c, fmt), "Release"], bar: null, keys: null },
  );
  const piles: Group[] =
    view === "list"
      ? kind === "show"
        ? [
            { id: "up-next", title: "Up next", items: data.shows.upNext.map(showItem) },
            { id: "ready", title: "Ready to start", items: data.shows.readyToStart.map(showItem) },
            { id: "skipped", title: "Skipped", items: data.shows.skipped.map(showItem) },
            { id: "on-hold", title: "On hold", items: data.shows.onHold.map(showItem) },
            { id: "void", title: "Entering the void", items: data.shows.theVoid.map(showItem) },
            { id: "hidden", title: "Hidden from watchlist", items: data.shows.hidden.map(showItem) },
          ]
        : [
            { id: "ready", title: "Ready to start", items: films(data.films.toWatch).map(filmItem) },
            { id: "on-hold", title: "On hold", items: films(data.films.onHold).map(filmItem) },
            { id: "void", title: "Entering the void", items: films(data.films.theVoid).map(filmItem) },
          ]
      : [
          { id: "today", title: "Today", items: coming.filter((c) => c.inDays === 0) },
          { id: "tomorrow", title: "Tomorrow", items: coming.filter((c) => c.inDays === 1) },
          ...[...new Set(coming.filter((c) => c.inDays >= 2).map((c) => c.date!))].map((d) => ({ id: `on-${d}`, title: fmt(d, "weekday"), items: coming.filter((c) => c.inDays >= 2 && c.date === d) })),
        ];

  // The header's three keys, remembered for each of the four pages.
  const tab = `${kind}-${view}`;
  const pref = prefs[tab] ?? DEFAULT_PREFS;
  const choices = view === "coming" ? COMING_FILTER : kind === "show" ? SHOW_FILTER : FILM_FILTER;
  const pile = choices.find((c) => c.id === pref.pile) ?? choices[0];
  const genre = GENRES.find((g) => g.key === pref.genre) ?? null;
  const setPref = (patch: Partial<Prefs>) => {
    const next = { ...prefs, [tab]: { ...pref, ...patch } };
    setPrefs(next);
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify(next));
    } catch {}
  };

  // The pile filter first: All stacks every pile but Hidden (as the app's
  // All does, Hidden being the pile asked to stay out of the way), Coming
  // soon's "Coming soon" every day past tomorrow.
  const narrowed = piles.filter((g) =>
    pile.id === "all" ? g.id !== "hidden" : pile.id === "soon" ? g.id.startsWith("on-") : g.id === pile.id,
  );
  // Then the genre, across whatever the pile left. Its menu counts what
  // each genre would leave, so the counts are taken here, before it cuts.
  // A series is filed under TMDB's TV genres and a film under its movie
  // ones, which is why one name can stand for two ids; a title the library
  // holds no genres for matches none.
  const genreID = (g: (typeof GENRES)[number], t: ProfileTitle) => (t.kind === "show" ? g.tvID : g.movieID);
  const inGenre = (g: (typeof GENRES)[number], t: ProfileTitle) => {
    const id = genreID(g, t);
    return id !== null && (t.genres ?? []).includes(id);
  };
  const tallies = GENRES.map((g) => ({ g, count: narrowed.reduce((n, p) => n + p.items.filter((i) => inGenre(g, i.t)).length, 0) }))
    .filter((x) => x.count > 0)
    .sort((x, y) => x.g.label.localeCompare(y.g.label));
  const groups = narrowed.map((g) => (genre ? { ...g, items: g.items.filter((i) => inGenre(genre, i.t)) } : g)).filter((g) => g.items.length > 0);

  const layout = pref.layout;
  // The episode panel sits beside the list and the cards on a screen wide
  // enough for both; the grid and the rails take the whole width, and so
  // does a phone, where a row opens its title's page instead.
  const wide = useWide();
  const withPanel = wide && (layout === "list" || layout === "card");
  const flat = groups.flatMap((g) => g.items);
  const picked = flat.find((i) => i.key === pickKey) ?? flat[0] ?? null;

  // The docked pill names the pile being read: the last one whose heading
  // has gone up under the header, or the first, which has no heading of its
  // own because the pill is it.
  const root = useRef<HTMLDivElement>(null);
  const header = useRef<HTMLDivElement>(null);
  const [headerH, setHeaderH] = useState(120);
  // The site's bar, which the header pins under: measured, since its height
  // depends on the window (a fixed guess left a gap the titles showed in).
  const [navH, setNavH] = useState(81);
  useEffect(() => {
    const nav = document.querySelector("nav");
    if (!nav) return;
    const ro = new ResizeObserver(() => setNavH(nav.getBoundingClientRect().height));
    ro.observe(nav);
    return () => ro.disconnect();
  }, []);
  // The episode panel stays in view beside the list, just under the bar,
  // and shows the episode at the top of the list: once scrolling stops for
  // a moment (so the picture doesn't flicker through every row on the way),
  // the row nearest the bar's foot becomes the picked one and is eased into
  // line with the panel's top. Clicking a row
  // picks it and glides it up to that spot. Its first position is level
  // with the first title.
  const leftCol = useRef<HTMLDivElement>(null);
  const [firstTop, setFirstTop] = useState(0);
  useEffect(() => {
    const col = leftCol.current;
    if (!col) return;
    const place = () => {
      const row = col.querySelector("[data-row]");
      setFirstTop(row ? row.getBoundingClientRect().top - col.getBoundingClientRect().top : 0);
    };
    place();
    const ro = new ResizeObserver(place);
    ro.observe(col);
    return () => ro.disconnect();
  });
  useEffect(() => {
    if (!withPanel) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const settle = () => {
      const line = navH + headerH + 4;
      const rows = [...(leftCol.current?.querySelectorAll<HTMLElement>("[data-row]") ?? [])];
      if (!rows.length) return;
      // Above the list (the carousel still in view), leave the page alone.
      if (rows[0].getBoundingClientRect().top > line + 2) return;
      // A magnet: the row whose top is nearest the bar's foot is the one
      // shown, and the page eases it up (or down) so its top sits exactly
      // there, level with the panel, rather than half under the bar.
      const row = rows.reduce((a, b) => (Math.abs(b.getBoundingClientRect().top - line) < Math.abs(a.getBoundingClientRect().top - line) ? b : a));
      const key = row.dataset.row;
      if (key) setPickKey(key);
      const off = row.getBoundingClientRect().top - line;
      // Not past the page's foot, and not for the first row above the list's start.
      if (Math.abs(off) > 2 && window.scrollY + off >= 0) {
        const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        window.scrollTo({ top: window.scrollY + off, behavior: reduce ? "auto" : "smooth" });
      }
    };
    const onScroll = () => {
      clearTimeout(timer);
      timer = setTimeout(settle, 160);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      clearTimeout(timer);
      window.removeEventListener("scroll", onScroll);
    };
  }, [withPanel, navH, headerH]);
  // Picking a row by clicking: show it, and glide it up under the bar.
  const pickRow = (key: string) => {
    setPickKey(key);
    const row = leftCol.current?.querySelector<HTMLElement>(`[data-row="${CSS.escape(key)}"]`);
    if (!row) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: window.scrollY + row.getBoundingClientRect().top - (navH + headerH + 4), behavior: reduce ? "auto" : "smooth" });
  };
  const [activeID, setActiveID] = useState<string | null>(null);
  useEffect(() => {
    const el = header.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setHeaderH(el.offsetHeight));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const ids = groups.map((g) => g.id).join("|");
  useEffect(() => {
    let frame = 0;
    const measure = () => {
      frame = 0;
      const bottom = header.current?.getBoundingClientRect().bottom ?? 0;
      let current: string | null = null;
      for (const id of ids.split("|").slice(1)) {
        const el = root.current?.querySelector(`[data-pile-heading="${CSS.escape(id)}"]`);
        if (el && el.getBoundingClientRect().top <= bottom + 1) current = id;
      }
      setActiveID(current);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [ids, layout]);
  const active = groups.find((g) => g.id === activeID) ?? groups[0] ?? null;
  // Tapping the pill goes to the start of its pile: the first title, just
  // under the header (not the heading, which the pill already says), or the
  // top of the tracker for the first pile.
  const jump = () => {
    if (!active) return;
    const row = active === groups[0] ? null : root.current?.querySelector(`[data-pile-start="${CSS.escape(active.id)}"]`);
    const target = row ?? root.current;
    if (!target) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: window.scrollY + target.getBoundingClientRect().top - (row ? navH + headerH : navH), behavior: reduce ? "auto" : "smooth" });
  };

  // A coming entry's keys, for the layouts with no panel to carry them.
  const tileKeys = (i: Item) => i.keys ?? (i.date ? keysFor({ date: i.date, t: i.t, label: "", episode: i.episode }) : null);
  const body = (g: Group) => {
    if (layout === "rail") {
      return (
        <ScrollStrip key={`${g.id}-${g.items.length}`} title={g.title}>
          {g.items.map((i) => (
            <PosterTile key={i.key} as="div" t={i.t} lines={i.lines} bar={i.bar} keys={tileKeys(i)} className="shrink-0 snap-start w-[clamp(150px,13.5vw,196px)]" />
          ))}
        </ScrollStrip>
      );
    }
    if (layout === "grid") {
      return (
        <ul className="m-0 p-0 list-none grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 2xl:grid-cols-6">
          {g.items.map((i) => (
            <PosterTile key={i.key} t={i.t} lines={i.lines} bar={i.bar} keys={tileKeys(i)} />
          ))}
        </ul>
      );
    }
    return (
      <ul className="m-0 p-0 list-none grid gap-2">
        {g.items.map((i) =>
          layout === "card" ? (
            <BackdropCard key={i.key} rowKey={i.key} t={i.t} lines={i.lines} bar={i.bar} keys={withPanel ? i.keys : tileKeys(i)} onPick={withPanel ? () => pickRow(i.key) : undefined} picked={withPanel && picked?.key === i.key} />
          ) : (
            <Row key={i.key} rowKey={i.key} t={i.t} lines={i.lines} bar={i.bar} keys={withPanel ? i.keys : tileKeys(i)} onPick={withPanel ? () => pickRow(i.key) : undefined} picked={withPanel && picked?.key === i.key} />
          ),
        )}
      </ul>
    );
  };

  const pileName = pile.id === "all" ? null : pile.label;
  const clearGenre = () => setPref({ genre: null });
  const browse = kind === "show" ? { href: "/shows", label: "Browse more shows" } : { href: "/movies", label: "Browse more movies" };
  const empty =
    groups.length > 0 ? null : genre ? (
      <Empty title="Nothing in both" message={`Nothing in ${pile.label} is filed under ${genre.label}.`} action={<button type="button" onClick={clearGenre} className={ACTION}>Clear genre</button>} />
    ) : view === "coming" ? (
      <Empty title="Nothing coming up" message={kind === "show" ? pile.empty : (pile.filmEmpty ?? pile.empty)} action={<Link href={browse.href} className={ACTION}>{browse.label}</Link>} />
    ) : pile.id === "all" ? (
      <Empty
        title="That's a wrap"
        message={kind === "show" ? "You're caught up on everything you're tracking. New episodes land in Coming Soon." : "You're caught up on your watch list. Films still on the way wait in Coming Soon."}
        action={<Link href={browse.href} className={ACTION}>{browse.label}</Link>}
      />
    ) : (
      <Empty title="Nothing to watch" message={pile.empty} action={<Link href={browse.href} className={ACTION}>{browse.label}</Link>} />
    );

  return (
    <div ref={root}>
      {problem && (
        <div role="alert" className="fixed z-50 bottom-6 left-1/2 -translate-x-1/2 max-w-[90vw] rounded-full bg-card-hi border border-hair px-4 py-2 text-[12.5px] text-ink shadow-lg">
          {problem}
        </div>
      )}
      {sheet?.kind === "more" && <TrackerMore t={sheet.t} onClose={() => setSheet(null)} />}
      {sheet?.kind === "recap" && <TrackerRecap t={sheet.t} episode={sheet.episode} watched={sheet.watched} onClose={() => setSheet(null)} />}
      {/* The piles in one run down the page; beside them, in the list and
          card layouts, the picked title's episode, its top level with the
          first title's and pinned there as the list goes by. */}
      <div className={withPanel ? "grid gap-4 items-start grid-cols-[minmax(0,1fr)_minmax(0,1fr)]" : ""}>
        <div ref={leftCol} className="min-w-0">
        {/* The header, pinned under the site's bar as the app pins its own:
            the two choices side by side from the left, then the docked pile
            name and the three keys. The page's colour behind it, with a 12px
            gap above it once pinned, so titles scrolling up go under it rather
            than show through. Over the list only when the episode panel is
            beside it; across the page otherwise. */}
        <div ref={header} className="sticky z-20 pt-3 -mt-3 pb-3" style={{ top: navH }}>
          {/* Frosted glass behind the bar rather than a solid band: whatever
              scrolls up under it blurs, barely tinted, and the blur fades out
              below the bar instead of stopping on a hard line. */}
          <div
            aria-hidden
            className="pointer-events-none absolute -inset-x-4 top-0 -bottom-6 backdrop-blur-xl"
            style={{
              background: "color-mix(in srgb, var(--page) 30%, transparent)",
              // Solid glass along the top, right up to the site's bar, so
              // nothing shows through the gap there; feathered at the sides
              // and below the bar so it has no corners or hard edges.
              maskImage: "linear-gradient(to bottom, black, black 75%, transparent), linear-gradient(to right, transparent, black 20px, black calc(100% - 20px), transparent)",
              WebkitMaskImage: "linear-gradient(to bottom, black, black 75%, transparent), linear-gradient(to right, transparent, black 20px, black calc(100% - 20px), transparent)",
              maskComposite: "intersect",
              WebkitMaskComposite: "source-in",
            }}
          />
          <div className="relative rounded-shell p-2 border-[0.5px] border-t-[color:var(--lit-edge)] border-x-piece border-b-well shadow-[0_4px_9px_rgba(0,0,0,.25)] backdrop-blur-xl grid grid-cols-[minmax(0,1fr)] gap-2" style={{ background: "color-mix(in srgb, var(--card) 72%, transparent)" }}>
            <div className="flex flex-wrap items-center gap-2">
              <Switch value={kind} onChange={setKind} options={[["show", "Shows"], ["movie", "Movies"]]} label="Shows or movies" />
              <Switch value={view} onChange={setView} options={[["list", "Watch list"], ["coming", "Coming soon"]]} label="Watch list or coming soon" />
            </div>
            <div className="flex items-center gap-2">
              <div className="min-w-0 flex-1">
                {active && (
                  <button
                    type="button"
                    onClick={jump}
                    aria-label={`Go to the start of ${active.title.toUpperCase()}`}
                    className="group/pill inline-flex items-center h-11 max-w-full px-3.5 rounded-[10px] bg-piece overflow-hidden cursor-pointer"
                  >
                    {/* Keyed on the pile, so a new name slides up into place. */}
                    <span key={active.id} className="block truncate display text-[24px] leading-none tracking-[.02em] text-ink uppercase translate-y-[1px] group-hover/pill:text-accent transition-colors animate-[tracker-pill-in_250ms_ease-out]">
                      {active.title}
                    </span>
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Menu label={`Genre: ${genre?.label ?? "All genres"}`} width={240} button={<span className={headerKey(!!genre)}><ClapperGlyph /></span>}>
                  <div className="soft-scroll max-h-[360px] overflow-y-auto py-1.5">
                    <MenuHeading>Genre</MenuHeading>
                    <Choice on={!genre} onClick={clearGenre}>
                      All genres
                    </Choice>
                    {tallies.length === 0 && <div className="px-4 py-2 text-[12.5px] text-dim">No genres yet</div>}
                    {tallies.map(({ g, count }) => (
                      <Choice key={g.key} on={genre?.key === g.key} onClick={() => setPref({ genre: g.key })}>
                        {g.label} ({count})
                      </Choice>
                    ))}
                  </div>
                </Menu>
                <Menu label={`Filter: ${pile.label}`} width={240} button={<span className={headerKey(pile.id !== "all")}><TrayGlyph /></span>}>
                  <div className="py-1.5">
                    <MenuHeading>Filter</MenuHeading>
                    {choices.map((c) => (
                      <Choice key={c.id} on={c.id === pile.id} onClick={() => setPref({ pile: c.id })}>
                        {c.label}
                      </Choice>
                    ))}
                  </div>
                </Menu>
                <button
                  type="button"
                  onClick={() => setPref({ layout: LAYOUTS[(LAYOUTS.indexOf(layout) + 1) % LAYOUTS.length] })}
                  aria-label={`Layout: ${LAYOUT_LABEL[layout]}. Changes to the next layout`}
                  title={`${LAYOUT_LABEL[layout]} layout`}
                  className={`${headerKey(false)} cursor-pointer`}
                >
                  <LayoutGlyph layout={layout} />
                </button>
              </div>
            </div>
          </div>
        </div>
        {genre && (
          <div className="mb-3">
            <span className="inline-flex items-center gap-1.5 h-8 pl-3.5 pr-1 rounded-full bg-accent-fill text-on-accent text-[12.5px] font-semibold">
              {pileName ? `${pileName} · ${genre.label}` : genre.label}
              <button type="button" onClick={clearGenre} aria-label="Clear genre" className="w-6 h-6 rounded-full flex items-center justify-center cursor-pointer hover:bg-black/15">
                <span aria-hidden>✕</span>
              </button>
            </span>
          </div>
        )}
          <div>
          {empty}
          {groups.map((g, i) => (
            <section key={g.id} className={i > 0 ? "mt-8" : ""}>
              {i > 0 && (
                <div data-pile-heading={g.id} className="mb-3">
                  <h2 className="inline-flex items-center h-11 px-3.5 rounded-[10px] bg-piece !m-0">
                    <span className="display text-[24px] leading-none tracking-[.02em] text-ink uppercase translate-y-[1px]">{g.title}</span>
                  </h2>
                </div>
              )}
              <div data-pile-start={g.id}>{body(g)}</div>
            </section>
          ))}
          </div>
        </div>
        {withPanel && picked && (
          <aside className="sticky self-start min-w-0 lg:pl-2 overflow-y-auto soft-scroll" style={{ top: navH + headerH + 4, marginTop: firstTop, maxHeight: `calc(100vh - ${navH + headerH + 20}px)` }}>
            {/* In a shell of its own, like the rows beside it. */}
            <div className="rounded-shell bg-well p-2 border-[0.5px] border-t-[color:var(--lit-edge)] border-x-piece border-b-well shadow-[0_4px_9px_rgba(0,0,0,.55)]">
              <EpisodePanel item={picked} keysFor={keysFor} />
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}

type Group = { id: string; title: string; items: Item[] };
type Layout = "card" | "grid" | "rail" | "list";
type Prefs = { layout: Layout; pile: string; genre: string | null };

// The order the layout key goes round in, and what each is called.
const LAYOUTS: Layout[] = ["card", "grid", "rail", "list"];
const LAYOUT_LABEL: Record<Layout, string> = { card: "Card", grid: "Grid", rail: "Rails", list: "List" };
const DEFAULT_PREFS: Prefs = { layout: "list", pile: "all", genre: null };
/** Where this browser keeps each page's layout, pile and genre. */
const PREFS_KEY = "kodigo.tracker.views";

// The filter key's choices for each page, with the app's words for a pile
// that comes up empty.
type FilterChoice = { id: string; label: string; empty: string; filmEmpty?: string };
const SHOW_FILTER: FilterChoice[] = [
  { id: "all", label: "All shows", empty: "Nothing to show yet. Add something from Explore to start tracking it." },
  { id: "up-next", label: "Up next", empty: "You're up to date. Check Coming soon for what's next." },
  { id: "ready", label: "Ready to start", empty: "You've started everything you're tracking." },
  { id: "skipped", label: "Skipped", empty: "Nothing skipped. Use the Skip key on an episode to pass over it." },
  { id: "on-hold", label: "On hold", empty: "Nothing set aside. Put a show on hold from its page to come back to it." },
  { id: "hidden", label: "Hidden from watchlist", empty: "Nothing hidden. Choose Hide from watchlist on a show to keep it out of Up Next." },
  { id: "void", label: "Entering the void", empty: "Nothing here. Three months in. Nothing escapes, except by being watched." },
];
// The app's film list has no On hold; the web keeps films set to On Hold
// in a pile of their own, so it gets a choice too.
const FILM_FILTER: FilterChoice[] = [
  { id: "all", label: "All", empty: "Nothing here. Films you add from Explore land in this tab." },
  { id: "ready", label: "Ready to start", empty: "Nothing here. Films you haven't started land in this section." },
  { id: "on-hold", label: "On hold", empty: "Nothing set aside. Put a movie on hold from its page to come back to it." },
  { id: "void", label: "Entering the void", empty: "Nothing here. Three months on the list. Nothing escapes, except by being watched." },
];
const COMING_FILTER: FilterChoice[] = [
  { id: "all", label: "All upcoming", empty: "Nothing upcoming from your shows yet.", filmEmpty: "Nothing on the way from your films yet." },
  { id: "today", label: "Today", empty: "Nothing from your shows airs today.", filmEmpty: "No film you're tracking opens today." },
  { id: "tomorrow", label: "Tomorrow", empty: "Nothing from your shows airs tomorrow.", filmEmpty: "No film you're tracking opens tomorrow." },
  { id: "soon", label: "Coming soon", empty: "Nothing further out from your shows yet.", filmEmpty: "Nothing further out from your films yet." },
];

/** Saved views as this browser kept them, anything unknown dropped. */
function readPrefs(raw: unknown): Record<string, Prefs> {
  const out: Record<string, Prefs> = {};
  if (!raw || typeof raw !== "object") return out;
  for (const [tab, v] of Object.entries(raw as Record<string, Partial<Prefs>>)) {
    if (!v || typeof v !== "object") continue;
    out[tab] = {
      layout: LAYOUTS.includes(v.layout as Layout) ? (v.layout as Layout) : DEFAULT_PREFS.layout,
      pile: typeof v.pile === "string" ? v.pile : DEFAULT_PREFS.pile,
      genre: GENRES.some((g) => g.key === v.genre) ? (v.genre as string) : null,
    };
  }
  return out;
}

// Whether the screen is wide enough for the panel beside the list (the
// `lg` breakpoint). The server can't know, so it draws without it.
const WIDE = "(min-width: 1024px)";
function useWide() {
  return useSyncExternalStore(
    (on) => {
      const q = window.matchMedia(WIDE);
      q.addEventListener("change", on);
      return () => q.removeEventListener("change", on);
    },
    () => window.matchMedia(WIDE).matches,
    () => false,
  );
}

const ACTION = "inline-flex items-center h-10 px-5 rounded-full bg-accent-fill text-on-accent text-[12px] font-bold uppercase tracking-[.1em] no-underline cursor-pointer";

/** A page with nothing on it, as the app's empty states say it. */
function Empty({ title, message, action }: { title: string; message: string; action: React.ReactNode }) {
  return (
    <div className="rounded-shell bg-card px-6 py-10 flex flex-col items-center text-center gap-3">
      <div className="display text-[30px] leading-none tracking-[.03em] uppercase text-ink">{title}</div>
      <p className="m-0 max-w-[420px] text-[13.5px] leading-[1.5] text-dim">{message}</p>
      <div className="mt-1">{action}</div>
    </div>
  );
}

/** A header key: a square on the header's plate, outlined in the accent
    while it narrows the page. */
function headerKey(on: boolean) {
  return `inline-flex items-center justify-center w-11 h-11 rounded-[10px] bg-piece border transition-colors ${on ? "border-accent text-accent" : "border-transparent text-dim hover:text-ink"}`;
}

function MenuHeading({ children }: { children: React.ReactNode }) {
  return <div className="px-4 pt-1.5 pb-1 text-[10.5px] font-bold uppercase tracking-[.12em] text-dim">{children}</div>;
}

function Choice({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" data-menu-close onClick={onClick} aria-pressed={on} className={`w-full flex items-center justify-between gap-3 px-4 py-2 text-[12.5px] text-left cursor-pointer hover:bg-card-hi ${on ? "text-accent font-semibold" : "text-ink"}`}>
      {children}
      {on && <span aria-hidden>✓</span>}
    </button>
  );
}

// The header keys' glyphs, drawn after the SF Symbols the app's keys use
// (movieclapper, tray.2, and the layout's own), which are Apple's alone.
function ClapperGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" strokeLinecap="round" aria-hidden>
      <path d="M3.5 10h17v8.5A1.5 1.5 0 0 1 19 20H5a1.5 1.5 0 0 1-1.5-1.5z" />
      <path d="M3.3 9.6l-.5-2.3a1.4 1.4 0 0 1 1-1.7l13.6-3a1.4 1.4 0 0 1 1.7 1.1l.4 1.9z" />
      <path d="M7.6 4.9l2.2 3.4M12.5 3.8l2.2 3.4" />
    </svg>
  );
}
function TrayGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" strokeLinecap="round" aria-hidden>
      <path d="M4 4.5h16M3.5 9h17" />
      <path d="M3.5 13h4.5l1.2 2.2h5.6L16 13h4.5v5A1.5 1.5 0 0 1 19 19.5H5A1.5 1.5 0 0 1 3.5 18z" />
    </svg>
  );
}
function LayoutGlyph({ layout }: { layout: Layout }) {
  const p = { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinejoin: "round" as const, strokeLinecap: "round" as const, "aria-hidden": true };
  if (layout === "card")
    return (
      <svg {...p}>
        <rect x="3.5" y="4" width="17" height="11" rx="2" />
        <path d="M3.5 19.5h17" />
      </svg>
    );
  if (layout === "grid")
    return (
      <svg {...p}>
        <rect x="4" y="4" width="6.5" height="6.5" rx="1.5" />
        <rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5" />
        <rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5" />
        <rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.5" />
      </svg>
    );
  if (layout === "rail")
    return (
      <svg {...p}>
        <rect x="2.5" y="5" width="5" height="14" rx="1.3" />
        <rect x="9.5" y="5" width="5" height="14" rx="1.3" />
        <path d="M16.5 5h3.5a1.3 1.3 0 0 1 1.3 1.3v11.4A1.3 1.3 0 0 1 20 19h-3.5" />
      </svg>
    );
  return (
    <svg {...p}>
      <path d="M9 6.5h11M9 12h11M9 17.5h11" />
      <circle cx="4.75" cy="6.5" r=".6" fill="currentColor" />
      <circle cx="4.75" cy="12" r=".6" fill="currentColor" />
      <circle cx="4.75" cy="17.5" r=".6" fill="currentColor" />
    </svg>
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
