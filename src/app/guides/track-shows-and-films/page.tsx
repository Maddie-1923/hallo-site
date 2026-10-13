import type { Metadata } from "next";
import Link from "next/link";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: "How to track shows and films with Kodigo — Kodigo",
  description:
    "A step-by-step guide to keeping track of everything you watch in Kodigo: adding shows and films, checking off episodes, rating, lists, release alerts and sync.",
  alternates: { canonical: "/guides/track-shows-and-films" },
};

// A walk through the app from first launch to a library that runs itself.
// Every label in bold is the one the app shows, so a reader can follow along
// with the phone in their other hand. Keep it in step with the app: when a
// button is renamed there, rename it here.
export default function TrackShowsAndFilms() {
  return (
    <div className="min-h-screen flex flex-col">
      <SiteNav />
      <main className="wrap prose py-16">
        <p className="text-sm text-dim m-0">
          <Link href="/guides">Guides</Link> · Updated 13 October 2026
        </p>
        <h1 className="!text-[clamp(40px,7vw,76px)] mt-3">How to track shows and films</h1>
        <p className="mt-6">
          Most people keep track of what they watch in their head, and their head is bad at it. Which episode of that
          show did you stop on in March? Did you ever finish the second season? What was the film your friend told you
          to see? Kodigo exists to answer those questions for you. This guide walks through setting it up so it does
          that with as little effort from you as possible: adding what you watch, checking off episodes, keeping notes
          on what you thought, and getting told when something new arrives.
        </p>
        <p>
          It is written for the iPhone app. Everything here takes a few minutes to set up, and after that most days
          need one tap.
        </p>

        <h2>Why I built Kodigo</h2>
        <p>
          I used TV trackers for years before making one. The thing that finally pushed me was a well-known tracker
          wiping my entire watch history with no warning. Years of episodes, gone overnight, and nobody seemed to think
          that was a big deal.
        </p>
        <p>
          When I went looking for somewhere else to go, nothing quite fit. The other trackers were missing features I
          had come to rely on, some cost far more than a tracker should, and I am honestly picky about layout: I wanted
          something I actually enjoyed opening every day.
        </p>
        <p>
          So Kodigo is built around those lessons. Your library lives on your own phone first, and you can export the
          whole thing whenever you like, so no company, including this one, can make it disappear. The rest of this
          guide is how I use it.
        </p>

        <h2>1. Start with what you are watching now</h2>
        <p>
          The first time you open Kodigo, it asks <strong>What are you watching?</strong> Pick the shows you are in the
          middle of right now, not everything you have ever seen. Then it asks <strong>How far along are you?</strong>{" "}
          so it can mark the earlier episodes for you. A library that starts with five shows you actually care about is
          far more useful than one that starts with two hundred you will never open again.
        </p>
        <p>
          If you have years of history in another app, you can bring it in instead of starting fresh. That has its own
          section <a href="#import">further down</a>.
        </p>

        <h2>2. Add shows and films</h2>
        <p>
          Open the <strong>Explore</strong> tab and use the search field (<strong>Search titles and people</strong>).
          Search covers shows and films, and also actors, directors, other members&apos; lists and reviews. If a title
          shares its name with an older one, the <strong>Release year</strong> filter helps.
        </p>
        <p>
          Tap the <strong>+</strong> on any result to add it. On a film&apos;s page, the same thing is labelled{" "}
          <strong>Add</strong>. Explore also has rails such as Trending, Top rated and Coming Soon, which are a good way
          to find things you didn&apos;t know you were looking for.
        </p>
        <p>Every title in your library has a status, which is how Kodigo knows where to put it:</p>
        <ul>
          <li>
            <strong>Shows:</strong> Watching, On Hold, Stopped Watching or Finished.
          </li>
          <li>
            <strong>Films:</strong> To Watch, On Hold, Stopped Watching or Watched.
          </li>
        </ul>
        <p>
          You rarely need to set these by hand. Check off an episode and a show becomes one you are watching; finish the
          last one and it moves to Finished on its own.
        </p>

        <h2>3. Check off episodes</h2>
        <p>
          This is the part you will do most. The <strong>Shows</strong> tab opens on <strong>Up next</strong>: one row
          per show, each showing the next episode you haven&apos;t seen. When you finish an episode, tap the circle at
          the end of its row. The row moves on to the following episode. Tap the circle again if you marked one by
          mistake.
        </p>
        <p>A few things make this faster:</p>
        <ul>
          <li>
            <strong>Whole seasons at once.</strong> On a show&apos;s page, <strong>Mark Season watched</strong> checks
            off a full season, and <strong>Mark all watched</strong> does the whole show. Kodigo asks whether to include
            specials, and whether to date the episodes <strong>All today</strong> or <strong>On their air dates</strong>.
            Choose air dates if you are logging a show you watched as it aired, so your history reads true.
          </li>
          <li>
            <strong>Catching up.</strong> If you mark an episode in season three and seasons one and two are still
            blank, Kodigo asks <strong>Catch up on earlier seasons?</strong> and fills them in for you.
          </li>
          <li>
            <strong>Skipping.</strong> Long-press an episode to skip it, for a recap episode or a filler arc you have
            no intention of sitting through. It stops holding up your Up next row.
          </li>
          <li>
            <strong>Undo.</strong> After a bulk mark, an <strong>Undo</strong> strip appears for a moment. Anything you
            checked off can also be removed later from your Watch History.
          </li>
        </ul>
        <p>
          Watching something a second time? Open the episode and tap <strong>Rewatch</strong>. Kodigo records the new
          viewing alongside the first one instead of overwriting it.
        </p>

        <h2>4. Films</h2>
        <p>
          Films are simpler: open one and tap <strong>Mark watched</strong>. The page then shows the date you watched
          it. If you are logging something from years ago, use <strong>Change date</strong>, or{" "}
          <strong>Watched on release date</strong> if you saw it opening weekend.
        </p>
        <p>
          <strong>Rewatch</strong> on a film adds another viewing and keeps the date you first saw it, so you can see
          which films you keep coming back to.
        </p>

        <h2>5. Say what you thought</h2>
        <p>
          Every show, film and episode has a <strong>Your take</strong> section. Ratings are out of ten hearts, each
          with a word (from Awful to Perfect) so the number means the same thing to you next year as it does today. You
          can add up to three moods, such as Loved it, Shocked or On Edge, which are often more honest than a score.
        </p>
        <p>
          From there you can write a public review, with a spoiler flag if it gives anything away, or a{" "}
          <strong>private note</strong> that only you will ever see. Private notes are worth using even if you never
          review anything: &ldquo;stopped here because the middle drags, gets good again in episode 6&rdquo; is exactly
          the kind of thing you will want to know in a year.
        </p>
        <p>
          On a film, Your take appears once you have marked it watched. You can see what other members wrote on the{" "}
          <Link href="/shows">show</Link> and <Link href="/movies">film</Link> pages on this site.
        </p>

        <h2>6. Make lists</h2>
        <p>
          Statuses tell Kodigo where a title stands. Lists are for everything else: a director&apos;s films in order, a
          list of comfort rewatches, every show someone has recommended to you. Create one from your{" "}
          <strong>Profile</strong> with <strong>Create Custom List</strong>, then long-press any title and choose{" "}
          <strong>Add to custom list</strong>.
        </p>
        <p>
          Lists can be sorted by <strong>Custom order</strong>, which lets you drag titles into whatever order you
          like. Lists are public unless you lock them, so you can share a list as a recommendation. You can browse
          other members&apos; lists on the <Link href="/lists">Lists page</Link>.
        </p>

        <h2>7. Get told when something new arrives</h2>
        <p>
          Turn notifications on in <strong>Settings → Notifications</strong>. Under <strong>What to send</strong> you
          can choose any of:
        </p>
        <ul>
          <li>
            <strong>New episodes</strong>, the day each one airs.
          </li>
          <li>
            <strong>Season premieres</strong>, when a show you follow comes back.
          </li>
          <li>
            <strong>Movie releases</strong>, when a film you are waiting on comes out.
          </li>
          <li>
            <strong>Weekly digest</strong>, a summary every Sunday.
          </li>
        </ul>
        <p>
          If a show doesn&apos;t have an air time, Kodigo uses the time you set in <strong>Send at</strong>, and{" "}
          <strong>Hold notifications</strong> keeps them quiet overnight. Each show also has its own alarm switch on its
          page, so you can turn alerts off for one show without losing the rest. Episode alerts carry a{" "}
          <strong>Mark watched</strong> button, so you can check an episode off straight from the notification.
        </p>
        <p>
          The <strong>Coming Soon</strong> tab inside Shows and Movies lists everything on its way, in date order.
        </p>

        <h2>8. Keep it in step across devices</h2>
        <p>
          You don&apos;t need an account to use Kodigo. Your library is kept on your phone, and nothing leaves it until
          you choose. If you want the same library on your iPad, or on this website, turn on sync in{" "}
          <strong>Settings → Backup &amp; Sync → Kodigo sync</strong> and sign in with Apple or with a code sent to your
          email.
        </p>
        <p>
          Sync keeps every device the same, which also means a show deleted by mistake is deleted everywhere. So sync
          is not a backup. Every so often, use <strong>Export library</strong> in the same screen to save a copy, or{" "}
          <strong>Email a backup</strong> so one lives off your phone.
        </p>
        <p>
          Your library is private unless you choose to share a shelf on your profile. On Hold and Stopped Watching are
          always private.
        </p>

        <h2 id="import">9. Bring your history from another app</h2>
        <p>
          In <strong>Settings → Backup &amp; Sync</strong>, or on the first screen of the app:
        </p>
        <ul>
          <li>
            <strong>Import from TV Time</strong> takes the export file TV Time gives you, as a zip or a CSV.
          </li>
          <li>
            <strong>Import from another app</strong> reads exports from Letterboxd, IMDb, Simkl and Trakt.
          </li>
          <li>
            <strong>Import from a file</strong> restores a Kodigo backup.
          </li>
        </ul>
        <p>
          Every title is matched against TMDB, the film and TV database Kodigo uses. Anything that can&apos;t be
          matched is listed for you to sort out, rather than dropped without telling you. There is more on this on the{" "}
          <Link href="/about#import">About page</Link>.
        </p>

        <h2>A few habits that help</h2>
        <ul>
          <li>
            <strong>Put shows on hold instead of deleting them.</strong> If you drift away from something, On Hold
            moves it out of Up next without losing where you were.
          </li>
          <li>
            <strong>Turn on spoiler hiding.</strong> <strong>Hide unwatched episodes</strong> keeps titles and
            descriptions of episodes you haven&apos;t seen covered up.
          </li>
          <li>
            <strong>Let it recap for you.</strong> Kodigo can offer a recap of the last episode when you come back to a
            show after a week, two weeks or a month away.
          </li>
          <li>
            <strong>Add a widget.</strong> The Shows Up Next widget puts your next episodes on your Home Screen, so
            you don&apos;t have to open the app to see what&apos;s next.
          </li>
          <li>
            <strong>Look back now and then.</strong> Your Profile has your stats and a Watch History, day by day.
          </li>
        </ul>

        <h2>Questions</h2>
        <p>
          The <Link href="/about#faq">FAQ</Link> covers the common ones, and the <Link href="/support">Support</Link>{" "}
          page has the rest. If something in this guide doesn&apos;t match what you see in the app, email{" "}
          <strong>hello@kodigo.pro</strong> and I&apos;ll fix it.
        </p>
      </main>
      <SiteFooter />
    </div>
  );
}
