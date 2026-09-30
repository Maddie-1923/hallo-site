// The handful of things Swift does without being asked that the library file
// depends on — Android's SwiftDates, SwiftNumbers and SwiftStrings. Two phones
// and this site merging the same pair of libraries have to agree to the
// character, so these are spelled out rather than left to JavaScript's own
// habits, which differ in exactly the corners that matter.

// ---- Dates ----

/**
 * Foundation's `Date.distantPast`, 0001-01-01T00:00:00Z, in milliseconds.
 * Two days earlier than JavaScript puts that string, because Foundation reads
 * dates before October 1582 in the Julian calendar and `Date` runs the
 * Gregorian one backwards forever. It is the stamp on a record nobody can
 * date, so it has to compare and print exactly as the apps do.
 */
export const DISTANT_PAST = -62_135_769_600_000;

/** The first second of the Gregorian calendar, 1582-10-15, in both calendars. */
const GREGORIAN_CUTOVER_SECONDS = -12_219_292_800;

const ISO = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(\.\d+)?(Z|[+-]\d{2}:?\d{2})$/;

/** Days from 1970-01-01 to a Julian-calendar date. */
function julianDays(year: number, month: number, day: number) {
  const a = Math.floor((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;
  const jdn = day + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - 32083;
  return jdn - 2440588;
}

/**
 * An archive date as milliseconds, or null when it isn't one. Reading is
 * looser than writing, as on the phones: a fraction or an offset is accepted,
 * since a file somebody fixed by hand might carry either.
 */
export function parseSwiftDate(text: string | null | undefined): number | null {
  if (typeof text !== "string") return null;
  const m = ISO.exec(text);
  if (!m) return null;
  const [year, month, day, hour, minute, second] = m.slice(1, 7).map(Number);
  if (month < 1 || month > 12 || day < 1 || hour > 23 || minute > 59 || second > 59) return null;
  const millis = m[7] ? Math.floor(Number(`0${m[7]}`) * 1000) : 0;
  let offset = 0;
  if (m[8] !== "Z") {
    const sign = m[8][0] === "-" ? -1 : 1;
    const digits = m[8].slice(1).replace(":", "");
    offset = sign * (Number(digits.slice(0, 2)) * 3600 + Number(digits.slice(2, 4)) * 60);
  }
  let seconds: number;
  if (year > 1582) {
    const t = Date.UTC(year, month - 1, day, hour, minute, second);
    const back = new Date(t);
    if (back.getUTCDate() !== day || back.getUTCMonth() !== month - 1) return null;
    seconds = t / 1000;
  } else {
    // The hybrid calendar Foundation uses: Gregorian from the cutover on,
    // Julian before it. (`setUTCFullYear` because `Date.UTC` reads years
    // below 100 as 19xx.)
    const g = new Date(0);
    g.setUTCFullYear(year, month - 1, day);
    g.setUTCHours(hour, minute, second, 0);
    const proleptic = g.getTime() / 1000;
    seconds = proleptic >= GREGORIAN_CUTOVER_SECONDS ? proleptic : julianDays(year, month, day) * 86400 + hour * 3600 + minute * 60 + second;
  }
  return (seconds - offset) * 1000 + millis;
}

const pad = (n: number, width = 2) => String(n).padStart(width, "0");

/**
 * A moment as the apps write it: JSONEncoder's `.iso8601`, whole seconds and a
 * `Z` — `2026-09-25T10:00:00Z`. The fraction is dropped, rounding down as
 * Foundation does, because Swift's decoder refuses a date that has one and a
 * single such date would leave a phone unable to read the library at all.
 */
export function formatSwiftDate(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  if (seconds >= GREGORIAN_CUTOVER_SECONDS) {
    const d = new Date(seconds * 1000);
    return `${pad(d.getUTCFullYear(), 4)}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}Z`;
  }
  // Back from days to a Julian date.
  const days = Math.floor(seconds / 86400);
  const rest = seconds - days * 86400;
  const c = days + 2440588 + 32082;
  const d = Math.floor((4 * c + 3) / 1461);
  const e = c - Math.floor((1461 * d) / 4);
  const m = Math.floor((5 * e + 2) / 153);
  const day = e - Math.floor((153 * m + 2) / 5) + 1;
  const month = m + 3 - 12 * Math.floor(m / 10);
  const year = d - 4800 + Math.floor(m / 10);
  return `${pad(year, 4)}-${pad(month)}-${pad(day)}T${pad(Math.floor(rest / 3600))}:${pad(Math.floor((rest % 3600) / 60))}:${pad(rest % 60)}Z`;
}

const CANONICAL = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;

/**
 * A date string in the spelling the apps write, left exactly alone when it
 * already is one. Anything unreadable is passed through untouched rather than
 * invented.
 */
export function canonicalDate(text: string): string {
  if (CANONICAL.test(text)) return text;
  const ms = parseSwiftDate(text);
  return ms === null ? text : formatSwiftDate(ms);
}

/** Now, as the apps write it — whole seconds. */
export function swiftNow(now: Date) {
  return formatSwiftDate(now.getTime());
}

// ---- Numbers ----

/**
 * What Swift's `Double.description` prints: the shortest digits that read
 * back as the same number, positional between 1e-4 and 1e16 with at least one
 * digit after the point, exponential outside it. A rewatch night's id carries
 * a moment spelled this way — `1727261234.0` — and an id spelled any other
 * way would never match the tombstone a phone wrote for the same night.
 */
export function swiftDescription(value: number): string {
  if (Number.isNaN(value)) return "nan";
  if (!Number.isFinite(value)) return value > 0 ? "inf" : "-inf";
  if (value === 0) return Object.is(value, -0) ? "-0.0" : "0.0";
  const sign = value < 0 ? "-" : "";
  // JavaScript's own exponential form is already the shortest round-trip digits.
  const [mantissa, exp] = Math.abs(value).toExponential().split("e");
  const digits = mantissa.replace(".", "");
  const exponent = Number(exp) + 1; // the point sits before the first digit
  let body: string;
  if (exponent >= -3 && exponent <= 16) {
    if (exponent <= 0) body = "0." + "0".repeat(-exponent) + digits;
    else if (exponent >= digits.length) body = digits + "0".repeat(exponent - digits.length) + ".0";
    else body = digits.slice(0, exponent) + "." + digits.slice(exponent);
  } else {
    const lead = digits.length === 1 ? digits : `${digits[0]}.${digits.slice(1)}`;
    const e = exponent - 1;
    body = `${lead}e${e < 0 ? "-" : "+"}${pad(Math.abs(e))}`;
  }
  return sign + body;
}

const SWIFT_DECIMAL = /^(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/;
const SWIFT_HEX = /^0x([0-9a-f]+\.?[0-9a-f]*|\.[0-9a-f]+)(p[+-]?\d+)?$/;

/** Swift's `Double(String)`: stricter than `Number` about whitespace, looser about `inf`, `nan` and hexadecimal. */
export function swiftParseDouble(text: string): number | null {
  if (!text) return null;
  const negative = text[0] === "-";
  const unsigned = text[0] === "-" || text[0] === "+" ? text.slice(1) : text;
  const lower = unsigned.toLowerCase();
  if (lower === "inf" || lower === "infinity") return negative ? -Infinity : Infinity;
  if (lower === "nan") return NaN;
  let magnitude: number;
  if (lower.startsWith("0x")) {
    const m = SWIFT_HEX.exec(lower);
    if (!m) return null;
    const [whole, fraction = ""] = m[1].split(".");
    magnitude = (whole ? parseInt(whole, 16) : 0) + (fraction ? parseInt(fraction, 16) / 16 ** fraction.length : 0);
    if (m[2]) magnitude *= 2 ** Number(m[2].slice(1));
  } else {
    if (!SWIFT_DECIMAL.test(unsigned)) return null;
    magnitude = Number(unsigned);
  }
  return negative ? -magnitude : magnitude;
}

// ---- Strings ----

/**
 * By Unicode code point, which is how Swift orders strings. JavaScript
 * compares UTF-16 units, which disagrees for characters beyond the first
 * 65,536 — an emoji in a show's name, say.
 */
export function swiftCompare(a: string, b: string): number {
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    const ca = a.codePointAt(i)!;
    const cb = b.codePointAt(j)!;
    if (ca !== cb) return ca < cb ? -1 : 1;
    i += ca > 0xffff ? 2 : 1;
    j += cb > 0xffff ? 2 : 1;
  }
  const ra = a.length - i;
  const rb = b.length - j;
  return ra === rb ? 0 : ra < rb ? -1 : 1;
}

/** Kotlin's `String.compareTo` and JavaScript's default sort: UTF-16 units. */
export function utf16Compare(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}
