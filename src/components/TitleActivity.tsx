import Link from "next/link";
import type { LibraryArchive, Movie, Show } from "@/lib/archive";
import { ReviewPanel } from "./ReviewPanel";

type Target = { kind: "show"; show: Show } | { kind: "movie"; movie: Movie };

// The person's side of a title page: what they've done with it (the
// "Recent activity" row in the list menu lands on #activity) and the review
// tiles under it. Signed out, the activity tile is a sign-in nudge and the
// review tiles still draw so the page reads the same either way.
export function TitleActivity({ target, archive, signedIn }: { target: Target; archive: LibraryArchive | null; signedIn: boolean }) {
  const id = target.kind === "show" ? target.show.id : target.movie.id;
  const key = `${target.kind}:${id}`;
  const rating = archive?.ratings?.[key] ?? null;
  const loved = archive?.reactions?.[key] === "loved";
  const review = archive?.reviews?.[key] ?? null;
  const lists = (archive?.customLists ?? []).filter((l) => (target.kind === "show" ? l.showIDs : l.movieIDs)?.includes(id));

  const facts: { label: string; value: string }[] = [];
  if (target.kind === "movie") {
    const t = archive?.movies.find((m) => m.movie.id === id);
    if (t) facts.push({ label: "Status", value: t.status });
    const seen = archive?.movieWatchedDates?.[String(id)];
    if (seen) facts.push({ label: "First watched", value: seen.slice(0, 10) });
  } else {
    const t = archive?.shows.find((s) => s.show.id === id);
    if (t) facts.push({ label: "Status", value: t.status });
    const eps = (archive?.watched ?? []).filter((k) => k.startsWith(`${id}-`)).length;
    if (eps) facts.push({ label: "Episodes watched", value: String(eps) });
  }
  if (review?.watchedOn) facts.push({ label: review.rewatch ? "Rewatched" : "Watched", value: review.watchedOn });
  if (rating !== null) facts.push({ label: "Rating", value: `${rating} / 10` });
  if (loved) facts.push({ label: "Favorite", value: "♥" });
  if (lists.length) facts.push({ label: "On lists", value: lists.map((l) => l.name).join(", ") });

  return (
    <div className="mt-10 grid gap-8">
      <section id="activity" className="scroll-mt-24">
        <h2 className="display text-3xl mb-4">Your activity</h2>
        {!signedIn ? (
          <p className="text-sm text-dim m-0">
            <Link href={`/login?next=/${target.kind}/${id}`} className="text-ink">
              Sign in
            </Link>{" "}
            to see what you&rsquo;ve done with this title.
          </p>
        ) : facts.length === 0 ? (
          <p className="text-sm text-dim m-0">Nothing yet. Mark it, rate it, or write it up below.</p>
        ) : (
          <dl className="grid gap-3 grid-cols-2 sm:grid-cols-4 m-0">
            {facts.map((f) => (
              <div key={f.label} className="rounded-2xl border border-hair bg-card p-4">
                <dt className="eyebrow">{f.label}</dt>
                <dd className="m-0 mt-1 text-lg font-semibold text-ink truncate" title={f.value}>
                  {f.value}
                </dd>
              </div>
            ))}
            {review?.text && (
              <div className="rounded-2xl border border-hair bg-card p-4 col-span-2 sm:col-span-4">
                <dt className="eyebrow">Review{review.spoilers ? " · spoilers" : ""}</dt>
                <dd className="m-0 mt-1 text-[15px] text-bone whitespace-pre-wrap">{review.text}</dd>
              </div>
            )}
          </dl>
        )}
      </section>
      <ReviewPanel target={target} review={review} rating={rating} loved={loved} signedIn={signedIn} />
    </div>
  );
}
