"use client";

import { useMemo, useState } from "react";

// The watch calendar, one month at a time: a week to a row, Sunday first,
// each day shaded by how much was watched on it, with arrows to step back
// and forward through the months. It opens on the latest month with any
// watching in it, so a profile never opens on an empty page just because the
// person hasn't logged anything yet this month. Days are small fixed squares,
// so the box stays as low as the two beside it.
export function MonthCalendar({ activity }: { activity: Record<string, number> }) {
  const latest = useMemo(() => {
    const days = Object.keys(activity).sort();
    const last = days[days.length - 1];
    const now = new Date();
    return last ? { y: Number(last.slice(0, 4)), m: Number(last.slice(5, 7)) - 1 } : { y: now.getFullYear(), m: now.getMonth() };
  }, [activity]);
  const [at, setAt] = useState(latest);

  const first = new Date(Date.UTC(at.y, at.m, 1));
  const daysIn = new Date(Date.UTC(at.y, at.m + 1, 0)).getUTCDate();
  const lead = first.getUTCDay();
  const key = (d: number) => `${at.y}-${String(at.m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  const watchedDays = Array.from({ length: daysIn }, (_, i) => activity[key(i + 1)] ?? 0).filter((n) => n > 0).length;

  const shade = (n: number) =>
    n === 0 ? "var(--card-hi)" : `color-mix(in srgb, var(--accent-fill) ${n === 1 ? 40 : n <= 3 ? 70 : 100}%, var(--card-hi))`;

  const step = (by: number) => setAt(({ y, m }) => ({ y: y + Math.floor((m + by) / 12), m: (((m + by) % 12) + 12) % 12 }));
  const label = first.toLocaleDateString("en-GB", { month: "short", year: "numeric", timeZone: "UTC" });

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <span className="text-[12px] min-w-0 truncate">
          <b className="font-semibold text-ink">{label}</b>
          <span className="text-dim"> · {watchedDays} {watchedDays === 1 ? "day" : "days"}</span>
        </span>
        <span className="flex gap-1">
          <Arrow dir={-1} onClick={() => step(-1)} />
          <Arrow dir={1} onClick={() => step(1)} />
        </span>
      </div>
      {/* Small coloured squares, one a day, a week to a row. The date is in
          each square's tooltip rather than printed on it. */}
      <div className="self-center grid grid-cols-7 gap-[3px]" style={{ gridAutoRows: "16px", gridTemplateColumns: "repeat(7, 16px)" }}>
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
          <span key={`w${i}`} aria-hidden className="text-center text-[9px] font-bold text-dim leading-[16px]">
            {d}
          </span>
        ))}
        {Array.from({ length: lead }, (_, i) => (
          <span key={`lead${i}`} />
        ))}
        {Array.from({ length: daysIn }, (_, i) => {
          const n = activity[key(i + 1)] ?? 0;
          return <span key={i} title={n ? `${key(i + 1)}: ${n} watched` : key(i + 1)} className="rounded-[3px]" style={{ background: shade(n) }} />;
        })}
      </div>
    </div>
  );
}

function Arrow({ dir, onClick }: { dir: 1 | -1; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={dir === 1 ? "Next month" : "Previous month"}
      className="w-5 h-5 rounded-full border border-hair text-dim hover:text-accent hover:border-accent flex items-center justify-center cursor-pointer transition-colors"
    >
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d={dir === 1 ? "M9 5l7 7-7 7" : "M15 5l-7 7 7 7"} />
      </svg>
    </button>
  );
}
