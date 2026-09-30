// The small text rules every importer shares — the header fold, the title key
// a match compares on, and the date parser — Android's ImportText.kt, from
// TVTimeArchive.swift (`TVTimeColumn.fold`, `TVTimeReader.titleKey`,
// `TVTimeReader.date`) and UniversalImport.swift (`ImportHeader.fold`).
//
// Also the few Kotlin conveniences the readers lean on (`toIntOrNull`,
// `trim()`, `toDoubleOrNull`), spelled out, because JavaScript's nearest
// equivalents accept things these don't — `parseInt("12abc")` is 12 — and a
// reader that's looser on one platform imports different rows from one file.

const ALNUM = /[\p{L}\p{M}\p{N}]/u;

/**
 * A header reduced to the letters and digits in it, lowercased, so
 * "Episode ID", "episode_id" and "ep id" are one name before anything is
 * looked up. Letters, marks and numbers of every script, as iOS's
 * `CharacterSet.alphanumerics` holds, not ASCII alone.
 */
export function fold(header: string): string {
  let out = "";
  for (const ch of header.toLowerCase()) if (ALNUM.test(ch)) out += ch;
  return out;
}

/**
 * Titles compared with case, accents, punctuation and a leading article
 * taken out, so "The Office" and "the office" are one series rather than two
 * searches and two entries. The accent fold is decomposing and dropping the
 * combining marks, as iOS's is.
 */
export function titleKey(title: string): string {
  const folded = title.normalize("NFD").replace(/\p{Mn}/gu, "").toLowerCase();
  let spaced = "";
  for (const ch of folded) spaced += ALNUM.test(ch) ? ch : " ";
  const words = spaced.split(" ").filter((w) => w.length > 0);
  return (words[0] === "the" ? words.slice(1) : words).join(" ");
}

/** A yes that is written a dozen ways: `1`, `true`, `yes`, `y`, `t`, in any case. */
export function truthy(text: string | null | undefined): boolean {
  return text != null && TRUTHY.has(text.toLowerCase());
}

const TRUTHY = new Set(["1", "true", "yes", "y", "t"]);

/**
 * Swift's `trimmingCharacters(in: .whitespaces)` — spaces and tabs, but not
 * line breaks, which `trim()` would take as well.
 */
export function trimSpaces(text: string): string {
  return text.replace(/^[\t\p{Zs}]+|[\t\p{Zs}]+$/gu, "");
}

/** Kotlin's `trim()`: what Java calls whitespace, plus the space separators it leaves out. */
export function ktTrim(text: string): string {
  return text.replace(/^[\t\n\v\f\r\x1c-\x1f\p{Zs}\u2028\u2029]+|[\t\n\v\f\r\x1c-\x1f\p{Zs}\u2028\u2029]+$/gu, "");
}

/** Kotlin's `toIntOrNull()`: a sign, digits, nothing else, and inside 32 bits. */
export function toIntOrNull(text: string | null | undefined): number | null {
  if (text == null || !/^[+-]?\d+$/.test(text)) return null;
  const n = Number(text);
  return n >= -2147483648 && n <= 2147483647 ? n : null;
}

/** Kotlin's `toLongOrNull()`, as far as a JavaScript number can hold one. */
export function toLongOrNull(text: string): number | null {
  if (!/^[+-]?\d+$/.test(text)) return null;
  const n = Number(text);
  return Math.abs(n) <= 9223372036854775807 ? n : null;
}

const JAVA_DOUBLE = /^[\x00-\x20]*[+-]?(NaN|Infinity|((\d+\.?\d*|\.\d+)([eE][+-]?\d+)?)[fFdD]?)[\x00-\x20]*$/;

/** Kotlin's `toDoubleOrNull()`, which is Java's number grammar: `NaN`, `Infinity`, a trailing `d` and all. */
export function toDoubleOrNull(text: string | null | undefined): number | null {
  if (text == null || !JAVA_DOUBLE.test(text)) return null;
  const t = text.replace(/^[\x00-\x20]+|[\x00-\x20]+$/g, "").replace(/[fFdD]$/, "");
  return Number(t);
}

// ---- Dates ----

function realDate(y: number, mo: number, d: number): boolean {
  if (!Number.isSafeInteger(y) || mo < 1 || mo > 12 || d < 1) return false;
  const t = new Date(0);
  t.setUTCFullYear(y, mo - 1, d);
  return t.getUTCFullYear() === y && t.getUTCMonth() === mo - 1 && t.getUTCDate() === d;
}

function utc(y: number, mo: number, d: number, h: number, mi: number, s: number, ms = 0): Date | null {
  if (!realDate(y, mo, d) || h > 23 || mi > 59 || s > 59) return null;
  const t = new Date(0);
  t.setUTCFullYear(y, mo - 1, d);
  t.setUTCHours(h, mi, s, ms);
  return t;
}

const N = (s: string | undefined) => (s === undefined ? 0 : Number(s));

