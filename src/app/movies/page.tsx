import { redirect } from "next/navigation";

// Explore took over browsing when the site's words were lined up with the
// app's. These paths were public and may be linked from outside, so they
// forward rather than 404.
export default function Moved() {
  redirect("/explore?kind=movie");
}
