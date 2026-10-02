-- The profile quote runs to three lines on the card now (2 Oct 2026): up to
-- 210 characters rather than 140.
alter table public.profiles drop constraint if exists profiles_text_lengths;
alter table public.profiles add constraint profiles_text_lengths
  check (coalesce(char_length(display_name), 0) <= 40 and coalesce(char_length(location), 0) <= 60 and coalesce(char_length(quote), 0) <= 210);
