import Link from "next/link";
import { Poster } from "./Poster";
import type { Shelf as ShelfData } from "@/lib/piles";

// A titled run of posters. Every pile on the lists and every shelf on the
// profile draws through this, so a Kodigo shelf and somebody's own list look
// the same — the heading is the only thing that says which it is.
export function Shelf({ title, count, detail, items, empty }: { title: string; count?: number; detail?: string | null; items: ShelfData["items"]; empty?: string }) {
  return (
    <section className="mt-10">
      <div className="rule" />
      <div className="eyebrow">
        {title}
        {count !== undefined && ` · ${count}`}
      </div>
      {detail && <p className="text-dim text-[15px] -mt-2 mb-4">{detail}</p>}
      {items.length === 0 ? (
        <p className="text-sm text-dim m-0">{empty ?? "Nothing here yet."}</p>
      ) : (
        <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(120px,1fr))]">
          {items.map((it) => (
            <Link key={it.key} href={it.href} className="no-underline text-ink group">
              <Poster path={it.path} alt={it.name} className="transition-colors group-hover:border-ink" />
              <div className="mt-2 text-xs font-semibold leading-tight line-clamp-2">{it.name}</div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
