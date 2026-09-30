-- Members' ratings of a title, summed up for its page (docs/social-plan.md),
-- 30 Sep 2026: the average out of 10, how many rated it, how many loved it,
-- and how the ratings spread over 1–10 (a half point counts with the whole
-- above it). Runs as the reader, so only what they may see is counted; a
-- private profile's entries aren't in public_entries at all.
create index if not exists public_entries_rated on public.public_entries (kind, tmdb_id) where rating is not null;

create or replace function public.title_ratings(p_kind text, p_id integer)
returns table (average numeric, ratings integer, loved integer, spread integer[])
language sql stable security invoker set search_path = '' as $$
  select
    round(avg(e.rating), 1),
    count(e.rating)::integer,
    count(*) filter (where e.reaction = 'loved')::integer,
    array(select count(x.rating)::integer from generate_series(1, 10) as b(n)
          left join public.public_entries x on x.kind = p_kind and x.tmdb_id = p_id and ceil(x.rating) = b.n
          group by b.n order by b.n)
  from public.public_entries e
  where e.kind = p_kind and e.tmdb_id = p_id;
$$;
grant execute on function public.title_ratings(text, integer) to anon, authenticated;
