import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { ReviewSheetCard } from "@/components/ReviewSheet";
import { BlockGate } from "@/components/SafetySheets";
import { CommentThread } from "@/components/CommentThread";
import { HeadingPill } from "@/components/TitleParts";
import { loadProfile } from "@/lib/real-profile";
import { reviewFor } from "@/lib/public-profile";

// A review's own page, the address Share hands out: /u/<username>/review/<title key>.
// It is the Watchlog's review sheet standing on the page, with who wrote it
// above, since whoever opens a shared link may not know them. The link
// preview beside it (opengraph-image.tsx) is drawn to match.
//
// Like the profile, only the two development previews exist until the public
// tables do (docs/social-plan.md, step 3.3).
async function load(params: PageProps<"/u/[username]/review/[key]">["params"]) {
  const { username, key } = await params;
  const view = await loadProfile(username);
  const review = view && reviewFor(view, key);
  return view && review ? { view, review } : null;
}

export async function generateMetadata({ params }: PageProps<"/u/[username]/review/[key]">): Promise<Metadata> {
  const found = await load(params);
  if (!found) return { title: "Kodigo" };
  const { view, review } = found;
  const title = `@${view.username}'s review of ${review.title} (${review.year}) — Kodigo`;
  // A spoiler review keeps its words out of the preview as well as off the page.
  const description = review.spoilers ? "This review contains spoilers." : review.text.split(/\n\s*\n/)[0].slice(0, 200);
  return { title, description, openGraph: { title, description, type: "article" }, twitter: { card: "summary_large_image", title, description } };
}

export default async function ReviewPage({ params }: PageProps<"/u/[username]/review/[key]">) {
  const found = await load(params);
  if (!found) notFound();
  const { view, review } = found;
  return (
    <div className="min-h-screen flex flex-col">
      <SiteNav />
      <main className="flex-1 w-full max-w-[600px] mx-auto px-4 py-8">
        <BlockGate username={view.username} bare>
        <Link href={`/u/${view.username}`} className="flex items-center gap-3 mb-4 no-underline text-ink group">
          <span className="w-11 h-11 rounded-full overflow-hidden bg-card-hi border border-hair shrink-0">
            {view.avatar && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={view.avatar} alt="" className="w-full h-full object-cover" />
            )}
          </span>
          <span className="min-w-0">
            <span className="block font-semibold group-hover:text-accent transition-colors">{view.displayName}</span>
            <span className="block text-[13px] text-dim">@{view.username}</span>
          </span>
        </Link>
        <article className="rounded-shell bg-card border border-hair overflow-hidden">
          <ReviewSheetCard r={review} username={view.username} avatar={view.avatar} />
        </article>
        {/* What people said about it. */}
        <section className="mt-8 grid gap-2">
          <HeadingPill small>Comments</HeadingPill>
          <CommentThread kind="review" owner={view.username} target={review.key} href={`/u/${view.username}/review/${review.key}`} />
        </section>
        </BlockGate>
      </main>
      <SiteFooter />
    </div>
  );
}
