import Link from "next/link";
import type { Metadata } from "next";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { ListCard } from "@/components/ListCard";
import { accountsOpen } from "@/lib/accounts";
import { loadProfile } from "@/lib/profile";
import { Unblocked } from "@/components/SafetySheets";
import { allLists } from "@/lib/lists";
import { listGroups } from "@/lib/list-groups";
import { CommunitySwitch } from "@/components/CommunitySwitch";
import { Chevron, H, SHELL } from "@/components/ListsChrome";

export const metadata: Metadata = { title: "Lists — Kodigo" };

// The Lists hub: the lists a moderator featured, the most liked this week
// and of all time, the recently updated, the ones with the most in them to
// dig into, a row for each genre with a couple of lists in it (a list's
// genre is the one most of its titles share: public.list_topics), and your
// own (lib/list-groups.ts). Each goes to the list's page; a section with
// more than it shows has a chevron to all of them.

export default async function Lists() {
  const [lists, me] = await Promise.all([allLists(), accountsOpen ? loadProfile().then((p) => p.username) : Promise.resolve(null)]);
  const groups = listGroups(lists, me);
  return (
    <div className="min-h-screen flex flex-col">
      <SiteNav />
      <main className="w-full px-[clamp(16px,3.2vw,64px)] pt-8 pb-20 flex-1">
        <div className="max-w-[86.6667rem] mx-auto grid grid-cols-[minmax(0,1fr)] gap-8">
          <div className={SHELL}>
            <div className="rounded-shell bg-piece p-3">
              <CommunitySwitch on="lists" />
              <h1 className="!text-[clamp(36px,5vw,56px)] !leading-[.95] tracking-[.02em] uppercase">Lists</h1>
              <p className="m-0 mt-2 text-[1.0417rem] leading-[1.6] text-mid-tone">Collections people have made of what to watch, from comfort rewatches to the year&apos;s best.</p>
            </div>
          </div>
          {groups
            .filter((g) => g.lists.length > 0)
            .map((g) => (
              <section key={g.slug} className="grid grid-cols-[minmax(0,1fr)] gap-2">
                <div>
                  {g.lists.length > g.shown ? (
                    <Link href={`/lists/${g.slug}`} aria-label={`All of ${g.title}`} className={`${H} no-underline hover:text-accent transition-colors`}>
                      <h2 className="!m-0 ![font:inherit] ![letter-spacing:inherit] uppercase">{g.title}</h2>
                      <Chevron />
                    </Link>
                  ) : (
                    <h2 className={H}>{g.title}</h2>
                  )}
                </div>
                <div className={SHELL}>
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                    {g.lists.slice(0, g.shown).map((l) => (
                      <Unblocked key={`${l.owner}/${l.id}`} username={l.owner}>
                        <ListCard l={l} />
                      </Unblocked>
                    ))}
                  </div>
                </div>
              </section>
            ))}
          {lists.length === 0 && <p className="m-0 rounded-shell bg-card p-3 text-[1.0417rem] text-dim">Lists open with accounts.</p>}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

