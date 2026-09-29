import type { ReviewEntry } from "@/lib/public-profile";
import { ReviewCard } from "./ReviewCard";
import { Unblocked } from "./SafetySheets";
import { Section, SectionCard } from "./TitleParts";

// Members' reviews of the title, above the cast: each as the profile's review
// card without the poster and title (the page is already about them). Until
// accounts open, only the development previews' reviews are here.
export function ReviewsSection({ reviews }: { reviews: { review: ReviewEntry; username: string; avatar: string | null }[] }) {
  return (
    <Section title={reviews.length ? `Reviews · ${reviews.length}` : "Reviews"} small>
      <SectionCard>
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
