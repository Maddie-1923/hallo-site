"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { CalendarEvent } from "@/lib/tracker";

// The tracker's calendar: on the left, the day picked (today to begin with)
// large on the accent, its weekday, and what airs or opens that day; on the
// right, the year with arrows, the twelve months, and the month's days, a dot
// under each day with something on it, today filled in the accent. Only the
// month's own days are drawn. The site's type (Bebas for the day's number,
// Open Runde for the rest), its shell and piece curves and its 8px and 12px
// spacing.
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const iso = (y: number, m: number, d: number) => `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

export function TrackerCalendar({ events }: { events: CalendarEvent[] }) {
  const now = new Date();
  const today = iso(now.getFullYear(), now.getMonth(), now.getDate());
  const [picked, setPicked] = useState(today);
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());

  const byDay = useMemo(() => {
    const m = new Map<string, CalendarEvent[]>();
    for (const e of events) m.set(e.date, [...(m.get(e.date) ?? []), e]);
    return m;
  }, [events]);

  const [py, pm, pd] = picked.split("-").map(Number);
  const weekday = new Date(py, pm - 1, pd).toLocaleDateString("en-GB", { weekday: "long" });
  const onDay = byDay.get(picked) ?? [];
  const days = new Date(year, month + 1, 0).getDate();
  const lead = new Date(year, month, 1).getDay();

  return (
    <div className="w-full max-w-[600px] rounded-shell bg-card p-2 border-[0.5px] border-t-[color:var(--lit-edge)] border-x-piece border-b-well shadow-[0_4px_9px_rgba(0,0,0,.35)] grid gap-2 sm:grid-cols-[200px_minmax(0,1fr)]">
      {/* The day. */}
      <div className="rounded-shell bg-accent-fill text-on-accent p-3 flex flex-col min-w-0">
        <div className="display text-[72px] leading-[.8] pt-2">{String(pd).padStart(2, "0")}</div>
        <div className="mt-2 text-[10.5px] font-bold uppercase tracking-[.12em]">
          {weekday}
          {picked === today && " · Today"}
        </div>
        <div className="mt-3 pt-2.5 border-t border-[color:color-mix(in_srgb,currentColor_25%,transparent)] min-h-0 flex-1">
          <div className="text-[10.5px] font-bold uppercase tracking-[.12em] opacity-75">{onDay.length ? (picked < today ? "Aired" : "Airing") : "Nothing on"}</div>
          <ul className="m-0 mt-1.5 p-0 list-none grid gap-1.5">
            {onDay.slice(0, 3).map((e) => (
              <li key={`${e.t.key}${e.label}`} className="text-[12.5px] leading-[16px] min-w-0">
                <Link href={e.t.href} className="block font-semibold truncate no-underline text-inherit hover:underline">
                  {e.t.title}
                </Link>
                <span className="block truncate opacity-80">{e.label}</span>
              </li>
            ))}
          </ul>
          {onDay.length > 3 && <div className="mt-1.5 text-[12.5px] opacity-80">+{onDay.length - 3} more</div>}
        </div>
      </div>

      {/* The month. */}
      <div className="rounded-shell bg-piece p-3 min-w-0">
        <div className="flex items-center justify-end gap-2">
          <span className="flex items-center gap-1">
            <Arrow label="Year before" d="M15 6l-6 6 6 6" onClick={() => setYear((y) => y - 1)} />
            <span className="text-[12.5px] font-semibold text-ink tabular-nums w-10 text-center">{year}</span>
            <Arrow label="Year after" d="M9 6l6 6-6 6" onClick={() => setYear((y) => y + 1)} />
          </span>
        </div>
        <div className="mt-2 grid grid-cols-12 border-b border-hair pb-1.5">
          {MONTHS.map((m, i) => (
            <button
              key={m}
              type="button"
              onClick={() => setMonth(i)}
              aria-pressed={i === month}
              className={`text-[10.5px] leading-none py-1 cursor-pointer ${i === month ? "font-bold text-ink" : "text-dim hover:text-ink"}`}
            >
              {m}
            </button>
          ))}
        </div>
        <div className="mt-1.5 grid grid-cols-7 text-center">
          {WEEK.map((w) => (
            <span key={w} className="text-[10.5px] font-bold uppercase tracking-[.12em] text-dim py-1.5">
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
            const isPicked = d === picked;
            return (
              <button
                key={d}
                type="button"
                onClick={() => setPicked(d)}
                aria-pressed={isPicked}
                aria-label={`${d}${has ? `, ${byDay.get(d)!.length} on` : ""}`}
                className="relative h-8 flex items-center justify-center cursor-pointer group"
              >
                <span
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-[12.5px] tabular-nums transition-colors ${
                    isToday ? "bg-accent-fill text-on-accent font-bold" : isPicked ? "ring-[1.5px] ring-accent-fill text-ink font-semibold" : "text-ink group-hover:bg-card"
                  }`}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                {has && <span aria-hidden className={`absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full ${isToday ? "bg-accent-fill" : "bg-accent"}`} />}
              </button>
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
