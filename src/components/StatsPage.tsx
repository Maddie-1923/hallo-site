"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { HeadingPill } from "./TitleParts";
import { MOODS } from "@/lib/moods";
import type { StatsInput } from "@/lib/stats-data";
import { useDateFormat } from "./Day";

// The Stats page (/stats): the app's stat pages on one screen. Totals and
// runs of days; Episodes, Shows and Movies, each with this week against last,
// this month, the weekday most is watched on, a chart of the week and a few
// facts; the last twelve months; and the app's Cinedata (taste): genres,
// ratings, moods, reactions. Days are counted in this browser's own time
// zone, and weeks start where the browser's locale starts them.
const SHELL = "rounded-shell bg-card p-2 border-[0.5px] border-t-[color:var(--lit-edge)] border-x-piece border-b-well shadow-[0_4px_9px_rgba(0,0,0,.35)]";
const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const dayKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

/** The weekday a week starts on here, 0 = Sunday (the locale's own). */
function weekStartDay(): number {
  try {
    const info = (new Intl.Locale(navigator.language) as Intl.Locale & { weekInfo?: { firstDay: number }; getWeekInfo?: () => { firstDay: number } });
    const first = info.getWeekInfo?.().firstDay ?? info.weekInfo?.firstDay;
    if (first) return first % 7;
  } catch {}
  return 0;
}

interface Log {
  /** How many on each local day. */
  byDay: Map<string, number>;
  thisWeek: number;
  lastWeek: number;
  thisMonth: number;
  week: { day: Date; count: number }[];
  todayIndex: number;
  /** The weekday carrying the most, if it's a habit (more than two). */
  topWeekday: number | null;
  busiest: { day: string; count: number } | null;
  first: string | null;
}

/** One log (episodes, series or films) counted by day, week and month. */
function count(days: string[], now: Date, startDay: number): Log {
  const byDay = new Map<string, number>();
  for (const d of days) byDay.set(d, (byDay.get(d) ?? 0) + 1);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = addDays(today, -((today.getDay() - startDay + 7) % 7));
  const week = Array.from({ length: 7 }, (_, i) => {
    const day = addDays(weekStart, i);
    return { day, count: byDay.get(dayKey(day)) ?? 0 };
  });
  const inRange = (from: Date, to: Date) => {
    const a = dayKey(from);
    const b = dayKey(to);
    let n = 0;
    for (const [d, c] of byDay) if (d >= a && d < b) n += c;
    return n;
  };
  const byWeekday = Array(7).fill(0);
  let busiest: Log["busiest"] = null;
  for (const [d, c] of byDay) {
    const [y, m, dd] = d.split("-").map(Number);
    byWeekday[new Date(y, m - 1, dd).getDay()] += c;
    if (!busiest || c > busiest.count || (c === busiest.count && d > busiest.day)) busiest = { day: d, count: c };
  }
  const best = byWeekday.reduce((b, c, i) => (c > byWeekday[b] ? i : b), 0);
  return {
    byDay,
    thisWeek: inRange(weekStart, addDays(weekStart, 7)),
    lastWeek: inRange(addDays(weekStart, -7), weekStart),
    thisMonth: inRange(new Date(today.getFullYear(), today.getMonth(), 1), new Date(today.getFullYear(), today.getMonth() + 1, 1)),
    week,
    todayIndex: week.findIndex((w) => dayKey(w.day) === dayKey(today)),
    topWeekday: byWeekday[best] > 2 ? best : null,
    busiest,
    first: byDay.size ? [...byDay.keys()].sort()[0] : null,
  };
}

/** Days in a row with anything watched: the run going now (today or ending
    yesterday) and the longest ever. */
function streaks(days: Set<string>, now: Date) {
  const sorted = [...days].sort();
  let longest = 0;
  let run = 0;
  let prev: string | null = null;
  for (const d of sorted) {
    const [y, m, dd] = d.split("-").map(Number);
    run = prev && dayKey(addDays(new Date(y, m - 1, dd), -1)) === prev ? run + 1 : 1;
    longest = Math.max(longest, run);
    prev = d;
  }
  let cursor = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (!days.has(dayKey(cursor))) cursor = addDays(cursor, -1);
  let current = 0;
  while (days.has(dayKey(cursor))) {
    current++;
    cursor = addDays(cursor, -1);
  }
  return { current, longest };
}

