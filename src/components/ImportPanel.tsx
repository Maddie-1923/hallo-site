"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { readImport, type ImportSummary } from "@/lib/import-read";
import { ImportRefused, NothingReadable, runImport, TvTimeReadFailure, type ImportOutcome } from "@/lib/import-runner";
import { importIntoLibrary } from "@/lib/library-actions";
import { progressFraction, type ImportProgress } from "@/lib/imports";

// Settings → Import & export → Bring your history. Pick the files; see what
// each one is; Import reads and matches every title in this browser (the
// app's importers, lib/imports) with its progress and a Stop; then the
// result, what would be added and what couldn't be placed, and only then
// Add to my library, which the server merges in without replacing anything.
const button = "inline-flex items-center h-8 px-4 rounded-full text-[1.0417rem] font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-default";
const quiet = `${button} bg-card border border-hair text-ink hover:text-accent transition-colors`;
const strong = `${button} bg-accent-fill text-on-accent`;
const STAGE: Record<ImportProgress["stage"], string> = { reading: "Reading the files", matching: "Finding each title", loadingEpisodes: "Fetching episode lists", saving: "Putting it together" };

type State =
  | { at: "idle" }
  | { at: "picked"; files: File[]; read: ImportSummary[] }
  | { at: "running"; files: File[]; progress: ImportProgress | null }
  | { at: "review"; files: File[]; outcome: ImportOutcome }
  | { at: "saving"; outcome: ImportOutcome }
  | { at: "done"; outcome: ImportOutcome }
  | { at: "failed"; files: File[]; message: string };

