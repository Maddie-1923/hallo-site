-- Which band of the banner survives the crop, 0 (top) to 100 (bottom).
-- A TMDB backdrop is 16:9 and the banner is 4:1, so most of the picture's
-- height is thrown away either way; this is who decides which part goes.
-- 40 rather than 50: on a wide crop of a 16:9 frame, slightly above centre
-- is where faces sit.
alter table public.profiles
  add column if not exists banner_focus smallint not null default 40
  check (banner_focus between 0 and 100);
