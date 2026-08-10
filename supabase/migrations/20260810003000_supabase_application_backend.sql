-- Supabase is the only application database. Firebase remains the identity provider.

begin;

alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in ('visitor', 'player', 'captain', 'owner', 'admin'));
alter table public.profiles alter column role set default 'visitor';

alter table public.profiles drop constraint if exists profiles_plan_check;
alter table public.profiles add constraint profiles_plan_check
  check (plan in ('free', 'pro', 'vip', 'player_pro', 'club_pro', 'club_premium'));
alter table public.profiles add column if not exists country_slug text default 'brasil';
alter table public.profiles add column if not exists club_id uuid references public.clubs(id) on delete set null;
alter table public.profiles add column if not exists stripe_customer_id text;
alter table public.profiles add column if not exists stripe_subscription_id text;
alter table public.profiles add column if not exists subscription_status text;
create index if not exists profiles_club_id_idx on public.profiles(club_id);

create table if not exists public.club_claims (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  firebase_uid text not null,
  responsible_name text not null,
  contact_email text not null,
  country_slug text not null default 'brasil',
  ea_url text not null,
  status text not null default 'pending_review'
    check (status in ('pending_review', 'approved', 'rejected')),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (profile_id, club_id)
);
alter table public.club_claims enable row level security;
revoke all on public.club_claims from anon, authenticated;
create index if not exists club_claims_status_created_idx on public.club_claims(status, created_at desc);

alter table public.matches add column if not exists creator_profile_id uuid references public.profiles(id) on delete set null;
alter table public.matches add column if not exists invited_club_id uuid references public.clubs(id) on delete set null;
alter table public.matches add column if not exists challenge_mode text default 'open'
  check (challenge_mode in ('open', 'invite'));
alter table public.matches add column if not exists region text default 'Brasil';
alter table public.matches add column if not exists host_elo int default 1000;
alter table public.matches add column if not exists away_elo int;
alter table public.matches add column if not exists featured boolean default false;
alter table public.matches add column if not exists played_at timestamptz;
alter table public.matches add column if not exists scheduled_date date;
alter table public.matches add column if not exists scheduled_time time;
alter table public.matches add column if not exists accepted_by_profile_id uuid references public.profiles(id) on delete set null;
alter table public.matches add column if not exists updated_at timestamptz not null default now();

alter table public.market_listings add column if not exists title text;
alter table public.market_listings add column if not exists owner_name text;
alter table public.market_listings add column if not exists platform text default 'common-gen5';
alter table public.market_listings add column if not exists availability text;
alter table public.market_listings add column if not exists contact text;
alter table public.market_listings add column if not exists updated_at timestamptz not null default now();

drop policy if exists "Public Read Profiles" on public.profiles;
revoke all on public.profiles from anon, authenticated;
revoke all on public.club_claims from anon, authenticated;
grant select on public.clubs, public.players, public.matches, public.market_listings, public.catalog_import_runs to anon;

comment on table public.club_claims is
  'Club-link requests created by Firebase-authenticated users through the server bridge.';

commit;
