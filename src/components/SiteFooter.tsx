import Link from "next/link";
import { LogoMark } from "./Logo";

export function SiteFooter() {
  return (
    <footer className="border-t border-hair pt-14 pb-20 text-sm text-dim mt-auto">
      <div className="wrap">
        <div className="flex flex-wrap gap-8 justify-between items-start">
          <div>
            <Link href="/" className="flex items-center gap-2.5 no-underline mb-3.5">
              <LogoMark size={18} />
              <span className="display text-[22px] text-ink">Kodigo</span>
            </Link>
            <div>© 2026 Kodigo</div>
          </div>
          <div className="flex flex-col gap-2">
            <Link href="/privacy" className="hover:text-ink">Privacy policy</Link>
            <Link href="/support" className="hover:text-ink">Support</Link>
            <a href="mailto:hello@kodigo.pro" className="hover:text-ink">hello@kodigo.pro</a>
          </div>
          <div className="flex flex-col gap-2">
            <Link href="/#features" className="hover:text-ink">Features</Link>
            <Link href="/#pricing" className="hover:text-ink">Pricing</Link>
            <Link href="/#faq" className="hover:text-ink">FAQ</Link>
          </div>
        </div>
        <p className="max-w-[52ch] mt-9 text-xs leading-7">
          This product uses the TMDB API but is not endorsed or certified by TMDB. Episode air times
          provided by TVMaze. Apple, iPhone, iPad and App Store are trademarks of Apple Inc.
        </p>
      </div>
    </footer>
  );
}
