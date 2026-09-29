import type { Metadata } from "next";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { MembersPage } from "@/components/MembersPage";
import { MEMBERS } from "@/lib/members";

export const metadata: Metadata = { title: "Members — Kodigo" };

// Members. Only the made-up ones exist until accounts, in development.
export default function Members() {
  const members = process.env.NODE_ENV === "development" ? MEMBERS : [];
  return (
    <div className="min-h-screen flex flex-col">
      <SiteNav />
      <main className="w-full px-[clamp(16px,3.2vw,64px)] pt-8 pb-20 flex-1">
        <MembersPage members={members} />
      </main>
      <SiteFooter />
    </div>
  );
}
