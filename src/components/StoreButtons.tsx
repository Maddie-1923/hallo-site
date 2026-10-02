import { AndroidMark, AppleMark } from "./StoreIcons";
import { APP_STORE_URL, PLAY_STORE_URL } from "@/lib/stores";

/** The two store buttons over a picture (About's and the landing's heroes).
    Each links once its listing is live (lib/stores); until then it says it's
    coming, there rather than in a FAQ, because "is it on my phone" is the
    first thing people reading a front page want to know. */
export function StoreButtons() {
  return (
    <>
      {[
        { label: "App Store", href: APP_STORE_URL, mark: <AppleMark /> },
        { label: "Android", href: PLAY_STORE_URL, mark: <AndroidMark /> },
      ].map((st, i) =>
        st.href ? (
          <a key={st.label} className={`btn ${i ? "ghost !text-white !border-white/40" : ""} !inline-flex items-center gap-2 !py-2.5 !px-4 !text-[1.25rem] whitespace-nowrap`} href={st.href}>
            {st.mark}
            {st.label}
          </a>
        ) : (
          <span key={st.label} className="btn ghost !inline-flex items-center gap-2 !py-2.5 !px-4 !text-[1.25rem] whitespace-nowrap !text-white/60 !border-white/25 cursor-default" aria-disabled="true">
            {st.mark}
            {st.label}
            <span className="text-[0.9167rem] font-bold tracking-[.12em] uppercase text-white/40">Soon</span>
          </span>
        ),
      )}
    </>
  );
}
