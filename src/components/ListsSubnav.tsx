"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ListToolbar } from "./ListToolbar";

// The second row under the profile: which slice of the library is showing.
// Tabs on a rule rather than pills, so it reads as a section divider and the
// accent underline says where you are — the same language the top nav uses.
const tabs = [
  ["/app/shows", "Shows"],
  ["/app/movies", "Movies"],
  ["/app/diary", "Diary"],
];

export function ListsSubnav() {
  const path = usePathname();
  return (
    <div className="flex items-end gap-6 border-b border-hair mt-6">
      {tabs.map(([href, label]) => {
        const on = path.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={`relative pb-3 text-sm font-semibold no-underline transition-colors ${on ? "text-ink" : "text-dim hover:text-ink"}`}
            aria-current={on ? "page" : undefined}
          >
            {label}
            {on && <span aria-hidden className="absolute left-0 right-0 -bottom-px h-[3px] rounded-t-full" style={{ background: "var(--accent-fill)" }} />}
          </Link>
        );
      })}
      <ListToolbar />
    </div>
  );
}
