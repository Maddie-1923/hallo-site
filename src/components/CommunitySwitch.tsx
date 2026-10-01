import Link from "next/link";

// Community is one tab in the bar and two pages under it, Members and Lists,
// the way Explore is one tab over Shows and Movies. The switch is links, so
// each half keeps its own address to share.
export function CommunitySwitch({ on }: { on: "members" | "lists" }) {
  const tabs: [string, string, boolean][] = [
    ["/members", "Members", on === "members"],
    ["/lists", "Lists", on === "lists"],
  ];
  return (
    <nav aria-label="Community" className="inline-flex gap-1 p-[0.25rem] mb-3 rounded-full bg-card border border-hair">
      {tabs.map(([href, label, active]) => (
        <Link
          key={href}
          href={href}
          aria-current={active ? "page" : undefined}
          className={`px-4 py-1.5 rounded-full text-[1.0417rem] font-bold no-underline transition-colors ${active ? "bg-accent-fill text-on-accent" : "text-dim hover:text-ink"}`}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}
