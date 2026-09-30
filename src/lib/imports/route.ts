import { looksLikeOurs } from "./json";
import { readTvTimeFiles } from "./tvtime-reader";
import { TvTimeReadFailure, type ImportFile } from "./types";
import { describeImportFile } from "./universal";

// Which reader an import goes to, decided by what's in the files and never by
// which row the person tapped or which phone made the export. The same rule,
// with the same name and the same sample exports in its tests, is in the
// iOS app (ImportRoute.swift) and the Android app (ImportRoute.kt):
//
//   1. A Kodigo backup goes to the backup reader.
//   2. What TV Time's reader can read is TV Time's export, and goes to it.
//   3. Anything else another reader recognises goes to the universal
//      importer: Letterboxd, Trakt, Simkl, Refract, Sofa Time, Bingers and
//      the rest, and any table whose columns can be read.
//   4. Nothing can read it: TV Time's own message if it named a TV Time
//      format it doesn't read yet (it knows that file better than anyone),
//      otherwise the universal importer's "nothing readable", with what it
//      made of each file.
//
// Step 3 before 4 is the fix: TV Time's reader guesses at its rarer formats
// from a column or two, and those guesses caught Simkl's and Refract's
// backups, which the universal importer reads in full.

export type ImportRoute =
  | { kind: "backup" }
  | { kind: "tvtime" }
  | { kind: "universal" }
  /** Nothing reads it. `tvTime` is TV Time's reason when it named a format it doesn't read yet. */
  | { kind: "unreadable"; tvTime: TvTimeReadFailure | null };

export function chooseImportRoute(files: ImportFile[]): ImportRoute {
  if (files.some((f) => looksLikeOurs(f.data))) return { kind: "backup" };

  let tvTimeFailure: TvTimeReadFailure | null = null;
  try {
    const tv = readTvTimeFiles(files);
    if (tv.shows.length > 0 || tv.movies.length > 0) return { kind: "tvtime" };
  } catch (e) {
    if (!(e instanceof TvTimeReadFailure)) throw e;
    tvTimeFailure = e;
  }

  const readable = files.some((f) => {
    try {
      return describeImportFile(f).some((p) => p.entries.length > 0);
    } catch {
      return false;
    }
  });
  if (readable) return { kind: "universal" };

  return { kind: "unreadable", tvTime: tvTimeFailure?.reason.kind === "notSupportedYet" ? tvTimeFailure : null };
}
