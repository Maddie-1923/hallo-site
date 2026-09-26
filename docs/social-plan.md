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
  - Recent activity, Diary, Reviews, Lists and Favourites, with tabs and
    back-to-top.
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
3. **Settings page:**
   - profile: name, bio, photo, banner, pinned favourites;
   - privacy;
   - notification choices;
   - country and streaming services;
   - import and export: Kodigo backups, and TV Time, Letterboxd and IMDb
     files like the app takes, including Letterboxd review text and lists;
   - delete account.

### 2. The tracker on the web (Pro)

Everything the app does, on a computer.

1. **Episode tracking:** check off episodes and whole seasons, and a
   "continue watching / up next" page.
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
3. **A page for each review**, with a link made for sharing: a preview image
   of the poster, the hearts and the first line.
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

### 5. Discovery

1. **Browse with stackable filters**, for films and series alike:
   - genre, decade and year, where to watch, highest rated, popular this
     week, month or all time;
   - for series, network, status (airing, ended, returning) and number of
     seasons;
   - filters combine into one address, so any combination can be shared and
     found by search engines (for example `/browse/series/genre/drama/on/netflix/`).
2. **Lists hub and list pages.** The hub has popular, featured and by-topic
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
   - an account-deletion page (Google Play needs it too).

### 7. Paying and ads

1. **`/pro` subscription page** for people who find the site first: the plans,
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

### 9. Open the site

Turn on `SITE_ACCOUNTS`, move the finished tables to the live project, and
redeploy. This is outward-facing, so ask first.

### 10. The apps

**iOS update:** feed, members' reviews on title pages, profiles, follow, like,
comment, report and block, and Pro from a web purchase. It goes through App
Review. Android picks the same up when it resumes.

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
