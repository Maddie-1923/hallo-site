import { redirect } from "next/navigation";

// The tracker page is called Calendar now; the old address still lands there.
export default function Tracker() {
  redirect("/calendar");
}
