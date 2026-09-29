# Kodigo on the web: the plan

The website becomes a full home for Kodigo, not a companion to the app. It is
a place to track shows and films from a computer, and a place to share what
you thought of them. This document holds what has been decided and the order
it gets built in. Last updated 26 Sep 2026.

## Decisions

- **Who it's for.** Two groups, both served in full:
  - people who would rather track on a computer than on their phone, so the
    website does everything the app does;
  - people who want to share their opinions about what they watched.
- **Series carry equal weight everywhere.** Letterboxd is films only. Every
  feature asks what the series version is: episode reviews, "watching now" on
  profiles, series filters in browse, per-episode diary entries.
- **Ratings stay at 10 hearts**, in half steps, as in the app. No stars.
- **Profiles are public by default**, with a switch to go private.
- **Platforms.** The website first, then an iOS update after the first
  version is approved. Android follows when it's no longer parked.
- **Letterboxd is a guide, not a spec.** A map of its site was used to find
  gaps (see "Deliberately left out" for what isn't copied).

### Free and Pro

Reading the website is free for everyone: title pages, profiles, reviews and
lists. That has to hold for shared links and search engines to work.

| | Visitor | Free account | Kodigo Pro |
|---|---|---|---|
| Browse, read reviews, profiles, lists | ✓ | ✓ | ✓ |
| Rate, review, log what you watched, heart | | ✓ | ✓ |
| Follow, like, comment, lists, a profile | | ✓ | ✓ |
| Episode tracking, up next, calendar | | | ✓ |
| Sync with the app, import and export | | | ✓ |
| Stats, hide watched, only my services | | | ✓ |
| Ads on the website | shown | shown | none |

- **Kodigo Pro** is the same subscription in the app and on the website:
  $1.99 a month or $15.99 a year, with the 7-day free trial. One subscription
  unlocks both.
- **The app stays subscription-only.** A free web account is for sharing;
  tracking, on the app or the site, is Pro. The site says so plainly.
- **Ads are website-only** and never reach Pro members or the app.

## How it fits the data we already have

A person's ratings, reviews, diary dates and lists live inside their private
library row (`libraries.archive`), and the phone writes that row directly.
Other people's pages can't read that row, and it shouldn't be opened up. It
holds everything, including notes and things never meant to be shared.

So the social side is a **public projection**. A database trigger on
`libraries` copies the shareable parts into separate public tables whenever the
row changes, whether the phone or the site made the change:

- `public_entries`: one row per title (and per episode, for episode ratings
  and reviews) per person, with rating, reaction, review text, spoiler flag,
  watched-on date and rewatch. This is the source for title pages, profiles,
  the feed and the activity timeline.
- `public_lists`: custom lists with their titles.
- The built-in categories are worked out from `public_entries` and each
  title's status, so they need no table of their own. On Hold and Stopped
  Watching are the owner's alone: those two statuses are never projected, so
  no visitor can see what someone set aside or gave up on (decided 27 Sep). The owner's tile order
  lives on their phone today (`kodigo.profileShelfOrder`); it has to join the
  archive before the site can show their own arrangement.

The trigger never fails the library write. If the projection hits an error,
it logs it and lets the sync through, so the app's sync can't break because of
the social side. Private accounts project nothing, and switching to private
deletes their projected rows.

Things that exist only socially sit in their own tables and never touch the
archive: `follows`, `likes`, `comments`, `notifications`, `blocks`, `reports`
and `pinned_reviews`.

Pro is an `entitlements` row per account, written by the Stripe webhook for a
web purchase and checked alongside the App Store receipt in the apps: Pro is
"App Store receipt OR account entitlement". The apps never link to the web
checkout, which keeps App Review simple.

Free accounts need somewhere to keep what they log on the web. They get a
library row like everyone else; what they can *do* with it on the site is
what Pro gates.

## Already built (branch `social`, local only)

- **Home page:** a Netflix-style billboard, wide cards with title logos, rows
  of trending, in cinemas and coming soon for the visitor's country, and the
  app pitch at the foot.
- **Explore:** the same layout, Shows or Movies.
- **Profile page layout** at `/u/[username]`, previewed from a local library
  file (`/u/preview`) and a made-up profile (`/u/sample`):
  - the banner and the photo hanging from it;
  - the user box with Follow;
  - numbers, ratings spread, top genres and a watch calendar;
  - Favourites: top 5 films, top 5 series, recent watches;
  - a "Watching now" mini tracker (series up next with progress, the film
    watchlist), with a check for the owner that only changes the page until
    the database exists;
  - Reviews, Recent activity, Watchlog (the diary: a table with columns, a year
    at a time), Categories and Favourites as tabs swapped in place, and
    back-to-top;
  - Categories as the app's profile grid has them: the eight built-in ones
    (Shows, Movies, Up to Date, Finished, On Hold, Stopped Watching,
    Favorites, Rewatched) then the person's lists, as collage tiles that open
    a sheet; empty ones are left off. Each tile shows one wide picture, the
    title added last, which the owner can change; the owner also has a New
    category tile (name, description, titles from their library). Both are
    kept in the browser until accounts exist, then saved to the library so
    the app gets them;
  - Favourites the owner can edit (saved in the browser for now).
  - a review sheet that opens from the Watchlog, and a mock-up of a review's
    own page (`/u/preview/review/<title key>`) with its link preview
    (`…/opengraph-image`), both drawn from the sheet. Share copies that link.
- **Site-wide:** the day/night toggle, the theme menu with the app's seven
  themes, and the new logo.

## Build order

### 0. Unblock the database

Set up the free `kodigo-dev` Supabase project (already created) with the live
project's tables, then build every step below against it. Needs the user to
switch this session out of auto mode or run the setup SQL themselves. Move to
the live project only once a step is finished, and ask first.

Done 30 Sep: kodigo-dev has every migration in `supabase/migrations/`
(libraries, profiles, banner focus, delete account, the live project's
hardening written down as `20260922120000_match_live_hardening.sql`,
entitlements, safety, and `20260930010000_safety_private.sql`, which moved
`is_blocked` out of the API and added indexes). Security advisor: only the
intended `delete_account` warning. Row-level security checked with two
made-up users in a rolled-back transaction: each sees only their own
library, can't write another's, can't grant themselves Pro, can't block for
someone else, and a block reads both ways. `.env.local` now points at
kodigo-dev (live commented out beside it). Left for the user: dev's
service-role key in `.env.local`, and dev's Authentication → URL
configuration (Site URL `http://localhost:3000`, redirect
`http://localhost:3000/auth/callback`). Live still has only its original
tables; entitlements and safety go there when accounts open.

### 1. Accounts and profiles

1. **Usernames and public profiles.** Add `username` and `is_private` to
   `profiles`, and wire `/u/[username]` to real data. Show a one-time notice to
   people who already have a library ("your profile is now public, here's the
   switch") before anything of theirs goes public. Nothing from an existing
   account is shown until they have picked a username.
   Built 30 Sep, on kodigo-dev (`20260930020000_usernames.sql`,
   `20260930030000_profiles_one_read_policy.sql`):
   - `profiles` gains `username` (unique, the word filter's shape),
     `is_private`, `location`, `quote`; anyone can read a profile with a
     username unless it's suspended or blocked either way;
   - usernames are written only by the server with the service key
     (`lib/username-actions.ts`), after the reserved names and word filter;
     column grants stop a browser writing `username` or `suspended_at`;
   - `/profile/setup` chooses or changes it, checked as it's typed, and is
     the one-time notice that profiles are public, with Public/Private beside
     it; the account menu says "Choose your username" until there is one,
     then "Your public profile";
   - `/u/<username>` loads real members (`lib/real-profile.ts`): the owner's
     whole profile from their own library; visitors get the card, and the
     private notice on a private profile; everything under the card for
     visitors comes from step 1.2's public tables;
   - Settings shows the username with Change, and Public profile saves to
     the account.
   Checked with made-up users in rolled-back transactions. Not yet tried
   with a real sign-in: needs dev's service key and auth URLs (see step 0)
   and `SITE_ACCOUNTS=on` in `.env.local`.
2. **The projection.** Add `public_entries` and `public_lists`, the trigger,
   and a one-off backfill for people who opted in.
   Built 30 Sep on kodigo-dev (`20260930040000_public_projection.sql`):
   - `public_libraries`: one cleaned copy of each public member's library,
     built from an allow-list (notes, moods, tags, pictures, stamps, device
     and anything the app adds later stay private). Visitors' profiles are
     drawn from it by `profileFromArchive`, the owner's own code path;
   - `public_entries`: every rated, reacted or reviewed title and episode,
     for members' reviews on title pages (`lib/public-reads.ts`) and the
     feed; `updated_at` only moves when the entry itself changes;
   - `public_lists`: lists with their titles (name, poster, year) for the
     Lists hub and list pages;
   - one refresh (`private.refresh_projection`) runs on every library or
     profile change; it never fails the write (checked with a broken
     library), and takes ~150 ms for a 400-series, 12,000-episode library;
   - nothing is copied without a username, when private or suspended, and
     going private or suspended deletes the copies; On Hold and Stopped
     Watching titles, and every rating, review, watch and list entry of
     theirs, are never copied; reads are refused across a block; nobody
     can write the copies;
   - the backfill runs at the end of the migration.
   Title pages, the Lists hub, list pages and visitors' profiles read them
   once accounts are open, with the development samples after. Favourites
   stay in the browser with their card, which is parked.
   Also store each person's chosen favourites (top 5 films, top 5 series, in
   order) on `profiles`. The profile page's editor already works and saves
   to the browser until this exists.
3. **Settings page** (`/settings` built 29 Sep on `social`, kept in the browser
   until this step; import, export, sign out and delete wait for accounts):
   - profile: name, location, quote, photo, banner, pinned favourites (the
     profile card already lets the owner set location and quote, kept in
     the browser until this exists);
   - privacy;
   - notification choices;
   - country and streaming services;
   - import and export: Kodigo backups, and TV Time, Letterboxd and IMDb
     files like the app takes, including Letterboxd review text and lists;
   - delete account.

   Settings sync built 30 Sep (`20260930050000_settings_sync.sql`,
   `lib/account-settings.ts`, `lib/settings.ts`):
   - on the profile, because they decide what visitors see: display name,
     public/private, Show recent activity, Show your Watchlog, Let people
     follow you, location, quote, and each category's eye
     (`category_privacy`);
   - in `user_settings`, theirs alone: notifications, country and
     services, only-my-services, date format, spoilers, theme; day or night
     stays per device;
   - the browser keeps a copy so the site works signed out; signed in, the
     account's copy wins and every change saves back (600 ms after the last
     change); one shared store per page, so a change reaches every part of
     it at once;
   - visitors' profiles hide the tabs, Follow and categories the owner has
     turned off; the public copy drops watch dates when both Watchlog and
     Recent activity are off, and never copies a hidden list.
   Still in the browser: made categories, category pictures and tile order
   (they belong in the library so the app gets them), and Favourites (card
   parked).

### 2. The tracker on the web (Pro)

Everything the app does, on a computer.

1. **Episode tracking:** check off episodes and whole seasons, and a
   "continue watching / up next" page. The profile's Tracker card already has
   the app's list rows and keys with their confirmation; its check must write
   through the library actions (watched date and stamp), which is what puts a
   watch in Recent activity on the site and Recents in the apps. Until then
   the page shows it in Recent activity for the visit only.
   Wired 30 Sep: `/calendar` is the signed-in person's own library when they
   have Pro (`lib/pro.ts`: their entitlement, or `DEV_PRO=on` in
   development), and every key saves (`TrackerBoard live`): tick an
   episode, watch it later (skip) or take the skip back, mark a film
   watched; a failed save flips back and says why. Signed out, without Pro
   or with an empty library, the page says what's needed. The rules are the
   app's, in `lib/library-rules.ts` (toggleWatched, toggleSkipped,
   setMovieWatched) and tested: watching clears a skip, skipping a watched
   episode unticks it with a stamp, the first watch date is never
   rewritten, an unskip doesn't travel (as in the app). The actions check
   Pro on the server too. `trackMovie` keeps a watched film Watched unless
   it's set aside, as the app does. Not yet: rewatch runs on the web, and
   Recap and More (disabled keys).
