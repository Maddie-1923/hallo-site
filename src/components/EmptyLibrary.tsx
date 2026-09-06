import Link from "next/link";

export function EmptyLibrary() {
  return (
    <div className="card max-w-[560px] mt-8">
      <h3>Nothing here yet</h3>
      <p className="text-dim text-[15px] mt-2">
        Your library hasn&apos;t synced to this account. Turn on sync in the app under Settings →
        Backup, or bring a backup file over yourself.
      </p>
      <div className="flex flex-wrap gap-3 mt-4">
        <Link href="/app/import" className="btn">Import a backup file</Link>
        <Link href="/discover" className="btn ghost">Browse Discover</Link>
      </div>
    </div>
  );
}
