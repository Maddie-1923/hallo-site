import "server-only";
import type { LibraryArchive, Movie, Show } from "./archive";

// A made-up library for the front door's tracker: this week's trending shows,
// each watched part-way through its first season over the last few days, a
// couple waiting to start, and a few films on the list. The titles and
// pictures are real; whose library it is isn't, which is the point — the
// visitor sees the real tracker working without an account.

const stamp = (d: Date) => d.toISOString().replace(/\.\d{3}Z$/, "Z");

export function sampleLibrary(shows: Show[], films: Movie[], now = new Date()): LibraryArchive {
  const day = (n: number) => new Date(now.getTime() - n * 86_400_000);
  const watching = shows.filter((s) => s.poster_path && s.backdrop_path).slice(0, 8);
  const watched: string[] = [];
  const watchedDates: Record<string, string> = {};
  const watchedStamps: Record<string, string> = {};
  // How far into season one each show is: the first six started, the last two
  // not yet, so Ready to start has something in it too.
  const reached = [4, 2, 6, 3, 1, 5, 0, 0];
  watching.forEach((s, i) => {
    for (let e = 1; e <= reached[i]; e++) {
      const key = `${s.id}-1-${e}`;
      const when = stamp(day(i + (reached[i] - e) * 0.5));
      watched.push(key);
      watchedDates[key] = when;
      watchedStamps[key] = when;
    }
  });
  return {
    version: 14,
    exported: stamp(now),
    device: "Sample",
    shows: watching.map((show, i) => ({ show, status: "Watching", modified: stamp(day(i)), added: stamp(day(i + 2)) })),
    movies: films.filter((m) => m.poster_path).slice(0, 6).map((movie, i) => ({ movie, status: "To Watch", modified: stamp(day(i)), added: stamp(day(i)) })),
    watched,
    watchedDates,
    watchedStamps,
  };
}
