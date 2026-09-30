"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// The tab strip on the left of the bar, lit for the section you're in. The
// nav itself is a server component (it reads the session), so the pathname
// check lives in this small client piece.
// Each tab's line takes a colour of the logo's stripes, in the logo's order:
// Explore the yellow, Calendar the pink, Community the blue. Any other tab
// keeps the theme's accent.
const STRIPE: Record<string, string> = {
  "/explore": "#FFCB14",
  "/calendar": "#FF69C4",
  "/members": "#38B6FF",
};

export function NavLinks({ links }: { links: [string, string][] }) {
  const path = usePathname();
  const active = (href: string) => {
    if (href.startsWith("/#")) return false;
    // Explore covers both catalogues, their title pages, Browse and people.
    if (href === "/explore") return ["/shows", "/movies", "/explore", "/show/", "/movie/", "/browse", "/person/"].some((p) => path === p || path.startsWith(p.endsWith("/") ? p : `${p}/`));
    // Community covers Members and Lists, and members' own pages.
    if (href === "/members") return ["/members", "/lists", "/u/"].some((p) => path === p || path.startsWith(p.endsWith("/") ? p : `${p}/`));
    return path === href || path.startsWith(`${href}/`);
  };
  return (
    <>
      {links.map(([href, label]) => {
        const on = active(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={on ? "page" : undefined}
            className={`relative no-underline transition-colors pt-5 pb-2.5 ${on ? "text-ink font-semibold" : "hover:text-ink"}`}
          >
            {label}
            {/* The accent line under the current tab, hung from the link's
                own padding so it sits on the bar's bottom edge. */}
            {on && <span aria-hidden className="absolute left-0 right-0 bottom-0 h-[3px] rounded-t-full" style={{ background: STRIPE[href] ?? "var(--accent-fill)" }} />}
          </Link>
        );
      })}
    </>
  );
}