/** ISO 8601 with a zone, with or without fractions of a second (java.time's `ISO_OFFSET_DATE_TIME`). */
const ISO_OFFSET = /^(\d{4})-(\d{2})-(\d{2})[Tt](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{0,9}))?)?([Zz]|[+-]\d{2}:\d{2}(?::\d{2})?)$/;

/**
 * The stamps the exports write without a zone, tried in iOS's order and,
 * like iOS's, read as UTC: TV Time's servers wrote UTC, and reading them in
 * the viewer's zone would move a late-evening episode onto the wrong day.
 * One digit or several in every field, as iOS's formatter reads them.
 */
const ZONELESS: RegExp[] = [
  /^(\d+)-(\d+)-(\d+) (\d+):(\d+):(\d+)$/,
  /^(\d+)-(\d+)-(\d+)T(\d+):(\d+):(\d+)$/,
  /^(\d+)-(\d+)-(\d+) (\d+):(\d+)$/,
];
const ZONELESS_DATE = /^(\d+)-(\d+)-(\d+)$/;
/** Month first, then day first — the order iOS tries them in, so an ambiguous date reads American. */
const SLASHED = /^(\d+)\/(\d+)\/(\d+) (\d+):(\d+):(\d+)$/;

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const ASCTIME = /^([A-Z][a-z]{2}) ([A-Z][a-z]{2}) (\d+) (\d+):(\d+):(\d+) (\d+)$/;

/**
 * A stamp in any shape an export has been seen to write, or null — never
 * today. An episode with no date attached is honest; one dated the day of
 * the import puts a decade of viewing on a single evening in every chart
 * that reads those dates. iOS `TVTimeReader.date`, the date parser every
 * import shares.
 */
export function parseDate(text: string | null | undefined): Date | null {
  const t = text == null ? "" : ktTrim(text);
  if (!t) return null;
  if (t.includes("T") || t.includes("t")) {
    const m = ISO_OFFSET.exec(t);
    if (m) {
      const fraction = (m[7] ?? "").padEnd(3, "0").slice(0, 3);
      const d = utc(N(m[1]), N(m[2]), N(m[3]), N(m[4]), N(m[5]), N(m[6]), Number(fraction));
      if (d) {
        const zone = m[8];
        if (zone === "Z" || zone === "z") return d;
        const sign = zone[0] === "-" ? -1 : 1;
        const [hh, mm, ss = "0"] = zone.slice(1).split(":");
        if (Number(hh) <= 18 && Number(mm) <= 59 && Number(ss) <= 59) {
          const offset = sign * (Number(hh) * 3600 + Number(mm) * 60 + Number(ss));
          if (Math.abs(offset) <= 18 * 3600) return new Date(d.getTime() - offset * 1000);
        }
      }
    }
  }
  for (const pattern of ZONELESS) {
    const m = pattern.exec(t);
    const d = m && utc(N(m[1]), N(m[2]), N(m[3]), N(m[4]), N(m[5]), N(m[6]));
    if (d) return d;
  }
  const day = ZONELESS_DATE.exec(t);
  const dated = day && utc(N(day[1]), N(day[2]), N(day[3]), 0, 0, 0);
  if (dated) return dated;
  const slashed = SLASHED.exec(t);
  if (slashed) {
    const [a, b, y, h, mi, s] = slashed.slice(1).map(Number);
    const d = utc(y, a, b, h, mi, s) ?? utc(y, b, a, h, mi, s);
    if (d) return d;
  }
  // A Unix stamp, in seconds or milliseconds. TV Time's newer files were
  // seen to write these where the older ones wrote a formatted date.
  const number = toDoubleOrNull(t);
  if (number !== null && Number.isFinite(number) && number > 100_000_000) {
    const seconds = number > 100_000_000_000 ? number / 1000 : number;
    return new Date(Math.trunc(seconds * 1000));
  }
  // The date C's `asctime` prints — `Sat Dec 31 00:00:00 2016` — which is how
  // IMDb's export wrote `created` until the end of 2017. In English, since
  // that is the language the file was written in, and only when the weekday
  // agrees with the date, as java.time's strict reading insists.
  //
  // Android only. iOS's parser has no pattern for it, so on iOS the old IMDb
  // export's films arrive undated and therefore on To Watch, carrying a
  // rating for a film the file says was seen ("Three import rules lose data"
  // in the Android port's backup-import.md). Kept, as Android keeps it,
  // because reading the date puts them on Watched.
  const a = ASCTIME.exec(t.replace(/\s+/g, " "));
  if (a) {
    const month = MONTHS.indexOf(a[2]) + 1;
    const weekday = DAYS.indexOf(a[1]);
    const d = month > 0 && weekday >= 0 ? utc(N(a[7]), month, N(a[3]), N(a[4]), N(a[5]), N(a[6])) : null;
    if (d && d.getUTCDay() === weekday) return d;
  }
  return null;
}

/** A moment as java.time's `Instant.toString` prints it: no fraction when there is none. */
export function instantString(d: Date | null | undefined): string | null {
  return d ? d.toISOString().replace(".000Z", "Z") : null;
}
