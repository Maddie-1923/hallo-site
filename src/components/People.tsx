import Link from "next/link";
import type { Credit } from "@/lib/tmdb";

/** Names in a fact row, each going to that person's page. */
export function People({ people }: { people: Credit[] }) {
  return (
    <>
      {people.map((p, i) => (
        <span key={p.id}>
          {i > 0 && " · "}
          <Link href={`/person/${p.id}`} className="text-accent no-underline hover:underline">
            {p.name}
          </Link>
        </span>
      ))}
    </>
  );
}
