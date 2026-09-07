import Link from "next/link";
import { poster } from "@/lib/archive";
import type { Shelf } from "@/lib/piles";

// A shelf as a card: three posters fanned out, the name, the count. The fan
// says what is inside without the page becoming a wall of artwork — a
// profile with eleven shelves drawn in full would be a thousand posters.
export function ShelfCard({ shelf, href }: { shelf: Shelf; href: string }) {
  const fan = shelf.items.slice(0, 3);
  return (
    <Link
      href={href}
      className={`no-underline text-ink rounded-2xl p-4 min-h-[132px] flex flex-col justify-between transition-colors ${
        shelf.kind === "custom" ? "border border-hair hover:bg-card" : "bg-card hover:bg-card-hi"
      }`}
    >
      <div className="flex">
        {fan.length === 0 ? (
          <div className="w-[34px] h-[50px] rounded-md border border-dashed border-hair" />
        ) : (
          fan.map((it, i) => {
            const src = poster(it.path, "w185");
            return (
              <div
                key={it.key}
                className="w-[34px] h-[50px] rounded-md overflow-hidden bg-card-hi border-2 border-page"
                style={{ marginRight: i === fan.length - 1 ? 0 : -10, zIndex: fan.length - i }}
              >
                {src && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={src} alt="" loading="lazy" className="w-full h-full object-cover" />
                )}
              </div>
            );
          })
        )}
      </div>
      <div className="mt-3">
        <div className="text-[15px] font-bold leading-tight">{shelf.name}</div>
        <div className="text-xs text-dim mt-0.5">
          {shelf.items.length === 0
            ? "Nothing here"
            : `${shelf.items.length} ${shelf.items.length === 1 ? "title" : "titles"}${shelf.kind === "custom" ? " · your list" : ""}`}
        </div>
      </div>
    </Link>
  );
}
