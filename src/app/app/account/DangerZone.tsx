"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function DangerZone({ hasLibrary }: { hasLibrary: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState<"library" | "account" | null>(null);
  const [error, setError] = useState<string>();

  async function removeLibrary() {
    setBusy("library");
    setError(undefined);
    const supabase = createClient();
    const { error } = await supabase.from("libraries").delete().neq("version", -1);
    if (error) setError(error.message);
    setBusy(null);
    router.refresh();
  }

  async function deleteAccount() {
    setBusy("account");
    setError(undefined);
    const res = await fetch("/api/account", { method: "DELETE" });
    if (!res.ok) {
      setError((await res.text()) || "Couldn't delete the account.");
      setBusy(null);
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <div className="card max-w-[560px] mt-4 !border-movies/40">
      <div className="text-xs uppercase tracking-[.12em]" style={{ color: "var(--movies)" }}>Remove</div>
      <p className="text-[15px] text-dim mt-2">
        Removing the library clears the copy on this account and leaves every device alone; the next
        sync from a phone puts it back. Deleting the account removes the account and the copy, and
        nothing on your phone changes.
      </p>
      <div className="flex flex-wrap gap-3 mt-2">
        <button className="btn ghost" disabled={!hasLibrary || busy !== null} onClick={removeLibrary}>
          {busy === "library" ? "Removing…" : "Remove library from account"}
        </button>
        <button
          className="btn ghost !border-movies/60"
          style={{ color: "var(--movies)" }}
          disabled={busy !== null}
          onClick={() => {
            if (window.confirm("Delete your Kodigo account and the library copy on it? Your phone is unaffected.")) deleteAccount();
          }}
        >
          {busy === "account" ? "Deleting…" : "Delete account"}
        </button>
      </div>
      {error && <p className="text-sm mt-3 mb-0" style={{ color: "var(--movies)" }} role="alert">{error}</p>}
    </div>
  );
}
