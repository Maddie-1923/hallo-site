import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs/config";

const nextConfig: NextConfig = {
  experimental: {
    // An import (Settings → Import & export) sends what it read to the server
    // in one piece to be merged into the library, and a big library with its
    // pictures can run to several megabytes; the default is 1 MB. The
    // library row itself is capped at 8 MB by the database.
    serverActions: { bodySizeLimit: "12mb" },
  },
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
