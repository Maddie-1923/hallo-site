"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Movie, MovieStatus, Show, WatchStatus } from "@/lib/archive";
import { labelFor } from "@/lib/archive";
import { trackMovie, trackShow, untrackMovie, untrackShow } from "@/lib/library-actions";

const showStatuses: WatchStatus[] = ["Watching", "Stopped", "Finished", "Dropped"];
const movieStatuses: MovieStatus[] = ["To Watch", "Watched", "On Hold", "Dropped"];

type Props =
  | { kind: "show"; show: Show; status: WatchStatus | null; signedIn: boolean }
  | { kind: "movie"; movie: Movie; status: MovieStatus | null; signedIn: boolean };

export function TrackControls(props: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string>();

  if (!props.signedIn) {
    return (
      <Link href={`/login?next=${encodeURIComponent(props.kind === "show" ? `/show/${props.show.id}` : `/movie/${props.movie.id}`)}`} className="btn">
        Sign in to track
      </Link>
    );
  }

  function run(action: () => Promise<{ error?: string }>) {
    setError(undefined);
    start(async () => {
      const r = await action();
      if (r.error) setError(r.error);
      router.refresh();
    });
  }

  const tracked = props.status !== null;
  const statuses = props.kind === "show" ? showStatuses : movieStatuses;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {!tracked ? (
        <button
          className="btn"
          disabled={pending}
          onClick={() => run(() => (props.kind === "show" ? trackShow(props.show) : trackMovie(props.movie)))}
        >
          {pending ? "Adding…" : "Add to library"}
        </button>
      ) : (
        <>
          <label className="sr-only" htmlFor="status">Status</label>
          <select
            id="status"
            className="field !w-auto !py-2.5"
            value={props.status ?? ""}
            disabled={pending}
            onChange={(e) => {
              const v = e.target.value;
              run(() =>
                props.kind === "show" ? trackShow(props.show, v as WatchStatus) : trackMovie(props.movie, v as MovieStatus),
              );
            }}
          >
            {statuses.map((s) => (
              <option key={s} value={s}>
                {labelFor(s)}
              </option>
            ))}
          </select>
          <button
            className="btn ghost"
            disabled={pending}
            onClick={() => run(() => (props.kind === "show" ? untrackShow(props.show.id) : untrackMovie(props.movie.id)))}
          >
            Remove
          </button>
        </>
      )}
      {error && <span className="text-sm" style={{ color: "var(--movies)" }} role="alert">{error}</span>}
    </div>
  );
}
