import { loadLibrary } from "@/lib/library";
import { ImportForm } from "./ImportForm";

export default async function Import() {
  const { row } = await loadLibrary();
  return (
    <div className="wrap py-10">
      <h1 className="!text-[clamp(44px,8vw,72px)]">Import a backup</h1>
      <p className="text-dim max-w-[60ch] mt-4">
        Drop the JSON file that Settings → Backup → Export writes. It becomes the library on this
        account, and the next time a phone with sync on opens Kodigo it settles the two copies record
        by record — nothing on the phone is thrown away.
      </p>
      <ImportForm
        existing={
          row
            ? { shows: row.archive.shows.length, movies: row.archive.movies.length, changedAt: row.changed_at }
            : null
        }
      />
    </div>
  );
}
