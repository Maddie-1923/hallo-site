import { AD_SLOTS, adFree, adsenseClient, type AdPlace } from "@/lib/ads";
import { AdUnit } from "./AdUnit";

// One ad, where the plan puts them (lib/ads.ts): a wide banner, its height
// kept free before the ad arrives so the page never jumps, labelled
// "Advertisement", with the way to be rid of them. Nothing for Pro members.
// Before AdSense is set up, development shows the space it will take, so
// the placements can be judged; a real build shows nothing.
export async function AdSlot({ place, className = "" }: { place: AdPlace; className?: string }) {
  if (await adFree()) return null;
  const slot = AD_SLOTS[place];
  const live = !!(adsenseClient && slot);
  if (!live && process.env.NODE_ENV !== "development") return null;
  return (
    <aside aria-label="Advertisement" className={`w-full ${className}`}>
      <div className="max-w-[80.8333rem] mx-auto">
        <div className="flex items-center justify-between gap-3 mb-1.5 px-1 text-[0.875rem] font-bold uppercase tracking-[.12em] text-dim">
          <span>Advertisement</span>
          <a href="/pro" className="normal-case tracking-normal font-semibold text-[1rem] text-dim no-underline hover:text-accent">
            Go ad-free with Pro →
          </a>
        </div>
        <div className="h-[8.3333rem] sm:h-[7.5rem] rounded-[10px] overflow-hidden">
          {live ? (
            <AdUnit client={adsenseClient!} slot={slot!} />
          ) : (
            <div className="h-full rounded-[10px] border border-dashed border-hair flex items-center justify-center text-[1rem] text-dim text-center px-3">Ad space · shown to visitors and free accounts once AdSense is set up</div>
          )}
        </div>
      </div>
    </aside>
  );
}
