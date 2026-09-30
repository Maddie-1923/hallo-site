import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { ProfilePage } from "@/components/ProfilePage";
import { loadProfile } from "@/lib/real-profile";
import { BlockGate } from "@/components/SafetySheets";

// A public profile at /u/<username>, read from the public tables; anyone
// else's private profile shows only what a stranger may see.
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
      {/* Someone you've blocked: a notice and Unblock in place of the page. */}
      {view.owner ? (
        <ProfilePage view={view} />
      ) : (
        <BlockGate username={view.username}>
          <ProfilePage view={view} />
        </BlockGate>
      )}
      <SiteFooter />
    </div>
  );
}
