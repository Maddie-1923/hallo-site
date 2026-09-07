"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Shows or Movies, the two piles. History left this row when it moved to the
// profile: it is a record of what you have done, and these two are what you
// have not done yet.
const tabs = [
  ["/app/shows", "Shows"],
  ["/app/movies", "Movies"],
];

export function KindTabs() {
  const path = usePathname();
  return (
    <div className="flex gap-6">
      {tabs.map(([href, label]) => {
        const on = path.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={on ? "page" : undefined}
            className={`relative pb-3 text-sm font-semibold no-underline transition-colors ${on ? "text-ink" : "text-dim hover:text-ink"}`}
          >
            {label}
            {on && <span aria-hidden className="absolute left-0 right-0 -bottom-px h-[3px] rounded-t-full" style={{ background: "var(--accent-fill)" }} />}
          </Link>
        );
      })}
    </div>
  );
}
