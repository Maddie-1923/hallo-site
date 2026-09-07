import type { Metadata } from "next";
import { ExplorePage } from "@/components/ExplorePage";

export const metadata: Metadata = { title: "Explore — Kodigo" };

export default async function Explore({ searchParams }: PageProps<"/explore">) {
  const { kind } = await searchParams;
  return <ExplorePage kind={kind === "movie" ? "movie" : "show"} />;
}
