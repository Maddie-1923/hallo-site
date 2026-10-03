// Whether the signed-in half of the site is open.
//
// The public side — the landing page, Explore, a title's page, privacy and
// support — is what the App Store listing points at and is always on. Behind
// this flag sits everything that needs a session: /app, /login, the auth
// callback, and the account routes underneath them.
//
// It is off by default, and that is the point. The signed-in side is written
// and unreleased: it has never been used by anybody but its author, and the
// week an app launches is the worst week to find out what it does wrong. The
// phone does not depend on it — the app talks to Supabase directly and has
// never asked this site for anything — so closing it costs nothing that
// somebody is currently using.
//
// Closed rather than merely unlinked. Taking the Sign in button out of the nav
// leaves every route resolving for anyone who types it, which is how a parked
// feature ends up being the first thing a stranger finds. Hiding the door and
// locking it are different jobs and this does the second.
//
// To open it: set SITE_ACCOUNTS=on in the environment and **redeploy**. The
// redeploy is not a formality. The proxy reads this per request, so the doors
// unlock the moment the variable is set — but the landing page, privacy and
// support are prerendered at build time, and their copy of the Sign in button
// was decided when they were built. Set the variable without rebuilding and
// you get a site whose doors are open and whose signage says nothing about it.
// Verified by starting a build made with the flag off and then running it with
// the flag on: /login answered, and the landing page still had no link to it.
//
// Nothing else changes. No code is removed while it is off, and nothing has to
// be written when it goes on.
export const accountsOpen = process.env.SITE_ACCOUNTS === "on";

// The apps' own doors — /api/app/username, /api/app/comments and
// /api/app/about — answer to this instead, and not to `accountsOpen`. They
// were behind the website's flag at first, which tied two unrelated questions
// together: whether the site's signed-in pages are ready, and whether
// Community in the apps works. With the site closed, nobody in either app
// could take a username, post a reply or save their About.
//
// On unless APP_SOCIAL=off. It's the brake for a bad day — a wave of spam, a
// filter letting something through — and pulling it stops new usernames,
// replies, comments and About text from the apps without a release of either.
// Reading, likes, follows, reports and blocks go to the database directly and
// carry on. Each door still needs a member's bearer token and still runs the
// word filter and the hourly cap. Like the flag above, it takes a redeploy.
export const appSocialOpen = process.env.APP_SOCIAL !== "off";

/// The routes that need a session. Kept here rather than spelled out in the
/// proxy so the nav and the proxy cannot disagree about what is closed.
export function needsAccount(path: string): boolean {
  return path === "/login"
      || path.startsWith("/app")
      || path.startsWith("/auth")
      || path.startsWith("/api/account");
}
