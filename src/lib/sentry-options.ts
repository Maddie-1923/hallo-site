import type { ErrorEvent } from "@sentry/nextjs";

// Crash and error reports to Sentry (docs/social-plan.md, step 8), shared by
// the browser (instrumentation-client.ts) and the server (instrumentation.ts).
//
// Off unless NEXT_PUBLIC_SENTRY_DSN is set, and never from `next dev`. Errors
// only: no performance tracing, no session replay, no IP addresses. What the
// privacy policy promises (its Crash reports section switches on with the
// same variable) is enforced here in `scrub`: no cookies, no headers but the
// browser's name, no query strings (sign-in codes and Stripe session ids
// travel in them), and no user beyond what Sentry needs to count people.
export const sentryDsn = process.env.NEXT_PUBLIC_SENTRY_DSN || undefined;

const stripQuery = (url?: string) => url?.split(/[?#]/)[0];

function scrub(event: ErrorEvent): ErrorEvent | null {
  if (event.request) {
    event.request.url = stripQuery(event.request.url);
    delete event.request.cookies;
    delete event.request.query_string;
    delete event.request.data;
    const ua = event.request.headers?.["user-agent"] ?? event.request.headers?.["User-Agent"];
    event.request.headers = ua ? { "user-agent": ua } : {};
  }
  delete event.user;
  for (const b of event.breadcrumbs ?? []) {
    if (b.data?.url) b.data.url = stripQuery(String(b.data.url));
    if (b.data?.from) b.data.from = stripQuery(String(b.data.from));
    if (b.data?.to) b.data.to = stripQuery(String(b.data.to));
    // What someone typed can end up in a console message; keep the level and drop the words.
    if (b.category === "console") b.message = undefined;
  }
  return event;
}

export function sentryOptions() {
  return {
    dsn: sentryDsn,
    enabled: !!sentryDsn && process.env.NODE_ENV === "production",
    environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.VERCEL_ENV ?? "production",
    release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA ?? process.env.VERCEL_GIT_COMMIT_SHA,
    sendDefaultPii: false,
    tracesSampleRate: 0,
    beforeSend: scrub,
    // Noise from browsers and extensions, not from Kodigo.
    ignoreErrors: ["ResizeObserver loop limit exceeded", "ResizeObserver loop completed with undelivered notifications", "Non-Error promise rejection captured", /^AbortError/, "NEXT_NOT_FOUND", "NEXT_REDIRECT"],
    denyUrls: [/^chrome-extension:\/\//, /^moz-extension:\/\//, /^safari-(web-)?extension:\/\//],
  };
}
