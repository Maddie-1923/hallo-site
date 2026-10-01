"use client";

import { useSyncExternalStore } from "react";
import { useDateFormat } from "./Day";

// An episode's air date, and its time when TVmaze knows it, in the viewer's
// own time zone (the app's "Aired"). The server can't know the zone, so the
// time joins once the page is up; the date alone stands until then.
export function AiredAt({ date, stamp }: { date: string; stamp?: string | null }) {
  const fmt = useDateFormat();
  // The stamp on the client, nothing on the server: a steady value either way.
  const shown = useSyncExternalStore(
    () => () => {},
    () => stamp ?? null,
    () => null,
  );
  if (!shown) return <>{fmt(date)}</>;
  const local = new Date(shown);
  const day = `${local.getFullYear()}-${String(local.getMonth() + 1).padStart(2, "0")}-${String(local.getDate()).padStart(2, "0")}`;
  return (
    <>
      {fmt(day)} · {local.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
    </>
  );
}
