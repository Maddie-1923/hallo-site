"use client";

import { useState } from "react";

// The right-hand end of the tab rule: how the run is laid out and how it's
// ordered. Both menus are placeholders for now — the options they hold are
// still being decided — but the controls live here so the row's shape is
// settled and the pages can start reading from them.
const views = ["Grid", "List", "Compact"];
const sorts = ["Recently added", "Title", "Release date", "Rating", "Last watched"];

export function ListToolbar() {
  const [open, setOpen] = useState<"view" | "sort" | null>(null);
  const [view, setView] = useState(views[0]);
  const [sort, setSort] = useState(sorts[0]);

  return (
    <div className="ml-auto flex items-center gap-1 pb-2 text-sm">
      <Menu label="View" value={view} options={views} onPick={setView} open={open === "view"} onToggle={() => setOpen((o) => (o === "view" ? null : "view"))} />
      <Menu label="Sort" value={sort} options={sorts} onPick={setSort} open={open === "sort"} onToggle={() => setOpen((o) => (o === "sort" ? null : "sort"))} />
    </div>
  );
}

function Menu({
  label,
  value,
  options,
  onPick,
  open,
  onToggle,
}: {
  label: string;
  value: string;
  options: string[];
  onPick: (v: string) => void;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="relative">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-dim hover:text-ink hover:bg-card cursor-pointer transition-colors"
      >
        <span className="text-[11px] font-bold tracking-[.12em] uppercase">{label}</span>
        <span className="text-ink/80">{value}</span>
        <span className="text-[10px] text-dim">{open ? "▴" : "▾"}</span>
      </button>
      {open && (
        <>
          {/* A click anywhere else closes the menu; nothing under it is
              clickable through the sheet, which is what a native menu does. */}
          <button type="button" aria-hidden tabIndex={-1} className="fixed inset-0 z-40 cursor-default" onClick={onToggle} />
          <div role="menu" className="absolute right-0 top-full mt-1 z-50 w-[184px] rounded-xl border border-hair bg-card shadow-[0_20px_50px_rgba(0,0,0,.6)] overflow-hidden py-1">
            {options.map((o) => (
              <button
                key={o}
                type="button"
                role="menuitemradio"
                aria-checked={o === value}
                onClick={() => {
                  onPick(o);
                  onToggle();
                }}
                className={`w-full text-left px-3.5 py-2 text-[13px] hover:bg-card-hi cursor-pointer ${o === value ? "text-ink" : "text-dim"}`}
              >
                {o === value ? "✓ " : "   "}
                {o}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
