import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { WatchedPage } from "@/components/WatchedPage";
import { loadWatched } from "@/lib/real-profile";

type Params = PageProps<"/u/[username]/movies">;

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { username } = await params;
  return { title: `@${username}'s movies — Kodigo` };
}

// The films they've watched, behind the Movies number on their profile;
// ?range=year for this year's only.
export default async function Movies({ params, searchParams }: Params) {
  const [{ username }, { range }] = await Promise.all([params, searchParams]);
  const data = await loadWatched(username);
  if (!data) notFound();
  return <WatchedPage data={data} kind="movies" thisYear={range === "year"} />;
}
