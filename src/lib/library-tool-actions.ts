"use server";

import { streamingOn } from "@/lib/tmdb";
import { hasPro } from "@/lib/pro";
import { accountsOpen } from "@/lib/accounts";

// Where each of a set of titles streams, for the Library's "Only what's on
// my services": { "s1399": [8, 337], ... }. Eight at a time, at most 400,
// each kept a day by the TMDB cache.
export async function servicesFor(titles: { kind: "show" | "movie"; id: number }[], region: string): Promise<Record<string, number[]>> {
  if (accountsOpen && !(await hasPro())) return {};
  if (!/^[A-Z]{2}$/.test(region)) return {};
  const list = titles.slice(0, 400);
  const out: Record<string, number[]> = {};
  for (let i = 0; i < list.length; i += 8) {
    const batch = list.slice(i, i + 8);
    const got = await Promise.all(batch.map((t) => streamingOn(t.kind, t.id, region).catch(() => [])));
    batch.forEach((t, j) => (out[`${t.kind[0]}${t.id}`] = got[j]));
  }
  return out;
}