2. **Calendar** of upcoming episodes and releases for what you follow,
   beyond the bell list in the nav.
3. **Library tools** on your own shows, films, watchlist and lists: sort,
   filter, hide watched, only my services, reorder by hand.
   Built 30 Sep: `/library` (Pro, gated like the Calendar; the preview in
   development), replacing `/app/shows` and `/app/movies`, which redirect.
   Shows or Movies; a tab for each status with its count; search; genre;
   the app's four sorts (Default, A–Z, Recently added, Release year) and My
   order, dragged by pointer or finger (arrow keys too) and saved as the
   app's `showOrder` / `movieOrder` (`saveOrder`, whole, as the merge
   expects); Hide watched (out of All); Only my services (TMDB providers per
   title for the chosen country, `servicesFor`); grid or list. Sort, layout
   and Hide watched are settings, so they follow the account. The signed-in
   nav is now Movies · Shows · Calendar · Library · Members · Lists. Not
   yet: a Watchlist of its own (To Watch is its tab here) and the lists
   (they're on the profile's Categories).
4. **Watchlist**, and a **Watching now** tab on profiles with episode progress.
   Watchlist built 30 Sep (user chose both): the watchlist is what's added
   and not started, series tracked with nothing watched bar specials (the
   app's Ready to start) and films To Watch, newest added first. `/watchlist`
   (Pro) is the Library's tools in `mode="watchlist"`: All, Series or Films;
   Recently added, Oldest first, A–Z, Release year; search, genre, Only my
   services, grid or list; Pick one for me (a random pick, "Pick another"
   skips the last). Profiles have a public Watchlist tab (`watchlist` on the
   view, drawn from the public copy for visitors), hidden with Settings →
   Privacy → Show your watchlist (`show_watchlist`,
   `20260930060000_show_watchlist.sql`). Still to do: Watching now.
5. **Stats page** with the full numbers behind the profile's panels.
   Built 30 Sep: `/stats` (Pro, gated like the Calendar; the preview in
   development), the app's stat pages on one screen: totals (episodes,
   series, films, watch time, days in a row, longest run); Episodes, Shows
   and Movies each with This week against last, This month, Your night /
   Film night (a weekday only once it's a habit, more than two), a chart of
   the week, and facts (biggest night, most watched, finished, watching
   since, the undated note); every month for a year; Taste (the app's
   Cinedata): top genre, average rating, genres, ratings spread, highest
   rated, moods, reactions; most watched series. Days are counted in the
   browser's own time zone and weeks start where its locale starts them
   (`StatsPage`); watch time is each series' usual episode length from TMDB
   times the episodes ticked, plus films' lengths, streamed in after the
   rest (`watchMinutes`), since the archive has no episode runtimes. Linked
   from the account menu and the profile's Stats tab.
6. **Where to watch** on every title page, by the visitor's country. This one
   is free for everyone.

### 3. Sharing opinions

1. **"+ Log" in the nav:** log, rate or review anything from any page, with
   watched-on date, rewatch, spoilers and tags.
2. **Reviews on title pages:**
   - the members' average and a chart of how they rated;
   - "friends who watched";
   - reviews from people you follow first, then popular and recent;
   - spoiler reviews collapsed.
3. **A page for each review**, with a link made for sharing. Both look like
   the review sheet the Watchlog already opens:
   - the page is the sheet standing on its own, centred on the site, with
     the reviewer's name and photo linking to their profile;
   - the link preview (what iMessage, WhatsApp, X and others draw when the
     link is pasted) is a picture of the sheet made on the fly: the title's
     still in its shell, the title, the stars and the review's opening
     lines, with the Kodigo logo. A spoiler review shows no text in the
     preview, only "Contains spoilers".
4. **Episode reviews and discussion**, which Letterboxd can't do.
5. **Pinned reviews** at the top of a profile.

### 4. The social graph

1. **Follow**, follower and following lists, and a **friends' feed** of what
   the people you follow watched, rated, reviewed and listed.
2. **Likes** on reviews and lists, and a **Likes** tab on profiles.
3. **Comments** on reviews and lists.
4. **Notifications:** someone followed you, liked or replied to your review
   or list.
5. **Members page:** popular reviewers, most followed, new members.
   `/members` built 29 Sep with made-up members (`lib/members.ts`), each with
   a sample profile; linked from the profile menu.

### 5. Discovery

1. **Browse with stackable filters** (`/browse/...` built 29 Sep: genre,
   decade, where to watch with My services, sort, and for series network and
   status; number of seasons isn't a TMDB filter, so left out), for films and
   series alike:
   - genre, decade and year, where to watch, highest rated, popular this
     week, month or all time;
   - for series, network, status (airing, ended, returning) and number of
     seasons;
   - filters combine into one address, so any combination can be shared and
     found by search engines (for example `/browse/series/genre/drama/on/netflix/`).
2. **Lists hub and list pages** (`/lists` and `/u/<name>/list/<id>` built
   29 Sep with the preview's and made-up members' lists; Lists in the top
   bar). The hub has popular, featured and by-topic
   lists. Each list page has "you've watched 7 of 20" progress, likes and
   comments.
3. **Person pages:** an actor's or director's films and series, with "you've
   seen X of these".
4. **Search tabs** for members, lists and reviews, beside titles and people.

### 6. Safety and policies (before anything opens)

1. **Safety**, required before the site opens, and by Apple guideline 1.2 for
   the app:
   - report a review, comment, list or profile;
   - block a person, which hides them both ways, and remove followers;
   - a basic word filter on comments and usernames;
   - a moderation page for the owner;
   - a contact address.

   Built 30 Sep on `social`, working in the browser until accounts open:
   - **Report** from the ⋯ on reviews, list comments, lists and profiles
     (`SafetySheets.tsx`): nine reasons, an optional note, then thanks and an
     offer to block. `fileReport` (`lib/safety-actions.ts`) writes the
     `reports` table, one per person per thing, at most 20 an hour.
   - **Block** from the same ⋯: hides their profile (`BlockGate`), reviews on
     title pages, lists, comments, members and notifications; ends follows
     both ways. Unblock in Settings → Privacy → Blocked people.
   - **Remove a follower:** press Followers on your own profile.
   - **Word filter** (`lib/word-filter.ts`): severe slurs, including
     disguised spellings, refused in comments, profile text and names;
     stricter for display names and usernames (plus reserved names). Words
     that appear in film talk ("Dick Van Dyke", Nazis) are left to reports.
     `saveProfile` checks it on the server too.
   - **Moderation page** `/moderation`: open and resolved reports gathered by
     what was reported; Dismiss, Remove, Suspend, Reopen. Only for emails in
     `MODERATOR_EMAILS`; 404 for everyone else. Dev menu links it.
   - **Support page** has a Safety and reporting section with the address.
   - Migration `20260930000000_safety.sql` (blocks, reports, `is_blocked()`
     for the public tables' read policies, `profiles.suspended_at`), not yet
     applied. Still to do with the database: block by user id (needs
     usernames, step 1), and Remove/Suspend acting on the public tables.
   - The app needs the same report and block (Apple guideline 1.2) when it
     gets the social side.
2. **Policies:**
   - update the privacy policy for public profiles, ads and crash data:
     rewritten 29 Sep on `social` (web accounts, what's public, Stripe,
     browser storage, the services involved, rights under the Philippine
     Data Privacy Act). Its Ads and Crash reports sections are written and
     switched off (`ADS`, `CRASH_REPORTS` in `app/privacy/page.tsx`); turn
     each on in the deploy that ships it, with the date. `main` keeps the
     app-only policy until the site opens;
   - terms of use with rules for user content: `/terms`, built 29 Sep and
     linked from the footer, the Pro page and Stripe checkout. Philippine law,
     accounts from 13, web Pro has no refunds for part-used periods. Still to
     do before real payments: the legal name in "Who we are", and a lawyer's
     read;
   - an account-deletion page (Google Play needs it too): `/delete-account`,
     built 29 Sep, linked from the footer. It promises deletion within 7 days
     by email for someone who can't sign in (confirmed 29 Sep).

### 7. Paying and ads

1. **`/pro` subscription page** (built 29 Sep, on `social`: the plans, the
   free week, what Pro adds, Free and Pro side by side, questions; its App
   Store and web-checkout keys say "coming soon" until the app is approved
   and Stripe exists) for people who find the site first: the plans,
   the free week, and what Pro adds (the tracker, no ads). It links to the App
   Store (and Google Play later) and offers **web checkout through Stripe**.
   The user needs to create a Stripe account.
   Checkout built 29 Sep: a plan picker (yearly preselected), US dollars
   only, **no free week on the web** (the week is the app's), charged at
   checkout. `/api/checkout` → Stripe Checkout → `/pro/welcome`; Settings →
   Account → Subscription shows the plan and renewal and a Manage button
   (`/api/billing-portal`). Everything is off until `STRIPE_*` keys are set
   and accounts open. Before real charges: the legal name on `/terms`, and turning on the
   Customer Portal in Stripe's dashboard.
2. **Entitlements:** the Stripe webhook (`/api/stripe/webhook`) writes Pro to
   the `entitlements` table (migration `20260929000000_entitlements.sql`, not
   yet applied), and the site and apps honour it. The apps' stores write the
   same row later (`source` app_store / google_play).
3. **Ads** for everyone who isn't Pro:
   - one ad between poster rows on Home and Explore;
   - one in the side column of title pages;
   - one between profile sections;
   - never in the billboard, inside a review, or on the sign-up and Pro pages;
   - space reserved so the page doesn't jump when an ad loads.

   A cookie consent banner is needed for Europe and the UK. Start with Google
   AdSense; it needs the user's own account and approves only a live site with
   content, so it is applied for after opening. A film and TV ad network can
   come later, once there's traffic.

   Built 30 Sep on `social` (`lib/ads.ts`, `AdSlot`, `AdUnit`):
   - one wide ad between the second and third rows on Home, Movies and
     Shows; between Reviews and More like this on film, series and episode
     pages; under a profile's sections (not in its side column, which has a
     fixed height the tracker needs);
   - labelled "Advertisement" with "Go ad-free with Pro →"; 90px (100px on
     phones) kept free so nothing jumps; never for Pro (`adFree`);
   - the AdSense script loads only on pages with an ad;
   - consent is Google's own message (AdSense → Privacy & messaging, for
     the EEA, UK and Switzerland) instead of a banner of our own; the footer's
     "Privacy and cookie settings" reopens it;
   - `/ads.txt` is built from the client id;
   - the privacy policy's Ads section switches on with the same client id;
   - in development, dashed boxes show where ads will go.
   To switch on: the user's AdSense account (after opening, with content
   live), the publisher id and three ad unit ids in the environment, and the
   consent message published in AdSense.

### 8. Crash and bug monitoring

Sentry for the website, iOS and later Android. A daily scheduled Claude check
reads new issues, finds the cause and prepares a fix for approval. The user
needs to create a free Sentry account. Update the privacy policy and App Store
privacy labels to mention crash data before it ships.

Website built 30 Sep on `social` (`@sentry/nextjs`, `lib/sentry-options.ts`,
`instrumentation.ts`, `instrumentation-client.ts`, `next.config.ts`):
- off until `NEXT_PUBLIC_SENTRY_DSN` is set, and never in `next dev`;
- errors only: no tracing, no session replay, no IP, no user; `scrub` drops
  cookies, headers (bar the browser's name), query strings and console text;
- reports go through the site at `/monitoring`, so browsers never contact
  Sentry and ad blockers don't drop them;
- source maps upload only with `SENTRY_AUTH_TOKEN`;
- friendly crash pages (`app/error.tsx`, `app/global-error.tsx`);
- the privacy policy's Crash reports section switches on with the same key;
- Moderation has "Send a test crash" (browser and `/api/crash-test`).

Still to do: the user's Sentry account and keys; the iOS app (next app
update, with its privacy labels); Android; the daily Claude check, which
needs a Sentry auth token with read access.

### Before opening: remove the test scaffolding

- The four sample reports on `/moderation` (`SAMPLES` in
  `components/ModerationPage.tsx`) and the preview's local block/report
  store fallback (`lib/safety.ts`).

- The three sample reviews on `/u/preview` (`withSampleReviews` in
  `app/u/[username]/page.tsx`), kept for testing at the user's request.
- The sample Watchlog entries on `/u/preview` for 2025 and 2026
  (`withSampleWatchlog`, same file), kept for testing.
- The three made-up members' reviews (moviemarta, joelwatches,
  night.owl.nadia) on every title page (`sampleReviewers` in
  `lib/profile-previews.ts`).
