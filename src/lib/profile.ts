import { createClient } from "@/lib/supabase/server";

export interface Profile {
  display_name: string | null;
  banner_path: string | null;
  avatar_path: string | null;
}

const EMPTY: Profile = { display_name: null, banner_path: null, avatar_path: null };

/** The signed-in person's profile dressing, or the empty one. */
export async function loadProfile(): Promise<Profile> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return EMPTY;
  const { data } = await supabase.from("profiles").select("display_name, banner_path, avatar_path").eq("user_id", user.id).maybeSingle();
  return (data as Profile | null) ?? EMPTY;
}
