import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs/config";

const nextConfig: NextConfig = {
  /* config options here */
};

// Sentry's build step (crash reports, lib/sentry-options.ts). Reports from
// browsers go through the site itself at /monitoring, so ad blockers don't
// drop them and visitors' browsers never contact Sentry directly. Source
// maps (readable stack traces) upload only when SENTRY_AUTH_TOKEN is set,
// and are never served to visitors.
export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  sourcemaps: { disable: process.env.SENTRY_AUTH_TOKEN ? false : "disable-upload" },
  widenClientFileUpload: true,
  tunnelRoute: "/monitoring",
  telemetry: false,
  silent: !process.env.CI,
});
