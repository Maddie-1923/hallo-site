import Link from "next/link";
import { loadLibrary } from "@/lib/library";
import { DangerZone } from "./DangerZone";

export default async function Account() {
  const { email, row } = await loadLibrary();

  return (
    <div className="wrap py-10">
      <h1 className="!text-[clamp(44px,8vw,72px)]">Account</h1>

      <div className="card max-w-[560px] mt-8">
        <div className="text-xs text-dim uppercase tracking-[.12em]">Signed in as</div>
        <div className="text-lg font-semibold mt-1">{email ?? "—"}</div>
        <form action="/auth/signout" method="post" className="mt-5">
          <button className="btn ghost" type="submit">Sign out</button>
        </form>
      </div>

      <div className="card max-w-[560px] mt-4">
        <div className="text-xs text-dim uppercase tracking-[.12em]">Library on this account</div>
        {row ? (
          <p className="text-[15px] mt-2 mb-0">
            {row.archive.shows.length} shows, {row.archive.movies.length} movies,{" "}
            {row.archive.watched.length} episodes checked off. Last change{" "}
            {new Date(row.changed_at).toLocaleString("en", { dateStyle: "medium", timeStyle: "short" })}
            {row.device ? ` from ${row.device}` : ""}. Archive version {row.version}.
          </p>
        ) : (
          <p className="text-dim text-[15px] mt-2 mb-0">
            Nothing synced yet. <Link href="/app/import" className="text-accent">Import a backup file</Link> or
            turn on sync in the app.
          </p>
        )}
        {row && (
          <Link href="/app/import" className="text-sm text-accent inline-block mt-4">
            Replace with a backup file
          </Link>
        )}
      </div>

      <DangerZone hasLibrary={!!row} />
    </div>
  );
}
