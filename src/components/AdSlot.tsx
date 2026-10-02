import { AD_SLOTS, adFree, adsenseClient, type AdPlace } from "@/lib/ads";
import { AdUnit } from "./AdUnit";

// One ad, where the plan puts them (lib/ads.ts), drawn like the rows around
// it: a small heading pill saying "Advertisement" with the way to be rid of
// them beside it, and the ad on a piece inside a shell, its height kept free
// before the ad arrives so the page never jumps. Nothing for Pro members.
// Before AdSense is set up, development shows the space it will take, so
// the placements can be judged; a real build shows nothing.
const SHELL = "rounded-shell bg-card p-2 border-[0.5px] border-t-[color:var(--lit-edge)] border-x-piece border-b-well shadow-[0_4px_9px_rgba(0,0,0,.35)]";

export async function AdSlot({ place, className = "" }: { place: AdPlace; className?: string }) {
  if (await adFree()) return null;
  const slot = AD_SLOTS[place];
  const live = !!(adsenseClient && slot);
  if (!live && process.env.NODE_ENV !== "development") return null;
  return (
    <aside aria-label="Advertisement" className={`w-full ${className}`}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="inline-flex items-center h-[2.8333rem] px-4 rounded-full bg-piece border border-hair text-[0.875rem] font-bold leading-none tracking-[.12em] uppercase text-dim">Advertisement</span>
        <a href="/pro" className="text-[1.0417rem] font-semibold text-dim no-underline hover:text-accent">
          Go ad-free with Pro →
        </a>
      </div>
      <div className={SHELL}>
        <div className="h-[8.3333rem] sm:h-[7.5rem] rounded-[12px] bg-piece overflow-hidden">
          {live ? (
            <AdUnit client={adsenseClient!} slot={slot!} />
          ) : (
            <div className="h-full flex items-center justify-center text-[1rem] text-dim text-center px-3">Ad space · shown to visitors and free accounts once AdSense is set up</div>
          )}
        </div>
      </div>
    </aside>
  );
}
