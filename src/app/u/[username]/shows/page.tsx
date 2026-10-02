import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { WatchedPage } from "@/components/WatchedPage";
import { loadWatched } from "@/lib/real-profile";

type Params = PageProps<"/u/[username]/shows">;

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { username } = await params;
  return { title: `@${username}'s shows — Kodigo` };
}

// The series in their library, behind the Shows number on their profile;
// ?range=year for this year's only.
export default async function Shows({ params, searchParams }: Params) {
  const [{ username }, { range }] = await Promise.all([params, searchParams]);
  const data = await loadWatched(username);
  if (!data) notFound();
  return <WatchedPage data={data} kind="shows" thisYear={range === "year"} />;
}
