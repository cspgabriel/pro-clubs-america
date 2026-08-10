begin;

alter table public.profiles add column if not exists player_id uuid references public.players(id) on delete set null;
create unique index if not exists profiles_player_id_key on public.profiles(player_id) where player_id is not null;

comment on column public.profiles.player_id is 'Official indexed EA Clubs player linked to this community account.';

commit;
