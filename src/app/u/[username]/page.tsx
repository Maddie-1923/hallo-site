import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { ProfilePage } from "@/components/ProfilePage";
import { loadProfile } from "@/lib/profile-previews";

// A public profile at /u/<username>.
//
// Real profiles are read from the public tables once they exist (see
// docs/social-plan.md, steps 1 and 2); until then every username is a 404.
// Two previews exist on a development machine only, never in a build that
// ships:
// - /u/preview draws a library file from disk (PROFILE_PREVIEW_FILE), so a
//   real library can be seen in the layout without anything being uploaded;
// - /u/sample draws a made-up profile from this week's TMDB titles, so the
//   layout can be judged with every section full.
export async function generateMetadata({ params }: PageProps<"/u/[username]">): Promise<Metadata> {
  const { username } = await params;
  return { title: `@${username} — Kodigo` };
}

export default async function UserProfile({ params }: PageProps<"/u/[username]">) {
  const { username } = await params;
  const view = await loadProfile(username);
  if (!view) notFound();

  return (
    <div className="min-h-screen flex flex-col">
      <SiteNav />
      <ProfilePage view={view} />
      <SiteFooter />
    </div>
  );
}
