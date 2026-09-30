# Kodigo site

Next.js 16 (App Router, TypeScript, Tailwind 4) with Supabase for accounts and
cloud sync. Sibling of the `kodigo` iOS repo; the two share one data format and
nothing else.

## What's here

- `src/app/page.tsx` — the home page, Netflix-shaped: `CinemaHero` (a
  full-width billboard of the week's trending titles, sliding right to left,
  sized by `.billboard-fit` in globals.css so it and the first row fit one
  screen) and `WideRow`s of landscape cards with each title's TMDB logo
  underneath. `components/TitleRows.tsx` builds both (billboard slides, wide
  rows) and is shared with Explore (`components/ExplorePage.tsx`), which is
  the same layout for one catalogue at a time, with its Shows/Movies switch
  in the billboard's corner. The app's pitch (features,
  themes, pricing, FAQ) lives at `about/`. `privacy/` and `support/` are the
  policy pages (they replaced the Jekyll `privacy.md`/`support.md`).
- `src/app/u/[username]/` — public profiles, and `review/[key]/` a review's
  own page with its link-preview picture (`opengraph-image.tsx`, fonts in
  `src/fonts/og/` because the image renderer can't read woff2). Only the
  development previews exist yet; they load through `lib/profile-previews.ts`.
- `docs/social-plan.md` — the plan for the social side (public profiles,
  members' reviews, follows, likes, comments) and its build order.
- `src/app/login/` — magic-link email sign-in plus a Sign in with Apple button.
  `src/app/auth/callback/route.ts` exchanges the code; `auth/signout` clears it.
- `src/proxy.ts` — refreshes the Supabase session cookie on every request and
  keeps `/app/*` behind sign-in. Next 16 renamed `middleware` to `proxy`.
- `src/app/app/` — the signed-in library: `shows`, `movies`, `profile`,
  `account` (sign out, remove library, delete account). Import moved to
  Settings → Import & export (`components/ImportPanel.tsx`): the app's
  importers ported to `src/lib/imports/` (TV Time, Letterboxd, Trakt, Simkl,
  IMDb and any CSV/JSON, plus the archive merge) run in the browser against
  TMDB through `lib/import-actions.ts`, and `importIntoLibrary` merges the
  result on the server. `npm run test:imports` runs their tests.
- `src/app/api/account/route.ts` — the one server-only route; deletes the auth
  user with the service-role key.
- `src/lib/archive.ts` — the TypeScript twin of the app's `LibraryArchive`.
  Field names match the Swift CodingKeys exactly. Add a field there when the
  app adds one; leave everything optional.
- `src/app/discover/`, `src/app/search/`, `src/app/show/[id]/`,
  `src/app/movie/[id]/` — the public Discover side: rails, search, title
  pages. Anyone can browse; tracking controls appear when signed in.
- `src/lib/tmdb.ts` — server-only TMDB client (key in `TMDB_API_KEY`, one-hour
  fetch cache). `toShow`/`toMovie` produce exactly the keys the Swift structs
  decode. `TMDB_BASE_URL` overrides the host for testing against a stand-in.
- `src/lib/library-actions.ts` — the server actions that change a library from
  the web: track/untrack shows and movies, set status, check episodes off.
  Every write stamps `modified`, keeps tombstones, moves `watchedStamps`, and
  sets the row's `changed_at`, so the app's merge treats the web as one more
  device. Dates are ISO 8601 without fractional seconds — Swift's `.iso8601`
  decoder rejects them otherwise.
- `src/lib/supabase/` — browser and server clients from `@supabase/ssr`.
- `supabase/migrations/` — the schema. One `libraries` row per user.
- `src/fonts/` — Open Runde (from the app repo) and Bebas Neue, self-hosted.
- `src/icons/*.svg` — Maddie's marks from Canva (heart, watched, list, add,
  check, bookmark), black disc stripped, glyph on currentColor.
  `src/components/marks.tsx` is generated from them: drop a new SVG in,
  strip its disc path, and regenerate the component file with the same
  attribute renames (clip-rule→clipRule etc.). `MarkButtons` draws the
  heart / watched / list trio on cards and the hero; `--loved` and `--seen`
  are the app's `loved` and `badgeOn` colour pairs.

## Design

Dark throughout: Graphite page, Bone type, the app's night-mode accents.
`ThemeRow` swaps `--accent` live on the landing page. Fonts go through
`--font-display` (Bebas Neue) and `--font-body` (Open Runde). Colours are the
CSS variables in `globals.css`, exposed to Tailwind as `text-accent`,
`bg-card`, `border-hair` and so on.

## Sync model

The server holds the whole `LibraryArchive` as JSON in one row per user, the
same shape iCloud sync pushes as one CKRecord and Backup writes to a file. The
server never interprets it. Conflict handling stays in the app: `changed_at` on
the row is the library-wide stamp the app routes on ("did the other side move
since I last synced"), and the per-record stamps and tombstones inside the
archive settle a two-sided change. An import on the web (a backup included) is
merged into the row with the app's own merge (`src/lib/imports/merge.ts`), never
written over it; replacing a library with a backup is the app's job.

### What the iOS side needs (not built yet)

A `SupabaseSync` next to `CloudSync.swift` that mirrors it:

- `fetchRemote()` → `GET /rest/v1/libraries?select=archive,changed_at,device`
  with the user's JWT; a missing row is the first-run nil.
- `push(archive, changedAt)` → `POST /rest/v1/libraries` with
  `Prefer: resolution=merge-duplicates` (an upsert on `user_id`), body
  `{user_id, archive, version, changed_at, device}`.
- `resolve()` is unchanged: the three-way comparison against
  `lastSyncedChange` and `LibraryArchive.merged(onto:)`.
- Auth: Sign in with Apple through `supabase.auth.signInWithIdToken`
  (`ASAuthorizationAppleIDCredential.identityToken`), or the same magic link
  as the site. `supabase-swift` handles token refresh; the anon key goes in
  `Secrets.swift` beside the TMDB key.
- `removeFromCloud()` → `DELETE /rest/v1/libraries?user_id=eq.<id>`.

## Setup

1. Supabase → SQL editor → run every file in `supabase/migrations/` in
   name order. Two projects exist: `kodigo` (live, the app's) and
   `kodigo-dev` (fxehhckzghqssupmzdig), which `.env.local` points at and where
   every new table is built and tested first. Live gets a migration only
   once its step is finished, and only after asking.
2. Authentication → Providers: Email on (magic link). Apple needs a Services
   ID and key from the Apple Developer portal; the site works without it.
3. Authentication → URL configuration: Site URL and a redirect of
   `<site>/auth/callback`.
4. Copy `.env.example` to `.env.local` and fill it in. The service-role key is
   optional and only enables account deletion.
5. `npm run dev`.

Deploys to Vercel as-is; set the same env vars there.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
