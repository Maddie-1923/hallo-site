import type { Metadata } from "next";
import Link from "next/link";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: "Terms of Use — Kodigo",
  description: "The terms for using Kodigo, the app and kodigo.pro: accounts, Kodigo Pro, what you post, and the community rules.",
};

// The terms of use, in the privacy policy's plain voice. Decided 29 Sep 2026:
// Philippine law, accounts from 13, web subscriptions in US dollars with no
// refunds for part-used periods (cancel any time). Before real payments, put
// the legal name of whoever runs Kodigo in "Who we are" (Stripe asks for the
// same name) and have someone qualified read it over.
export default function Terms() {
  return (
    <div className="min-h-screen flex flex-col">
      <SiteNav />
      <main className="wrap prose py-16">
        <h1 className="!text-[clamp(44px,8vw,84px)]">Terms of Use</h1>
        <p className="mt-6">
          These terms cover Kodigo: the app on your phone and the website at kodigo.pro. Using either
          means you agree to them. They sit alongside the <Link href="/privacy">privacy policy</Link>,
          which says what Kodigo keeps about you and why.
        </p>

        <h2>The short version</h2>
        <ul>
          <li>You need to be 13 or older to make an account.</li>
          <li>What you write is yours. You let Kodigo show it, and you can delete it whenever you like.</li>
          <li>Be decent: no harassment, hate, spam, or posting other people&apos;s private details.</li>
          <li>Kodigo Pro renews until you cancel. Cancelling stops the next charge, and you keep Pro until the end of the time you paid for.</li>
          <li>Film and TV details come from TMDB and TVmaze, not from Kodigo.</li>
        </ul>
        <p>The rest of this page is the full version, and it&apos;s the one that counts.</p>

        <h2>Who we are</h2>
        <p>
          Kodigo (&ldquo;Kodigo&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;) makes the app and runs the website. You can reach us at{" "}
          <strong>hello@kodigo.pro</strong>.
        </p>

        <h2>Who can use Kodigo</h2>
        <p>
          Anyone can browse the website without an account. To make an account you must be at least 13.
          If you&apos;re under 18, a parent or guardian must agree to these terms with you, and only they
          can buy Kodigo Pro for you. One person, one account: accounts aren&apos;t shared and can&apos;t
          be sold or transferred.
        </p>

        <h2>Your account</h2>
        <p>
          You sign in with your email address or through Sign in with Apple, so keep that email account
          secure; anyone who can read it can sign in as you. You&apos;re responsible for what happens under
          your account. If you think someone else has got in, tell us straight away.
        </p>
        <p>
          You can delete your account at any time in Settings, or by following the steps on the{" "}
          <Link href="/delete-account">delete your account</Link> page. Deleting it removes your library,
          your profile and everything you&apos;ve posted.
        </p>

        <h2>Kodigo Pro</h2>
        <p>
          Kodigo Pro is a subscription that unlocks tracking on your phone and on the website. It costs
          $1.99 a month or $15.99 a year. One subscription covers both, whichever one you buy it on.
        </p>
        <p>
          <strong>Bought on the website.</strong> Prices are in US dollars. Your bank converts them if your
          card is in another currency, and may charge a fee for doing so. You pay when you subscribe; there&apos;s
          no free trial on the website. The subscription then renews automatically, and your card is
          charged at the start of each month or year, until you cancel. Payments are handled by Stripe,
          and Kodigo never sees or stores your card details.
        </p>
        <p>
          <strong>Cancelling.</strong> Cancel any time in <strong>Settings → Account → Subscription → Manage</strong>.
          Cancelling stops the next renewal, and you keep Pro until the end of the period you&apos;ve
          already paid for. We don&apos;t refund part-used months or years, except where the law requires
          it. If a payment fails, we&apos;ll try again for a short while; if it still can&apos;t be
          taken, Pro ends.
        </p>
        <p>
          <strong>Bought in the app.</strong> Subscriptions bought through the App Store or Google Play,
          including the free week in the app, are sold and billed by Apple or Google under their own
          terms. Cancel them and ask for refunds in your Apple Account or Google Play subscriptions; Kodigo
          can&apos;t cancel or refund them for you.
        </p>
        <p>
          <strong>Price changes.</strong> If the price goes up, we&apos;ll tell you by email at least 30
          days before it applies. The new price starts at your next renewal after that, and you can cancel
          before then.
        </p>
        <p>
          If we ever stop offering Kodigo Pro for good, we&apos;ll refund the unused part of any
          subscription you paid for on the website.
        </p>

        <h2>What you post</h2>
        <p>
          Reviews, ratings, notes, lists, comments, your profile and anything else you add on Kodigo are
          yours. You keep the rights to them. By posting something where others can see it, you give
          Kodigo permission to store it, show it on Kodigo, and show it in link previews when someone
          shares it. That permission is free, worldwide, and lasts until you delete the post or your
          account; copies can stay in our backups for up to 30 days after that.
        </p>
        <p>
          You&apos;re responsible for what you post. Only post things you have the right to share.
        </p>

        <h2 id="community-rules">Community rules</h2>
        <p>Don&apos;t use Kodigo to:</p>
        <ul>
          <li>harass, bully, threaten or intimidate anyone;</li>
          <li>attack people for their race, ethnicity, nationality, religion, gender, sexual orientation, disability or age;</li>
          <li>post sexual content, graphic violence, or anything that sexualises minors;</li>
          <li>share someone else&apos;s private information, such as their address, phone number or photos;</li>
          <li>pretend to be another person or organisation;</li>
          <li>post spam, advertising, scams or links to malware;</li>
          <li>post other people&apos;s work, such as full scripts, subtitles or pirated copies of films and shows, or links to them;</li>
          <li>break the law, or encourage someone else to;</li>
          <li>scrape or copy Kodigo in bulk, get around its limits, or interfere with how it runs;</li>
          <li>make another account to get around a block or a suspension.</li>
        </ul>
        <p>
          Please hide spoilers. Put a warning on a review that gives away a plot, so people who haven&apos;t
          watched it yet can scroll past.
        </p>

        <h2>Reports and moderation</h2>
        <p>
          You can report a review, comment, list or profile, or write to <strong>hello@kodigo.pro</strong>.
          We may remove anything that breaks these rules, and suspend or close accounts that break them,
          especially more than once. For serious cases, such as threats or content that exploits children,
          we may act without a warning and report it to the authorities. If you think we got it wrong,
          write to us and we&apos;ll look again.
        </p>

        <h2>Copyright complaints</h2>
        <p>
          If something on Kodigo uses your work without permission, email <strong>hello@kodigo.pro</strong>{" "}
          with a link to it, what it copies, and a way to contact you. We&apos;ll take it down if the
          complaint holds up, and tell the person who posted it.
        </p>

        <h2>Film and TV information</h2>
        <p>
          Titles, posters, cast, episode lists and trailers come from{" "}
          <a href="https://www.themoviedb.org" rel="noopener">TMDB</a>. Air times come from{" "}
          <a href="https://www.tvmaze.com" rel="noopener">TVmaze</a>, and where-to-watch listings from{" "}
          <a href="https://www.justwatch.com" rel="noopener">JustWatch</a> via TMDB. This product uses the
          TMDB API but is not endorsed or certified by TMDB. That information can be wrong or out of date,
          and streaming services change what they carry, so check with the service before you rely on it.
          Posters, stills and trailers belong to the studios and networks that made them.
        </p>

        <h2>Kodigo itself</h2>
        <p>
          Kodigo&apos;s name, logo, design, app and website belong to Kodigo. These terms let you use them;
          they don&apos;t let you copy, resell or build on them.
        </p>

        <h2>If things go wrong</h2>
        <p>
          We work to keep Kodigo running and your library safe, but we can&apos;t promise it will always be
          available or free of mistakes. Kodigo is provided &ldquo;as is&rdquo;. Keep your own backups:
          Settings → Backup exports your whole library.
        </p>
        <p>
          As far as the law allows, Kodigo isn&apos;t responsible for indirect losses, such as lost data,
          profits or opportunities, and our total responsibility to you for any claim is limited to what
          you paid Kodigo in the 12 months before it. Nothing in these terms takes away rights you have as a
          consumer that the law doesn&apos;t let a contract remove.
        </p>

        <h2>Ending</h2>
        <p>
          You can stop using Kodigo and delete your account at any time. We can suspend or close an account
          that seriously or repeatedly breaks these terms. If we close an account with a paid website
          subscription for a reason other than breaking these terms, we&apos;ll refund the unused part.
        </p>

        <h2>Changes to these terms</h2>
        <p>
          We may update these terms as Kodigo changes. For anything significant we&apos;ll tell you by email
          or on the site before it applies. The date below changes with every update. Carrying on using
          Kodigo after that means you accept the new version.
        </p>

        <h2>The law that applies</h2>
        <p>
          These terms are governed by the laws of the Republic of the Philippines, and disputes go to the
          courts of the Philippines. If you live somewhere else, you still keep any protections that your
          own country&apos;s consumer laws give you.
        </p>

        <h2>Contact</h2>
        <p>
          Questions about these terms: <strong>hello@kodigo.pro</strong>
        </p>
        <p className="text-dim">
          <em>Last updated: 29 September 2026</em>
        </p>
      </main>
      <SiteFooter />
    </div>
  );
}
