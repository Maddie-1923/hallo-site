import type { Metadata } from "next";
import Link from "next/link";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { FeedList } from "@/components/FeedList";
import { accountsOpen } from "@/lib/accounts";
import { MEMBERS } from "@/lib/members";
import { loadProfile } from "@/lib/profile-previews";
import { loadFeed, type FeedItem } from "@/lib/social-actions";

export const metadata: Metadata = { title: "Feed — Kodigo" };

// The friends' feed (docs/social-plan.md, step 4.1): what the people you
// follow reviewed, rated, loved and listed, newest first, from their public
// side. Signed in, your own; before accounts, development shows the sample
// members' so the page can be judged.
export default async function Feed() {
  let items: FeedItem[] | null = null;
  let signedOut = false;
  if (accountsOpen) {
    items = await loadFeed();
    if (items === null) signedOut = true;
  } else if (process.env.NODE_ENV === "development") {
    items = await sampleFeed();
  }
  return (
    <div className="min-h-screen flex flex-col">
      <SiteNav />
      <main className="w-full px-[clamp(16px,3.2vw,64px)] pt-8 pb-20 flex-1">
        <div className="max-w-[760px] mx-auto grid gap-4">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <h1 className="!text-[clamp(36px,5vw,60px)] !leading-[.9] tracking-[.02em] uppercase">Feed</h1>
            <Link href="/members" className="text-[12.5px] font-semibold text-accent no-underline hover:underline">
              Find people to follow →
            </Link>
          </div>
          {signedOut ? (
            <p className="m-0 rounded-shell bg-card p-4 text-[12.5px] text-mid-tone">
              <Link href="/login?next=/feed" className="text-accent no-underline hover:underline">
                Sign in
              </Link>{" "}
              to see what the people you follow are watching.
            </p>
          ) : items && items.length ? (
            <FeedList items={items} />
          ) : (
            <p className="m-0 rounded-shell bg-card p-4 text-[12.5px] text-mid-tone">Follow people from Members, and what they rate, review and list shows up here.</p>
          )}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

/** The sample members' reviews and ratings, as a feed. Development only. */
async function sampleFeed(): Promise<FeedItem[]> {
  const views = await Promise.all(MEMBERS.slice(0, 5).map((m) => loadProfile(m.username)));
  const out: FeedItem[] = [];
  views.forEach((v, i) => {
    if (!v) return;
    const who = { username: v.username, displayName: v.displayName, avatar: v.avatar };
    v.reviews.slice(0, 2).forEach((r, j) =>
      out.push({ key: `${v.username}-${r.key}`, who, at: new Date(Date.now() - (i * 5 + j * 9 + 1) * 3_600_000).toISOString(), kind: "review", title: r.title, href: r.href, poster: r.poster, rating: r.rating, text: r.text, spoilers: r.spoilers, reviewHref: `/u/${v.username}/review/${r.key}` }),
    );
    v.diary.slice(2, 3).forEach((d) => out.push({ key: `${v.username}-${d.key}-r`, who, at: new Date(Date.now() - (i * 7 + 3) * 3_600_000).toISOString(), kind: d.loved ? "loved" : "rating", title: d.title, href: d.href, poster: d.poster, rating: d.rating, text: null, spoilers: false }));
  });
  return out.sort((a, b) => b.at.localeCompare(a.at));
}