- The two sample lists in the preview's Categories (`withSampleLists` in
  `lib/profile-previews.ts`).
- The eight made-up members (`lib/members.ts`) and their sample profiles,
  and the sample notifications (`lib/notifications.ts`).
- The `/u/preview` and `/u/sample` pages themselves, and their links in the
  profile menu. They only exist in development, but should go once real
  profiles work.

### 9. Open the site

Turn on `SITE_ACCOUNTS`, move the finished tables to the live project, and
redeploy. This is outward-facing, so ask first.

### 10. The apps

**iOS update:** feed, members' reviews on title pages, profiles, follow, like,
comment, report and block, and Pro from a web purchase. It goes through App
Review. Android picks the same up when it resumes.

## For the apps (from the website's design)

- **Category pictures:** one wide picture per category instead of the
  four-poster collage; the title added last by default, changeable by the
  owner. The archive needs a field for the chosen picture of every category,
  built-in ones included (today only a list's cover is stored).
- **Category order:** the owner's arrangement (`kodigo.profileShelfOrder`)
  moves into the archive so the website can show it.
- **"Your take" keeps its name** (decided 27 Sep; "Review" was tried and
  dropped). The app's section gains the review text, with spoilers,
  watched-on and rewatch, as the website has it; the note stays private and
  is labelled so. Its cards run: rating, mood, review, note, then tags (the
  app has tags before the note today).
- **Visibility:** every category has an eye the owner toggles, public or
  private. All start public except On Hold and Stopped Watching, which start
  private. The choice is stored in the library and the server leaves private
  categories out of anyone else's view.

## Calendar (the tracker page)

`/calendar` (built 29 Sep; `/tracker` forwards): the carousel of new episodes
and films now showing, the calendar with the day's rows beside it, then
Shows or Movies, the watch list's piles or Coming soon. Drawn from the preview
library until accounts. In the top bar after Shows, and in the profile menu.

## What's new

`/whats-new` (built 29 Sep): dated notes on features and fixes in the app and
on the website, newest first, each marked Live, In review or Coming soon. The
notes live in `src/lib/updates.ts`; add one with every release. Linked from
the nav menu, the footer and the Pro page.

## Later

- **Year in Review** (`/u/<name>/year/<year>` built 29 Sep from the
  preview library: numbers, top series and films, month by month, genres,
  first and last, moods; linked from Stats and the profile menu). Its link
  preview picture (the year, the numbers, the top three posters) too.
- Clone someone's list into your own.
- Tags on logs and lists.

## Deliberately left out

- Letterboxd's Journal (an editorial magazine) and Video Store (its own
  rentals): they need staff and licensing deals, not code.
- Accounts for studios and festivals, and themed list challenges.

## Notes

- A review today is one per title, and a rewatch replaces the text. Letterboxd
  keeps one diary entry per watch. We keep the app's one-per-title for now. It
  can grow later without breaking anything.
- The archive's `notes`, `moods`, `tags`, hidden shows and saved rails are
  never projected.
- Comments someone left on *other people's* Letterboxd reviews have nothing to
  attach to here, since those people and reviews aren't on Kodigo. The
  importer keeps them in the person's own history as a read-only archive rather
  than posting them.
