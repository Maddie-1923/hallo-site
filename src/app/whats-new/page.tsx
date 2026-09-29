import type { Metadata } from "next";
import Link from "next/link";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { HeadingPill } from "@/components/TitleParts";
import { updates, type Update } from "@/lib/updates";

export const metadata: Metadata = {
  title: "What's new — Kodigo",
  description: "New features and updates in the Kodigo app and on the website.",
};

// What's new: every feature and update, newest first, each in a shell of its
// own: when, where (the app or the website), whether it can be used yet, what
// it is, and the points worth knowing. The notes themselves live in
// lib/updates.ts.
export default function WhatsNewPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <SiteNav />
      <main className="w-full px-[clamp(16px,3.2vw,64px)] pt-[clamp(12px,2.2vw,32px)] pb-20 flex-1">
        <div className="max-w-[760px] mx-auto">
          <div className="rounded-shell bg-card p-2">
            <div className="rounded-shell bg-piece p-3">
              <h1 className="!text-[clamp(36px,5vw,56px)] !leading-[.95] tracking-[.02em] uppercase">What&apos;s new</h1>
              <p className="m-0 mt-2 text-[12.5px] leading-[1.6] text-mid-tone">
                New features and fixes in the Kodigo app and on this website, newest first. For what Pro unlocks, see{" "}
                <Link href="/pro" className="text-accent no-underline hover:underline">
                  Kodigo Pro
                </Link>
                .
              </p>
            </div>
          </div>
          <div className="mt-8 grid gap-8">
            {updates.map((u) => (
              <Entry key={`${u.date}${u.title}`} u={u} />
            ))}
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

function Entry({ u }: { u: Update }) {
  return (
    <section className="grid gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <HeadingPill small>{longDate(u.date)}</HeadingPill>
        <Chip>{u.where}</Chip>
        <Chip tone={u.status}>{u.status === "live" ? "Live" : u.status === "in review" ? "In review" : "Coming soon"}</Chip>
      </div>
      <div className="rounded-shell bg-card p-2 border-[0.5px] border-t-[color:var(--lit-edge)] border-x-piece border-b-well shadow-[0_4px_9px_rgba(0,0,0,.35)]">
        <div className="rounded-shell bg-piece p-3">
          <h2 className="display !text-[22px] !leading-none tracking-[.03em] uppercase">{u.title}</h2>
          <p className="m-0 mt-2 text-[12.5px] leading-[1.6] text-mid-tone">{u.summary}</p>
          <ul className="m-0 mt-2.5 p-0 list-none border-t border-hair">
            {u.points.map((p) => (
              <li key={p} className="flex gap-2.5 py-[8px] border-b border-hair last:border-b-0 last:pb-0 text-[12.5px] leading-[1.6] text-ink">
                <span aria-hidden className="text-accent">•</span>
                <span>{p}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

/** A small label beside the date, lettered as the tab bar. */
function Chip({ children, tone }: { children: React.ReactNode; tone?: Update["status"] }) {
  const fill = tone === "live" ? "bg-accent-fill text-on-accent" : tone ? "bg-[color:var(--quiet)] text-ink" : "bg-piece text-dim";
  return <span className={`inline-flex items-center h-[26px] px-3 rounded-full text-[10.5px] font-bold uppercase tracking-[.12em] ${fill}`}>{children}</span>;
}

function longDate(d: string) {
  const [y, m, day] = d.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, day)).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}
