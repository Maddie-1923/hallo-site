import type { Metadata } from "next";
import Link from "next/link";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { guides } from "@/lib/guides";

export const metadata: Metadata = {
  title: "Guides — Kodigo",
  description: "How to get the most out of Kodigo, the tracker for shows and films.",
  alternates: { canonical: "/guides" },
};

export default function Guides() {
  return (
    <div className="min-h-screen flex flex-col">
      <SiteNav />
      <main className="wrap prose py-16">
        <h1 className="!text-[clamp(44px,8vw,84px)]">Guides</h1>
        <p className="mt-6">How to get the most out of Kodigo, one task at a time.</p>
        {guides.map((g) => (
          <section key={g.href}>
            <h2>
              <Link href={g.href}>{g.title}</Link>
            </h2>
            <p>{g.summary}</p>
          </section>
        ))}
      </main>
      <SiteFooter />
    </div>
  );
}
