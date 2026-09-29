"use client";

import { CrashNotice } from "@/components/CrashNotice";

// A page that crashed, inside the site's layout.
export default function PageError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return <CrashNotice {...props} />;
}