export function StatsPage({ input, watchTime, owner }: { input: StatsInput; watchTime: React.ReactNode; owner: string | null }) {
  const fmt = useDateFormat();
  const [tab, setTab] = useState<"episodes" | "shows" | "movies">("episodes");
  const [months, setMonths] = useState<"episodes" | "films">("episodes");

  const data = useMemo(() => {
    const now = new Date();
    const startDay = weekStartDay();
    const local = (iso: string) => dayKey(new Date(iso));
    const epDays = input.episodes.map(([iso]) => local(iso));
    // Series counted once a night however many episodes.
    const showNights = [...new Set(input.episodes.map(([iso, sid]) => `${local(iso)}|${sid}`))].map((x) => x.split("|")[0]);
    const filmDays = input.films.map(([iso]) => local(iso));
    const names = new Map(input.shows.map((s) => [s.id, s.name]));
    const top = [...input.shows].filter((s) => s.episodes > 0).sort((a, b) => b.episodes - a.episodes);
    // Twelve months, oldest first.
    const monthKeys = Array.from({ length: 12 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    });
    const perMonth = (days: string[]) => monthKeys.map((m) => ({ month: m, count: days.filter((d) => d.startsWith(m)).length }));
    return {
      episodes: count(epDays, now, startDay),
      shows: count(showNights, now, startDay),
      films: count(filmDays, now, startDay),
      runs: streaks(new Set([...epDays, ...filmDays]), now),
      top,
      topShow: top[0] ? { name: names.get(top[0].id) ?? top[0].name, count: top[0].episodes } : null,
      months: { episodes: perMonth(epDays), films: perMonth(filmDays) },
    };
  }, [input]);

  const finished = input.shows.filter((s) => s.status === "Finished").length;
  const watchedFilms = input.films.length + input.undatedFilms;
  const totalEpisodes = input.episodes.length + input.undatedEpisodes;
  const day = (d: string) => fmt(d, "long");

  const log = tab === "episodes" ? data.episodes : tab === "shows" ? data.shows : data.films;
  const noun = tab === "episodes" ? "episodes" : tab === "shows" ? "series" : "films";
  const facts: [string, string][] = [];
  if (log.busiest) facts.push(["Biggest night", `${log.busiest.count} ${log.busiest.count === 1 ? noun.replace(/s$/, "") : noun} on ${day(log.busiest.day)}`]);
  if (tab === "shows" && data.topShow) facts.push(["Most watched", `${data.topShow.name}, ${data.topShow.count} episodes`]);
  if (tab === "shows") facts.push(["Finished", `${finished} series`]);
  if (log.first) facts.push(["Watching since", fmt(log.first, "month")]);

  const rated = input.rated;
  const avg = rated.length ? rated.reduce((n, r) => n + r.rating, 0) / rated.length : null;
  const buckets = Array.from({ length: 10 }, (_, i) => rated.filter((r) => Math.ceil(r.rating) === i + 1).length);
  const genresTop = input.genres.slice(0, 8);
  const moodList = MOODS.map((m) => ({ ...m, count: input.moods[m.id] ?? 0 })).filter((m) => m.count > 0).sort((a, b) => b.count - a.count);

  return (
    <div className="max-w-[91.6667rem] mx-auto grid grid-cols-[minmax(0,1fr)] gap-8">
      {/* The totals. */}
      <div className={SHELL}>
        <div className="grid gap-2">
          <div className="rounded-shell bg-piece p-3 flex flex-wrap items-end justify-between gap-2">
            <div>
              <h1 className="!text-[clamp(36px,5vw,60px)] !leading-[.9] tracking-[.02em] uppercase">Your stats</h1>
              <p className="m-0 mt-2 text-[1.0417rem] leading-[1.6] text-mid-tone">Everything you&apos;ve watched, counted. Days follow this device&apos;s time zone.</p>
            </div>
            {owner && (
              <Link href={`/u/${owner}/year/${new Date().getFullYear()}`} className="text-[1.0417rem] font-semibold text-accent no-underline hover:underline">
                Your year in review →
              </Link>
            )}
          </div>
          <div className="grid gap-2 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
            <Tile value={totalEpisodes.toLocaleString("en")} label="Episodes" />
            <Tile value={input.shows.length.toLocaleString("en")} label="Series" />
            <Tile value={watchedFilms.toLocaleString("en")} label="Films" />
            <div className="rounded-shell bg-piece p-3 min-w-0">{watchTime}</div>
            <Tile value={String(data.runs.current)} label="Days in a row" note={data.runs.current ? "Going now" : "Watch something today to start one"} />
            <Tile value={String(data.runs.longest)} label="Longest run" note="Days in a row" />
          </div>
        </div>
      </div>

      {/* Episodes, Shows, Movies. */}
      <section className="grid grid-cols-[minmax(0,1fr)] gap-2">
        <div>
          <Switch
            value={tab}
            onChange={setTab}
            options={[
              ["episodes", "Episodes"],
              ["shows", "Shows"],
              ["movies", "Movies"],
            ]}
            label="Which stats"
          />
        </div>
        <div className={SHELL}>
          <div className="grid gap-2 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
            <div className="grid gap-2 content-start">
              <div className="grid gap-2 grid-cols-2 sm:grid-cols-3">
                <Tile value={String(log.thisWeek)} label="This week" note={delta(log.thisWeek, log.lastWeek)} />
                <Tile value={String(log.thisMonth)} label="This month" />
                <Tile value={log.topWeekday == null ? "—" : WEEKDAYS[log.topWeekday]} label={tab === "movies" ? "Film night" : "Your night"} note={log.topWeekday == null ? "Not a habit yet" : "The day you watch most"} small />
              </div>
              <WeekChart week={log.week} todayIndex={log.todayIndex} unit={tab === "episodes" ? "Episodes a night" : tab === "shows" ? "Series a night" : "Films a night"} />
            </div>
            <div className="rounded-shell bg-piece p-3">
              <ul className="m-0 p-0 list-none divide-y divide-hair">
                {facts.map(([k, v]) => (
                  <li key={k} className="flex items-baseline justify-between gap-4 py-2 text-[1.0417rem]">
                    <span className="text-dim">{k}</span>
                    <span className="text-ink text-right">{v}</span>
                  </li>
                ))}
                {facts.length === 0 && <li className="py-2 text-[1.0417rem] text-dim">Nothing dated yet.</li>}
              </ul>
              {(tab === "movies" ? input.undatedFilms : input.undatedEpisodes) > 0 && (
                <p className="m-0 mt-2 text-[1rem] leading-[1.5] text-dim">
                  {(tab === "movies" ? input.undatedFilms : input.undatedEpisodes).toLocaleString("en")} {tab === "movies" ? "films were" : "episodes were"} marked watched without a date, from before Kodigo recorded when or from an import. They count in the totals, just not on any night.
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* The year. */}
      <section className="grid grid-cols-[minmax(0,1fr)] gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <HeadingPill small>Every month</HeadingPill>
          <Switch
            value={months}
            onChange={setMonths}
            options={[
              ["episodes", "Episodes"],
              ["films", "Films"],
            ]}
            label="Episodes or films each month"
          />
        </div>
        <div className={SHELL}>
          <div className="rounded-shell bg-piece p-3">
            <Bars
              bars={data.months[months].map((m) => {
                const [y, mo] = m.month.split("-").map(Number);
                return { label: new Date(y, mo - 1, 1).toLocaleDateString("en-GB", { month: "short" }), tip: `${new Date(y, mo - 1, 1).toLocaleDateString("en-GB", { month: "long", year: "numeric" })}: ${m.count} ${months}`, value: m.count };
              })}
              height={140}
            />
          </div>
        </div>
      </section>

      {/* Taste. */}
      <section className="grid grid-cols-[minmax(0,1fr)] gap-2">
        <div>
          <HeadingPill small>Taste</HeadingPill>
        </div>
        <div className={SHELL}>
          <div className="grid gap-2">
            <div className="grid gap-2 grid-cols-3">
              <Tile value={input.genres[0]?.name ?? "—"} label="Top genre" small />
              <Tile value={avg == null ? "—" : `★ ${avg.toFixed(1)}`} label="Average rating" />
              <Tile value={rated.length.toLocaleString("en")} label="Rated" />
            </div>
            <div className="grid gap-2 md:grid-cols-2">
              <Panel title="Genres">
                {genresTop.length ? (
                  <ul className="m-0 p-0 list-none grid gap-2">
                    {genresTop.map((g) => (
                      <li key={g.name} className="grid grid-cols-[minmax(0,9rem)_minmax(0,1fr)_2.5rem] items-center gap-2 text-[1.0417rem]" title={`${g.name}: ${g.count}`}>
                        <span className="truncate text-ink">{g.name}</span>
                        <span className="h-[0.5rem] rounded-full bg-card overflow-hidden">
                          <span className="block h-full rounded-full bg-accent-fill" style={{ width: `${(g.count / genresTop[0].count) * 100}%` }} />
                        </span>
                        <span className="text-right text-dim tabular-nums">{g.count}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <Empty>Track something and its genres show here.</Empty>
                )}
              </Panel>
              <Panel title="Ratings">
                {rated.length ? <Bars bars={buckets.map((n, i) => ({ label: `${i + 1}`, tip: `★ ${i + 1}: ${n} rated`, value: n }))} height={120} /> : <Empty>Rate something and your spread shows here.</Empty>}
              </Panel>
            </div>
            <Panel title="Highest rated">
              {rated.length ? (
                <ol className="m-0 p-0 list-none grid gap-2 grid-cols-3 sm:grid-cols-5 lg:grid-cols-10">
                  {rated.slice(0, 10).map((r) => (
                    <li key={r.key} className="min-w-0">
                      <Link href={r.href} className="group block no-underline text-ink">
                        <span className="block aspect-[2/3] rounded-[8px] overflow-hidden bg-card border border-hair group-hover:border-accent transition-colors">
                          {r.poster && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={r.poster} alt="" className="w-full h-full object-cover" loading="lazy" />
                          )}
                        </span>
                        <span className="block mt-1 text-[1rem] truncate group-hover:text-accent">{r.title}</span>
                        <span className="block text-[1rem] text-dim">★ {r.rating}</span>
                      </Link>
                    </li>
                  ))}
                </ol>
              ) : (
                <Empty>Nothing rated yet.</Empty>
              )}
            </Panel>
            <div className="grid gap-2 md:grid-cols-2">
              <Panel title="Moods">
                {moodList.length ? (
                  <ul className="m-0 p-0 list-none flex flex-wrap gap-1.5">
                    {moodList.map((m) => (
                      <li key={m.id} className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full bg-card text-[1.0417rem] text-ink">
                        <span aria-hidden>{m.emoji}</span>
                        {m.label}
                        <span className="text-dim tabular-nums">{m.count}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <Empty>Pick a mood for something you watched and it counts here.</Empty>
                )}
              </Panel>
              <Panel title="Reactions">
                <div className="grid grid-cols-3 gap-2">
                  <Tile value={String(input.reactions.loved)} label="Loved" inset />
                  <Tile value={String(input.reactions.liked)} label="Liked" inset />
                  <Tile value={String(input.reactions.notForMe)} label="Not for me" inset />
                </div>
              </Panel>
            </div>
          </div>
        </div>
      </section>

      {/* The series watched most. */}
      {data.top.length > 0 && (
        <section className="grid grid-cols-[minmax(0,1fr)] gap-2">
          <div>
            <HeadingPill small>Most watched series</HeadingPill>
          </div>
          <div className={SHELL}>
            <ol className="m-0 p-0 list-none rounded-shell bg-piece divide-y divide-hair">
              {data.top.slice(0, 10).map((s, i) => (
                <li key={s.id}>
                  <Link href={s.href} className="group flex items-center gap-3 px-3 py-2 no-underline text-ink">
                    <span className="w-5 text-[1.0417rem] text-dim tabular-nums text-right">{i + 1}</span>
                    <span className="w-8 shrink-0 aspect-[2/3] rounded-[5px] overflow-hidden bg-card border border-hair">
                      {s.poster && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={s.poster} alt="" className="w-full h-full object-cover" loading="lazy" />
                      )}
                    </span>
                    <span className="flex-1 min-w-0 text-[1.0417rem] font-semibold truncate group-hover:text-accent">{s.name}</span>
                    <span className="text-[1.0417rem] text-dim tabular-nums">{s.episodes} episodes</span>
                  </Link>
                </li>
              ))}
            </ol>
          </div>
        </section>
      )}
    </div>
  );
}

/** "3 more than last week", said only when there's a last week to compare. */
function delta(now: number, before: number) {
  if (!now && !before) return undefined;
  if (now === before) return "Same as last week";
  return now > before ? `${now - before} more than last week` : `${before - now} fewer than last week`;
}

export function Tile({ value, label, note, small = false, inset = false }: { value: string; label: string; note?: string; small?: boolean; inset?: boolean }) {
  return (
    <div className={`rounded-shell ${inset ? "bg-card" : "bg-piece"} p-3 min-w-0`}>
      <div className={`display leading-none text-accent truncate ${small ? "text-[clamp(22px,2.4vw,28px)]" : "text-[clamp(30px,3.4vw,40px)]"}`}>{value}</div>
      <div className="mt-1 text-[0.875rem] font-bold uppercase tracking-[.12em] text-dim">{label}</div>
      {note && <div className="mt-0.5 text-[1rem] text-dim truncate">{note}</div>}
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-shell bg-piece p-3 min-w-0">
      <div className="text-[0.875rem] font-bold uppercase tracking-[.12em] text-dim mb-2">{title}</div>
      {children}
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="m-0 text-[1.0417rem] text-dim">{children}</p>;
}

/** The week, a bar a day, today marked under its bar. */
function WeekChart({ week, todayIndex, unit }: { week: { day: Date; count: number }[]; todayIndex: number; unit: string }) {
  return (
    <div className="rounded-shell bg-piece p-3">
      <div className="text-[0.875rem] font-bold uppercase tracking-[.12em] text-dim mb-2">{unit} · this week</div>
      <Bars
        bars={week.map((w, i) => ({
          label: w.day.toLocaleDateString("en-GB", { weekday: "short" }) + (i === todayIndex ? " •" : ""),
          tip: `${w.day.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}: ${w.count}`,
          value: w.count,
          strong: i === todayIndex,
        }))}
        height={110}
      />
    </div>
  );
}

/** Thin bars on one baseline, one hue, each with its figure on hover (and
    in its title, for touch and screen readers), labels under. */
function Bars({ bars, height }: { bars: { label: string; tip: string; value: number; strong?: boolean }[]; height: number }) {
  const most = Math.max(1, ...bars.map((b) => b.value));
  return (
    <div role="img" aria-label={bars.map((b) => b.tip).join("; ")}>
      <div className="flex items-end gap-[0.5rem] border-b border-hair" style={{ height }}>
        {bars.map((b, i) => (
          <div key={i} title={b.tip} className="group relative flex-1 h-full flex items-end justify-center">
            <div className={`w-full max-w-[2.3333rem] rounded-t-[4px] bg-accent-fill transition-opacity ${b.value ? "" : "opacity-20"} group-hover:opacity-80`} style={{ height: `${b.value ? Math.max(4, (b.value / most) * 100) : 3}%` }} />
            {/* Only there while hovered (so it can't widen the page), and
                opening inwards from the bars at either end. */}
            <span
              aria-hidden
              className={`pointer-events-none absolute bottom-full mb-1 hidden group-hover:block whitespace-nowrap rounded-full bg-card-hi border border-hair px-2 py-0.5 text-[0.9583rem] text-ink z-10 ${
                i < 2 ? "left-0" : i >= bars.length - 2 ? "right-0" : "left-1/2 -translate-x-1/2"
              }`}
            >
              {b.tip}
            </span>
          </div>
        ))}
      </div>
      <div className="flex gap-[0.5rem] mt-1">
        {bars.map((b, i) => (
          <span key={i} className={`flex-1 text-center text-[0.9167rem] truncate ${b.strong ? "text-ink font-semibold" : "text-dim"}`}>
            {b.label}
          </span>
        ))}
      </div>
    </div>
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
          className={`px-4 py-2 rounded-full text-[0.875rem] leading-none font-bold uppercase tracking-[.12em] cursor-pointer transition-colors ${value === v ? "bg-ink text-page" : "text-dim hover:text-ink"}`}
        >
          {text}
        </button>
      ))}
    </div>
  );
}
