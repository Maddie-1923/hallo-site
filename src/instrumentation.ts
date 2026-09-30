import * as Sentry from "@sentry/nextjs";
import { sentryOptions } from "./lib/sentry-options";

// Server-side crash reports (lib/sentry-options.ts): pages, server actions
// and API routes, on both runtimes. Does nothing without the Sentry key.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs" || process.env.NEXT_RUNTIME === "edge") Sentry.init(sentryOptions());
}

export const onRequestError = Sentry.captureRequestError;
