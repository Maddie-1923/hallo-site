# Profile privacy: private library, public lists

Plan written 12 Oct 2026. Nothing here is built yet.

## What was decided

- The Profile tab gets two sections that fold: **Your library** (the eight
  built-in shelves) and **Your lists** (custom lists). The app remembers
  which ones are folded, and a folded heading still shows its count
  ("8 · 1 public").
- **Library shelves start private.** Each one can be shared on its own.
- **Lists start public.** Each one can be locked.
- **Every tile has a badge**, a globe for public or a lock for private.
  Tapping the badge opens a small menu ("Share on your profile" / "Keep
  private"), so a stray tap can't publish anything.
- **Reviews and ratings stay public** even when the shelf their title is on
  is private.
- **Existing members' shelves all go private** with this change, and the
  app tells them once.
- **The website's "Show your watchlist" and "Show what you're watching"
  switches go.** The Shows and Movies badges replace them.

## What the code does today (and why this is more than a UI change)

- **The privacy map can't express "private by default".**
  `profiles.category_privacy` uses `true` for hidden and a missing key for
  public. The database only understands its `list:<id>` keys. The website
  already writes built-in keys (`shows`, `finished`…), but they only hide a
  tab on the website; the titles stay in `public_libraries`, which anyone
  with the public key can read.
- **Everything public hangs off the shelves.** `private.refresh_projection`
  (latest version in `20261011120000_watchlist_privacy.sql`) builds the
  public `shows`/`movies` arrays first. Ratings, reviews, `public_entries`
  and list contents are then filtered to those titles. If the shelves are
  simply made private, reviews and list contents disappear too.
- **iOS has no privacy control on the Profile tab.** The eye key in the
  toolbar is "Hide empty shelves". List privacy is only under Community →
  Collections → Yours (`Social.setListHidden`). That function reads the
  whole map, changes one key and writes the whole map back, so two quick
  taps can overwrite each other.
- **iOS has no watchlist or watching switches.** Those live only in the
  website's Settings → Privacy (`SettingsPage.tsx`).
- **The app never shows another member's built-in shelves.** Its member
  profile has three tabs: Reviews, Collections and Favourites.
- **Sorting is one sequence across built-ins and lists.**
  `Library.arrangedShelves` and `ProfileArrangeSheet` handle both together.
- **Android** (`kodigo-android`, unreleased) is a port of the iOS app with
  the same shelf model and the same `category_privacy` rules.

## Data model

New column `profiles.shared_shelves text[] not null default '{}'`. It
holds the keys of the built-in shelves a member has shared: `shows`,
`movies`, `upToDate`, `finished`, `onHold`, `didNotFinish`, `favorites`,
`rewatched`. A key that's missing means private, so every existing member
starts private without having their row rewritten.

Lists keep `category_privacy["list:<id>"] = true` for locked. They already
default to public, so nothing changes for them.

Two RPCs replace the read-change-write PATCH, and both apps use them:
- `set_shelf_shared(key text, shared boolean)`
- `set_list_hidden(list_id text, hidden boolean)`

Each one updates its single key on the server, so taps can't overwrite
each other.

`show_watchlist` and `show_watching` stay in the table for now (old app
builds and old site deploys still send them), but nothing reads them any
more. Drop them in a later migration.

## Server: the projection (`refresh_projection`, new migration)

Split what's public into three separate questions:

1. **Which titles can appear anywhere at all?** Everything except shows
   that are Stopped or Dropped and films that are On Hold or Dropped, as
   today. Call these "listable".
2. **Which titles fill the shared shelves?** `public_libraries.shows` and
   `.movies` get only the titles that belong to a shared shelf:
   - Shows shared: all listable shows.
   - Movies shared: all listable films.
   - Finished, Favorites, Up to Date: only their own titles.
   - On Hold and Stopped Watching: never (decision 3).
   - Rewatched: the rewatch logs, which today are never copied.

   Add a `sharedShelves` array to the public archive so the website knows
   which tabs to draw.
3. **Which titles carry what the member published?** Ratings, reactions
   and reviews of any listable title go to `public_entries` and the
   archive's `ratings`/`reviews`, whether or not a shelf is shared. Only the
   minimum title fields go with them.

**Lists:** contents are resolved against all listable titles, not against
the shared shelves, so a public list stays whole when the library is
private.

**Dates:** `show_watchlog` and `show_activity` still decide whether watch
dates are copied.

**Trigger:** add `shared_shelves` to the `profiles_project` trigger's
column list. End the migration with the usual backfill
(`select private.refresh_projection(user_id) …`).

**Knock-on effects to check:**
- `member_directory` counts `titles` from the public shelves, so most
  members' counts would drop to 0. Decide: keep a count in the projection
  (a number gives away no titles), or drop the stat.
- `list_topics` reads genres from `public_libraries`. Move it to
  `public_lists` titles.
- The feed, the weekly digest, title ratings, "friends who rated" and
  comment and like target checks all read `public_entries`. Point 3 keeps
  these working.

Build and test on `kodigo-dev` first. Apply to live only after asking, and
only together with the website deploy (see Rollout).

## Website (`kodigo-site`)

- **`real-profile.ts` / `public-profile.ts`:**
  - For visitors, show a built-in category only if its key is in
    `sharedShelves`. Lists keep the `category_privacy` filter.
  - Keep `ownerOnly` for On Hold and Stopped Watching (decision 3).
  - The Watchlist tab shows only when Shows or Movies is shared.
  - Drop the dead `watching` key in `hiddenSections`.
- **`ProfileCategories.tsx`:** for the owner, the same two groups and
  badges as the app. Built-ins read `shared_shelves` through the RPC; lists
  read `category_privacy`. Update the "Everything starts public…" comment.
- **`ProfilePage.tsx` / `ProfileNav.tsx`:** the number tiles (Movies,
  Shows, Episodes), Stats and the Movies/Shows/Episodes pages draw from the
  public archive, so they'll only reflect shared shelves.
  - Hide a number tile and its page when the shelf behind it isn't shared.
  - Stats shows only what's public.
- **`SettingsPage.tsx`:** remove "Show your watchlist".
  - Point "Categories" to the profile, with a line saying shelves start
    private.
  - Take `showWatchlist` and `showWatching` out of `settings-shape.ts`
    `PROFILE_SETTINGS`, so the site stops writing them.
- **`account-settings.ts`:** `saveCategoryPrivacy` keeps handling lists
  only. Built-ins go through `set_shelf_shared`.
- **`docs/social-plan.md`:** update the privacy section, including the
  stale Watching-now tab.

## iOS app (`kodigo`)

- **`ProfileView.swift`:** replace the single `LazyVGrid` with two
  sections, each a header that folds (icon, title, count "8 · 1 public",
  chevron) above its own grid.
  - The library grid holds the eight built-ins.
  - The lists grid holds the lists plus `ProfileCreateListTile` at the end.
  - Store the folded state in `ProfileSettings` as `libraryCollapsed` and
    `listsCollapsed`, next to `hideEmptyShelves` (keys
    `kodigo.profileLibraryCollapsed` and `kodigo.profileListsCollapsed`).
- **Badges on `ProfileCategoryTile` / `ProfileShelfTile`:** a globe or lock
  in the corner. Tapping opens a menu: "Share on your profile" / "Keep
  private", plus a line on who can see it. Reuse the existing strings
  `community.collections.public` ("On your profile") and
  `community.collections.private` ("Only you").
- **When there are no badges:** if the person isn't signed in to Community,
  show no badges and nothing is shared. The section notes say "Join
  Community to share a shelf".
- **`Social.swift`:**
  - Add `shared_shelves` to `ProfileRow` and its column list.
  - Add `setShelfShared` and make `setListHidden` call the RPCs.
  - Cache the state in `SocialSession`, so the Profile tab draws badges
    without waiting on the network, and refresh it on profile load.
- **`ProfileShelves.swift`:**
  - Split `arrangedShelves` into `arrangedLibrary` and `arrangedLists`,
    using the same `shelfOrder` keys, each sorted within its own section.
  - `ProfileArrangeSheet` gets two drag groups, and a row can't be dragged
    across groups.
- **Community → Collections → Yours** keeps its per-list switches, reading
  the same state, so the two places can never disagree.
- **Other members' profiles (`MemberProfileView`):** optional, a fourth
  "Library" tab showing their shared shelves from `public_libraries`. This
  is new, so do it after the rest.
- **One-time notice:** a sheet or card on the Profile tab saying "Your
  library is now private. Tap a badge to share a shelf."
  - Store it as `kodigo.libraryPrivacyNotice.v1` in `KodigoDefaults.store`.
  - Show it only to someone who already had a Community profile before this
    version; a new install skips it.
- **Strings:** every new string goes in `Localizable.xcstrings` through
  `String(localized:defaultValue:comment:)`.
- **Privacy answers:** check `AppStore/privacy-labels-next.md`. Probably no
  change, since this shares less, not more.

## Android (`kodigo-android`)

Mirror the iOS work once it's settled:
- `ui/profile/ProfileScreen.kt` / `ProfileParts.kt`: the two sections,
  folding and badges.
- `ArrangeSheet.kt`: two drag groups.
- `data/social/SocialModels.kt`: add `shared_shelves`.
- `SocialApi.kt` and `SocialRules.kt`: the two RPCs and the
  private-by-default rule.
- Update `docs/specs/profile-tab.md` and `docs/specs/community.md`.

Android isn't released, so it doesn't have to ship at the same time.

## Rollout

The server change makes everyone's shelves private as soon as it's applied.
The app update only adds the badges and the notice. So:

1. Build and test the migration, the website and the iOS app against
   `kodigo-dev`.
2. Submit the iOS update. It can be submitted before live changes because
   the app reads `shared_shelves` and treats a missing column as "nothing
   shared".
3. Once it's approved, apply the migration to live and deploy the website
   in the same window, then release the app.
4. Android follows.

Old app builds (1.1) carry on working. They never showed built-in privacy,
and their list switches still write `category_privacy`.

## Tests

- **Projection:** a dev test member with each shelf shared and private, a
  review on a private shelf, and a public list containing titles from
  private shelves.
  - Check that `public_libraries`, `public_entries` and `public_lists` hold
    exactly what's expected.
  - Check the anonymous API returns nothing more.
- **Website:** a visitor sees only shared tabs; the owner sees badges on
  every shelf and list; the Settings page no longer has the switches.
- **iOS:**
  - Tap a badge and confirm in the menu, then check that the website
    profile updates.
  - Fold, quit and relaunch: the sections stay folded.
  - Sorting and dragging stay within each section.
  - The notice shows once for an existing member and never on a fresh
    install.
- **Fast taps:** toggle five badges quickly and check that none of the
  changes is lost (the RPC fix).

## Decisions (12 Oct 2026)

1. **Member directory titles count:** kept as a plain number. The
   projection stores `titleCount` (every listable title), and
   `member_directory` reads that instead of counting the shared shelves.
   It's hidden along with everything else on a private profile.
2. **Other members' shared shelves in the app:** later. The website
   already shows them; the app tab waits until people have shared shelves.
3. **On Hold and Stopped Watching:** always private, as they are today.
   They show a lock with no menu and the line "Always private".
   `set_shelf_shared` refuses `onHold` and `didNotFinish`.
