"use client";

import { useState } from "react";

// Month by month: one bar a month in the accent, thin, rounded where the data
// ends and anchored to the baseline, the busiest month named above its bar;
// hovering (or focusing) a month says how many. A table of the same numbers
// is there for screen readers.
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const FULL = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export function YearChart({ months }: { months: number[] }) {
  const [at, setAt] = useState<number | null>(null);
  const max = Math.max(1, ...months);
  const peak = months.indexOf(Math.max(...months));
  return (
    <div className="relative">
      <div className="relative h-[15rem] flex items-end gap-2 border-b border-hair" role="img" aria-label="Watches each month">
        {/* Three faint guides, recessive. */}
        {[0.33, 0.66, 1].map((f) => (
          <span key={f} aria-hidden className="absolute left-0 right-0 border-t border-dashed border-hair/60" style={{ bottom: `${f * 100}%` }} />
        ))}
        {months.map((n, i) => (
          <button
            key={i}
            type="button"
            onMouseEnter={() => setAt(i)}
            onMouseLeave={() => setAt(null)}
            onFocus={() => setAt(i)}
            onBlur={() => setAt(null)}
            aria-label={`${FULL[i]}: ${n} ${n === 1 ? "watch" : "watches"}`}
            className="relative flex-1 h-full flex items-end justify-center cursor-default focus:outline-none group"
          >
            <span
              className={`block w-full max-w-[2.3333rem] rounded-t-[4px] transition-opacity ${n ? "bg-accent-fill" : "bg-hair"} ${at != null && at !== i ? "opacity-45" : ""}`}
              style={{ height: n ? `${Math.max(3, (n / max) * 100)}%` : "2px" }}
            />
            {i === peak && n > 0 && at == null && (
              <span className="absolute text-[1.0417rem] font-semibold text-ink tabular-nums" style={{ bottom: `calc(${(n / max) * 100}% + 4px)` }}>
                {n}
              </span>
            )}
          </button>
        ))}
      </div>
      <div className="mt-1.5 flex gap-2">
        {MONTHS.map((m, i) => (
          <span key={m} className={`flex-1 text-center text-[0.875rem] font-bold uppercase tracking-[.08em] ${i === at ? "text-ink" : "text-dim"}`}>
            {m.slice(0, 1)}
            <span className="max-sm:hidden">{m.slice(1)}</span>
          </span>
        ))}
      </div>
      {at != null && (
        <div role="status" className="absolute top-0 right-0 rounded-[10px] bg-card border border-hair px-3 py-1.5 text-[1.0417rem] shadow-[0_8px_20px_rgba(0,0,0,.35)] pointer-events-none">
          <span className="text-dim">{FULL[at]}</span> <b className="font-semibold text-ink tabular-nums">{months[at]}</b> <span className="text-dim">{months[at] === 1 ? "watch" : "watches"}</span>
        </div>
      )}
      <table className="sr-only">
        <caption>Watches each month</caption>
        <tbody>
          {months.map((n, i) => (
            <tr key={i}>
              <th scope="row">{FULL[i]}</th>
              <td>{n}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
