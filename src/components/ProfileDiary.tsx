"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import type { DiaryEntry } from "@/lib/public-profile";
import { MarkRewatched } from "./marks";
import { RatingMarks } from "./RatingMarks";

const MONTHS_LONG = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

// The profile's Watchlog. A year at a time: twelve month cards across the
// top, two rows of six, each a wide picture with the month's numbers under
// it; then every watch in the selected month, one shell to an entry, with a
// switch to show only its films or its series. It opens on the current month.
//
// A month card's picture is picked automatically from what was watched that
// month. The owner can choose it instead, from that month's titles; until
// accounts exist the choice is kept in this browser.
//
// The columns of the list read in the order a watch is thought about: when,
// what (and the year it came out), how it was watched (which episodes, whether a rewatch), then what
// they thought (a review), with the hearts rating last. Series get the Episodes column,
// which a films-only log like Letterboxd's diary has no need for.
export function ProfileDiary({ entries, owner = false, username = "" }: { entries: DiaryEntry[]; owner?: boolean; username?: string }) {
  const now = new Date();
  const thisYear = String(now.getFullYear());
  const [kind, setKind] = useState<"all" | "movie" | "show">("all");
  const years = useMemo(() => [...new Set([thisYear, ...entries.map((e) => e.date.slice(0, 4))])].sort().reverse(), [entries, thisYear]);
  const [year, setYear] = useState(thisYear);
  const [month, setMonth] = useState(now.getMonth());
  const [pictures, setPictures] = useState<Record<string, string>>({});
  const [choosing, setChoosing] = useState<number | null>(null);
  const storeKey = `kodigo.watchlog-pictures.${username}`;

  useEffect(() => {
    if (!owner) return;
    try {
      // This browser's saved choices, read after mount: the server can't see them.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPictures(JSON.parse(localStorage.getItem(storeKey) ?? "{}"));
    } catch {}
  }, [owner, storeKey]);

  function choosePicture(m: number, entryKey: string | null) {
    const ym = `${year}-${String(m + 1).padStart(2, "0")}`;
    const next = { ...pictures };
    if (entryKey) next[ym] = entryKey;
    else delete next[ym];
    setPictures(next);
    try {
      localStorage.setItem(storeKey, JSON.stringify(next));
    } catch {}
    setChoosing(null);
  }

  // The month cards count everything; the switch by the list narrows only the
  // list to films or series.
  const inYear = entries.filter((e) => e.date.startsWith(year));
  const byMonth = Array.from({ length: 12 }, (_, m) => inYear.filter((e) => Number(e.date.slice(5, 7)) === m + 1));
  const rows = byMonth[month].filter((e) => kind === "all" || e.kind === kind);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <label className="inline-flex items-center gap-2 text-[12.5px] text-dim">
          Year
          <select value={year} onChange={(e) => setYear(e.target.value)} className="rounded-full bg-page border border-hair px-3 py-1 text-ink text-[12.5px] font-semibold cursor-pointer">
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </label>
        <span className="text-[12.5px] text-dim ml-auto">
          {inYear.length} {inYear.length === 1 ? "entry" : "entries"} in {year}
        </span>
      </div>

      {/* The twelve months. */}
      <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        {byMonth.map((list, m) => (
          <MonthCard
            key={m}
            month={m}
            list={list}
            selected={m === month}
            picture={pictureFor(list, pictures[`${year}-${String(m + 1).padStart(2, "0")}`])}
            onSelect={() => setMonth(m)}
            onChoose={owner && list.length > 0 ? () => setChoosing(m) : undefined}
          />
        ))}
      </div>

      {/* The selected month in full. */}
      <div className="mt-6">
        {/* The month's heading, its count and the switch share one shell. */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-[14px] bg-card-hi pl-4 pr-2 py-2">
          <h3 className="!text-[clamp(22px,2vw,28px)]">
            {MONTHS_LONG[month]} {year}
          </h3>
          <span className="text-[12.5px] text-dim">
            {rows.length} {rows.length === 1 ? "entry" : "entries"}
          </span>
          <div className="ml-auto inline-flex p-[3px] rounded-full bg-page border border-hair">
            {(
              [
                ["all", "All"],
                ["movie", "Films"],
                ["show", "Series"],
              ] as const
            ).map(([k, label]) => (
              <button
                key={k}
                type="button"
                aria-pressed={kind === k}
                onClick={() => setKind(k)}
                className={`px-3.5 py-1 rounded-full text-[12.5px] font-semibold cursor-pointer transition-colors ${kind === k ? "bg-ink text-page" : "text-dim hover:text-ink"}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        {rows.length === 0 ? <p className="text-sm text-dim m-0">{kind === "all" ? "Nothing logged this month." : `No ${kind === "movie" ? "films" : "series"} logged this month.`}</p> : <EntryTable rows={rows} />}
      </div>

      {choosing != null && (
        <PicturePicker
          month={`${MONTHS_LONG[choosing]} ${year}`}
          list={byMonth[choosing]}
          onChoose={(key) => choosePicture(choosing, key)}
          onClose={() => setChoosing(null)}
        />
      )}
    </div>
  );
}

// The month's picture: the owner's choice when there is one, or else the
// most recent entry with a backdrop.
function pictureFor(list: DiaryEntry[], chosenKey: string | undefined) {
  const chosen = chosenKey ? list.find((e) => e.key === chosenKey && e.backdrop) : undefined;
  return (chosen ?? list.find((e) => e.backdrop))?.backdrop ?? null;
}

function MonthCard({
  month,
  list,
  selected,
  picture,
  onSelect,
  onChoose,
}: {
  month: number;
  list: DiaryEntry[];
  selected: boolean;
  picture: string | null;
  onSelect: () => void;
  onChoose?: () => void;
}) {
  const films = list.filter((e) => e.kind === "movie").length;
  // Different series watched in the month, however many days or episodes.
  const series = new Set(list.filter((e) => e.kind === "show").map((e) => e.key)).size;
  const episodes = list.reduce((n, e) => n + (e.episodeCount ?? 0), 0);
  const empty = list.length === 0;
  return (
    <div className={`group relative ${empty && !selected ? "opacity-45" : ""}`}>
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={selected}
        aria-label={`${MONTHS_LONG[month]}: ${films} ${films === 1 ? "film" : "films"}, ${series} series, ${episodes} ${episodes === 1 ? "episode" : "episodes"}`}
        // The month and its numbers share one shell, a tile like the other
        // boxes on the profile; the selected month is ringed in the accent.
        className={`block w-full text-left rounded-[16px] bg-card-hi p-1.5 cursor-pointer transition-[box-shadow,background-color] hover:bg-page ${selected ? "ring-2 ring-accent-fill" : ""}`}
      >
        <span className="block aspect-video rounded-[11px] overflow-hidden bg-card border border-hair">
          {picture && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={picture} alt="" className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-500" />
          )}
        </span>
        <span className="block px-1 pt-1.5 pb-0.5">
          <span className={`block text-[11.5px] leading-[16px] font-bold uppercase tracking-[.1em] ${selected ? "text-accent" : "text-ink"}`}>{MONTHS_LONG[month]}</span>
          {/* The month's numbers, one to a line: the label on the left, the
              figure on the right, so a figure under the month's name can't be
              read as a date. Every card carries all three lines, zeros
              included, so the cards stay the same height. */}
          <span className="block mt-0.5 text-[10.5px] leading-[14px] text-dim">
            {(
              [
                ["Films", films],
                ["Series", series],
                ["Episodes", episodes],
              ] as const
            ).map(([label, n]) => (
              <span key={label} className="flex justify-between gap-2">
                <span>{label}</span>
                <b className={`font-semibold tabular-nums ${empty ? "text-dim" : "text-ink"}`}>{n}</b>
              </span>
            ))}
          </span>
        </span>
      </button>
      {onChoose && (
        <button
          type="button"
          onClick={onChoose}
          aria-label={`Choose the picture for ${MONTHS_LONG[month]}`}
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

// Choosing a month's picture from what was watched that month, or going back
// to the automatic one.
function PicturePicker({ month, list, onChoose, onClose }: { month: string; list: DiaryEntry[]; onChoose: (key: string | null) => void; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  const titles = list.filter((e, i) => e.backdrop && list.findIndex((x) => x.key === e.key) === i);
  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={`Picture for ${month}`} className="fixed inset-0 z-[100] bg-black/70 flex items-center justify-center p-4" onClick={onClose}>
      <div className="w-full max-w-[720px] max-h-[82vh] flex flex-col rounded-[24px] bg-card border border-hair shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="p-4 border-b border-hair flex items-center justify-between gap-3">
          <div className="display text-[24px] leading-none">Picture for {month}</div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => onChoose(null)} className="text-[12.5px] text-dim hover:text-ink cursor-pointer">
              Use automatic
            </button>
            <button type="button" onClick={onClose} aria-label="Close" className="w-9 h-9 rounded-full hover:bg-card-hi text-dim hover:text-ink text-xl cursor-pointer">
              ×
            </button>
          </div>
        </div>
        <div className="p-4 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 gap-3">
          {titles.map((t) => (
            <button key={t.key} type="button" onClick={() => onChoose(t.key)} className="text-left cursor-pointer group">
              <span className="block aspect-video rounded-[10px] overflow-hidden bg-card-hi border border-hair group-hover:border-accent transition-colors">
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

// The month's watches, each in its own shell: the table is set with space
// between its rows, and every cell from the day to the last mark is filled,
// with the ends rounded.
function EntryTable({ rows }: { rows: DiaryEntry[] }) {
  return (
    <table className="w-full table-fixed border-separate border-spacing-y-[6px] -mb-[6px] text-[14px]">
      {/* The column headings sit in a shell of their own, in the page tone,
          so they read as the table's heading bar rather than loose words.
          Fixed column widths with the same padding in every cell, so the
          gaps between columns are even and each heading sits squarely over
          what it heads; the title takes whatever is left. */}
      <thead>
        <tr className="text-[10.5px] font-bold uppercase tracking-[.12em] text-dim text-left">
          <th className={`${HEAD} rounded-l-[14px] py-2 pl-4 pr-3 font-bold w-[76px] text-left`}>Day</th>
          <th className={`${HEAD} py-2 px-4 font-bold`}>Title</th>
          <th className={`${HEAD} py-2 px-4 font-bold hidden md:table-cell w-[104px]`}>Released</th>
          <th className={`${HEAD} py-2 px-4 font-bold hidden md:table-cell w-[150px]`}>Episodes</th>
          <th className={`${HEAD} py-2 px-4 font-bold text-center w-[104px] hidden sm:table-cell`}>Rewatch</th>
          <th className={`${HEAD} py-2 px-4 font-bold text-center w-[100px] hidden sm:table-cell`}>Review</th>
          <th className={`${HEAD} rounded-r-[14px] py-2 px-4 font-bold w-[160px]`}>Rating</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((e) => (
          <tr key={`${e.key}${e.date}`} className="align-middle">
            <td className={`${SHELL} rounded-l-[14px] py-2 pl-4 pr-3 text-left`}>
              <span className="block display text-[26px] leading-none text-dim">{Number(e.date.slice(8, 10))}</span>
              <span className="block mt-0.5 text-[9.5px] leading-none font-bold uppercase tracking-[.1em] text-dim">{weekday(e.date)}</span>
            </td>
            <td className={`${SHELL} py-2 px-4`}>
              <Link href={e.href} className="flex items-center gap-3 no-underline text-ink hover:text-accent group">
                <span className="w-9 shrink-0">
                  {e.poster ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={e.poster} alt="" className="w-9 aspect-[2/3] rounded-[4px] object-cover" />
                  ) : (
                    <span className="block w-9 aspect-[2/3] rounded-[4px] bg-card" />
                  )}
                </span>
                <span className="min-w-0">
                  <span className="block truncate">
                    <span className="font-semibold">{e.title}</span>
                  </span>
                  {/* On a phone the Released and Episodes columns fold in under
                      the title. */}
                  {(e.year || e.episodes) && <span className="block md:hidden text-[12px] text-dim truncate">{[e.year, e.episodes].filter(Boolean).join(" · ")}</span>}
                </span>
              </Link>
            </td>
            <td className={`${SHELL} py-2 px-4 text-dim hidden md:table-cell tabular-nums`}>{e.year}</td>
            <td className={`${SHELL} py-2 px-4 text-dim hidden md:table-cell truncate`}>{e.episodes}</td>
            <td className={`${SHELL} py-2 px-4 text-center hidden sm:table-cell`}>
              {e.rewatch ? (
                <span className="inline-flex text-accent" title="Rewatch">
                  <MarkRewatched size={22} />
                  <span className="sr-only">Rewatch</span>
                </span>
              ) : null}
            </td>
            <td className={`${SHELL} py-2 px-4 text-center hidden sm:table-cell`}>
              {e.reviewed ? (
                <Link href={e.href} className="inline-flex text-accent" title="Has a review">
                  <ReviewGlyph />
                  <span className="sr-only">Read the review</span>
                </Link>
              ) : null}
            </td>
            <td className={`${SHELL} rounded-r-[14px] py-2 px-4`}>{e.rating != null ? <RatingMarks value={e.rating} /> : null}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// The fill of an entry's shell: the lighter card tone, on the section's card.
const SHELL = "bg-card-hi";
// The column headings' shell: the page tone, set apart from the entries.
const HEAD = "bg-page";


/** "Tue" for "2026-09-22": the day of the week the watch fell on. */
function weekday(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-GB", { weekday: "short", timeZone: "UTC" });
}

// The Review column's mark: a page with lines of writing on it, drawn to match
// the app's SF Symbol `text.document` (SF Symbols are licensed for Apple
// platforms only, so the web draws its own). Only there when they wrote one.
function ReviewGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="block">
      <rect x="4.5" y="2.5" width="15" height="19" rx="3" />
      <path d="M8.5 8h7M8.5 12h7M8.5 16h4.5" />
    </svg>
  );
}
