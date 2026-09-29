import { createClient } from "@/lib/supabase/server";

export interface Profile {
  display_name: string | null;
  banner_path: string | null;
  avatar_path: string | null;
  /** Which band of the banner survives the crop, 0 (top) to 100 (bottom). */
  banner_focus: number;
  /** Null until they choose one; until then nothing of theirs is public. */
  username: string | null;
  is_private: boolean;
  location: string | null;
  quote: string | null;
}

const EMPTY: Profile = { display_name: null, banner_path: null, avatar_path: null, banner_focus: 40, username: null, is_private: false, location: null, quote: null };

/** The signed-in person's profile dressing, or the empty one. */
export async function loadProfile(): Promise<Profile> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return EMPTY;
  const { data } = await supabase.from("profiles").select("display_name, banner_path, avatar_path, banner_focus, username, is_private, location, quote").eq("user_id", user.id).maybeSingle();
  if (!data) return EMPTY;
  // A row written before this column existed comes back without it.
  return { ...EMPTY, ...(data as Partial<Profile>) };
}
