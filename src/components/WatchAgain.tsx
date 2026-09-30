"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { RewatchTarget } from "@/lib/library-rules";
import { takeBackRewatch, watchAgain } from "@/lib/library-actions";
import { useDateFormat } from "./Day";

// Watched it again: on a film's or an episode's page once it's watched. How
// many times it's been seen, "Watched it again" (asked first, as the app
// asks, since a night is a real thing that happened), and the nights
// themselves, each of which can be taken back. The first viewing never moves.
export function WatchAgain({ target, nights }: { target: RewatchTarget; nights: string[] }) {
  const router = useRouter();
  const fmt = useDateFormat();
  const [pending, start] = useTransition();
  const [asking, setAsking] = useState(false);
  const [open, setOpen] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const run = (fn: () => Promise<{ error?: string }>) =>
    start(async () => {
      setProblem(null);
      const r = await fn().catch(() => ({ error: "That didn't save. Try again." }));
      if (r.error) setProblem(r.error);
      else router.refresh();
    });
  const seen = nights.length + 1;
  return (
    <div className="rounded-[10px] bg-piece p-3 grid gap-2 text-[12.5px]">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button type="button" onClick={() => nights.length && setOpen((o) => !o)} className={`text-left ${nights.length ? "cursor-pointer hover:text-accent" : "cursor-default"} text-ink`}>
          {seen === 1 ? "Seen once" : `Seen ${seen} times`}
          {nights.length > 0 && <span className="text-dim"> · {open ? "hide" : "the nights"}</span>}
        </button>
        {asking ? (
          <span className="flex items-center gap-2">
            <span className="text-dim">Watched it again today?</span>
            <button type="button" disabled={pending} onClick={() => { setAsking(false); run(() => watchAgain(target)); }} className="h-8 px-3.5 rounded-full bg-accent-fill text-on-accent font-semibold cursor-pointer disabled:opacity-50">
              Yes
            </button>
            <button type="button" onClick={() => setAsking(false)} className="h-8 px-3 rounded-full bg-card border border-hair text-dim hover:text-ink cursor-pointer">
              No
            </button>
          </span>
        ) : (
          <button type="button" disabled={pending} onClick={() => setAsking(true)} className="h-8 px-3.5 rounded-full bg-card border border-hair text-ink font-semibold cursor-pointer hover:text-accent disabled:opacity-50">
            {pending ? "Saving…" : "Watched it again"}
          </button>
        )}
      </div>
      {open && nights.length > 0 && (
        <ul className="m-0 p-0 list-none grid gap-1">
          {nights.map((n) => (
            <li key={n} className="flex items-center justify-between gap-2 text-dim">
              <span>Again on {fmt(n.slice(0, 10))}</span>
              <button type="button" disabled={pending} onClick={() => run(() => takeBackRewatch(target, n))} className="text-[12px] text-dim hover:text-loved cursor-pointer disabled:opacity-50">
                Take back
              </button>
            </li>
          ))}
        </ul>
      )}
      {problem && <p className="m-0 text-[12px] text-loved">{problem}</p>}
    </div>
  );
}
