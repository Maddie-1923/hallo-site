"use client";

import { formatDate, type DateStyle } from "@/lib/dates";
import { useSettings } from "@/lib/settings";

/** A date drawn as the person's date setting says (see lib/dates). Usable
    from server pages too: it reads the setting in the browser. */
export function Day({ iso, style = "long" }: { iso: string; style?: DateStyle }) {
  const [s] = useSettings();
  return <>{formatDate(iso, s.dateFormat, style)}</>;
}

/** The date setting for client components that build strings themselves. */
export function useDateFormat() {
  const [s] = useSettings();
  return (iso: string, style: DateStyle = "long") => formatDate(iso, s.dateFormat, style);
}
