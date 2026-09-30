import { unzipSync } from "fflate";

// Reading a zip that somebody's old app gave them — Android's ImportZip.kt,
// the job iOS's `TVTimeZip` does with a hand-written central-directory walk.
// Here it is fflate, which reads the central directory as iOS's walk does (so
// the names come in the archive's own order), handles ZIP64, and runs in the
// browser as well as on the server.
//
// The rules around it are iOS's: only the extensions asked for are pulled out,
// with their full paths kept (Letterboxd needs them to tell three files called
// `diary.csv` apart), directories and the `__MACOSX` forks a Mac leaves behind
// are skipped, every name is listed for the diagnostics whether or not it was
// read, and an entry that fails to inflate is skipped rather than failing the
// archive.

export interface ZipEntry {
  name: string;
  data: Uint8Array;
}

/** Every name in the archive, and the payloads of the ones wanted. */
export interface ZipContents {
  names: string[];
  payloads: ZipEntry[];
}

/**
 * True when the bytes start with a local file header, an empty-archive end
 * record or a spanned-archive marker. Decided by content rather than by the
 * type the file picker reported, which is routinely wrong.
 */
export function looksLikeZip(data: Uint8Array): boolean {
  if (data.length < 4 || data[0] !== 0x50 || data[1] !== 0x4b) return false;
  const a = data[2];
  const b = data[3];
  return (a === 3 && b === 4) || (a === 5 && b === 6) || (a === 7 && b === 8);
}

/** Throws when the archive itself can't be opened. */
export function readZip(data: Uint8Array, extensions: string[]): ZipContents {
  const wanted = extensions.map((e) => e.toLowerCase());
  const names: string[] = [];
  // A first pass that inflates nothing: the directory alone, for the names.
  unzipSync(data, {
    filter: (file) => {
      names.push(file.name);
      return false;
    },
  });
  const payloads: ZipEntry[] = [];
  for (const name of names) {
    const lower = name.toLowerCase();
    if (!wanted.some((ext) => lower.endsWith(ext))) continue;
    // A directory entry, or one of the resource forks a zip re-saved on a
    // Mac picks up. Both would parse as empty files.
    if (name.endsWith("/") || name.includes("__MACOSX")) continue;
    try {
      // One entry at a time, so a method this can't inflate or a damaged
      // entry costs that entry and the rest of the archive is still read.
      let seen = false;
      const one = unzipSync(data, {
        filter: (file) => {
          if (seen || file.name !== name) return false;
          seen = true;
          return true;
        },
      });
      const bytes = one[name];
      if (bytes) payloads.push({ name, data: bytes });
    } catch {
      continue;
    }
  }
  return { names, payloads };
}
