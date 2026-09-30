import Link from "next/link";
import type { ReviewEntry } from "@/lib/public-profile";
import { ReviewActions } from "./ReviewActions";
import { ReviewHeading } from "./ReviewSheet";
import { PinReview } from "./PinReview";

// A review as a card, on a profile's Reviews tab and on the title's own
// page (where the poster and title are left off, the page being about it).
// Spaced like the review sheet (components/ReviewSheet.tsx): one 16px inset
// all round, the heading (who, title, stars) set close as a group, and 16px
// between every group under it.
// On its owner's own profile (`owner`) the card can be pinned to the top.
export function ReviewCard({ r, username, avatar, onTitlePage = false, owner = false }: { r: ReviewEntry; username: string; avatar: string | null; onTitlePage?: boolean; owner?: boolean }) {
  const paragraphs = r.text.split(/\n\s*\n/);
  const body = (
    <div className="mt-4 grid gap-2 text-[12.5px] leading-[1.6] text-bone max-w-[80ch]">
      {paragraphs.map((p, i) => (
        <p key={i} className="m-0">
          {p}
        </p>
      ))}
    </div>
  );
  return (
    <article className="rounded-shell bg-card-hi p-3 flex gap-3">
      {!onTitlePage && (
        <Link href={r.href} className="w-[clamp(64px,7vw,88px)] shrink-0 self-start">
          {r.poster && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={r.poster} alt={r.title} className="w-full aspect-[2/3] rounded-[8px] object-cover border border-hair" />
          )}
        </Link>
      )}
      <div className="min-w-0 flex-1">
        {(r.pinned || owner) && !onTitlePage && (
          <div className="mb-2 flex items-center gap-3">
            {r.pinned && <span className="px-2 py-[2px] rounded-full bg-accent-fill text-on-accent text-[10px] font-bold uppercase tracking-[.12em]">Pinned</span>}
            {owner && <PinReview reviewKey={r.key} pinned={!!r.pinned} />}
          </div>
        )}
        <ReviewHeading username={username} avatar={avatar} r={{ ...r, episodes: r.episode }} titleHref={r.href} hideTitle={onTitlePage} />

        {r.spoilers ? (
          <details className="mt-4 group/sp">
            <summary className="list-none cursor-pointer inline-flex items-center gap-2 text-[12.5px] text-dim hover:text-ink [&::-webkit-details-marker]:hidden">
              <span className="px-2 py-[2px] rounded-full bg-card border border-hair text-[10.5px] font-bold uppercase tracking-[.12em]">Spoilers</span>
              <span className="group-open/sp:hidden">This review gives things away. Show it anyway.</span>
              <span className="hidden group-open/sp:inline">Hide it again</span>
            </summary>
            {body}
          </details>
        ) : (
          body
        )}

        <ReviewActions likes={r.likes} comments={r.comments} title={r.title} shareHref={`/u/${username}/review/${r.key}`} what={{ kind: "review", target: `${username}/${r.key}`, author: username, href: `/u/${username}/review/${r.key}`, excerpt: r.text.slice(0, 200) }} owner={username} reviewKey={r.key} className="mt-4" />
      </div>
    </article>
  );
}
