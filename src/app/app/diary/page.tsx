import { redirect } from "next/navigation";

/** The Diary became History and moved onto the profile. */
export default function Moved() {
  redirect("/app/history");
}
