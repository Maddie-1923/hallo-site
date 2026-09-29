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

### 1. Accounts and profiles

1. **Usernames and public profiles.** Add `username` and `is_private` to
   `profiles`, and wire `/u/[username]` to real data. Show a one-time notice to
   people who already have a library ("your profile is now public, here's the
   switch") before anything of theirs goes public. Nothing from an existing
   account is shown until they have picked a username.
2. **The projection.** Add `public_entries` and `public_lists`, the trigger,
   and a one-off backfill for people who opted in.
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

### 2. The tracker on the web (Pro)

Everything the app does, on a computer.

1. **Episode tracking:** check off episodes and whole seasons, and a
   "continue watching / up next" page. The profile's Tracker card already has
   the app's list rows and keys with their confirmation; its check must write
   through the library actions (watched date and stamp), which is what puts a
   watch in Recent activity on the site and Recents in the apps. Until then
   the page shows it in Recent activity for the visit only.
2. **Calendar** of upcoming episodes and releases for what you follow,
   beyond the bell list in the nav.
3. **Library tools** on your own shows, films, watchlist and lists: sort,
   filter, hide watched, only my services, reorder by hand.
4. **Watchlist**, and a **Watching now** tab on profiles with episode progress.
5. **Stats page** with the full numbers behind the profile's panels.
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

1. **Browse with stackable filters**, for films and series alike:
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
2. **Policies:**
   - update the privacy policy for public profiles, ads and crash data;
   - terms of use with rules for user content;
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
2. **Entitlements:** the Stripe webhook writes Pro to the account, and the site
   and apps honour it.
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

### 8. Crash and bug monitoring

Sentry for the website, iOS and later Android. A daily scheduled Claude check
reads new issues, finds the cause and prepares a fix for approval. The user
needs to create a free Sentry account. Update the privacy policy and App Store
privacy labels to mention crash data before it ships.

### Before opening: remove the test scaffolding

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

- **Year in Review:** a personal yearly recap made for sharing, once people
  have a year of data on Kodigo.
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
