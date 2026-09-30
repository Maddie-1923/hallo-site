import Link from "next/link";

// The grid a row opens into: posters with their title and year, the app's
// three-across "show all" page widened for a screen. Shared by the built-in
// rows' pages and a custom category's.
export function PosterGrid({ titles }: { titles: { key: string; href: string; title: string; poster: string | null; sub: string }[] }) {
  return (
    <ul className="m-0 mt-6 p-0 list-none grid gap-2 grid-cols-3 sm:grid-cols-4 lg:grid-cols-6">
      {titles.map((t) => (
        <li key={t.key} className="min-w-0">
          <Link href={t.href} title={t.title} className="group block rounded-shell bg-piece p-1.5 no-underline text-ink">
            <span className="block aspect-[2/3] rounded-[10px] overflow-hidden bg-card border border-hair">
              {t.poster ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={t.poster} alt="" loading="lazy" className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" />
              ) : (
                <span className="w-full h-full flex items-center justify-center p-3 text-center text-xs text-dim">{t.title}</span>
              )}
            </span>
            <span className="block px-1 pt-1.5 text-[12.5px] leading-[16px] font-semibold truncate group-hover:text-accent transition-colors">{t.title}</span>
            <span className="block px-1 pb-0.5 text-[12.5px] leading-[16px] text-dim">{t.sub || "—"}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
