-- The profile quote goes from 210 characters to 1,000.
--
-- It has a box of its own across the profile, clamped to three lines that open
-- on a tap, in the app and on the site alike, so a long quote no longer has to
-- fit a card. 1,000 is a ceiling against pasting a script, not a size anybody
-- is meant to aim at; the app shows no counter. Display name and location keep
-- their limits.
alter table public.profiles drop constraint profiles_text_lengths;
alter table public.profiles add constraint profiles_text_lengths check (
  coalesce(char_length(display_name), 0) <= 40
  and coalesce(char_length(location), 0) <= 60
  and coalesce(char_length(quote), 0) <= 1000
);
