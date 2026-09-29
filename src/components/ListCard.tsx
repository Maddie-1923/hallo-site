import Link from "next/link";
import type { ListView } from "@/lib/lists";

// A list as a card, the way list sites show them: the first five posters
// fanned across, overlapping, then the list's name, whose it is, how many
// titles and how many likes.
export function ListCard({ l }: { l: ListView }) {
  const five = l.titles.slice(0, 5);
  return (
    <Link href={`/u/${l.owner}/list/${l.id}`} className="group block rounded-shell bg-piece p-3 no-underline text-ink min-w-0">
      <span className="flex">
        {five.map((t, i) => (
          <span
            key={t.key}
            className="block w-[22%] shrink-0 aspect-[2/3] rounded-[8px] overflow-hidden bg-card border border-hair shadow-[4px_0_10px_rgba(0,0,0,.35)] -ml-[3%] first:ml-0 transition-transform duration-200 group-hover:-translate-y-0.5"
            style={{ zIndex: 5 - i }}
          >
            {t.poster && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={t.poster} alt="" loading="lazy" className="w-full h-full object-cover" />
            )}
          </span>
        ))}
      </span>
      <span className="block mt-2.5 text-[12.5px] font-semibold truncate group-hover:text-accent transition-colors">{l.name}</span>
      <span className="block text-[12.5px] text-dim truncate">
        @{l.owner} · {l.titles.length} {l.titles.length === 1 ? "title" : "titles"}
        {l.likes > 0 && <> · ♥ {l.likes}</>}
      </span>
    </Link>
  );
}
