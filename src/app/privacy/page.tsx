import type { Metadata } from "next";
import Link from "next/link";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: "Privacy Policy — Kodigo",
  description: "What Kodigo, the app and kodigo.pro, keeps about you, what's public, who else is involved, and how to delete it.",
};

// The privacy policy for the app and the website, rewritten 29 Sep 2026 for
// the social site: public profiles, web accounts, Kodigo Pro through Stripe.
// Two sections wait for things that aren't live, so the page never describes
// something that isn't happening. Turn each on, and change the date at the
// bottom, in the same deploy that ships it:
// - ADS: on by itself when AdSense is set up (NEXT_PUBLIC_ADSENSE_CLIENT,
//   lib/ads.ts). Its consent message is Google's own, from AdSense →
//   Privacy & messaging, which must be published before ads go live.
// - CRASH_REPORTS: on by itself when the website's Sentry key is set
//   (lib/sentry-options.ts), so the page and the site can't disagree. When
//   the app gets Sentry too, add it to that section and update the App Store
//   privacy labels.
const ADS = !!process.env.NEXT_PUBLIC_ADSENSE_CLIENT;
const CRASH_REPORTS = !!process.env.NEXT_PUBLIC_SENTRY_DSN;

export default function Privacy() {
  return (
    <div className="min-h-screen flex flex-col">
      <SiteNav />
      <main className="wrap prose py-16">
        <h1 className="!text-[clamp(44px,8vw,84px)]">Privacy Policy</h1>
        <p className="mt-6">
          Kodigo is the app for tracking the shows and films you watch, and the website at kodigo.pro where
          you can share what you think of them. This page says what Kodigo keeps about you, what other
          people can see, which other companies are involved, and how to get it all deleted.
        </p>

        <h2>The short version</h2>
        <ul>
          <li>Without an account, your library stays on your phone and nothing about you reaches us.</li>
          <li>An account is an email address. Kodigo never has a password for you.</li>
          <li>Your profile, reviews, ratings and lists are public unless you make your profile private. Your email never is.</li>
          <li>Your data is never sold.{!ADS && " There are no ads and no tracking."}</li>
          <li>You can download everything, or delete everything, at any time.</li>
        </ul>

        <h2>Who we are</h2>
        <p>
          Kodigo (&ldquo;Kodigo&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;) makes the app and runs the website, and decides
          what happens to the information on this page. Questions go to <strong>hello@kodigo.pro</strong>.
        </p>

        <h2>The app, without an account</h2>
        <p>
          Your tracked shows and films, what you&apos;ve watched and when, your ratings, reactions and notes,
          your theme and your reminder settings are all stored on your device. With no account and sync
          off, none of it is sent anywhere, and none of it reaches us.
        </p>
        <p>
          Reminders about new episodes, premieres and releases are scheduled on your phone. Kodigo works out
          the dates and hands the list to your phone, which delivers them itself. There&apos;s no push server,
          and nothing about what you track leaves your phone to notify you.
        </p>

        <h2>Your Kodigo account</h2>
        <p>
          An account lets you keep the same library in the app and on the website, and share what you watch.
          It&apos;s made from your email address. You sign in with a link or code sent to that address, or
          with Sign in with Apple, which may give us a private relay address instead of your real one.
        </p>
        <p>With an account, we keep:</p>
        <ul>
          <li><strong>Your email address</strong>, to sign you in and to send the emails you&apos;ve chosen.</li>
          <li>
            <strong>Your library</strong>: the same file <strong>Settings → Backup</strong> exports, with what you track, what
            you&apos;ve watched and when, and your ratings, reviews, notes, lists and reactions.
          </li>
          <li>
            <strong>Your profile</strong>: your username, and anything you add, such as a display name, a photo and
            banner (chosen from posters), a short bio, a location and a quote.
          </li>
          <li>
            <strong>What you do on the social side</strong>: who you follow and who follows you, your likes, your
            comments, anyone you&apos;ve blocked, and any reports you make.
          </li>
          <li><strong>Your settings</strong>, such as your privacy choices, country, streaming services and email preferences.</li>
        </ul>
        <p>
          We use this to run Kodigo for you: to sync your library, show your profile, build your feed,
          calendar and stats, and send the notifications you&apos;ve turned on. We don&apos;t use it for
          anything else, and we don&apos;t build a profile of you for advertising.
        </p>

        <h2>What other people can see</h2>
        <p>
          Kodigo is partly a social site, so some of what you add is public. With a <strong>public profile</strong>{" "}
          (the setting new accounts start with), anyone can see your username and profile details, your
          reviews and ratings, your lists, the comments and likes you leave, and who you follow. Your
          recent activity, what you&apos;re watching now and how far you are, your Watchlog (what you watched and when), your watchlist, your stats and your Year in Review
          show too, unless you turn them off in <strong>Settings → Privacy</strong>. Each category on your profile,
          such as Watching or Watchlist, has its own switch. What you put On Hold or Stopped Watching is never shown to anyone but you.
        </p>
        <p>
          With a <strong>private profile</strong>, only people you&apos;ve let follow you see those things. Your
          username, photo and name still appear so people can find you and ask to follow.
        </p>
        <p>
          Public pages can be found by search engines, and when someone shares a link to your profile, a
          review or a Year in Review, the preview picture shows what that page shows. Your{" "}
          <strong>email address is never shown</strong> to anyone. Your notes are only ever visible to you.
          Choose <strong>See your profile as others do</strong> from your profile menu to check exactly what&apos;s public.
        </p>
        <p>
          If you already had an account before profiles existed, nothing of yours becomes public until
          we&apos;ve told you and you&apos;ve had the chance to make your profile private.
        </p>

        <h2>Kodigo Pro and payments</h2>
        <p>
          If you subscribe on the website, <strong>Stripe</strong> takes the payment. You enter your card on
          Stripe&apos;s page, and Stripe keeps it; Kodigo never sees or stores your card number. Stripe tells
          us your plan, whether it&apos;s active, when it renews, and a customer reference so you can manage
          it. Stripe&apos;s own privacy policy covers what it keeps, which includes what the law requires for
          payments and fraud prevention.
        </p>
        <p>
          If you subscribe in the app, Apple or Google take the payment, and we&apos;re told only that your
          subscription is active and when it renews.
        </p>

        <h2>Emails</h2>
        <p>
          We send the sign-in emails you ask for, receipts and important account notices (such as a price
          change or an update to these policies). Anything else, such as new followers, likes and comments,
          is only sent if it&apos;s turned on in <strong>Settings → Notifications</strong>, and each can be turned off
          there.
        </p>

        <h2>On the website</h2>
        <p>
          Anyone can browse kodigo.pro without an account. To show films in cinemas and what&apos;s on
          streaming where you are, the site works out your <strong>country</strong> from your connection, as
          our host tells it; the rest of your IP address isn&apos;t kept for this. You can pick a different
          country in Settings.
        </p>
        <p>The site stores a few things in your browser, only to make it work:</p>
        <ul>
          <li>a sign-in cookie, if you&apos;re signed in;</li>
          <li>the country you picked, as a cookie, so the page is right before it loads;</li>
          <li>your theme, appearance and site settings, and drafts of what you&apos;re writing, in your browser&apos;s storage.</li>
        </ul>
        <p>
          {ADS
            ? "Beyond these, advertising cookies are set only if you agree to them; see Ads below."
            : "There are no advertising or analytics cookies, and nothing tracks you from one site to another."}
        </p>

        {ADS && (
          <>
            <h2 id="ads">Ads</h2>
            <p>
              The website shows a few ads to visitors and free accounts, which helps keep Kodigo running.
              Kodigo Pro members never see them, and the app has none. Ads come from <strong>Google AdSense</strong>.
              Google may use cookies and your IP address to choose ads and measure them, and, if you agree,
              to personalise them. In the UK, the European Economic Area and Switzerland, you&apos;re asked first,
              and you can change your answer at any time from the link at the bottom of every page. You can
              also manage Google&apos;s ad personalisation at{" "}
              <a href="https://adssettings.google.com" rel="noopener">adssettings.google.com</a>. We never give
              Google your library, your email or anything from your account.
            </p>
          </>
        )}

        {CRASH_REPORTS && (
          <>
            <h2>Crash reports</h2>
            <p>
              When a page on the website crashes or hits an error, a report goes to <strong>Sentry</strong> so we can
              fix it. It holds the error, the address of the page that was open (without anything after a
              &ldquo;?&rdquo; in it), and your browser and system type and version. It doesn&apos;t include your IP
              address, cookies, your email, your account, your library or anything you typed. Reports go through
              kodigo.pro on their way, so your browser never contacts Sentry directly, and they&apos;re deleted
              within 90 days. The app doesn&apos;t send crash reports.
            </p>
          </>
        )}

        <h2>Other companies involved</h2>
        <p>Kodigo relies on a handful of services. Each only gets what it needs to do its part:</p>
        <ul>
          <li>
            <strong>Supabase</strong> stores accounts and synced libraries. The database refuses any request for
            your private library that isn&apos;t signed in as you.
          </li>
          <li><strong>Vercel</strong> hosts the website and, like any web host, briefly logs requests to keep it running and secure.</li>
          <li>
            <strong>TMDB</strong> supplies show and film details, posters and cast, and <strong>TVmaze</strong> episode air
            times. The app&apos;s requests carry only what&apos;s being looked up. Your browser or phone loads
            posters straight from TMDB, which, like any website, sees the address the request came from.
          </li>
          <li>
            <strong>YouTube</strong> plays trailers. Its preview pictures load from YouTube, and a trailer only
            starts playing, from YouTube&apos;s privacy-enhanced player, when you press it.
          </li>
          <li><strong>Stripe</strong>, <strong>Apple</strong> and <strong>Google</strong> handle subscriptions, as above.</li>
          <li><strong>Apple</strong> handles Sign in with Apple, if you use it.</li>
          {ADS && <li><strong>Google AdSense</strong> shows ads on the website, as above.</li>}
          {CRASH_REPORTS && <li><strong>Sentry</strong> receives crash reports, as above.</li>}
        </ul>
        <p>
          Some of these companies store information outside your country, including in the United States.
          We only use services that protect it to the standard the law requires.
        </p>

        <h2>Never sold</h2>
        <p>
          We don&apos;t sell your information or trade it with anyone. We only share it with the services above,
          to run Kodigo, or when the law requires us to, such as a valid court order.
        </p>

        <h2>How long we keep it</h2>
        <p>
          We keep your account and library until you delete them. When you delete your account, everything
          attached to it goes: your library, profile, reviews, lists, comments, likes and follows. Copies in
          our backups are gone within 30 days. What the law requires us to keep for payments, such as a record
          of the charge, stays with Stripe for as long as the law says.
        </p>

        <h2>Your choices and rights</h2>
        <ul>
          <li>
            <strong>See and download it:</strong> <strong>Settings → Import &amp; export</strong> on the website, or{" "}
            <strong>Settings → Backup</strong> in the app, gives you your whole library as a plain file any copy of
            Kodigo can read back.
          </li>
          <li><strong>Correct it:</strong> change your profile, reviews and settings whenever you like.</li>
          <li><strong>Limit who sees it:</strong> make your profile private, or hide individual sections, in Settings → Privacy.</li>
          <li>
            <strong>Delete it:</strong> in the app, <strong>Settings → Kodigo sync → Delete my Kodigo account</strong>;
            on the website, <strong>Settings → Delete account</strong>. Both take effect straight away. If you can&apos;t
            sign in, the <Link href="/delete-account">delete your account</Link> page explains how to ask by email.
            Deleting the app on its own leaves your account in place.
          </li>
        </ul>
        <p>
          Depending on where you live, you may also have the right to object to how we use your information,
          to ask us to limit it, and to complain to a data protection authority. In the Philippines that&apos;s
          the National Privacy Commission, under the Data Privacy Act of 2012. To use any of these rights,
          write to <strong>hello@kodigo.pro</strong>; we&apos;ll answer within 30 days.
        </p>
        <p>
          Where the law asks what gives us the right to use your information: we use your account and library
          to provide the service you signed up for, your email preferences and any ad cookies with your
          consent, and the rest (keeping Kodigo secure, stopping abuse) because we have a legitimate need to.
        </p>

        <h2>Security</h2>
        <p>
          Connections to Kodigo are encrypted, private libraries can only be read when signed in as their
          owner, and there are no passwords to steal. No service can promise perfect security, but if
          something ever goes wrong that affects your information, we&apos;ll tell you and the authorities as
          the law requires.
        </p>

        <h2>Children</h2>
        <p>
          You need to be at least 13 to make a Kodigo account. We don&apos;t knowingly keep information about
          anyone younger. If you think a child under 13 has an account, tell us and we&apos;ll delete it.
        </p>

        <h2>Changes to this policy</h2>
        <p>
          When this policy changes, the date below changes with it. For anything significant, we&apos;ll tell
          you by email or on the site before it applies. The <Link href="/terms">terms of use</Link> cover the
          rest of how Kodigo works.
        </p>

        <h2>Contact</h2>
        <p>
          Questions about privacy: <strong>hello@kodigo.pro</strong>
        </p>
        <p className="text-dim">
          <em>Last updated: 29 September 2026</em>
        </p>
      </main>
      <SiteFooter />
    </div>
  );
}
