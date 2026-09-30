import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { ListPage } from "@/components/ListPage";
import { BlockGate } from "@/components/SafetySheets";
import { listFor, watchedKeys } from "@/lib/lists";

type Params = PageProps<"/u/[username]/list/[id]">;

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { username, id } = await params;
  const l = await listFor(username, id);
  return { title: l ? `${l.name} by @${l.owner} — Kodigo` : "List — Kodigo", description: l?.detail ?? undefined };
}

// A list's own page, made for sharing.
export default async function List({ params }: Params) {
  const { username, id } = await params;
  const [l, watched] = await Promise.all([listFor(username, id), watchedKeys()]);
  if (!l) notFound();
  return (
    <div className="min-h-screen flex flex-col">
      <SiteNav />
      <main className="w-full px-[clamp(16px,3.2vw,64px)] pt-8 pb-20 flex-1">
        <BlockGate username={l.owner} bare>
          <ListPage l={l} watched={watched} />
        </BlockGate>
      </main>
      <SiteFooter />
    </div>
  );
}
