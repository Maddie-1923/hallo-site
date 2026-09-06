"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// The tab strip on the left of the bar, lit for the section you're in. The
// nav itself is a server component (it reads the session), so the pathname
// check lives in this small client piece. A title page counts as its
// catalogue — /show/123 lights Shows — and anything under /app is My Lists,
// since that's where every signed-in page hangs.
export function NavLinks({ links }: { links: [string, string][] }) {
  const path = usePathname();
  const active = (href: string) => {
    if (href.startsWith("/#")) return false;
    if (href === "/app/lists") return path.startsWith("/app");
    if (href === "/shows") return path.startsWith("/shows") || path.startsWith("/show/");
    if (href === "/movies") return path.startsWith("/movies") || path.startsWith("/movie/");
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
            className={`relative no-underline transition-colors py-5 ${on ? "text-ink font-semibold" : "hover:text-ink"}`}
          >
            {label}
            {/* The accent line under the current tab, hung from the link's
                own padding so it sits on the bar's bottom edge. */}
            {on && <span aria-hidden className="absolute left-0 right-0 bottom-0 h-[3px] rounded-t-full" style={{ background: "var(--accent-fill)" }} />}
          </Link>
        );
      })}
    </>
  );
}
