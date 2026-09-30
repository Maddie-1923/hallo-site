import Link from "next/link";
import type { ReviewEntry } from "@/lib/public-profile";
import type { TitleRatings } from "@/lib/public-reads";
import { ReviewCard } from "./ReviewCard";
import { Unblocked } from "./SafetySheets";
import { Section, SectionCard } from "./TitleParts";

// Members' reviews of the title, above the cast: each as the profile's review
// card without the poster and title (the page is already about them). Until
// accounts open, only the development previews' reviews are here.
export function ReviewsSection({ reviews, ratings = null }: { reviews: { review: ReviewEntry; username: string; avatar: string | null }[]; ratings?: TitleRatings | null }) {
  return (
    <Section title={reviews.length ? `Reviews · ${reviews.length}` : "Reviews"} small>
      <SectionCard>
        {ratings && <RatingsSummary r={ratings} />}
        {reviews.length ? (
          <div className="grid gap-2">
            {reviews.map(({ review, username, avatar }) => (
              <Unblocked key={`${username}-${review.key}`} username={username}>
                <ReviewCard r={review} username={username} avatar={avatar} onTitlePage />
              </Unblocked>
            ))}
          </div>
        ) : (
          <p className="m-0 px-3 py-4 text-[12.5px] text-dim">No reviews yet. Members&apos; reviews show here once accounts open.</p>
        )}
      </SectionCard>
    </Section>
  );
}

// Above the reviews: members' average out of 10 with how the ratings spread
// (each bar's height against the tallest), how many loved it, and the
// people the reader follows who rated it, each to their review or profile.
function RatingsSummary({ r }: { r: TitleRatings }) {
  const top = Math.max(1, ...r.spread);
  return (
    <div className="mb-2 rounded-[10px] bg-piece p-3 grid gap-3">
      {r.count > 0 && (
        <div className="flex items-end justify-between gap-4">
          <div>
            <div className="flex items-baseline gap-1.5">
              <span aria-hidden className="text-loved text-[18px] leading-none">♥</span>
              <span className="display text-[34px] leading-[.85] text-ink">{r.average?.toFixed(1)}</span>
              <span className="text-[12.5px] text-dim">/10</span>
            </div>
            <div className="mt-1 text-[12px] text-dim">
              {r.count.toLocaleString("en")} {r.count === 1 ? "rating" : "ratings"}
              {r.loved > 0 && ` · ${r.loved.toLocaleString("en")} loved it`}
            </div>
          </div>
          <div role="img" aria-label={`Ratings from 1 to 10: ${r.spread.join(", ")}`} className="flex items-end gap-[3px] h-10">
            {r.spread.map((n, i) => (
              <span key={i} title={`${i + 1}: ${n}`} className="w-[7px] rounded-t-[2px] bg-accent-fill" style={{ height: `${Math.max(6, (n / top) * 100)}%`, opacity: n ? 1 : 0.25 }} />
            ))}
          </div>
        </div>
      )}
      {r.friends.length > 0 && (
        <div className="grid gap-1.5">
          <div className="text-[10.5px] font-bold uppercase tracking-[.12em] text-dim">People you follow</div>
          <ul className="m-0 p-0 list-none flex flex-wrap gap-2">
            {r.friends.slice(0, 12).map((f) => (
              <li key={f.username}>
                <Unblocked username={f.username}>
                  <Link href={f.href} title={`@${f.username}`} className="flex items-center gap-1.5 h-8 pl-1 pr-2.5 rounded-full bg-card border border-hair no-underline text-ink hover:border-accent">
                    <span className="w-6 h-6 rounded-full overflow-hidden bg-accent-fill text-on-accent flex items-center justify-center text-[11px] font-semibold">
                      {f.avatar ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={f.avatar} alt="" className="w-full h-full object-cover object-top" />
                      ) : (
                        f.username[0].toUpperCase()
                      )}
                    </span>
                    <span className="text-[12px] font-semibold">{f.rating != null ? String(f.rating).replace(/\.0$/, "") : ""}</span>
                    {f.loved && <span aria-label="loved it" className="text-loved text-[12px]">♥</span>}
                  </Link>
                </Unblocked>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
