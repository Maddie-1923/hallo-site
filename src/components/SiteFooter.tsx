import Link from "next/link";
import { CookieSettingsLink } from "./CookieSettingsLink";

export function SiteFooter() {
  return (
    <footer className="border-t border-hair pt-10 pb-12 text-sm text-dim mt-auto">
      <div className="wrap">
        <div className="flex flex-wrap gap-8 justify-between items-start">
          <div>
            <Link href="/" className="flex items-center gap-2.5 no-underline mb-2.5">
              {/* The app's own icon, as in the top bar. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/kodigo-icon.png" alt="" width={32} height={32} className="rounded-[23%] shadow-[0_1px_3px_rgba(0,0,0,.25)]" />
              <span className="display text-[1.8333rem] text-[color:var(--logo-ink)]">Kodigo</span>
            </Link>
            <div>© 2026 Kodigo</div>
            {/* The credits sit under the name, in a narrow column, so they
                stay clear of the links beside them. */}
            <p className="m-0 mt-4 max-w-[38ch] text-xs leading-[1.6]">
              This product uses TMDB and the TMDB APIs but is not endorsed, certified, or otherwise approved by TMDB. Episode air
              times provided by TVmaze. Apple, iPhone, iPad and App Store are trademarks of Apple Inc.
            </p>
          </div>
          <div className="flex flex-col gap-1">
            <Link href="/privacy" className="hover:text-ink">Privacy policy</Link>
            <Link href="/terms" className="hover:text-ink">Terms of use</Link>
            {process.env.NEXT_PUBLIC_ADSENSE_CLIENT && <CookieSettingsLink />}
            <Link href="/support" className="hover:text-ink">Support</Link>
            <Link href="/delete-account" className="hover:text-ink">Delete your account</Link>
            <a href="mailto:hello@kodigo.pro" className="hover:text-ink">hello@kodigo.pro</a>
          </div>
          <div className="flex flex-col gap-1">
            <Link href="/about#features" className="hover:text-ink">Features</Link>
            <Link href="/pro" className="hover:text-ink">Kodigo Pro</Link>
            <Link href="/whats-new" className="hover:text-ink">What&apos;s new</Link>
            <Link href="/about#faq" className="hover:text-ink">FAQ</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
