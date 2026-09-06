import type { Metadata } from "next";
import { loadLibrary } from "@/lib/library";
import { diaryEntries, monthLabel } from "@/lib/diary";
import { EmptyLibrary } from "@/components/EmptyLibrary";
import { DiaryRow } from "@/components/DiaryRow";

export const metadata: Metadata = { title: "Diary — Kodigo" };

const columns = ["Day", "", "Title", "Released", "Rating", "Loved", "Rewatch", "Review", ""];

// Everything watched, newest first, one bento row per entry, grouped by
// month. Films and episodes share the grid; a series shows up through its
// episodes rather than as a row of its own.
export default async function Diary() {
  const { row } = await loadLibrary();
  if (!row) return <EmptyLibrary />;
  const entries = diaryEntries(row.archive);

  return (
    <>      {entries.length === 0 ? (
        <p className="text-dim mt-10">Nothing logged yet. Mark a film watched or check off an episode and it lands here.</p>
      ) : (
        <div className="mt-8 overflow-x-auto">
          <div className="min-w-[900px]">
            <div className="grid gap-2 px-3 pb-1 text-[10px] tracking-[.12em] uppercase text-dim [grid-template-columns:56px_40px_minmax(0,1fr)_56px_136px_44px_44px_minmax(120px,220px)_40px]">
              {columns.map((c, i) => (
                <div key={i}>{c}</div>
              ))}
            </div>
            {entries.map((e, i) => {
              const m = monthLabel(e.day);
              const head = i === 0 || m !== monthLabel(entries[i - 1].day);
              return (
                <div key={e.key}>
                  {head && <div className="eyebrow mt-5 mb-2">{m}</div>}
                  <div className="mb-2">
                    <DiaryRow e={e} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
