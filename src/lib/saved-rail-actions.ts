"use server";

import { withArchive } from "@/lib/archive-write";
import { accountsOpen } from "@/lib/accounts";
import { applyCreateRails, applyDeleteRail, applyRenameRail, applyReorderRails, applySetRailFilter, cleanFilter, RAIL_LIMIT, type Catalogue } from "@/lib/saved-rails";

// Custom categories from the web: the app's createRail, renameRail,
// setRailFilter and deleteRail (Library.swift), written into the synced
// archive so the phone finds them on its next sync. The rules themselves are
// in saved-rails.ts, where the tests can reach them; these only take what
// the browser sent, tidy it, and write.

const closed = { error: "Custom categories open with accounts." };

/** Saving a filter as a category: one per catalogue it asks. `refused` names
    a catalogue that was already full while the other was saved. */
export async function createRails(name: string, filter: unknown): Promise<{ error?: string; refused?: Catalogue[] }> {
  if (!accountsOpen) return closed;
  let refused: Catalogue[] = [];
  const r = await withArchive((a, stamp) => {
    const out = applyCreateRails(a, name, cleanFilter(filter), stamp);
    if (!out.created.length) throw new Error(`${out.refused.join(" and ")} already ${out.refused.length > 1 ? "have" : "has"} ${RAIL_LIMIT} saved categories. Remove one to make room.`);
    refused = out.refused;
  });
  return r.error ? r : { refused };
}

export async function renameRail(id: string, name: string): Promise<{ error?: string }> {
  if (!accountsOpen) return closed;
  return withArchive((a) => applyRenameRail(a, String(id), String(name ?? "")));
}

export async function setRailFilter(id: string, filter: unknown): Promise<{ error?: string }> {
  if (!accountsOpen) return closed;
  return withArchive((a) => applySetRailFilter(a, String(id), cleanFilter(filter)));
}

export async function deleteRail(id: string): Promise<{ error?: string }> {
  if (!accountsOpen) return closed;
  return withArchive((a) => applyDeleteRail(a, String(id)));
}

/** Explore's Arrange: the order of the visitor's own categories, kept in
    the synced archive so the phone shows them in the same order. */
export async function reorderRails(ids: string[]): Promise<{ error?: string }> {
  if (!accountsOpen) return closed;
  const clean = (Array.isArray(ids) ? ids : []).filter((x): x is string => typeof x === "string").slice(0, 40);
  return withArchive((a) => applyReorderRails(a, clean));
}
