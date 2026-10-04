# GIFs in replies and comments: the plan

For after Kodigo 1.1 is approved. Nothing here is built. Written 4 Oct 2026.

## The decision

GIFs come from **KLIPY**. Members can attach one to a reply under a review or
a comment on a collection, on the website, iOS and Android.

- **Tenor is gone.** Google stopped new API keys on 13 Jan 2026 and shut the
  API down on 30 Jun 2026.
- **GIPHY is paid for production.** That has been the case since March 2025:
  about $99 a month for 5,000 requests a day, after an approval process that
  can take weeks.
- **KLIPY is free with no usage caps.** It was built by former Tenor people as
  a near drop-in replacement, and is used by WhatsApp, Canva, Figma, Miro and
  Outlook.

## What stays out

- **Reviews.** A review stays text: it's the considered part, and it feeds
  the ratings, search and the link previews. GIFs belong in the conversation
  under it.
- **KLIPY's ads.** They're optional and stay off. Kodigo has no advertising
  in the apps, and the privacy answers say no tracking.
- **KLIPY's customer id.** It's optional and is left out, so KLIPY is never
  sent anything that identifies a member.
- **Stickers, clips and memes.** These are in KLIPY's library but are a
  separate decision, and not this one.

## KLIPY's terms that shape the build

- **Keys.** A test key allows 100 calls an hour, which is enough to build
  against. A production key with unlimited calls is asked for in KLIPY's
  Partner Panel and approved by them. **Ask for it first, before any of the
  build starts**, as the wait is theirs.
- **Attribution is required.** The picker's search field says "Search KLIPY",
  and the picker shows the "Powered by KLIPY" mark. Follow their guidelines
  exactly, as they're a condition of the key.
- **Content filter.** This is set in the Partner Panel. Choose the strictest
  rating, and block the categories a film-and-TV community has no use for.
  Write down what was chosen, here, once it's set.
- **The key stays on the server.** The apps don't hold KLIPY's key: searches
  go through the website (below), so the key can be changed or revoked
  without a release.

## Build order

### 1. Database (kodigo-dev first, then live after asking)

- Add `gif` to `public.comments` as a nullable jsonb column: `{ id, url,
  width, height, title }`. `url` is KLIPY's own address for the small
  rendition; nothing is copied to our storage.
- Allow a comment with a GIF and no words. Today `body` must have text.
  Relax that to "text or a GIF", in the table's check and in
  `writeComment`.
- Nothing else changes. The comment keeps its existing likes, notifications,
  blocks and report kinds.

### 2. Website: the doors

- **`GET /api/app/gifs?q=` (new).** Search and trending, through KLIPY with
  the server's key and the strict filter. It needs a member's bearer token,
  sits behind `APP_SOCIAL`, and is capped per member per minute. It answers
  only what a picker draws: id, preview address, size, title.
- **`writeComment` takes an optional `gif`.**
  - Check its id against KLIPY before saving, so a client can't attach an
    arbitrary address.
  - Run the word filter over the GIF's title as well as the text.
  - Keep the hourly cap as it is.
- **`/api/app/comments`** passes `gif` through, and the website's own
  comment form gets the same.

### 3. Pickers (website, iOS, Android)

- A GIF button in the reply and comment boxes only. It opens a sheet with
  "Search KLIPY", a grid of results, trending when the field is empty, and
  the "Powered by KLIPY" mark.
- One GIF per reply. It shows above the text in the box, with an ✕ to
  remove it.
- **In a thread,** the GIF draws at its own shape, no wider than the text
  column, with its title read out to VoiceOver and TalkBack. A tap pauses it.
- **Motion.** With Reduce Motion on (iOS) or animations off (Android), GIFs
  show their first frame with a play button. They only play once tapped.
- The same layout rules as the rest of Community: the screen margin, the
  panel, the send pill. The sheet is dismissed by swiping down.

### 4. Moderation

- A report on a reply or comment with a GIF carries the GIF's address in
  the report's excerpt, so the queue at /moderation shows what was posted.
- Removing a comment removes its GIF with it. Nothing is stored on our side.
- `APP_SOCIAL=off` stops GIF posting along with everything else the brake
  covers.

### 5. Privacy and review

- **Privacy policy:** name KLIPY as a service the picker talks to, and say
  that search words go to KLIPY through Kodigo's server, with no account
  details.
- **App Store and Play privacy answers:** add nothing, unless KLIPY's terms
  ask for more. Searches go through our server, nothing identifying is sent,
  and there are no ads. Re-read KLIPY's terms at the time.
- **App Review notes:** mention GIFs, the strict filter, and that GIFs can be
  reported like any reply.

## Open questions for when it starts

- KLIPY's production key: how long approval takes, and whether their terms
  allow a paid app with no ads.
- Should GIFs autoplay on cellular data, or only on Wi-Fi?
- Should a member be able to switch GIFs off for themselves, so that others'
  GIFs show as a still with a play button? This is a small setting, and
  welcome for some people.

## Sources (checked 4 Oct 2026)

- 9to5Google, "Google pulls the plug on Tenor API":
  https://9to5google.com/2026/06/30/google-tenor-api-gif-updates/
- AgentDeals, "Tenor API shutdown: alternatives":
  https://agentdeals.dev/tenor-alternatives
- DEV Community, "GIPHY's GIF API is no longer free":
  https://dev.to/giorgi_khachidze_ab9ac4ad/giphys-gif-api-is-no-longer-free-heres-what-you-need-to-know-l7h
- KLIPY API overview: https://klipy.com/api-overview
- KLIPY blog, "GIPHY vs Tenor vs KLIPY":
  https://medium.com/klipy-blog/best-gif-apis-for-developers-in-2025-giphy-vs-tenor-vs-klipy-5e4f868e4381
