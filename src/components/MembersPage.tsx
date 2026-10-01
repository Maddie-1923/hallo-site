"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { searchMembers } from "@/lib/member-directory";
import type { Member } from "@/lib/member-directory";
import { useSafety } from "@/lib/safety";
import { FollowPill } from "./FollowPill";
import { CommunitySwitch } from "./CommunitySwitch";

// Members, as the plan has it: the popular reviewers this week, the most
// followed, and new members, with a search over them all. Each person is
// their initial on the accent (their own picture with accounts), their
// handle, name and place, what they've logged, and Follow.
const SHELL = "rounded-shell bg-card p-2 border-[0.5px] border-t-[color:var(--lit-edge)] border-x-piece border-b-well shadow-[0_4px_9px_rgba(0,0,0,.35)]";
const H = "inline-flex items-center h-[2.8333rem] px-4 rounded-full bg-piece ![font-family:var(--font-body)] !font-bold !text-[0.875rem] !leading-none !tracking-[.12em] uppercase text-ink";

const k = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1).replace(/\.0$/, "")}K` : String(n));

// `live`: real members, where search asks the server (it also finds private
// members by name) and Follow saves.
export function MembersPage({ members: everyone, live = false }: { members: Member[]; live?: boolean }) {
  // Nobody you've blocked.
  const { blocked } = useSafety();
  const members = everyone.filter((m) => !blocked.includes(m.username) && m.follow !== "self");
  const [q, setQ] = useState("");
  const [searched, setSearched] = useState<{ q: string; list: Member[] } | null>(null);
  useEffect(() => {
    const text = q.trim();
    if (!live || text.length < 2) return;
    const t = setTimeout(async () => {
      const r = await searchMembers(text).catch(() => null);
      if (r) setSearched({ q: text, list: r });
    }, 300);
    return () => clearTimeout(t);
  }, [q, live]);
  const local = q.trim() ? members.filter((m) => `${m.username} ${m.displayName} ${m.location}`.toLowerCase().includes(q.trim().toLowerCase())) : null;
  const found = !q.trim() ? null : live ? (searched?.q === q.trim() ? searched.list.filter((m) => !blocked.includes(m.username)) : (local ?? [])) : local;
  // Popular this week only counts anyone with a like this week; with few
  // members the page says so rather than ranking zeroes.
  const popular = [...members].filter((m) => m.likesThisWeek > 0).sort((a, b) => b.likesThisWeek - a.likesThisWeek).slice(0, 4);
  const followed = [...members].sort((a, b) => b.followers - a.followers).slice(0, 25);
  const fresh = [...members].sort((a, b) => a.joined - b.joined).slice(0, 4);

  return (
    <div className="max-w-[86.6667rem] mx-auto grid grid-cols-[minmax(0,1fr)] gap-8">
      <div className={SHELL}>
        <div className="rounded-shell bg-piece p-3 flex flex-wrap items-end justify-between gap-3">
          <div>
            <CommunitySwitch on="members" />
            <h1 className="!text-[clamp(36px,5vw,56px)] !leading-[.95] tracking-[.02em] uppercase">Members</h1>
            <p className="m-0 mt-2 text-[1.0417rem] leading-[1.6] text-mid-tone">Find people who love what you love.</p>
          </div>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search members"
            aria-label="Search members"
            className="w-[20rem] max-w-full rounded-full bg-card border border-hair px-4 py-2 text-[1.0417rem] text-ink placeholder:text-dim focus:outline-none focus:border-accent"
          />
        </div>
      </div>

      {found ? (
        <Group title={`${found.length} found`}>
          {found.length ? <Ranked list={found} stats={!live} /> : <p className="m-0 rounded-shell bg-piece p-3 text-[1.0417rem] text-dim">Nobody by that name.</p>}
        </Group>
      ) : (
        <>
          <Group title="Popular this week">
            {popular.length === 0 && <p className="m-0 rounded-shell bg-piece p-3 text-[1.0417rem] text-dim">Nobody&apos;s reviews or lists have been liked this week yet.</p>}
            <div className={`grid gap-2 sm:grid-cols-2 lg:grid-cols-4 ${popular.length ? "" : "hidden"}`}>
              {popular.map((m) => (
                <div key={m.username} className="rounded-shell bg-piece p-3 grid justify-items-center text-center gap-2">
                  <Hand m={m} />
                  <div className="min-w-0 w-full">
                    <Link href={`/u/${m.username}`} className="block text-[1.0417rem] font-semibold text-ink truncate no-underline hover:text-accent">
                      @{m.username}
                    </Link>
                    <div className="text-[1.0417rem] text-dim truncate">{[m.displayName, m.location].filter(Boolean).join(" · ")}</div>
                  </div>
                  <div className="text-[1.0417rem] text-mid-tone">
                    <b className="font-semibold text-ink tabular-nums">{m.likesThisWeek}</b> likes this week
                  </div>
                  <FollowPill username={m.username} state={m.follow} />
                </div>
              ))}
            </div>
          </Group>

          <Group title="Most followed">
            <Ranked list={followed} numbered />
          </Group>

          <Group title="New members">
            {fresh.length === 0 && <p className="m-0 rounded-shell bg-piece p-3 text-[1.0417rem] text-dim">No members yet.</p>}
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {fresh.map((m) => (
                <Link key={m.username} href={`/u/${m.username}`} className="rounded-shell bg-piece p-3 flex items-center gap-3 no-underline text-ink hover:bg-card-hi transition-colors min-w-0">
                  <Avatar m={m} size={40} />
                  <span className="min-w-0">
                    <span className="block text-[1.0417rem] font-semibold truncate">@{m.username}</span>
                    <span className="block text-[1.0417rem] text-dim truncate">Joined {joined(m.joined)}</span>
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
// `stats`: false for live search results, which don't carry the counts.
function Ranked({ list, numbered = false, stats = true }: { list: Member[]; numbered?: boolean; stats?: boolean }) {
  return (
    <ul className="m-0 p-0 list-none rounded-shell bg-piece divide-y divide-hair">
      {list.map((m, i) => (
        <li key={m.username} className="flex items-center gap-3 p-3 min-w-0">
          {numbered && <span className="display text-[1.8333rem] leading-none w-6 text-center text-dim tabular-nums">{i + 1}</span>}
          <Avatar m={m} size={44} />
          <Link href={`/u/${m.username}`} className="min-w-0 flex-1 no-underline text-ink group">
            <span className="block text-[1.0417rem] font-semibold truncate group-hover:text-accent transition-colors">@{m.username}</span>
            <span className="block text-[1.0417rem] text-dim truncate">{[m.displayName, m.location, m.isPrivate ? "Private profile" : ""].filter(Boolean).join(" · ")}</span>
          </Link>
          <span className={`${stats && !m.isPrivate ? "sm:flex" : ""} hidden gap-4 text-[1.0417rem] text-mid-tone shrink-0`}>
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
          <FollowPill username={m.username} state={m.follow} />
        </li>
      ))}
    </ul>
  );
}

/** Their favourites fanned like a hand of cards, the best in the middle and
    raised, their picture in front at the foot of the fan. With fewer than
    three rated, the hand holds what there is; with none, the picture alone. */
function Hand({ m }: { m: Member }) {
  const cards = m.favourites ?? [];
  if (!cards.length) return <Avatar m={m} size={64} />;
  // Best in the middle: second on the left, third on the right.
  const order = [cards[1], cards[0], cards[2]];
  const place = [
    { x: -42, y: 10, r: -13, z: 1 },
    { x: 0, y: 0, r: 0, z: 2 },
    { x: 42, y: 10, r: 13, z: 1 },
  ];
  return (
    <div className="relative w-[12.5rem] h-[10.5rem]" aria-hidden>
      {order.map((src, i) =>
        src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={i}
            src={src}
            alt=""
            className="absolute left-1/2 top-0 w-[5.5rem] aspect-[2/3] rounded-[8px] object-cover border border-hair shadow-[0_4px_12px_rgba(0,0,0,.3)]"
            style={{ transform: `translateX(calc(-50% + ${place[i].x}px)) translateY(${place[i].y}px) rotate(${place[i].r}deg)`, zIndex: place[i].z }}
          />
        ) : null,
      )}
      <span className="absolute left-1/2 bottom-0 -translate-x-1/2 z-[3] rounded-full border-[3px] border-[color:var(--piece)]">
        <Avatar m={m} size={56} />
      </span>
    </div>
  );
}

function Avatar({ m, size }: { m: Member; size: number }) {
  return (
    <span className="shrink-0 rounded-full overflow-hidden bg-accent-fill text-on-accent flex items-center justify-center display leading-none" style={{ width: size, height: size, fontSize: size * 0.45, paddingTop: m.avatar ? 0 : size * 0.05 }} aria-hidden>
      {m.avatar ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={m.avatar} alt="" className="w-full h-full object-cover object-top" />
      ) : (
        m.username[0].toUpperCase()
      )}
    </span>
  );
}

function joined(days: number) {
  if (days < 7) return "this week";
  if (days < 30) return `${Math.round(days / 7)} weeks ago`;
  if (days < 365) return `${Math.round(days / 30)} months ago`;
  return `${Math.round(days / 365)} years ago`;
}
