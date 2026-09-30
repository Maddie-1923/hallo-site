import "server-only";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { hasPro } from "@/lib/pro";
import { CURRENT_VERSION, isArchive, type LibraryArchive } from "./archive";

// The one way the website writes a library: load the row's archive, change
// it, write it back with the row's `changed_at` moved. Its own module rather
// than inside library-actions.ts, so other sets of server actions (the saved
// categories in saved-rail-actions.ts) write the same way without it being a
// server action itself — anything exported from a "use server" file can be
// called from a browser.

const DEVICE = "Kodigo web";

// Swift's .iso8601 decoder refuses fractional seconds, so `toISOString()` as
// it comes would make the whole archive undecodable on the phone.
function now() {
  return new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
}

function emptyArchive(): LibraryArchive {
  return {
    version: CURRENT_VERSION,
    exported: now(),
    device: DEVICE,
    shows: [],
    movies: [],
    watched: [],
    watchedMovies: [],
    movieWatchedDates: {},
    watchedDates: {},
    watchedStamps: {},
    showTombstones: [],
    movieTombstones: [],
  };
}

// `pro`: a change only Kodigo Pro can make on the web (episode tracking and
// skips, the tracker's keys). Logging films, rating and reviewing are free.
export async function withArchive(mutate: (a: LibraryArchive, stamp: string) => void, opts: { pro?: boolean } = {}): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in to track titles." };
  if (opts.pro && !(await hasPro())) return { error: "Tracking and importing on the web come with Kodigo Pro." };

  const { data } = await supabase.from("libraries").select("archive").eq("user_id", user.id).maybeSingle();
  const archive: LibraryArchive = data && isArchive(data.archive) ? (data.archive as LibraryArchive) : emptyArchive();

  const stamp = now();
  try {
    mutate(archive, stamp);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Couldn't make that change." };
  }
  archive.exported = stamp;
  archive.device = DEVICE;

  const { error } = await supabase.from("libraries").upsert({
    user_id: user.id,
    archive,
    version: archive.version,
    changed_at: stamp,
    device: DEVICE,
  });
  if (error) return { error: error.message };
  revalidatePath("/calendar");
  return {};
}
