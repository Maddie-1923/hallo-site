import { SiteNav } from "@/components/SiteNav";

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
