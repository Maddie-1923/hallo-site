// Dates as the person likes them (Settings, Appearance, Dates): 29 September
// 2026, September 29, 2026, or 29/09/2026. One place for every date on the
// site, so they all follow the setting. Pure, so it runs anywhere; pages
// draw dates through <Day> (components/Day.tsx), which reads the setting.
export type DateFormat = "day-month" | "month-day" | "numeric";
/** long: 29 September 2026 · short: 29 Sep 2026 · weekday: Tue 29 Sep ·
    dayMonth: 29 September (no year) · month: September 2026. */
export type DateStyle = "long" | "short" | "weekday" | "dayMonth" | "month";

export function formatDate(iso: string, format: DateFormat = "day-month", style: DateStyle = "long"): string {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  if (!y || !m) return iso;
  const date = new Date(Date.UTC(y, m - 1, d || 1));
  const f = (locale: string, o: Intl.DateTimeFormatOptions) => date.toLocaleDateString(locale, { ...o, timeZone: "UTC" });
  if (style === "month") return f(format === "month-day" ? "en-US" : "en-GB", { month: "long", year: "numeric" });
  if (format === "numeric") {
    const dm = `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}`;
    if (style === "weekday") return `${f("en-GB", { weekday: "short" })} ${dm}`;
    if (style === "dayMonth") return dm;
    return `${dm}/${y}`;
  }
  const locale = format === "month-day" ? "en-US" : "en-GB";
  if (style === "weekday") return f(locale, { weekday: "short", day: "numeric", month: "short" });
  if (style === "dayMonth") return f(locale, { day: "numeric", month: "long" });
  return f(locale, { day: "numeric", month: style === "short" ? "short" : "long", year: "numeric" });
}
