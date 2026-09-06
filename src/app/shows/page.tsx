import type { Metadata } from "next";
import { BrowsePage } from "@/components/BrowsePage";

export const metadata: Metadata = { title: "Shows — Kodigo" };

export default function Shows() {
  return <BrowsePage kind="show" />;
}
