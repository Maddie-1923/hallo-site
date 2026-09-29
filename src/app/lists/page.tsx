import type { Metadata } from "next";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { ListCard } from "@/components/ListCard";
import { allLists } from "@/lib/lists";

export const metadata: Metadata = { title: "Lists — Kodigo" };

// The Lists hub: the most liked lists this week, the ones with the most in
// them to dig into, and your own. Each goes to the list's page.
const SHELL = "rounded-shell bg-card p-2 border-[0.5px] border-t-[color:var(--lit-edge)] border-x-piece border-b-well shadow-[0_4px_9px_rgba(0,0,0,.35)]";
const H = "inline-flex items-center h-[34px] px-4 rounded-full bg-piece ![font-family:var(--font-body)] !font-bold !text-[10.5px] !leading-none !tracking-[.12em] uppercase text-ink";

export default async function Lists() {
  const lists = await allLists();
  const others = lists.filter((l) => l.owner !== "preview");
  const groups: [string, typeof lists][] = [
    ["Popular this week", [...others].sort((a, b) => b.likes - a.likes).slice(0, 8)],
    ["Big lists to dig into", [...others].sort((a, b) => b.titles.length - a.titles.length).slice(0, 4)],
    ["Your lists", lists.filter((l) => l.owner === "preview")],
  ];
  return (
    <div className="min-h-screen flex flex-col">
      <SiteNav />
      <main className="w-full px-[clamp(16px,3.2vw,64px)] pt-8 pb-20 flex-1">
        <div className="max-w-[1040px] mx-auto grid grid-cols-[minmax(0,1fr)] gap-8">
          <div className={SHELL}>
            <div className="rounded-shell bg-piece p-3">
              <h1 className="!text-[clamp(36px,5vw,56px)] !leading-[.95] tracking-[.02em] uppercase">Lists</h1>
              <p className="m-0 mt-2 text-[12.5px] leading-[1.6] text-mid-tone">Collections people have made of what to watch, from comfort rewatches to the year&apos;s best.</p>
            </div>
          </div>
          {groups
            .filter(([, ls]) => ls.length > 0)
            .map(([title, ls]) => (
              <section key={title} className="grid grid-cols-[minmax(0,1fr)] gap-2">
                <div>
                  <h2 className={H}>{title}</h2>
                </div>
                <div className={SHELL}>
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                    {ls.map((l) => (
                      <ListCard key={`${l.owner}/${l.id}`} l={l} />
                    ))}
                  </div>
                </div>
              </section>
            ))}
          {lists.length === 0 && <p className="m-0 rounded-shell bg-card p-3 text-[12.5px] text-dim">Lists open with accounts.</p>}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
