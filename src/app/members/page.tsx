import type { Metadata } from "next";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { MembersPage } from "@/components/MembersPage";
import { MEMBERS } from "@/lib/members";
import { memberDirectory } from "@/lib/member-directory";
import { accountsOpen } from "@/lib/accounts";

export const metadata: Metadata = { title: "Members — Kodigo" };

// Members: the real ones once accounts are open (lib/member-directory.ts);
// before that, in development, the made-up ones.
export default async function Members() {
  const members = (await memberDirectory()) ?? (process.env.NODE_ENV === "development" ? MEMBERS : []);
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
