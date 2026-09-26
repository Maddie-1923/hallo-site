# Kodigo social — the Letterboxd side

Decided with the user on 26 Sep 2026:

- **Scope:** public profiles, members' reviews on title pages, follow + friends
  feed, likes and comments. All four.
- **Privacy:** public by default, with a switch to go private.
- **Platforms:** website and iOS app. The iOS part ships as an app update after
  the first version is approved. Android follows when it's no longer parked.

## How it fits the data we already have

A person's ratings, reviews, diary dates and lists live inside their private
library row (`libraries.archive`), and the phone writes that row directly.
Other people's pages can't read that row, and it shouldn't be opened up. It
holds everything, including notes and things never meant to be shared.

So the social side is a **public projection**. A database trigger on
`libraries` copies the shareable parts into separate public tables whenever the
row changes, whether the phone or the site made the change:

- `public_entries`: one row per title per person, with rating, reaction,
  review text, spoiler flag, watched-on date and rewatch. This is the source
  for title pages, profiles and the feed.
- `public_lists`: custom lists with their titles.

The trigger never fails the library write. If the projection hits an error,
it logs it and lets the sync through, so the app's sync can't break because of
the social side. Private accounts project nothing, and switching to private
deletes their projected rows.

Things that exist only socially sit in their own tables and never touch the
archive: `follows`, `likes`, `comments`, `blocks` and `reports`.

## Build order

1. **Usernames and public profiles.** Add `username` and `is_private` to
   `profiles`. Create the `/u/[username]` page with favourites, recent diary,
   reviews, lists and stats. Show a one-time notice to people who already have
   a library ("your profile is now public, here's the switch") before anything
   of theirs goes public. Nothing from an existing account is shown until they
   have picked a username.
2. **The projection.** Add `public_entries` and `public_lists`, the trigger,
   and a one-off backfill for people who opted in.
3. **Reviews on title pages.** Show the members' average rating, the reviews
   from people you follow first, then popular and recent ones. Spoiler reviews
   are collapsed.
4. **Follow and the friends' feed.** Follow and unfollow, follower and
   following lists, and a `/feed` of what the people you follow watched, rated,
   reviewed and listed.
5. **Likes and comments** on reviews and lists.
6. **Safety.** Required before anything opens, and by Apple guideline 1.2 for
   the app:
   - report a review, comment, list or profile;
   - block a person, which hides them both ways, and remove followers;
   - a basic word filter on comments and usernames;
   - a moderation page for the owner;
   - a contact address.
7. **Policies.** Update the privacy policy for public profiles. Write terms of
   use with rules for user content, and an account-deletion page (Google Play
   needs it too).
8. **Open the site.** Turn on `SITE_ACCOUNTS` and redeploy. This is
   outward-facing, so ask first.
9. **iOS update.** Add the feed, members' reviews on title pages, profiles,
   follow, like, comment, report and block. It goes through App Review.

## Notes

- A review today is one per title, and a rewatch replaces the text. Letterboxd
  keeps one diary entry per watch. We keep the app's one-per-title for now. It
  can grow later without breaking anything.
- The archive's `notes`, `moods`, `tags`, hidden shows and saved rails are
  never projected.
