import { redirect } from "next/navigation";

// The old import page, replaced by Settings → Import & export (ImportPanel),
// which merges a backup or another app's history into the library rather
// than writing over it.
export default function OldImport() {
  redirect("/settings#data");
}
