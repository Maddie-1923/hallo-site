import { ListToolbar } from "@/components/ListToolbar";
import { KindTabs } from "@/components/KindTabs";

// Shows and Movies: the piles you are working through, the way the phone
// splits them. The profile dressing that used to sit on top moved to
// /app/profile with the settled shelves — this page is a to-do list, and a
// banner over it made it read as somebody's page rather than as work.
export default function ListsLayout({ children }: LayoutProps<"/app">) {
  return (
    <div className="wrap pt-8 sm:pt-10 pb-12">
      <div className="flex items-end gap-6 border-b border-hair">
        <KindTabs />
        <ListToolbar />
      </div>
      <div className="mt-2">{children}</div>
    </div>
  );
}
