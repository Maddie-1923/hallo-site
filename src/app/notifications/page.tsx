import type { Metadata } from "next";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { NotificationsPage } from "@/components/Notifications";
import { myNotifications } from "@/lib/my-notifications";

export const metadata: Metadata = { title: "Notifications — Kodigo" };

export default async function Notifications() {
  // Signed in, their own; signed out, none.
  const items = (await myNotifications()) ?? [];
  return (
    <div className="min-h-screen flex flex-col">
      <SiteNav />
      <main className="w-full px-[clamp(16px,3.2vw,64px)] pt-8 pb-20 flex-1">
        <NotificationsPage items={items} />
      </main>
      <SiteFooter />
    </div>
  );
}
