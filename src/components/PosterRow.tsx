import Link from "next/link";
import { poster } from "@/lib/archive";

export interface PosterItem {
  key: string;
  href: string;
  title: string;
  poster: string | null | undefined;
  sub?: string;
}

// A home-page row: a small caps heading over a hairline, "More" on the right,
// then a run of small posters, the way Letterboxd lays out its front page.
// Smaller than Explore's cards on purpose: this page is for glancing, and a
// click on a poster goes to its page. One line and no scrollbar: four
// posters on a phone, six on a tablet, eight on a desktop, and "More" for the
// rest.
export function PosterRow({ title, href, items }: { title: string; href?: string; items: PosterItem[] }) {
  if (items.length === 0) return null;
  return (
    <section className="mt-12">
      <div className="flex items-baseline justify-between border-b border-hair pb-1.5 mb-4">
        <h2 className="!font-[family-name:var(--font-body)] !text-[13px] !tracking-[.14em] uppercase font-bold text-dim">{title}</h2>
        {href && (
          <Link href={href} className="text-[12px] tracking-[.1em] uppercase text-dim hover:text-accent no-underline">
            More
          </Link>
        )}
      </div>
      <ul className="m-0 p-0 list-none grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-[clamp(8px,1.2vw,14px)]">
        {items.slice(0, 8).map((it, i) => {
          const src = poster(it.poster, "w342");
          return (
            <li key={it.key} className={i >= 6 ? "hidden lg:block" : i >= 4 ? "hidden sm:block" : ""}>
              <Link href={it.href} title={it.sub ? `${it.title} (${it.sub})` : it.title} className="group block no-underline">
                <div className="aspect-[2/3] rounded-[6px] overflow-hidden bg-card border border-white/10 group-hover:border-accent group-hover:shadow-[0_0_0_2px_var(--accent-fill)] transition-[border-color,box-shadow]">
                  {src ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={src} alt={it.title} loading="lazy" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center p-2 text-center text-xs text-dim">{it.title}</div>
                  )}
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
