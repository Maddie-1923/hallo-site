"use server";

import { movieBillboard, showBillboard } from "@/lib/tmdb";

/** A title's trailer (a YouTube id), for the poster menu's Watch trailer.
    The same pick the billboard makes, and cached with it. */
export async function trailerFor(kind: "show" | "movie", id: number): Promise<string | null> {
  const n = Math.floor(Number(id));
  if (!Number.isFinite(n) || n <= 0) return null;
  const b = kind === "show" ? await showBillboard(n) : await movieBillboard(n);
  return b?.trailer ?? null;
}
