"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setPinnedReview } from "@/lib/profile-actions";

// Pin or unpin one of your own reviews to the top of your profile (three at
// most), from the review's card on your profile.
export function PinReview({ reviewKey, pinned }: { reviewKey: string; pinned: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [problem, setProblem] = useState<string | null>(null);
  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            setProblem(null);
            const r = await setPinnedReview(reviewKey, !pinned).catch(() => ({ error: "That didn't save. Try again." }));
            if (r.error) setProblem(r.error);
            else router.refresh();
          })
        }
        className="text-[1rem] font-semibold text-dim hover:text-accent cursor-pointer disabled:opacity-50"
      >
        {pinned ? "Unpin" : "Pin to profile"}
      </button>
      {problem && <span className="text-[1rem] text-loved">{problem}</span>}
    </span>
  );
}
