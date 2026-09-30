"use client";

import "./globals.css";
import { CrashNotice } from "@/components/CrashNotice";

// When even the site's layout fails, this replaces it, so it brings its own
// html and body (and the site's colours, without its fonts).
export default function GlobalError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col bg-page text-ink">
        <CrashNotice {...props} />
      </body>
    </html>
  );
}
