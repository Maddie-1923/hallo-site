import type { Metadata } from "next";
import Link from "next/link";
import { loadLibrary } from "@/lib/library";
import { EmptyLibrary } from "@/components/EmptyLibrary";
import { HistoryDay } from "@/components/HistoryDay";
import { diaryEntries, monthLabel, weekday, type DiaryEntry } from "@/lib/diary";

export const metadata: Metadata = { title: "History — Kodigo" };

// Everything watched, newest first, a month at a time: a heading, a strip of
// the month's days shaded by how much was watched, a tally, then the days
// themselves as bento cards. A month is the unit because that is the span
// somebody actually asks about — "what did I watch in September".
export default async function History() {
  const { row } = await loadLibrary();
  if (!row) {
    return (
      <div className="wrap pt-8 sm:pt-10 pb-16">
        <h1 className="!text-[clamp(38px,6vw,64px)]">History</h1>
        <EmptyLibrary />
      </div>
    );
  }

  const entries = diaryEntries(row.archive);
  const months = new Map<string, DiaryEntry[]>();
  for (const e of entries) {
    const key = e.day.slice(0, 7);
    const run = months.get(key);
    if (run) run.push(e);
    else months.set(key, [e]);
  }

  return (
    <div className="wrap pt-8 sm:pt-10 pb-16">
      <p className="text-sm text-dim m-0">
        <Link href="/app/profile" className="text-accent">
          Profile
        </Link>{" "}
        <span className="text-dim">› History</span>
      </p>

      {entries.length === 0 ? (
        <p className="text-dim mt-8">
          Nothing logged yet. Check an episode off or mark a film watched and it lands here.
        </p>
      ) : (
        [...months.entries()].map(([key, run]) => <Month key={key} month={key} entries={run} />)
      )}
    </div>
  );
}

function Month({ month, entries }: { month: string; entries: DiaryEntry[] }) {
  const year = Number(month.slice(0, 4));
  const monthIndex = Number(month.slice(5, 7)) - 1;
  const days = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();

  // How much was watched on each day of the month, for the strip.
  const perDay = new Map<number, number>();
  for (const e of entries) {
    const d = Number(e.day.slice(8, 10));
    perDay.set(d, (perDay.get(d) ?? 0) + 1);
  }

  const episodes = entries.filter((e) => e.kind === "episode").length;
  const films = entries.filter((e) => e.kind === "movie").length;
  // The same 42-minute estimate the profile uses; a film with no runtime in
  // the archive counts as two hours.
  const minutes = episodes * 42 + films * 120;
  const busiest = [...perDay.entries()].sort((a, b) => b[1] - a[1])[0];

  const byDay = new Map<string, DiaryEntry[]>();
  for (const e of entries) {
    const run = byDay.get(e.day);
    if (run) run.push(e);
    else byDay.set(e.day, [e]);
  }

  return (
    <section className="mt-12 first:mt-8">
      <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)_300px] items-center">
        <h2 className="!text-[clamp(30px,4vw,44px)] leading-none m-0">
          {monthLabel(`${month}-01`)}
        </h2>

        {/* One square per day, shaded by how much was watched. A month with a
            long weekend in it looks different from one without, before any
            number is read. */}
        <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${days}, minmax(0, 1fr))` }}>
          {Array.from({ length: days }, (_, i) => i + 1).map((d) => {
            const n = perDay.get(d) ?? 0;
            const shade = n === 0 ? 0 : n === 1 ? 35 : n < 4 ? 65 : 100;
            return (
              <span
                key={d}
                title={`${d} ${monthLabel(`${month}-01`).split(" ")[0]} · ${n} watched`}
                className="aspect-square rounded-[5px]"
                style={{
                  background:
                    shade === 0
                      ? "var(--card-hi)"
                      : `color-mix(in srgb, var(--accent-fill) ${shade}%, var(--card-hi))`,
                }}
              />
            );
          })}
        </div>

        <div className="grid grid-cols-3 rounded-2xl bg-card py-3 text-center divide-x divide-hair">
          <div>
            <div className="display text-2xl leading-none">{episodes}</div>
            <div className="text-[10px] tracking-[.14em] uppercase text-dim mt-1.5">Episodes</div>
          </div>
          <div>
            <div className="display text-2xl leading-none">{films}</div>
            <div className="text-[10px] tracking-[.14em] uppercase text-dim mt-1.5">Films</div>
          </div>
          <div>
            <div className="display text-2xl leading-none">{Math.round(minutes / 60)}h</div>
            <div className="text-[10px] tracking-[.14em] uppercase text-dim mt-1.5">Watched</div>
          </div>
        </div>
      </div>

      {busiest && busiest[1] > 2 && (
        <p className="text-xs text-dim mt-3 mb-0">
          Busiest day: the {busiest[0]}th, {busiest[1]} logged.
        </p>
      )}

      <div className="mt-7 grid gap-4">
        {[...byDay.entries()].map(([day, run]) => (
          <div key={day} className="grid gap-4 sm:grid-cols-[88px_minmax(0,1fr)]">
            <div className="text-right pt-1">
              <div className="text-[11px] tracking-[.16em] uppercase text-dim">{weekday(day)}</div>
              <div className="display text-4xl leading-none mt-0.5">{day.slice(8, 10)}</div>
            </div>
            <HistoryDay entries={run} />
          </div>
        ))}
      </div>
    </section>
  );
}
