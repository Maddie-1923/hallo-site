# Kodigo site

Next.js 16 (App Router, TypeScript, Tailwind 4) with Supabase for accounts and
cloud sync. Sibling of the `kodigo` iOS repo; the two share one data format and
nothing else.

## What's here

- `src/app/page.tsx` — the landing page. `privacy/` and `support/` are the
  policy pages (they replaced the Jekyll `privacy.md`/`support.md`).
- `src/app/login/` — magic-link email sign-in plus a Sign in with Apple button.
  `src/app/auth/callback/route.ts` exchanges the code; `auth/signout` clears it.
- `src/proxy.ts` — refreshes the Supabase session cookie on every request and
  keeps `/app/*` behind sign-in. Next 16 renamed `middleware` to `proxy`.
- `src/app/app/` — the signed-in library: `shows`, `movies`, `profile`,
  `account` (sign out, remove library, delete account) and `import` (upload a
  backup JSON to seed or replace the row).
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
archive settle a two-sided change. The import page writes `changed_at` from the
file's `exported` date, never from the clock, so an old backup can't look newer
than a phone's live copy.

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

1. Supabase → SQL editor → run `supabase/migrations/20260905000000_libraries.sql`.
2. Authentication → Providers: Email on (magic link). Apple needs a Services
   ID and key from the Apple Developer portal; the site works without it.
3. Authentication → URL configuration: Site URL and a redirect of
   `<site>/auth/callback`.
4. Copy `.env.example` to `.env.local` and fill it in. The service-role key is
   optional and only enables account deletion.
5. `npm run dev`.

Deploys to Vercel as-is; set the same env vars there.
