"use client";

import { useState } from "react";

// A title's themes (TMDB's keywords), ten at first and the rest behind
// "Show all", as Letterboxd does.
export function Themes({ items }: { items: string[] }) {
  const [all, setAll] = useState(false);
  const shown = all ? items : items.slice(0, 10);
  const chip = "inline-flex items-center rounded-[8px] bg-piece px-2.5 py-[5px] text-[12.5px] leading-[1.2] text-ink";
  return (
    <>
      {shown.map((k) => (
        <span key={k} className={chip}>
          {k}
        </span>
      ))}
      {items.length > 10 && (
        <button type="button" onClick={() => setAll(!all)} className={`${chip} text-dim hover:text-ink cursor-pointer`}>
          {all ? "Show fewer" : `Show all ${items.length}`}
        </button>
      )}
    </>
  );
}
