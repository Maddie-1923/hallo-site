"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";

// The search icon that becomes a field. Closed, it's a 22px glyph. Open, the
// field grows leftwards out of the icon — it lives at the right end of the
// bar, so a width transition on the wrapper is all the leftward motion needs.
// Empty and blurred, it folds back; on /search it starts open with the query.
export function NavSearch() {
  const router = useRouter();
  const path = usePathname();
  const params = useSearchParams();
  const onSearchPage = path === "/search";
  const [open, setOpen] = useState(onSearchPage);
  const [value, setValue] = useState(onSearchPage ? (params.get("q") ?? "") : "");
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) input.current?.focus();
  }, [open]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const q = value.trim();
    if (q) router.push(`/search?q=${encodeURIComponent(q)}`);
  }

  return (
    <form
      onSubmit={submit}
      role="search"
      className={`flex items-center h-10 rounded-full border transition-[width,background-color,border-color] duration-300 ease-out overflow-hidden ${
        open ? "w-[min(360px,60vw)] bg-graphite/80 border-bone/25 pl-3 pr-1" : "w-10 justify-center border-transparent"
      }`}
    >
      <button
        type={open ? "submit" : "button"}
        aria-label={open ? "Search" : "Open search"}
        onClick={() => {
          if (!open) setOpen(true);
        }}
        className="text-ink hover:text-accent transition-colors shrink-0 flex items-center justify-center w-6 h-6 cursor-pointer"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden>
          <circle cx="11" cy="11" r="7" />
          <path d="M20 20l-3.5-3.5" />
        </svg>
      </button>
      <input
        ref={input}
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            setValue("");
            setOpen(false);
            (e.target as HTMLInputElement).blur();
          }
        }}
        onBlur={() => {
          if (!value.trim() && !onSearchPage) setOpen(false);
        }}
        placeholder="Titles, people, genres"
        aria-label="Search shows and movies"
        tabIndex={open ? 0 : -1}
        className={`bg-transparent outline-none text-[15px] text-ink placeholder:text-dim ml-2 transition-opacity duration-200 ${
          open ? "w-full opacity-100" : "w-0 opacity-0"
        }`}
      />
    </form>
  );
}
