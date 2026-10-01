import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { ListCard } from "@/components/ListCard";
import { Unblocked } from "@/components/SafetySheets";
import { SHELL } from "@/components/ListsChrome";
import { accountsOpen } from "@/lib/accounts";
import { loadProfile } from "@/lib/profile";
import { allLists } from "@/lib/lists";
import { listGroups } from "@/lib/list-groups";

// One of the Lists hub's sections whole, where its chevron goes: every list
// in it, in the same order and on the same cards as the hub.

async function section(slug: string) {
  const [lists, me] = await Promise.all([allLists(), accountsOpen ? loadProfile().then((p) => p.username) : Promise.resolve(null)]);
  return listGroups(lists, me).find((g) => g.slug === slug) ?? null;
}

export async function generateMetadata({ params }: PageProps<"/lists/[slug]">): Promise<Metadata> {
  const g = await section((await params).slug);
  return { title: `${g?.title ?? "Lists"} — Kodigo` };
}

export default async function ListSection({ params }: PageProps<"/lists/[slug]">) {
  const g = await section((await params).slug);
  if (!g) notFound();
  return (
    <div className="min-h-screen flex flex-col">
      <SiteNav />
      <main className="w-full px-[clamp(16px,3.2vw,64px)] pt-8 pb-20 flex-1">
        <div className="max-w-[86.6667rem] mx-auto grid grid-cols-[minmax(0,1fr)] gap-4">
          <div>
            <Link href="/lists" className="text-[1.0417rem] font-semibold text-dim no-underline hover:text-ink">
              ← Lists
            </Link>
            <h1 className="!text-[clamp(36px,5vw,56px)] !leading-[.95] tracking-[.02em] uppercase !m-0 mt-3">{g.title}</h1>
            <p className="m-0 mt-2 text-[1.0417rem] text-dim">
              {g.lists.length} {g.lists.length === 1 ? "list" : "lists"}
            </p>
          </div>
          {g.lists.length ? (
            <div className={SHELL}>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {g.lists.map((l) => (
                  <Unblocked key={`${l.owner}/${l.id}`} username={l.owner}>
                    <ListCard l={l} />
                  </Unblocked>
                ))}
              </div>
            </div>
          ) : (
            <p className="m-0 rounded-shell bg-card p-3 text-[1.0417rem] text-dim">No lists here yet.</p>
          )}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
