-- A GIF on a reply or comment, 12 Oct 2026 (docs/gif-plan.md).
--
-- One GIF a comment, from KLIPY, kept as KLIPY's own addresses and nothing
-- else: their terms forbid copying or caching the media, so this holds the
-- slug and the URLs they returned, and the picture always loads from them.
-- { slug, title, url, still, width, height }.
--
-- A comment may now be a GIF with no words: the body may be empty when there
-- is a GIF, and still has to say something when there isn't. Writes still go
-- only through the site's writeComment (service key, after the word filter,
-- which reads the GIF's title too, and a check of the slug against KLIPY).

alter table public.comments add column if not exists gif jsonb;

alter table public.comments drop constraint if exists comments_body_check;
alter table public.comments add constraint comments_body_check
  check (char_length(body) <= 1000 and (char_length(btrim(body)) >= 1 or gif is not null));

alter table public.comments drop constraint if exists comments_gif_shape;
alter table public.comments add constraint comments_gif_shape
  check (gif is null or (jsonb_typeof(gif) = 'object' and gif ? 'slug' and gif ? 'url'
                         and gif ->> 'url' ~ '^https://static[0-9]*\.klipy\.com/'));
