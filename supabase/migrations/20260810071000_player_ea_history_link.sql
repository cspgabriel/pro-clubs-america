begin;

alter table public.profiles
  add column if not exists player_ea_url text,
  add column if not exists player_ea_linked_at timestamptz;

comment on column public.profiles.player_ea_url is
  'Public EA Clubs URL supplied by the player to link career statistics and queue match-history collection.';
comment on column public.profiles.player_ea_linked_at is
  'Most recent instant when the account confirmed its public EA player source.';

commit;
