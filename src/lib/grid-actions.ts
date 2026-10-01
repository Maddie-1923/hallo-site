"use server";

import { gridPage, type GridPage, type GridSource } from "@/lib/grid-pages";

/** The next page of a poster grid, for the grid's own scrolling. */
export async function moreGrid(source: GridSource, page: number): Promise<GridPage> {
  const p = Math.max(2, Math.min(25, Math.floor(Number(page)) || 2));
  return gridPage(source, p);
}
