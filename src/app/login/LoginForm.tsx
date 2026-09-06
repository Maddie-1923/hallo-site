"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function LoginForm({ next, initialError }: { next: string; initialError?: string }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | undefined>(initialError);

  const callback = () =>
    `${process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;

  async function sendLink(e: React.FormEvent) {
    e.preventDefault();
    setState("sending");
    setError(undefined);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: callback() },
    });
    if (error) {
      setError(error.message);
      setState("idle");
    } else {
      setState("sent");
    }
  }

  async function apple() {
    setError(undefined);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "apple",
      options: { redirectTo: callback() },
    });
    if (error) setError(error.message);
  }

  if (state === "sent") {
    return (
      <div className="card mt-8">
        <h3>Check your email</h3>
        <p className="text-dim text-[15px] mt-2 mb-0">
          A sign-in link is on its way to <strong className="text-ink">{email}</strong>. It works
          once and expires in an hour.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={sendLink} className="mt-8 flex flex-col gap-3">
      <label className="sr-only" htmlFor="email">Email</label>
      <input
        id="email"
        type="email"
        required
        autoComplete="email"
        placeholder="you@example.com"
        className="field"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <button className="btn justify-center" type="submit" disabled={state === "sending"}>
        {state === "sending" ? "Sending…" : "Email me a sign-in link"}
      </button>
      <div className="flex items-center gap-3 text-xs text-dim my-2">
        <span className="flex-1 h-px bg-hair" />
        or
        <span className="flex-1 h-px bg-hair" />
      </div>
      <button className="btn ghost justify-center" type="button" onClick={apple}>
        Sign in with Apple
      </button>
      {error && (
        <p className="text-sm mt-2" style={{ color: "var(--movies)" }} role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
