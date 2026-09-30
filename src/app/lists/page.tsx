import type { Metadata } from "next";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { ListCard } from "@/components/ListCard";
import { accountsOpen } from "@/lib/accounts";
import { loadProfile } from "@/lib/profile";
import { Unblocked } from "@/components/SafetySheets";
import { allLists } from "@/lib/lists";
import { CommunitySwitch } from "@/components/CommunitySwitch";

export const metadata: Metadata = { title: "Lists — Kodigo" };

// The Lists hub: the lists a moderator featured, the most liked this week
// and of all time, the recently updated, the ones with the most in them to
// dig into, a row for each genre with a couple of lists in it (a list's
// genre is the one most of its titles share: public.list_topics), and your
// own. Each goes to the list's page.
const SHELL = "rounded-shell bg-card p-2 border-[0.5px] border-t-[color:var(--lit-edge)] border-x-piece border-b-well shadow-[0_4px_9px_rgba(0,0,0,.35)]";
const H = "inline-flex items-center h-[34px] px-4 rounded-full bg-piece ![font-family:var(--font-body)] !font-bold !text-[10.5px] !leading-none !tracking-[.12em] uppercase text-ink";

export default async function Lists() {
  const [lists, me] = await Promise.all([allLists(), accountsOpen ? loadProfile().then((p) => p.username) : Promise.resolve(null)]);
  const others = lists.filter((l) => l.owner !== me);
  const week = (l: (typeof lists)[number]) => l.likesWeek ?? l.likes;
  // A topic row once a genre has two lists in it, the fullest topics first.
  const byTopic = new Map<string, typeof lists>();
  for (const l of others) if (l.topic) byTopic.set(l.topic, [...(byTopic.get(l.topic) ?? []), l]);
  const topics = [...byTopic.entries()].filter(([, ls]) => ls.length >= 2).sort((a, b) => b[1].length - a[1].length).slice(0, 5);
  const groups: [string, typeof lists][] = [
    ["Featured", lists.filter((l) => l.featured)],
    ["Popular this week", [...others].filter((l) => week(l) > 0).sort((a, b) => week(b) - week(a)).slice(0, 8)],
    ["Most liked", [...others].filter((l) => l.likesWeek !== undefined && l.likes > 0).sort((a, b) => b.likes - a.likes).slice(0, 8)],
    ["Recently updated", others.filter((l) => l.likesWeek !== undefined).slice(0, 8)],
    ["Big lists to dig into", [...others].sort((a, b) => b.titles.length - a.titles.length).slice(0, 4)],
    ...topics.map(([topic, ls]): [string, typeof lists] => [topic, ls.slice(0, 8)]),
    ["Your lists", lists.filter((l) => l.owner === me)],
  ];
  return (
    <div className="min-h-screen flex flex-col">
      <SiteNav />
      <main className="w-full px-[clamp(16px,3.2vw,64px)] pt-8 pb-20 flex-1">
        <div className="max-w-[1040px] mx-auto grid grid-cols-[minmax(0,1fr)] gap-8">
          <div className={SHELL}>
            <div className="rounded-shell bg-piece p-3">
              <CommunitySwitch on="lists" />
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
                      <Unblocked key={`${l.owner}/${l.id}`} username={l.owner}>
                        <ListCard l={l} />
                      </Unblocked>
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
