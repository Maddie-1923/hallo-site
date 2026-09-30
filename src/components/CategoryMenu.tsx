"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Service } from "@/lib/tmdb";
import { deleteRail, renameRail } from "@/lib/saved-rail-actions";
import { RAIL_NAME_LIMIT, type Catalogue, type DiscoverFilter } from "@/lib/saved-rails";
import { Menu } from "./Menu";
import { CategoryDialog, Sheet } from "./CategoryDialog";

// The ••• beside a custom category's heading, on Explore and on the
// category's own page: rename it, change what it asks for, or remove it —
// the app's long press on a saved rail. Removing asks first, and takes the
// category off every device at their next sync; nothing tracked is touched.
export function CategoryMenu({
  rail,
  services,
  counts,
  // Where to go once it's removed, when the page was the category's own.
  leaveTo,
}: {
  rail: { id: string; name: string; catalogue: Catalogue; filter: DiscoverFilter };
  services: Service[];
  counts: Record<Catalogue, number>;
  leaveTo?: string;
}) {
  const router = useRouter();
  const [sheet, setSheet] = useState<"rename" | "filter" | null>(null);
  const [pending, start] = useTransition();

  function remove() {
    if (!confirm(`Remove ${rail.name}? The titles in it stay as they are.`)) return;
    start(async () => {
      const r = await deleteRail(rail.id);
      if (r.error) return alert(r.error);
      if (leaveTo) router.push(leaveTo);
      else router.refresh();
    });
  }

  const item = "w-full flex items-center gap-3 px-4 py-2.5 text-[13.5px] text-ink hover:bg-card-hi cursor-pointer text-left";
  return (
    <>
      <Menu
        label={`${rail.name}: more`}
        width={200}
        align="left"
        button={
          <span className={`inline-flex items-center justify-center w-11 h-11 rounded-[10px] bg-piece text-dim hover:text-ink transition-colors ${pending ? "opacity-50" : ""}`}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <circle cx="5" cy="12" r="2" />
              <circle cx="12" cy="12" r="2" />
              <circle cx="19" cy="12" r="2" />
            </svg>
          </span>
        }
      >
        <div className="py-1.5">
          <button type="button" data-menu-close onClick={() => setSheet("rename")} className={item}>
            Rename
          </button>
          <button type="button" data-menu-close onClick={() => setSheet("filter")} className={item}>
            Edit filter
          </button>
          <div className="my-1.5 border-t border-hair" />
          <button type="button" data-menu-close onClick={remove} className={`${item} hover:!text-loved`}>
            Remove
          </button>
        </div>
      </Menu>
      {sheet === "rename" && <RenameSheet id={rail.id} name={rail.name} onClose={() => setSheet(null)} />}
      {sheet === "filter" && <CategoryDialog services={services} counts={counts} edit={rail} onClose={() => setSheet(null)} />}
    </>
  );
}

function RenameSheet({ id, name, onClose }: { id: string; name: string; onClose: () => void }) {
  const router = useRouter();
  const [value, setValue] = useState(name);
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();
  const empty = !value.trim();

  function save() {
    setError(undefined);
    start(async () => {
      const r = await renameRail(id, value);
      if (r.error) return setError(r.error);
      router.refresh();
      onClose();
    });
  }

  return (
    <Sheet
      label={`Rename ${name}`}
      title="Rename category"
      width={440}
      onClose={onClose}
      footer={
        <>
          {error && (
            <span className="text-sm mr-auto" style={{ color: "var(--movies)" }} role="alert">
              {error}
            </span>
          )}
          <button type="button" className="text-[15px] font-semibold text-dim hover:text-ink cursor-pointer" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn !py-2.5 !px-6 !text-[15px]" disabled={pending || empty} onClick={save}>
            {pending ? "Saving…" : "Save"}
          </button>
        </>
      }
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!empty) save();
        }}
      >
        <div className="flex items-baseline gap-3">
          <div className="eyebrow">Name</div>
          <span className="text-xs text-dim">
            {Array.from(value).length}/{RAIL_NAME_LIMIT}
          </span>
        </div>
        <input className="field mt-2" value={value} maxLength={RAIL_NAME_LIMIT} autoFocus onChange={(e) => setValue(e.target.value)} />
      </form>
    </Sheet>
  );
}
