import { redirect } from "next/navigation";
import { loadProfile } from "@/lib/profile";

// The old signed-in pages under /app, retired: each now lives somewhere
// else, and an old bookmark or sign-in link lands there. The proxy has
// already sent anyone signed out to /login.
export default async function Moved({ params }: PageProps<"/app/[[...rest]]">) {
  const [page] = (await params).rest ?? [];
  if (page === "profile" || page === "history" || page === "diary") {
    const { username } = await loadProfile();
    redirect(username ? `/u/${username}${page === "profile" ? "" : "#watchlog"}` : "/profile/setup");
  }
  if (page === "account") redirect("/settings#account");
  if (page === "import") redirect("/settings#data");
  if (page === "movies") redirect("/library?kind=movies");
  redirect("/library");
}
