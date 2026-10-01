// The app's series pill, from `SeriesBadge` in Models.swift. TMDB's
// series-level status decides it, and the order the app resolves it in is kept
// here: cancelled beats ended, a miniseries beats a pilot, and anything the
// field can hold that isn't one of these draws nothing — TMDB has grown this
// field before and will again, and a value a build has never heard of should
// be one it doesn't draw rather than a reason to guess.
export function seriesBadge(status: string | null | undefined, type?: string | null) {
  const s = (status ?? "").toLowerCase();
  if (!s) return null;
  if (s === "canceled" || s === "cancelled") return { label: "CANCELED", tone: "cut" as const };
  if (s === "ended") return { label: "ENDED", tone: "done" as const };
  if ((type ?? "").toLowerCase() === "miniseries") return { label: "MINISERIES", tone: "done" as const };
  if (s === "pilot") return { label: "PILOT", tone: "going" as const };
  if (s === "returning series") return { label: "RETURNING", tone: "going" as const };
  return null;
}

export function SeriesBadge({ status, type, className = "" }: { status: string | null | undefined; type?: string | null; className?: string }) {
  const badge = seriesBadge(status, type);
  if (!badge) return null;
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold tracking-[.12em] leading-[1.6] ${className}`}
      style={{ background: `var(--chip-${badge.tone})`, color: `var(--chip-${badge.tone}-ink)` }}
    >
      {badge.label}
    </span>
  );
}

// The app's series pill: small bold capitals on a rounded chip; blue for a
// show still going, stone for one that has ended.
export function SeriesPill({ label, returning, small = false }: { label: string; returning: boolean; /** The Tracker's size, matched by its episode pills. */ small?: boolean }) {
  return (
    <span className={`shrink-0 font-bold tracking-[.04em] ${small ? "inline-flex items-center min-h-[14px] py-[2px] rounded-[4px] px-[4px] text-[8px] leading-none" : "rounded-[6px] px-1.5 py-[2px] text-[11px]"} ${returning ? "bg-[#6FAECF] text-[#0D2E40]" : "bg-[#CFCAC0] text-[#3A3833]"}`}>
      {label}
    </span>
  );
}
