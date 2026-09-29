import type { Metadata } from "next";
import { ExplorePage } from "@/components/ExplorePage";

export const metadata: Metadata = { title: "Shows — Kodigo" };

// Explore's series, at their own address so the bar can go straight to them.
export default function Shows() {
  return <ExplorePage kind="show" />;
}
