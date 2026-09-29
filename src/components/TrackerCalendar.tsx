"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { CalendarEvent } from "@/lib/tracker";

// The tracker's calendar: on the left, the day picked (today to begin with)
// large on the accent and its weekday; on the right, Today, the month by name with arrows either side and the year, and the month's days, a dot
// under each day with something on it, today filled in the accent. Only the
// month's own days are drawn. Pressing a day lists under the calendar what
// airs or opens that day; pressing it again puts the list away. The site's type (Bebas for the day's number,
// Open Runde for the rest), its shell and piece curves and its 8px and 12px
// spacing.
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const FULL = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
/** The years offered: back to when anyone might have started, and a few ahead. */
const YEARS = (now: number) => Array.from({ length: now + 5 - 1990 + 1 }, (_, i) => 1990 + i);
const WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const iso = (y: number, m: number, d: number) => `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

export function TrackerCalendar({ events }: { events: CalendarEvent[] }) {
  const now = new Date();
  const today = iso(now.getFullYear(), now.getMonth(), now.getDate());
  const [picked, setPicked] = useState(today);
  const [open, setOpen] = useState(false);
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

  const [py, pm, pd] = picked.split("-").map(Number);
  const weekday = new Date(py, pm - 1, pd).toLocaleDateString("en-GB", { weekday: "long" });
  const onDay = byDay.get(picked) ?? [];
  const days = new Date(year, month + 1, 0).getDate();
  const lead = new Date(year, month, 1).getDay();

  return (
    <div className="w-full max-w-[480px] rounded-shell bg-card p-2 border-[0.5px] border-t-[color:var(--lit-edge)] border-x-piece border-b-well shadow-[0_4px_9px_rgba(0,0,0,.35)] grid gap-2 sm:grid-cols-[132px_minmax(0,1fr)]">
      {/* The day. */}
      <div className="rounded-shell bg-accent-fill text-on-accent p-3 flex flex-col min-w-0">
        <div className="display text-[56px] leading-[.8] pt-1.5">{String(pd).padStart(2, "0")}</div>
        <div className="mt-2 text-[10.5px] font-bold uppercase tracking-[.12em]">{weekday}</div>
        {picked === today && <div className="mt-1 text-[10.5px] font-bold uppercase tracking-[.12em] opacity-75">Today</div>}
        <div className="mt-auto pt-3 text-[12.5px] leading-[16px] opacity-85">{onDay.length ? `${onDay.length} on this day` : "Nothing on"}</div>
      </div>

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
              setPicked(today);
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
            const isPicked = d === picked;
            return (
              <button
                key={d}
                type="button"
                onClick={() => {
                  setOpen(!(open && isPicked));
                  setPicked(d);
                }}
                aria-pressed={isPicked}
                aria-label={`${d}${has ? `, ${byDay.get(d)!.length} on` : ""}`}
                className="relative h-7 flex items-center justify-center cursor-pointer group"
              >
                <span
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-[12.5px] tabular-nums transition-colors ${
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

      {/* What's on the day pressed, across both panels. */}
      {open && (
        <div className="sm:col-span-2 rounded-shell bg-piece p-3">
          <div className="text-[10.5px] font-bold uppercase tracking-[.12em] text-dim">
            {new Date(py, pm - 1, pd).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "long" })}
            {onDay.length ? ` · ${picked < today ? "Aired" : "Airing"}` : ""}
          </div>
          {onDay.length === 0 ? (
            <p className="m-0 mt-2 text-[12.5px] text-dim">Nothing from what you track on this day.</p>
          ) : (
            <ul className="m-0 mt-2 p-0 list-none grid gap-2">
              {onDay.map((e) => (
                <li key={`${e.t.key}${e.label}`}>
                  <Link href={e.t.href} className="group flex items-center gap-2.5 no-underline text-ink">
                    <span className="w-[72px] aspect-video shrink-0 rounded-[8px] overflow-hidden bg-card border border-hair">
                      {(e.t.backdrop ?? e.t.poster) && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={(e.t.backdrop ?? e.t.poster)!} alt="" className="w-full h-full object-cover" />
                      )}
                    </span>
                    <span className="min-w-0 text-[12.5px] leading-[16px]">
                      <span className="block font-semibold truncate group-hover:text-accent transition-colors">{e.t.title}</span>
                      <span className="block text-dim truncate">{e.label}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
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
