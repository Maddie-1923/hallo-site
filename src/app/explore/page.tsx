import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ExplorePage } from "@/components/ExplorePage";

export const metadata: Metadata = { title: "Explore — Kodigo" };

// Explore's front: series and films together. Old links that named a half
// (?kind=movie, ?kind=show) still land in it.
export default async function Explore({ searchParams }: PageProps<"/explore">) {
  const { kind } = await searchParams;
  if (kind === "movie") redirect("/movies");
  if (kind === "show") redirect("/shows");
  return <ExplorePage kind="all" />;
}
