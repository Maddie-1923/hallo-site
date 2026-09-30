import { NextResponse } from "next/server";
import { accountsOpen } from "@/lib/accounts";
import { loadLibrary } from "@/lib/library";

// Export (Settings, Import & export): the person's whole library as one
// Kodigo backup file, the same JSON the app writes and any copy of Kodigo can
// read back: the signed-in person's.
export async function GET() {
  let archive: unknown = null;
  if (accountsOpen) {
    try {
      archive = (await loadLibrary()).row?.archive ?? null;
    } catch {
      archive = null;
    }
  }
  if (!archive) return NextResponse.json({ error: "Nothing to export yet." }, { status: 404 });
  const day = new Date().toISOString().slice(0, 10);
  return new NextResponse(JSON.stringify(archive, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="Kodigo Backup ${day}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
