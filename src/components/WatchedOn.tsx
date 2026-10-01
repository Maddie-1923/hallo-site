"use client";

import { useEffect, useRef, useState } from "react";
import { useDateFormat } from "./Day";

// When they watched it: a button reading the day chosen ("Today", or the
// date), opening a small calendar under it. Quick picks first, today and the
// day it came out (its release, or an episode's air date), then one month
// at a time, only that month's days, with arrows to the months either side.
// Days still to come can't be picked.
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const WEEK = ["S", "M", "T", "W", "T", "F", "S"];

export function WatchedOn({ value, onChange, out }: { value: string; onChange: (v: string) => void; out?: { label: string; date: string } | null }) {
  const today = iso(new Date());
  const fmt = useDateFormat();
  const long = (v: string) => fmt(v, "short");
  const chosen = value || today;
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(() => {
    const [y, m] = chosen.split("-").map(Number);
    return new Date(y, m - 1, 1);
  });
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const [y, m] = chosen.split("-").map(Number);
    setMonth(new Date(y, m - 1, 1)); // eslint-disable-line react-hooks/set-state-in-effect
    const away = (e: MouseEvent) => box.current && !box.current.contains(e.target as Node) && setOpen(false);
    const key = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", away);
    window.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("mousedown", away);
      window.removeEventListener("keydown", key);
    };
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  function pick(v: string) {
    onChange(v === today ? "" : v);
    setOpen(false);
  }

  const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const lead = month.getDay();
  const thisMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const shift = (n: number) => setMonth(new Date(month.getFullYear(), month.getMonth() + n, 1));
  const outOk = out && out.date && out.date <= today;

  return (
    <div ref={box} className="relative">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="rounded-[10px] bg-card border border-hair px-2.5 py-1 text-[1.0417rem] text-ink cursor-pointer hover:border-dim">
        {chosen === today ? "Today" : long(chosen)}
      </button>
      {open && (
        <div role="dialog" aria-label="Watched on" className="absolute z-40 left-0 top-[calc(100%+6px)] w-[22rem] rounded-shell bg-card border border-hair shadow-[0_20px_50px_rgba(0,0,0,.6)] p-3 grid gap-3">
          <div className="flex flex-wrap gap-1.5">
            <Quick on={chosen === today} onClick={() => pick(today)}>
              Today
            </Quick>
            {outOk && (
              <Quick on={chosen === out.date} onClick={() => pick(out.date)}>
                {out.label} · {long(out.date)}
              </Quick>
            )}
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[1.0417rem] font-semibold text-ink">{month.toLocaleDateString("en-GB", { month: "long", year: "numeric" })}</span>
            <span className="flex gap-1">
              <Arrow label="Month before" onClick={() => shift(-1)} d="M15 6l-6 6 6 6" />
              <Arrow label="Month after" onClick={() => shift(1)} d="M9 6l6 6-6 6" off={month >= thisMonth} />
            </span>
          </div>
          <div className="grid grid-cols-7 gap-y-1 text-center">
            {WEEK.map((w, i) => (
              <span key={i} className="text-[0.875rem] font-bold text-dim pb-1">
                {w}
              </span>
            ))}
            {Array.from({ length: lead }, (_, i) => (
              <span key={`b${i}`} />
            ))}
            {Array.from({ length: days }, (_, i) => {
              const v = iso(new Date(month.getFullYear(), month.getMonth(), i + 1));
              const future = v > today;
              const on = v === chosen;
              return (
                <button
                  key={v}
                  type="button"
                  disabled={future}
                  onClick={() => pick(v)}
                  className={`mx-auto w-8 h-8 rounded-full text-[1.0417rem] tabular-nums cursor-pointer disabled:cursor-default disabled:opacity-30 ${on ? "bg-accent-fill text-on-accent font-semibold" : v === today ? "text-accent font-semibold enabled:hover:bg-piece" : "text-ink enabled:hover:bg-piece"}`}
                >
                  {i + 1}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function Quick({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className={`rounded-full px-3 py-[0.5rem] text-[1.0417rem] leading-none cursor-pointer ${on ? "bg-accent-fill text-on-accent font-semibold" : "bg-piece text-ink hover:bg-card-hi"}`}>
      {children}
    </button>
  );
}

function Arrow({ label, onClick, d, off = false }: { label: string; onClick: () => void; d: string; off?: boolean }) {
  return (
    <button type="button" aria-label={label} onClick={onClick} disabled={off} className="w-7 h-7 rounded-full bg-piece text-ink flex items-center justify-center cursor-pointer disabled:opacity-30 disabled:cursor-default">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d={d} />
      </svg>
    </button>
  );
}
