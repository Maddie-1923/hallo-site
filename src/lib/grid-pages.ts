import "server-only";
import { accountsOpen } from "@/lib/accounts";
import { optionalLibrary } from "@/lib/library";
import { markLookup, type ListOption } from "@/lib/marks";
import { visitorRegion } from "@/lib/region";
import { savedRailTitles } from "@/lib/tmdb";
import { EXPLORE_RAILS, movieCards, showCards } from "@/lib/explore-rails";
import { emptyFilter, orderedRails, readFilterParam, sameID } from "@/lib/saved-rails";
import type { GridTitle } from "@/components/PosterGrid";
import type { PosterRowItem } from "@/components/PosterRow";

// One page of a poster grid, whichever kind: Browse's results, a built-in
// row opened up, or a custom category. The first page is drawn by the page
// itself; the rest arrive as the visitor scrolls (`moreGrid`), so every
// grid fills itself in rather than asking for "Show more".
export type GridSource = { kind: "filter"; f: string } | { kind: "rail"; slug: string } | { kind: "category"; id: string };
export type GridPage = { items: PosterRowItem[]; lists: ListOption[]; more: boolean };

/** TMDB serves up to 500 pages; 25 is far past anybody's scrolling. */
const PAGE_CAP = 25;

export async function gridPage(source: GridSource, page: number): Promise<GridPage> {
  const [region, lib] = await Promise.all([visitorRegion(), accountsOpen ? optionalLibrary() : Promise.resolve({ archive: null })]);
  const marks = markLookup(lib.archive);
  let titles: GridTitle[] = [];
  let more = false;

  if (source.kind === "filter") {
    const f = readFilterParam(source.f) ?? emptyFilter();
    const results = await Promise.all(f.kinds.map((catalogue) => savedRailTitles({ catalogue, filter: f }, region, page)));
    const lists = results.map((r) => (r.kind === "show" ? showCards(r.titles) : movieCards(r.titles)));
    for (let i = 0; i < Math.max(0, ...lists.map((l) => l.length)); i++) for (const l of lists) if (l[i]) titles.push(l[i]);
    more = results.some((r) => r.pages > page);
  } else if (source.kind === "rail") {
    const rail = EXPLORE_RAILS[source.slug];
    if (rail) {
      titles = await rail.page(page, region);
      // TMDB doesn't say how many pages these lists have; an empty page is the end.
      more = titles.length > 0;
    }
  } else {
    const rail = lib.archive ? orderedRails(lib.archive).find((r) => sameID(r.id, source.id)) : undefined;
    if (rail) {
      const r = await savedRailTitles(rail, region, page);
      titles = r.kind === "show" ? showCards(r.titles) : movieCards(r.titles);
      more = r.pages > page;
    }
  }

  const items = titles
    .filter((t) => t.poster)
    .map((t) => ({ ...t, marks: t.target.kind === "show" ? marks.show(t.target.show.id) : marks.movie(t.target.movie.id) }));
  return { items, lists: marks.lists, more: more && page < PAGE_CAP };
}
