import type { LibraryArchive } from "../archive";
import { mergeArchives } from "./merge";
import type { ImportPlan } from "./types";

// Landing an import's plan on a library — what Android does with
// `library.apply(archive, Merge)` and then the rating and heart setters,
// here as one step on a plain archive so it can run wherever the library row
// is read and written.

/**
 * Whether the plan's archive says anything a merge would act on. An import
 * that found nothing new never calls `apply` on the phones, and a merge of an
 * empty archive isn't quite nothing (it prunes and re-sorts), so this one
 * doesn't either.
 */
function carriesSomething(a: LibraryArchive) {
  return (
    (a.shows?.length ?? 0) > 0 ||
    (a.movies?.length ?? 0) > 0 ||
    (a.watched?.length ?? 0) > 0 ||
    (a.watchedMovies?.length ?? 0) > 0 ||
    Object.keys(a.watchedDates ?? {}).length > 0 ||
    Object.keys(a.movieWatchedDates ?? {}).length > 0
  );
}

/**
 * The library with the plan folded in: the plan's archive merged onto it as
 * the phones merge an import, then each rating and heart set only where the
 * library holds none of its own — an import fills gaps and never overwrites
 * a verdict given here. Returns a new archive and leaves `library` alone.
 *
 * `exported` and `device` come out as the merge leaves them (the import's
 * moment and "Import"); whoever saves the result stamps its own, as every
 * write from the web does.
 */
export function applyImportPlan(library: LibraryArchive, plan: ImportPlan, now: Date): LibraryArchive {
  const out: LibraryArchive = carriesSomething(plan.archive) ? mergeArchives(plan.archive, library, now) : { ...library };
  const ratings = { ...(out.ratings ?? {}) };
  for (const [key, score] of Object.entries(plan.ratings)) if (ratings[key] == null) ratings[key] = score;
  const reactions = { ...(out.reactions ?? {}) };
  for (const key of plan.loved) if (reactions[key] == null) reactions[key] = "loved";
  if (Object.keys(ratings).length > 0 || out.ratings) out.ratings = ratings;
  if (Object.keys(reactions).length > 0 || out.reactions) out.reactions = reactions;
  return out;
}
