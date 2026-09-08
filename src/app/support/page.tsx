import type { Metadata } from "next";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";

export const metadata: Metadata = { title: "Support — Kodigo" };

export default function Support() {
  return (
    <div className="scheme-dark min-h-screen flex flex-col">
        <SiteNav />
        <main className="wrap prose py-16">
          <h1 className="!text-[clamp(44px,8vw,84px)]">Support</h1>
          <p className="mt-6">
            Kodigo keeps track of the shows and movies you&apos;re watching — what you&apos;ve seen,
            what&apos;s waiting, and when the next episode airs. It runs on your phone, with show
            details, ratings and air times pulled from TMDB, OMDb and TVMaze.
          </p>

          <h2>Get in touch</h2>
          <p>
            <strong>hello@kodigo.pro</strong>
          </p>
          <p>I usually reply within two or three days.</p>

          <h2>Reporting a bug</h2>
          <p>
            It helps a lot if you include your iOS version and what happened — what you tapped, what
            you expected, and what the app did instead. A screenshot is worth even more.
          </p>

          <h2>About your data</h2>
          <p>
            Your library lives on your device. Deleting the app deletes your tracked shows and movies,
            your watch history, your reactions and your notes along with it. If you have sync turned on,
            the copy on your Kodigo account is still there and the next install brings it back down; if
            you don&apos;t, there is no copy for me to restore.
          </p>
          <p>
            If you want to keep any of it, export first: <strong>Settings → Backup → Export</strong>{" "}
            writes everything to a JSON file you can save wherever you like, and any copy of Kodigo can
            read it back in. You can also drop that file onto the import page here after signing in.
          </p>

          <h2>Sync questions</h2>
          <p>
            Sync is off until you turn it on in Settings. It carries the same file Backup exports —
            your library, history, reactions and notes — and nothing else. Posters and episode lists
            are fetched fresh on every device. If two devices both changed things before they next
            synced, Kodigo settles each show, film and episode by whichever side touched it most
            recently, so a deletion on one phone doesn&apos;t come back from the other.
          </p>
        </main>
        <SiteFooter />
    </div>
  );
}
