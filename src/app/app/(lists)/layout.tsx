import { ListsSubnav } from "@/components/ListsSubnav";
import { ProfileHeader } from "@/components/ProfileHeader";
import { optionalLibrary } from "@/lib/library";
import { loadProfile } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";

// "My Lists" — the tracking half of the site. A profile banner across the
// top, the person's name and numbers, the Shows · Movies row, and each page
// below draws only its own run.
export default async function ListsLayout({ children }: LayoutProps<"/app">) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const [{ archive }, profile] = await Promise.all([optionalLibrary(), loadProfile()]);

  return (
    <>
      <ProfileHeader profile={profile} archive={archive} email={user?.email ?? ""} />
      <div className="wrap pb-12">
        <ListsSubnav />
        <div className="mt-2">{children}</div>
      </div>
    </>
  );
}
