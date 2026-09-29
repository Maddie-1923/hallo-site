"use client";

import Link from "next/link";
import { useState } from "react";
import type { Member } from "@/lib/members";
import { useSafety } from "@/lib/safety";
import { FollowPill } from "./FollowPill";

// Members, as the plan has it: the popular reviewers this week, the most
// followed, and new members, with a search over them all. Each person is
// their initial on the accent (their own picture with accounts), their
// handle, name and place, what they've logged, and Follow.
const SHELL = "rounded-shell bg-card p-2 border-[0.5px] border-t-[color:var(--lit-edge)] border-x-piece border-b-well shadow-[0_4px_9px_rgba(0,0,0,.35)]";
const H = "inline-flex items-center h-[34px] px-4 rounded-full bg-piece ![font-family:var(--font-body)] !font-bold !text-[10.5px] !leading-none !tracking-[.12em] uppercase text-ink";

const k = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1).replace(/\.0$/, "")}K` : String(n));

export function MembersPage({ members: everyone }: { members: Member[] }) {
  // Nobody you've blocked.
  const { blocked } = useSafety();
  const members = everyone.filter((m) => !blocked.includes(m.username));
  const [q, setQ] = useState("");
  const found = q.trim() ? members.filter((m) => `${m.username} ${m.displayName} ${m.location}`.toLowerCase().includes(q.trim().toLowerCase())) : null;
  const popular = [...members].sort((a, b) => b.likesThisWeek - a.likesThisWeek).slice(0, 4);
  const followed = [...members].sort((a, b) => b.followers - a.followers);
  const fresh = [...members].sort((a, b) => a.joined - b.joined).slice(0, 4);

  return (
    <div className="max-w-[1040px] mx-auto grid grid-cols-[minmax(0,1fr)] gap-8">
      <div className={SHELL}>
        <div className="rounded-shell bg-piece p-3 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="!text-[clamp(36px,5vw,56px)] !leading-[.95] tracking-[.02em] uppercase">Members</h1>
            <p className="m-0 mt-2 text-[12.5px] leading-[1.6] text-mid-tone">Find people who watch what you watch, and follow their reviews and lists.</p>
          </div>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search members"
            aria-label="Search members"
            className="w-[240px] max-w-full rounded-full bg-card border border-hair px-4 py-2 text-[12.5px] text-ink placeholder:text-dim focus:outline-none focus:border-accent"
          />
        </div>
      </div>

      {found ? (
        <Group title={`${found.length} found`}>
          {found.length ? <Ranked list={found} /> : <p className="m-0 rounded-shell bg-piece p-3 text-[12.5px] text-dim">Nobody by that name.</p>}
        </Group>
      ) : (
        <>
          <Group title="Popular this week">
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {popular.map((m) => (
                <div key={m.username} className="rounded-shell bg-piece p-3 grid justify-items-center text-center gap-2">
                  <Avatar m={m} size={64} />
                  <div className="min-w-0 w-full">
                    <Link href={`/u/${m.username}`} className="block text-[12.5px] font-semibold text-ink truncate no-underline hover:text-accent">
                      @{m.username}
                    </Link>
                    <div className="text-[12.5px] text-dim truncate">
                      {m.displayName} · {m.location}
                    </div>
                  </div>
                  <div className="text-[12.5px] text-mid-tone">
                    <b className="font-semibold text-ink tabular-nums">{m.likesThisWeek}</b> likes this week
                  </div>
                  <FollowPill />
                </div>
              ))}
            </div>
          </Group>

          <Group title="Most followed">
            <Ranked list={followed} numbered />
          </Group>

          <Group title="New members">
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {fresh.map((m) => (
                <Link key={m.username} href={`/u/${m.username}`} className="rounded-shell bg-piece p-3 flex items-center gap-3 no-underline text-ink hover:bg-card-hi transition-colors min-w-0">
                  <Avatar m={m} size={40} />
                  <span className="min-w-0">
                    <span className="block text-[12.5px] font-semibold truncate">@{m.username}</span>
                    <span className="block text-[12.5px] text-dim truncate">Joined {joined(m.joined)}</span>
                  </span>
                </Link>
              ))}
            </div>
          </Group>
        </>
      )}
    </div>
  );
}

/** A heading pill over a shell. */
function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="grid grid-cols-[minmax(0,1fr)] gap-2">
      <div>
        <h2 className={H}>{title}</h2>
      </div>
      <div className={SHELL}>{children}</div>
    </section>
  );
}

/** Members as rows: rank, picture, who, what they've logged, Follow. */
function Ranked({ list, numbered = false }: { list: Member[]; numbered?: boolean }) {
  return (
    <ul className="m-0 p-0 list-none rounded-shell bg-piece divide-y divide-hair">
      {list.map((m, i) => (
        <li key={m.username} className="flex items-center gap-3 p-3 min-w-0">
          {numbered && <span className="display text-[22px] leading-none w-6 text-center text-dim tabular-nums">{i + 1}</span>}
          <Avatar m={m} size={44} />
          <Link href={`/u/${m.username}`} className="min-w-0 flex-1 no-underline text-ink group">
            <span className="block text-[12.5px] font-semibold truncate group-hover:text-accent transition-colors">@{m.username}</span>
            <span className="block text-[12.5px] text-dim truncate">
              {m.displayName} · {m.location}
            </span>
          </Link>
          <span className="hidden sm:flex gap-4 text-[12.5px] text-mid-tone shrink-0">
            <span>
              <b className="font-semibold text-ink tabular-nums">{k(m.followers)}</b> followers
            </span>
            <span>
              <b className="font-semibold text-ink tabular-nums">{k(m.reviews)}</b> reviews
            </span>
            <span>
              <b className="font-semibold text-ink tabular-nums">{k(m.films + m.shows)}</b> titles
            </span>
          </span>
          <FollowPill />
        </li>
      ))}
    </ul>
  );
}

function Avatar({ m, size }: { m: Member; size: number }) {
  return (
    <span className="shrink-0 rounded-full bg-accent-fill text-on-accent flex items-center justify-center display leading-none" style={{ width: size, height: size, fontSize: size * 0.45, paddingTop: size * 0.05 }} aria-hidden>
      {m.username[0].toUpperCase()}
    </span>
  );
}

function joined(days: number) {
  if (days < 7) return "this week";
  if (days < 30) return `${Math.round(days / 7)} weeks ago`;
  if (days < 365) return `${Math.round(days / 30)} months ago`;
  return `${Math.round(days / 365)} years ago`;
}
