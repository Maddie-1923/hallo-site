import { createClient } from "@/lib/supabase/server";
import { isArchive, type LibraryArchive } from "./archive";

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