export function ImportPanel() {
  const router = useRouter();
  const [state, setState] = useState<State>({ at: "idle" });
  const stop = useRef<AbortController | null>(null);

  async function pick(files: File[]) {
    if (!files.length) return;
    setState({ at: "picked", files, read: await Promise.all(files.map(readImport)) });
  }

  async function start(files: File[]) {
    const ctrl = new AbortController();
    stop.current = ctrl;
    setState({ at: "running", files, progress: null });
    try {
      const outcome = await runImport(files, (p) => setState((s) => (s.at === "running" ? { ...s, progress: p } : s)), ctrl.signal);
      setState({ at: "review", files, outcome });
    } catch (e) {
      if (ctrl.signal.aborted) return setState({ at: "picked", files, read: await Promise.all(files.map(readImport)) });
      setState({ at: "failed", files, message: failure(e) });
    }
  }

  // A save that failed says why under the result; before accounts open,
  // that the preview saves nothing.
  const [saveError, setSaveError] = useState<string | null>(null);
  async function save(outcome: ImportOutcome) {
    setSaveError(null);
    setState({ at: "saving", outcome });
    const r = await importIntoLibrary(outcome.plan).catch(() => ({ error: "That didn't save. Try again." }));
    if (r.error) {
      setSaveError(/sign in/i.test(r.error) ? "This is the preview: nothing is saved until accounts open. The numbers above are what would be added." : r.error);
      setState({ at: "review", files: [], outcome });
      return;
    }
    setState({ at: "done", outcome });
    router.refresh();
  }

  return (
    <div className="py-[0.8333rem] grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[1.0417rem] text-ink">Bring your history</div>
          <div className="mt-0.5 text-[1.0417rem] leading-[1.5] text-dim">From TV Time, Letterboxd, Trakt, Simkl, IMDb or another app&apos;s export, or a Kodigo backup. Nothing you already have is replaced.</div>
        </div>
        {(state.at === "idle" || state.at === "picked" || state.at === "failed" || state.at === "done") && (
          <label className={quiet}>
            {state.at === "idle" ? "Choose files" : "Choose other files"}
            <input
              type="file"
              multiple
              accept=".json,.csv,.zip,.txt"
              className="sr-only"
              onChange={(e) => {
                const files = [...(e.target.files ?? [])];
                e.target.value = "";
                setSaveError(null);
                void pick(files);
              }}
            />
          </label>
        )}
      </div>

      {state.at === "picked" && (
        <>
          {state.read.map((r, i) => (
            <FileCard key={`${r.file}${i}`} r={r} />
          ))}
          <div className="flex justify-end gap-2">
            <button type="button" className={quiet} onClick={() => setState({ at: "idle" })}>
              Clear
            </button>
            <button type="button" className={strong} onClick={() => start(state.files)} disabled={state.read.every((r) => r.counts.length === 0)}>
              Import
            </button>
          </div>
        </>
      )}

      {state.at === "running" && (
        <div className="rounded-[10px] bg-card border border-hair p-3 grid gap-2" aria-live="polite">
          <div className="flex items-baseline justify-between gap-3 text-[1.0417rem]">
            <span className="font-semibold text-ink">{state.progress ? STAGE[state.progress.stage] : "Starting"}</span>
            {state.progress && state.progress.toMatch > 0 && (
              <span className="text-dim tabular-nums">
                {state.progress.matched.toLocaleString("en")} of {state.progress.toMatch.toLocaleString("en")}
              </span>
            )}
          </div>
          <div className="h-[0.4167rem] rounded-full bg-track overflow-hidden">
            <div className="h-full rounded-full bg-accent-fill transition-[width] duration-300" style={{ width: `${Math.round((state.progress ? (progressFraction(state.progress) ?? 0.03) : 0.03) * 100)}%` }} />
          </div>
          {state.progress?.currentTitle && <div className="text-[1.0417rem] text-dim truncate">{state.progress.currentTitle}</div>}
          <p className="m-0 text-[1rem] text-dim">A big history takes a few minutes. Keep this page open.</p>
          <div className="flex justify-end">
            <button type="button" className={quiet} onClick={() => stop.current?.abort()}>
              Stop
            </button>
          </div>
        </div>
      )}

      {(state.at === "review" || state.at === "saving" || state.at === "done") && (
        <div className="rounded-[10px] bg-card border border-hair p-3 grid gap-2">
          <Result outcome={state.outcome} done={state.at === "done"} />
          {saveError && state.at === "review" && (
            <p role="alert" className="m-0 text-[1.0417rem] text-loved">
              {saveError}
            </p>
          )}
          {state.at === "done" ? (
            <div className="flex flex-wrap justify-end gap-2">
              <Link href="/library" className={`${quiet} no-underline`}>
                Open your library
              </Link>
              <button type="button" className={quiet} onClick={() => setState({ at: "idle" })}>
                Import something else
              </button>
            </div>
          ) : (
            <div className="flex justify-end gap-2">
              <button type="button" className={quiet} disabled={state.at === "saving"} onClick={() => setState({ at: "idle" })}>
                Cancel
              </button>
              <button type="button" className={strong} disabled={state.at === "saving" || !adds(state.outcome)} onClick={() => save(state.outcome)}>
                {state.at === "saving" ? "Adding…" : "Add to my library"}
              </button>
            </div>
          )}
        </div>
      )}

      {state.at === "failed" && (
        <div className="rounded-[10px] bg-card border border-hair p-3 grid gap-2">
          <p role="alert" className="m-0 text-[1.0417rem] text-loved">
            {state.message}
          </p>
          <div className="flex justify-end">
            <button type="button" className={quiet} onClick={() => start(state.files)}>
              Try again
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/** What a file is and what's in it. */
function FileCard({ r }: { r: ImportSummary }) {
  return (
    <div className="rounded-[10px] bg-card border border-hair p-3">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[1.0417rem] font-semibold text-ink truncate">{r.source}</span>
        <span className="text-[1.0417rem] text-dim truncate">{r.file}</span>
      </div>
      {r.counts.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-[1.0417rem]">
          {r.counts
            .filter(([, n]) => n > 0)
            .map(([label, n]) => (
              <span key={label} className="text-mid-tone">
                <b className="font-semibold text-ink tabular-nums">{n.toLocaleString("en")}</b> {label.toLowerCase()}
              </span>
            ))}
        </div>
      )}
      {r.note && <p className="m-0 mt-1.5 text-[1.0417rem] text-dim">{r.note}</p>}
    </div>
  );
}

/** Whether there's anything to add. */
function adds(o: ImportOutcome) {
  if (o.kind === "backup") return o.counts.shows + o.counts.movies + o.counts.reviews > 0;
  const r = o.result;
  return r.showsAdded + r.episodesAdded + r.moviesAdded + r.reviewsAdded > 0 || Object.keys(o.plan.ratings).length > 0 || o.plan.loved.length > 0 || r.showsAlreadyTracked + r.moviesAlreadyTracked > 0;
}

/** The numbers, and the titles that couldn't be placed or were a guess. */
function Result({ outcome: o, done }: { outcome: ImportOutcome; done: boolean }) {
  const lines: [string, number][] =
    o.kind === "backup"
      ? [
          ["series", o.counts.shows],
          ["films", o.counts.movies],
          ["episodes watched", o.counts.episodes],
          ["reviews", o.counts.reviews],
        ]
      : [
          ["series added", o.result.showsAdded],
          ["films added", o.result.moviesAdded],
          ["episodes checked off", o.result.episodesAdded],
          ["already in your library", o.result.showsAlreadyTracked + o.result.moviesAlreadyTracked],
          ["ratings", Object.keys(o.plan.ratings).length],
          ["reviews", o.result.reviewsAdded],
          ["kept, already reviewed here", o.result.reviewsKept],
        ];
  const unmatched = o.kind === "universal" ? o.result.unmatched : o.kind === "tvtime" ? [...o.result.unmatchedShows, ...o.result.unmatchedMovies] : [];
  const guessed = o.kind === "universal" ? o.result.ambiguous : o.kind === "tvtime" ? o.result.ambiguous.map((a) => (a.takenAs ? `${a.title} (taken as ${a.takenAs})` : a.title)) : [];
  return (
    <>
      <div className="text-[1.0417rem] font-semibold text-ink">
        {done ? "Added to your library" : o.kind === "backup" ? "A Kodigo backup, to add to your library" : "Ready to add"}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[1.0417rem]">
        {lines
          .filter(([, n]) => n > 0)
          .map(([label, n]) => (
            <span key={label} className="text-mid-tone">
              <b className="font-semibold text-ink tabular-nums">{n.toLocaleString("en")}</b> {label}
            </span>
          ))}
      </div>
      {o.kind === "backup" && !done && <p className="m-0 text-[1.0417rem] leading-[1.5] text-dim">It&apos;s merged with what&apos;s here, record by record, the newer side winning, as the app&apos;s sync does. To replace your library with a backup, use Settings → Backup in the app.</p>}
      {unmatched.length > 0 && <Titles label={`Couldn't find ${unmatched.length}`} titles={unmatched} />}
      {guessed.length > 0 && <Titles label={`Matched by name, worth a look (${guessed.length})`} titles={guessed} />}
    </>
  );
}

function Titles({ label, titles }: { label: string; titles: string[] }) {
  return (
    <details className="text-[1.0417rem]">
      <summary className="cursor-pointer text-dim hover:text-ink">{label}</summary>
      <ul className="m-0 mt-1 pl-4 grid gap-0.5 text-mid-tone max-h-[15rem] overflow-y-auto soft-scroll">
        {titles.slice(0, 300).map((t, i) => (
          <li key={`${t}${i}`}>{t}</li>
        ))}
      </ul>
    </details>
  );
}

/** A failure, in words. */
function failure(e: unknown): string {
  if (e instanceof ImportRefused) return e.message;
  if (e instanceof NothingReadable) return "Nothing in those files looked like a watch history. Pick the CSV, JSON or zip your old app exported.";
  if (e instanceof TvTimeReadFailure) {
    const r = e.reason;
    if (r.kind === "notSupportedYet") return `That TV Time file (${r.formatLabel}) isn't one Kodigo can read yet.`;
    if (r.kind === "archiveUnreadable") return "That zip couldn't be opened. Download it from TV Time again and try once more.";
    return "Nothing in that TV Time export could be used.";
  }
  return "The import stopped partway. Try again.";
}
