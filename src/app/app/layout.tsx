import { SiteNav } from "@/components/SiteNav";

// Never prerendered. Every page under here reads one person's library out of a
// session, so there is nothing to build ahead of time — and until now that was
// true only by accident: the shared nav read the session cookie on every page,
// which is what made these dynamic. Closing the accounts side stopped the nav
// asking, the build tried to prerender /app/movies with no session to read,
// and it failed. Saying it here is what makes it a property of these pages
// rather than a side effect of a component they happen to draw.
export const dynamic = "force-dynamic";

// The signed-in shell. The proxy has already bounced anyone without a session
// to /login, so nothing here re-checks — the pages inside read the row and
// handle "no library yet" themselves. The nav is the shared one, which knows
// it's talking to a signed-in person and draws the product tabs.
export default function AppLayout({ children }: LayoutProps<"/app">) {
  return (
    <>
      <SiteNav />
      <main className="flex-1">{children}</main>
    </>
  );
}
