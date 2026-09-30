import type { Metadata } from "next";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { MembersPage } from "@/components/MembersPage";
import { memberDirectory } from "@/lib/member-directory";
import { accountsOpen } from "@/lib/accounts";

export const metadata: Metadata = { title: "Members — Kodigo" };

// Members: everyone with a public profile (lib/member-directory.ts).
export default async function Members() {
  const members = (await memberDirectory()) ?? [];
  return (
    <div className="min-h-screen flex flex-col">
      <SiteNav />
      <main className="w-full px-[clamp(16px,3.2vw,64px)] pt-8 pb-20 flex-1">
        <MembersPage members={members} live={accountsOpen} />
      </main>
      <SiteFooter />
    </div>
  );
}
