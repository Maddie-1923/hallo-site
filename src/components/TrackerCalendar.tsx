"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { CalendarEvent } from "@/lib/tracker";
import type { Key } from "./TrackerRow";

// The tracker's calendar: Today, the month by name with arrows either side
// and the year, and the month's days, a dot under each day with something
// on it, today filled in the accent. Only the month's own days are drawn.
// It sits beside the tracker, which lists what's coming.
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const FULL = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
/** The years offered: back to when anyone might have started, and a few ahead. */
const YEARS = (now: number) => Array.from({ length: now + 5 - 1990 + 1 }, (_, i) => 1990 + i);
const WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const iso = (y: number, m: number, d: number) => `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

export function TrackerCalendar({ events }: { events: CalendarEvent[]; keysFor?: (e: CalendarEvent) => Key[] | null; watched?: (e: CalendarEvent) => boolean }) {
  const now = new Date();
  const today = iso(now.getFullYear(), now.getMonth(), now.getDate());
  // The month shown, as its first day, so stepping crosses years by itself.
  const [shown, setShown] = useState(() => new Date(now.getFullYear(), now.getMonth(), 1));
  const year = shown.getFullYear();
  const month = shown.getMonth();
  const setYear = (f: (y: number) => number) => setShown((d) => new Date(f(d.getFullYear()), d.getMonth(), 1));
  const setMonth = (m: number) => setShown((d) => new Date(d.getFullYear(), m, 1));
  const [menu, setMenu] = useState<"month" | "year" | null>(null);
  // The year list opens scrolled to the year shown.
  const yearsRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (menu !== "year") return;
    const box = yearsRef.current;
    const row = box?.querySelector<HTMLElement>(`[data-year="${year}"]`);
    if (box && row) box.scrollTop = row.offsetTop - box.clientHeight / 2 + row.offsetHeight / 2;
  }, [menu]); // eslint-disable-line react-hooks/exhaustive-deps
  const step = (n: number) => setShown((d) => new Date(d.getFullYear(), d.getMonth() + n, 1));

  const byDay = useMemo(() => {
    const m = new Map<string, CalendarEvent[]>();
    for (const e of events) m.set(e.date, [...(m.get(e.date) ?? []), e]);
    return m;
  }, [events]);

  const days = new Date(year, month + 1, 0).getDate();
  const lead = new Date(year, month, 1).getDay();

  return (
    // The month on its own, beside the tracker: a dot under each day
    // something you track airs or opens.
    <div className="w-full max-w-[440px] lg:w-[320px] shrink-0 rounded-shell bg-card p-2 border-[0.5px] border-t-[color:var(--lit-edge)] border-x-piece border-b-well shadow-[0_4px_9px_rgba(0,0,0,.35)]">

      {/* The month. */}
      <div className="rounded-shell bg-piece p-3 min-w-0">
        {/* Today on the left, back to today's date; the month by its full
            name in the middle, in a box as wide as the longest (September)
            so its arrows never move, and pressing it opens the twelve; the
            year on the right, pressing it opens a list of years. */}
        <div className="relative grid grid-cols-[1fr_auto_1fr] items-center gap-2 border-b border-hair pb-1.5">
          <button
            type="button"
            onClick={() => {
              setShown(new Date(now.getFullYear(), now.getMonth(), 1));
            }}
            className="justify-self-start text-[12.5px] font-semibold text-accent cursor-pointer hover:underline"
          >
            Today
          </button>
          <div className="flex items-center gap-0.5">
            <Arrow label="Month before" d="M15 6l-6 6 6 6" onClick={() => step(-1)} />
            <button
              type="button"
              onClick={() => {
                setMenu((m) => (m === "month" ? null : "month"));
              }}
              aria-expanded={menu === "month"}
              className="w-[76px] text-center text-[12.5px] font-semibold text-ink cursor-pointer hover:text-accent transition-colors"
            >
              {FULL[month]}
            </button>
            <Arrow label="Month after" d="M9 6l6 6-6 6" onClick={() => step(1)} />
          </div>
          <button
            type="button"
            onClick={() => setMenu((m) => (m === "year" ? null : "year"))}
            aria-expanded={menu === "year"}
            className="justify-self-end text-[12.5px] font-semibold text-ink tabular-nums cursor-pointer hover:text-accent transition-colors"
          >
            {year}
          </button>
          {menu === "month" && (
            <div role="dialog" aria-label="Choose a month" className="absolute z-20 left-1/2 -translate-x-1/2 top-[calc(100%+6px)] w-[204px] rounded-shell bg-card border border-hair shadow-[0_20px_50px_rgba(0,0,0,.6)] p-2 grid grid-cols-3 gap-1">
              {MONTHS.map((m, i) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => {
                    setMonth(i);
                    setMenu(null);
                  }}
                  aria-pressed={i === month}
                  className={`h-8 rounded-[8px] text-[12.5px] cursor-pointer ${i === month ? "bg-accent-fill text-on-accent font-semibold" : "text-ink hover:bg-piece"}`}
                >
                  {m}
                </button>
              ))}
            </div>
          )}
          {menu === "year" && (
            <div role="dialog" aria-label="Choose a year" className="absolute z-20 right-0 top-[calc(100%+6px)] w-[96px] rounded-shell bg-card border border-hair shadow-[0_20px_50px_rgba(0,0,0,.6)] p-1">
              <div ref={yearsRef} className="relative soft-scroll max-h-[208px] overflow-y-auto grid gap-0.5">
                {YEARS(now.getFullYear()).map((y) => (
                  <button
                    key={y}
                    type="button"
                    data-year={y}
                    onClick={() => {
                      setYear(() => y);
                      setMenu(null);
                    }}
                    aria-pressed={y === year}
                    className={`h-8 shrink-0 rounded-[8px] text-[12.5px] tabular-nums cursor-pointer ${y === year ? "bg-accent-fill text-on-accent font-semibold" : "text-ink hover:bg-piece"}`}
                  >
                    {y}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="mt-1.5 grid grid-cols-7 text-center">
          {WEEK.map((w) => (
            // Three letters fit the narrower month at this size.
            <span key={w} className="text-[10.5px] font-bold uppercase tracking-[.08em] text-dim py-1">
              {w}
            </span>
          ))}
          {Array.from({ length: lead }, (_, i) => (
            <span key={`b${i}`} />
          ))}
          {Array.from({ length: days }, (_, i) => {
            const d = iso(year, month, i + 1);
            const has = byDay.has(d);
            const isToday = d === today;
            const n = byDay.get(d)?.length ?? 0;
            return (
              <div key={d} title={n ? `${n} on this day` : undefined} aria-label={`${d}${n ? `, ${n} on` : ""}`} className="relative h-7 flex items-center justify-center">
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[12.5px] tabular-nums ${isToday ? "bg-accent-fill text-on-accent font-bold" : "text-ink"}`}>
                  {String(i + 1).padStart(2, "0")}
                </span>
                {has && <span aria-hidden className={`absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full ${isToday ? "bg-accent-fill" : "bg-accent"}`} />}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Arrow({ label, d, onClick }: { label: string; d: string; onClick: () => void }) {
  return (
    <button type="button" aria-label={label} onClick={onClick} className="w-6 h-6 rounded-full text-dim hover:text-ink hover:bg-card flex items-center justify-center cursor-pointer">
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d={d} />
      </svg>
    </button>
  );
}
