"use client";

import * as Sentry from "@sentry/nextjs";
import Link from "next/link";
import { useEffect } from "react";
import { LogoMark } from "./Logo";
import { sentryDsn } from "@/lib/sentry-options";

// What a visitor sees when a page crashes (app/error.tsx, and
// app/global-error.tsx when even the layout fails): what happened, Try again
// and Home. The crash goes to Sentry (lib/sentry-options.ts) when it's set up.
export function CrashNotice({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);
  return (
    <main className="flex-1 min-h-[70vh] w-full px-4 flex items-center justify-center">
      <div className="w-full max-w-[38.3333rem] rounded-shell bg-card p-2 border-[0.5px] border-t-[color:var(--lit-edge)] border-x-piece border-b-well shadow-[0_4px_9px_rgba(0,0,0,.35)]">
        <div className="rounded-shell bg-piece p-4 grid gap-3">
          <LogoMark size={28} label="Kodigo" />
          <h1 className="!text-[clamp(30px,4vw,40px)] !leading-none uppercase">Something went wrong</h1>
          <p className="m-0 text-[1.0417rem] leading-[1.6] text-mid-tone">
            This page hit a problem and couldn&apos;t finish loading. Nothing you saved is affected.{" "}
            {sentryDsn ? "We've been told about it automatically." : "If it keeps happening, email hello@kodigo.pro."}
          </p>
          {error.digest && <p className="m-0 text-[1rem] text-dim">Reference: {error.digest}</p>}
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={reset} className="h-9 px-5 rounded-full bg-accent-fill text-on-accent text-[1.0417rem] font-semibold cursor-pointer">
              Try again
            </button>
            <Link href="/" className="h-9 px-5 inline-flex items-center rounded-full bg-card border border-hair text-[1.0417rem] font-semibold text-ink no-underline hover:text-accent">
              Home
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
