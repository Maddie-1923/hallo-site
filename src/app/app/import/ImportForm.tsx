"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { CURRENT_VERSION, isArchive, type LibraryArchive } from "@/lib/archive";

type Existing = { shows: number; movies: number; changedAt: string } | null;

export function ImportForm({ existing }: { existing: Existing }) {
  const router = useRouter();
  const [archive, setArchive] = useState<LibraryArchive | null>(null);
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function pick(file: File | undefined) {
    setError(undefined);
    setArchive(null);
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text());
      if (!isArchive(parsed)) throw new Error("That file isn't a Kodigo backup.");
      if (parsed.version > CURRENT_VERSION) {
        throw new Error(`This backup was written by a newer Kodigo (version ${parsed.version}) than this site understands.`);
      }
      setArchive(parsed);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't read that file.");
    }
  }

  async function upload() {
    if (!archive) return;
    setBusy(true);
    setError(undefined);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError("You're signed out. Sign in and try again.");
      setBusy(false);
      return;
    }
    // changed_at is the file's own export stamp, not now: the phone's sync
    // compares it against the last stamp it pushed, and a fresh clock here
    // would make an old backup look like the newest thing in the world.
    const { error } = await supabase.from("libraries").upsert({
      user_id: user.id,
      archive,
      version: archive.version,
      changed_at: archive.exported,
      device: archive.device ? `${archive.device} (backup file)` : "backup file",
    });
    if (error) {
      setError(error.message);
      setBusy(false);
      return;
    }
    setDone(true);
    setBusy(false);
    router.refresh();
  }

  if (done) {
    return (
      <div className="card max-w-[560px] mt-8">
        <h3>Imported</h3>
        <p className="text-dim text-[15px] mt-2 mb-0">Your library is on this account now.</p>
        <a href="/app/shows" className="btn mt-4">See your shows</a>
      </div>
    );
  }

  return (
    <div className="max-w-[560px] mt-8 flex flex-col gap-4">
      {existing && (
        <p className="text-sm text-dim m-0">
          This account already holds {existing.shows} shows and {existing.movies} movies, last changed{" "}
          {new Date(existing.changedAt).toLocaleDateString("en", { dateStyle: "medium" })}. Importing replaces
          that copy.
        </p>
      )}
      <input
        type="file"
        accept="application/json,.json"
        className="field file:mr-4 file:btn file:ghost file:!py-2 file:!px-4 file:text-sm"
        onChange={(e) => pick(e.target.files?.[0])}
      />
      {archive && (
        <div className="card">
          <div className="text-xs text-dim uppercase tracking-[.12em]">In this file</div>
          <p className="text-[15px] mt-2">
            {archive.shows.length} shows, {archive.movies.length} movies, {archive.watched.length} episodes
            checked off. Exported{" "}
            {new Date(archive.exported).toLocaleString("en", { dateStyle: "medium", timeStyle: "short" })}
            {archive.device ? ` from ${archive.device}` : ""}. Version {archive.version}.
          </p>
          <button className="btn" disabled={busy} onClick={upload}>
            {busy ? "Uploading…" : existing ? "Replace library on this account" : "Put this library on my account"}
          </button>
        </div>
      )}
      {error && <p className="text-sm m-0" style={{ color: "var(--movies)" }} role="alert">{error}</p>}
    </div>
  );
}
