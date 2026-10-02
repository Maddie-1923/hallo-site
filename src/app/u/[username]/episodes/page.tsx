import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { WatchedPage } from "@/components/WatchedPage";
import { loadWatched } from "@/lib/real-profile";

type Params = PageProps<"/u/[username]/episodes">;

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { username } = await params;
  return { title: `@${username}'s episodes — Kodigo` };
}

// The episodes they've watched, by series, behind the Episodes number on their profile;
// ?range=year for this year's only.
export default async function Episodes({ params, searchParams }: Params) {
  const [{ username }, { range }] = await Promise.all([params, searchParams]);
  const data = await loadWatched(username);
  if (!data) notFound();
  return <WatchedPage data={data} kind="episodes" thisYear={range === "year"} />;
}
