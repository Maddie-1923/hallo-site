import type { Metadata } from "next";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";

export const metadata: Metadata = { title: "Privacy Policy — Kodigo" };

export default function Privacy() {
  return (
    <div className="scheme-dark min-h-screen flex flex-col">
        <SiteNav />
        <main className="wrap prose py-16">
          <h1 className="!text-[clamp(44px,8vw,84px)]">Privacy Policy</h1>
          <p className="mt-6">
            Kodigo is an app for tracking the shows and movies you watch. It has no analytics and no
            advertising. It collects nothing about you unless you make a Kodigo account, and the whole
            of what an account holds is described below.
          </p>

          <h2>Everything you save stays on your phone</h2>
          <p>
            Your tracked shows and movies, what you&apos;ve watched and when, your reactions and notes,
            your theme and accessibility settings, and your notification preferences are all stored on
            your device. With sync off, none of it is sent anywhere, and none of it reaches me.
          </p>

          <h2>Kodigo accounts and sync</h2>
          <p>
            You can use Kodigo without an account. An account exists for one reason: to keep the same
            library on more than one device, and to show it to you on this website. Sync is off until
            you turn it on.
          </p>
          <p>
            When you turn it on, a copy of your library — the same file Settings → Backup exports — is
            stored against your account on Kodigo&apos;s server. That server is hosted by Supabase, and
            the copy is readable only by your account: the database refuses any request that isn&apos;t
            signed in as you. Posters and episode listings aren&apos;t synced; those come back from the
            sources below on their own.
          </p>
          <p>
            An account is an email address and nothing else. Signing in works by a link sent to that
            address, or through Sign in with Apple, so Kodigo never holds a password for you. Apple
            may give Kodigo a relay address rather than your real one; that is fine and it works the
            same way.
          </p>
          <p>
            Turning sync off in Settings offers to remove the copy on the server, and deleting your
            account from this site removes the account, the library copy, and anything else attached
            to it. There is no waiting period and nothing is kept back.
          </p>

          <h2>What Kodigo sends to other services</h2>
          <p>To show you anything useful, Kodigo asks three services for information about shows and movies:</p>
          <ul>
            <li><strong>TMDB</strong> for show and movie details, posters, episode lists and cast</li>
            <li><strong>OMDb</strong> for IMDb and Rotten Tomatoes ratings</li>
            <li><strong>TVMaze</strong> for episode air times</li>
          </ul>
          <p>
            These requests carry the title or the ID of the thing being looked up, and nothing else.
            There is no device identifier and nothing about you attached to them. The services can see
            that someone asked about a particular show; they can&apos;t see who, and they aren&apos;t
            told anything about your library, your watch history or your settings. Each of these
            services has its own privacy policy covering what they log about incoming requests.
          </p>

          <h2>No analytics, no tracking, no ads</h2>
          <p>
            Kodigo contains no analytics SDK, no crash reporting service, no advertising, and no
            tracking of any kind. Your data is never sold and never shared.
          </p>

          <h2>Notifications</h2>
          <p>
            Notifications about new episodes, season premieres, movie releases and the weekly digest
            are scheduled entirely on your device. Kodigo works out the dates from information it
            already has and hands iOS a list of reminders, which iOS then delivers on its own. There is
            no push server, and nothing about what you track leaves your phone in order to notify you.
          </p>

          <h2>Poster images</h2>
          <p>
            Posters and stills are cached on your device so they load instantly and still appear when
            you&apos;re offline. The cache has a size limit and clears out the oldest images on its own.
            It lives in the system caches folder, which means iOS can also empty it whenever it needs
            the space, and it&apos;s removed completely when you delete the app.
          </p>

          <h2>Your data is yours</h2>
          <p>
            You can export your entire library to a plain JSON file at any time from{" "}
            <strong>Settings → Backup</strong>. It&apos;s readable text, you can keep it wherever you
            like, and any copy of Kodigo can take it back in.
          </p>
          <p>
            You can delete everything on your phone by deleting the app. That removes your library,
            your watch history, your settings and the poster cache from your device. If you have an
            account, delete it from the account page on this site to remove the server copy too.
          </p>

          <h2>Children</h2>
          <p>Kodigo doesn&apos;t knowingly collect information from anyone, including children.</p>

          <h2>Changes to this policy</h2>
          <p>If this policy changes, the date below changes with it.</p>

          <h2>Contact</h2>
          <p>
            Questions about privacy: <strong>hello@kodigo.pro</strong>
          </p>
          <p className="text-dim">
            <em>Last updated: 5 September 2026</em>
          </p>
        </main>
        <SiteFooter />
    </div>
  );
}
