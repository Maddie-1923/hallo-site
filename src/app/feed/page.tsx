import type { Metadata } from "next";
import Link from "next/link";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { FeedList } from "@/components/FeedList";
import { accountsOpen } from "@/lib/accounts";
import { loadFeed, type FeedItem } from "@/lib/social-actions";

export const metadata: Metadata = { title: "Feed — Kodigo" };

// The friends' feed (docs/social-plan.md, step 4.1): what the people you
// follow reviewed, rated, loved and listed, newest first, from their public
// side.
export default async function Feed() {
  let items: FeedItem[] | null = null;
  let signedOut = false;
  if (accountsOpen) {
    items = await loadFeed();
    if (items === null) signedOut = true;
  }
  return (
    <div className="min-h-screen flex flex-col">
      <SiteNav />
      <main className="w-full px-[clamp(16px,3.2vw,64px)] pt-8 pb-20 flex-1">
        <div className="max-w-[63.3333rem] mx-auto grid gap-4">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <h1 className="!text-[clamp(36px,5vw,60px)] !leading-[.9] tracking-[.02em] uppercase">Feed</h1>
            <Link href="/members" className="text-[1.0417rem] font-semibold text-accent no-underline hover:underline">
              Find people to follow →
            </Link>
          </div>
          {signedOut ? (
            <p className="m-0 rounded-shell bg-card p-4 text-[1.0417rem] text-mid-tone">
              <Link href="/login?next=/feed" className="text-accent no-underline hover:underline">
                Sign in
              </Link>{" "}
              to see what the people you follow are watching.
            </p>
          ) : items && items.length ? (
            <FeedList items={items} />
          ) : (
            <p className="m-0 rounded-shell bg-card p-4 text-[1.0417rem] text-mid-tone">Follow people from Members, and what they rate, review and list shows up here.</p>
          )}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
