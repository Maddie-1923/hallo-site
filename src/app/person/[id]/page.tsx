import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { ExpandableText } from "@/components/ExpandableText";
import { Section, SectionCard } from "@/components/TitleParts";
import { personPage, type PersonCredit } from "@/lib/tmdb";
import { accountsOpen } from "@/lib/accounts";
import { optionalLibrary } from "@/lib/library";
import { previewArchive } from "@/lib/profile-previews";
import { Day } from "@/components/Day";

// A person's page, reached from a title's cast, crew, director or creator:
// who they are, then their filmography: what they have directed or created
// (anything still to come first, marked so), what they have acted in, and
// their other crew work, with whatever they are known for leading. Laid out in the title
// pages' pieces: section heading pills over cards, poster cards in a grid.
export async function generateMetadata({ params }: PageProps<"/person/[id]">): Promise<Metadata> {
  const { id } = await params;
  const p = await personPage(Number(id));
  return { title: p ? `${p.name} — Kodigo` : "Person — Kodigo" };
}

export default async function PersonPage({ params }: PageProps<"/person/[id]">) {
  const { id } = await params;
  const personID = Number(id);
  if (!Number.isInteger(personID)) notFound();
  const [p, seen] = await Promise.all([personPage(personID), seenKeys()]);
  if (!p) notFound();
  // "You've seen 7 of these": everything they're in, counted once.
  const all = new Set([...p.acted, ...p.directed, ...p.crew].map((c) => `${c.kind[0]}${c.id}`));
  const seenHere = [...all].filter((k) => seen.has(k)).length;

  const facts = [
    p.knownFor && { label: "Known for", value: p.knownFor },
    p.born && { label: "Born", value: <Day iso={p.born} /> },
    p.place && { label: "From", value: p.place },
    seen.size > 0 && { label: "You've seen", value: `${seenHere} of ${all.size}` },
  ].filter(Boolean) as { label: string; value: React.ReactNode }[];

  return (
    <div className="min-h-screen flex flex-col">
      <SiteNav />
      <main className="w-full px-[clamp(16px,3.2vw,64px)] pt-[clamp(12px,2.2vw,32px)] pb-20 flex-1 grid gap-8 content-start">
        <div className="grid gap-5 md:grid-cols-[minmax(0,220px)_minmax(0,1fr)] items-start">
          <div className="rounded-shell bg-card p-2">
            <div className="aspect-[2/3] rounded-shell overflow-hidden bg-piece">
              {p.photo && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.photo} alt="" className="w-full h-full object-cover" />
              )}
            </div>
          </div>
          <div className="rounded-shell bg-card p-2 grid gap-2">
            <div className="rounded-shell bg-piece p-3">
              <h1 className="!text-[clamp(30px,3vw,37px)] !leading-[.95] tracking-[.04em] uppercase">{p.name}</h1>
              {facts.length > 0 && (
                <div className="mt-2.5 border-t border-hair">
                  {facts.map((f, i) => (
                    <div key={f.label} className={`flex items-baseline justify-between gap-4 py-[8px] text-[12.5px] ${i < facts.length - 1 ? "border-b border-hair" : ""}`}>
                      <span className="text-dim shrink-0">{f.label}</span>
                      <span className="text-right min-w-0 text-ink">{f.value}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {p.biography && (
              <div className="rounded-shell bg-piece p-3">
                <ExpandableText text={p.biography} />
              </div>
            )}
          </div>
        </div>

        {p.knownFor === "Acting" && p.acted.length > 0 && <Credits title="Acting" items={p.acted} showRole seen={seen} />}
        {p.directed.length > 0 && <Credits title="Directed" items={p.directed} showRole={p.directed.some((c) => c.role === "Creator")} seen={seen} />}
        {p.knownFor !== "Acting" && p.acted.length > 0 && <Credits title="Acting" items={p.acted} showRole seen={seen} />}
        {p.crew.length > 0 && <Credits title="Crew" items={p.crew} showRole seen={seen} />}
      </main>
      <SiteFooter />
    </div>
  );
}

function Credits({ title, items, showRole, seen }: { title: string; items: PersonCredit[]; showRole: boolean; seen: Set<string> }) {
  const today = new Date().toISOString().slice(0, 10);
  const watched = items.filter((c) => seen.has(`${c.kind[0]}${c.id}`)).length;
  return (
    <Section title={`${title} · ${items.length}${seen.size ? ` · Seen ${watched}` : ""}`} small>
      <SectionCard>
        <div className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(130px,1fr))]">
          {items.map((c) => {
            const coming = !c.date || c.date > today;
            return (
              <Link key={`${c.kind}${c.id}`} href={`/${c.kind}/${c.id}`} className="group rounded-shell bg-piece overflow-hidden no-underline text-ink">
                <div className="relative aspect-[2/3] rounded-t-shell rounded-b-[8px] overflow-hidden bg-card">
                  {c.poster && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.poster} alt="" loading="lazy" className="w-full h-full object-cover" />
                  )}
                  {coming && <span className="absolute top-2 left-2 rounded-[6px] bg-accent-fill text-on-accent px-1.5 py-[2px] text-[10.5px] font-bold tracking-[.12em] uppercase">Coming</span>}
                  {seen.has(`${c.kind[0]}${c.id}`) && (
                    <span title="You've seen it" className="absolute right-1.5 bottom-1.5 w-6 h-6 rounded-full bg-accent-fill text-on-accent flex items-center justify-center">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" aria-label="Seen">
                        <path d="M5 12.5l4.5 4.5L19 7.5" />
                      </svg>
                    </span>
                  )}
                </div>
                <div className="px-2.5 pt-2 pb-2.5">
                  <div className="text-[12.5px] leading-[16px] font-semibold truncate group-hover:text-accent transition-colors">{c.title}</div>
                  <div className="text-[12.5px] leading-[16px] text-dim truncate">
                    {c.date ? (coming ? `Coming ${c.date.slice(0, 4)}` : c.date.slice(0, 4)) : "In the works"}
                    {c.kind === "show" && " · Series"}
                  </div>
                  {showRole && c.role && <div className="text-[12.5px] leading-[16px] text-dim truncate">{c.role}</div>}
                </div>
              </Link>
            );
          })}
        </div>
      </SectionCard>
    </Section>
  );
}

/** What the viewer has seen, by key ("m123", "s456"): films watched and
    series with an episode watched. Their own library when signed in, the
    preview's in development; nothing otherwise. */
async function seenKeys(): Promise<Set<string>> {
  const a = (accountsOpen ? (await optionalLibrary()).archive : null) ?? (await previewArchive());
  if (!a) return new Set();
  const films = new Set([...(a.watchedMovies ?? []), ...Object.keys(a.movieWatchedDates ?? {}).map(Number), ...a.movies.filter((t) => t.status === "Watched").map((t) => t.movie.id)]);
  const shows = new Set(a.watched.map((k) => Number(k.split("-")[0])));
  return new Set([...[...films].map((id) => `m${id}`), ...[...shows].map((id) => `s${id}`)]);
}
