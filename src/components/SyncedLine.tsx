import type { LibraryRow } from "@/lib/library";

export function SyncedLine({ row }: { row: LibraryRow }) {
  const when = new Date(row.changed_at);
  return (
    <p className="text-xs text-dim m-0">
      Last change {when.toLocaleString("en", { dateStyle: "medium", timeStyle: "short" })}
      {row.device ? ` · from ${row.device}` : ""}
    </p>
  );
}
