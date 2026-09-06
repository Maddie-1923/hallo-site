import type { Metadata } from "next";
import { BrowsePage } from "@/components/BrowsePage";

export const metadata: Metadata = { title: "Movies — Kodigo" };

export default function Movies() {
  return <BrowsePage kind="movie" />;
}
