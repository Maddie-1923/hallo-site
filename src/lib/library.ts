import { createClient } from "@/lib/supabase/server";
import { isArchive, type LibraryArchive } from "./archive";
import { accountsOpen } from "./accounts";
import { loadProfile } from "./profile";

export interface LibraryRow {
  archive: LibraryArchive;
  version: number;
  changed_at: string;
  device: string | null;
  updated_at: string;
}

/**
 * The library for a page anyone can see. `signedIn: false` when nobody is,
 * `archive: null` when they are but nothing has synced yet.
 */
export async function optionalLibrary(): Promise<{ signedIn: boolean; archive: LibraryArchive | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { signedIn: false, archive: null };
  const { data } = await supabase.from("libraries").select("archive").eq("user_id", user.id).maybeSingle();
  return { signedIn: true, archive: data && isArchive(data.archive) ? (data.archive as LibraryArchive) : null };
}

/** The signed-in person's library row, or null when they haven't synced yet. */
export async function loadLibrary(): Promise<{ userId: string; email?: string; row: LibraryRow | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");

  const { data } = await supabase
    .from("libraries")
    .select("archive, version, changed_at, device, updated_at")
    .eq("user_id", user.id)
    .maybeSingle();

  const row = data && isArchive(data.archive) ? (data as LibraryRow) : null;
  return { userId: user.id, email: user.email ?? undefined, row };
}

/** The signed-in person's library when `username` is theirs, else null: the
    pages made from a whole library (Year in review) are the owner's own. */
export async function ownLibraryAt(username: string): Promise<LibraryArchive | null> {
  if (!accountsOpen) return null;
  const [{ archive }, me] = await Promise.all([optionalLibrary(), loadProfile()]);
  return me.username && me.username === username.toLowerCase() ? archive : null;
}
