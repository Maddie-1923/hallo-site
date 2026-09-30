import { fold, ktTrim, trimSpaces } from "./text";

// A CSV read as rows of folded headers to values — Android's ImportCsv.kt,
// iOS `TVTimeCSV` (TVTimeArchive.swift), which is the CSV parser for every
// import, the TV Time reader and the universal one alike.
//
// Parsed over bytes rather than characters, as on the phones: every character
// this parser makes a decision about — quote, delimiter, line break — is
// ASCII, so bytes are both faster and exactly as correct. A field's bytes are
// decoded as UTF-8 once it is complete, with anything malformed becoming
// U+FFFD as Swift's `String(decoding:as:)` does.

export interface CsvTable {
  /** Headers exactly as written in the file, trimmed, for the diagnostics. */
  headers: string[];
  /** The same headers folded (see `fold`), positionally matched to `headers`. */
  foldedHeaders: string[];
  rows: string[][];
}

/**
 * The first value under any of `names`, trimmed, or null when the file has no
 * such column or the cell is empty. Order in `names` is preference order — an
 * empty cell under the first name gives way to a filled one under the next.
 */
export function csvValue(table: CsvTable, row: string[], names: readonly string[]): string | null {
  for (const name of names) {
    const index = table.foldedHeaders.indexOf(name);
    if (index < 0 || index >= row.length) continue;
    const text = ktTrim(row[index]);
    if (text) return text;
  }
  return null;
}

/**
 * The delimiters worth guessing between. A CSV exported through a European
 * spreadsheet arrives semicolon-separated and would otherwise parse as one
 * enormous column, which looks from the outside like a corrupt file.
 */
const CANDIDATES = [0x2c, 0x3b, 0x09];
const QUOTE = 0x22;
const LF = 0x0a;
const CR = 0x0d;

const utf8 = new TextDecoder("utf-8", { ignoreBOM: true });

export function parseCsv(data: Uint8Array): CsvTable | null {
  // A BOM ahead of the first header would otherwise ride along into it and
  // stop the first column from ever matching a name.
  const start = data.length >= 3 && data[0] === 0xef && data[1] === 0xbb && data[2] === 0xbf ? 3 : 0;
  if (data.length - start <= 0) return null;

  const delimiter = guessDelimiter(data, start);
  const records = parseRecords(data, start, delimiter);
  if (records.length === 0) return null;

  const headers = records.shift()!.map(ktTrim);
  if (!headers.some((h) => h.length > 0)) return null;

  // Rows that are entirely empty are dropped here rather than guarded against
  // at every use. A trailing newline produces one on almost every file, and
  // it would otherwise be counted as a row that failed to import.
  const rows = records.filter((row) => row.some((cell) => trimSpaces(cell).length > 0));
  return { headers, foldedHeaders: headers.map(fold), rows };
}

/**
 * Whichever candidate appears most often in the first line outside quotes,
 * or a comma. Counting one line is enough — the header is the line whose
 * separators are guaranteed to be separators. A tie goes to the earlier
 * candidate; iOS leaves a tie to dictionary order, which is no rule at all.
 */
function guessDelimiter(bytes: Uint8Array, start: number): number {
  const counts = CANDIDATES.map(() => 0);
  let quoted = false;
  for (let i = start; i < bytes.length; i++) {
    const b = bytes[i];
    if (b === QUOTE) {
      quoted = !quoted;
      continue;
    }
    if (quoted) continue;
    if (b === LF || b === CR) break;
    const at = CANDIDATES.indexOf(b);
    if (at >= 0) counts[at]++;
  }
  let best = -1;
  for (let i = 0; i < counts.length; i++) if (counts[i] > 0 && (best < 0 || counts[i] > counts[best])) best = i;
  return best < 0 ? 0x2c : CANDIDATES[best];
}

/**
 * RFC 4180, including the parts people forget: a quoted field may hold the
 * delimiter, a line break and a doubled quote standing for a literal one.
 * Titles carry commas often enough that a naive split would shift every
 * column right on exactly the rows somebody cares most about.
 */
function parseRecords(bytes: Uint8Array, start: number, delimiter: number): string[][] {
  const records: string[][] = [];
  let row: string[] = [];
  // One growing buffer for the field in hand, since a decade of history is a
  // six-figure row count and a fresh array per byte would be most of the work.
  let field = new Uint8Array(256);
  let length = 0;
  let quoted = false;

  const push = (b: number) => {
    if (length === field.length) {
      const bigger = new Uint8Array(field.length * 2);
      bigger.set(field);
      field = bigger;
    }
    field[length++] = b;
  };
  const endField = () => {
    row.push(utf8.decode(field.subarray(0, length)));
    length = 0;
  };
  const endRow = () => {
    endField();
    records.push(row);
    row = [];
  };

  for (let i = start; i < bytes.length; i++) {
    const b = bytes[i];
    if (quoted) {
      if (b === QUOTE) {
        if (i + 1 < bytes.length && bytes[i + 1] === QUOTE) {
          push(QUOTE);
          i++;
          continue;
        }
        quoted = false;
      } else {
        push(b);
      }
    } else if (b === QUOTE) {
      quoted = true;
    } else if (b === delimiter) {
      endField();
    } else if (b === LF) {
      endRow();
    } else if (b === CR) {
      // CRLF is one line ending, not two. Swallowing the LF here keeps a
      // Windows-written export from producing an empty row between every
      // real one.
      if (i + 1 < bytes.length && bytes[i + 1] === LF) i++;
      endRow();
    } else {
      push(b);
    }
  }
  // A file that doesn't end in a line break still has a last row in hand.
  if (length > 0 || row.length > 0) endRow();
  return records;
}
