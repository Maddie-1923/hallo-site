import { redirect } from "next/navigation";

// Explore is now Movies and Shows, each at its own address. Links to the old
// one still land in the right half.
export default async function Explore({ searchParams }: PageProps<"/explore">) {
  const { kind } = await searchParams;
  redirect(kind === "movie" ? "/movies" : "/shows");
}
