import type { Metadata } from "next";
import { ExplorePage } from "@/components/ExplorePage";

export const metadata: Metadata = { title: "Movies — Kodigo" };

// Explore's films, at their own address so the bar can go straight to them.
export default function Movies() {
  return <ExplorePage kind="movie" />;
}
