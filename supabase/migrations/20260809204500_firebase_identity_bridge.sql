-- Firebase Auth remains the identity provider. Supabase stores application data.
-- All privileged writes must pass through the server-side Firebase token bridge.

begin;

drop policy if exists "Public Read Profiles" on public.profiles;
drop policy if exists "Users Can Update Own Profile" on public.profiles;
drop policy if exists "Captains Can Manage Clubs" on public.clubs;
drop policy if exists "Users Can Manage Market Listings" on public.market_listings;

alter table public.profiles drop constraint if exists profiles_id_fkey;
alter table public.profiles alter column id set default gen_random_uuid();
alter table public.profiles add column if not exists firebase_uid text;
alter table public.profiles add column if not exists locale varchar(10) default 'pt-br';
alter table public.profiles add column if not exists plan text default 'free'
  check (plan in ('free', 'pro', 'vip'));
alter table public.profiles add column if not exists reliability int default 100
  check (reliability between 0 and 100);
alter table public.profiles add column if not exists elo int default 1000;
create unique index if not exists profiles_firebase_uid_key
  on public.profiles(firebase_uid) where firebase_uid is not null;

create table if not exists public.match_messages (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  author_profile_id uuid not null references public.profiles(id) on delete cascade,
  author_name text not null,
  message text not null check (char_length(message) between 1 and 500),
  created_at timestamptz not null default now()
);
alter table public.match_messages enable row level security;

-- No public profile or lobby policy is intentional. The service role bypasses
-- RLS only inside the server bridge after Firebase auth and club checks.
revoke all on public.profiles from anon;
revoke all on public.match_messages from anon, authenticated;
grant select on public.clubs, public.players, public.matches, public.market_listings to anon;

comment on column public.profiles.firebase_uid is
  'Firebase UID; never accepted from an unverified client payload.';
comment on table public.match_messages is
  'Private lobby messages available only through the Firebase-authenticated server bridge.';

commit;
