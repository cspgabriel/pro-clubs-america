-- Referral links grant 15 bonus days to the inviting member and their club.
begin;

alter table public.profiles add column if not exists referral_code text;
alter table public.profiles add column if not exists referred_by_profile_id uuid references public.profiles(id) on delete set null;
alter table public.profiles add column if not exists bonus_access_until timestamptz;
create unique index if not exists profiles_referral_code_key on public.profiles(referral_code) where referral_code is not null;

alter table public.clubs add column if not exists bonus_access_until timestamptz;

create table if not exists public.club_members (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  profile_id uuid not null unique references public.profiles(id) on delete cascade,
  role text not null default 'player' check (role in ('player', 'captain', 'owner')),
  invited_by_profile_id uuid references public.profiles(id) on delete set null,
  joined_at timestamptz not null default now(),
  unique (club_id, profile_id)
);

create table if not exists public.club_referrals (
  id uuid primary key default gen_random_uuid(),
  inviter_profile_id uuid not null references public.profiles(id) on delete cascade,
  invitee_profile_id uuid not null unique references public.profiles(id) on delete cascade,
  club_id uuid not null references public.clubs(id) on delete cascade,
  bonus_days int not null default 15 check (bonus_days = 15),
  credited_at timestamptz not null default now(),
  unique (inviter_profile_id, invitee_profile_id)
);

create table if not exists public.market_applications (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.market_listings(id) on delete cascade,
  applicant_profile_id uuid not null references public.profiles(id) on delete cascade,
  message text,
  contact text,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (listing_id, applicant_profile_id)
);

alter table public.club_members enable row level security;
alter table public.club_referrals enable row level security;
alter table public.market_applications enable row level security;
revoke all on public.club_members, public.club_referrals, public.market_applications from anon, authenticated;

create or replace function public.redeem_club_referral(p_invitee_uid text, p_code text)
returns table (club_id uuid, club_name text, bonus_days int, inviter_bonus_until timestamptz, club_bonus_until timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invitee public.profiles%rowtype;
  v_inviter public.profiles%rowtype;
  v_club public.clubs%rowtype;
  v_inviter_until timestamptz;
  v_club_until timestamptz;
begin
  select * into v_invitee from public.profiles where firebase_uid = p_invitee_uid for update;
  select * into v_inviter from public.profiles where referral_code = upper(trim(p_code)) for update;
  if v_invitee.id is null or v_inviter.id is null then raise exception 'REFERRAL_INVALID'; end if;
  if v_invitee.id = v_inviter.id then raise exception 'REFERRAL_SELF'; end if;
  if v_inviter.club_id is null then raise exception 'REFERRAL_INVITER_WITHOUT_CLUB'; end if;
  if v_invitee.referred_by_profile_id is not null or exists(select 1 from public.club_referrals where invitee_profile_id = v_invitee.id) then raise exception 'REFERRAL_ALREADY_USED'; end if;
  if v_invitee.club_id is not null and v_invitee.club_id <> v_inviter.club_id then raise exception 'REFERRAL_INVITEE_HAS_CLUB'; end if;
  select * into v_club from public.clubs where id = v_inviter.club_id for update;

  insert into public.club_referrals(inviter_profile_id, invitee_profile_id, club_id)
  values(v_inviter.id, v_invitee.id, v_club.id);
  insert into public.club_members(club_id, profile_id, role, invited_by_profile_id)
  values(v_club.id, v_invitee.id, 'player', v_inviter.id)
  on conflict(profile_id) do update set club_id=excluded.club_id, role='player', invited_by_profile_id=excluded.invited_by_profile_id;

  v_inviter_until := greatest(coalesce(v_inviter.bonus_access_until, now()), now()) + interval '15 days';
  v_club_until := greatest(coalesce(v_club.bonus_access_until, now()), now()) + interval '15 days';
  update public.profiles set bonus_access_until=v_inviter_until, updated_at=now() where id=v_inviter.id;
  update public.profiles set club_id=v_club.id, role='player', referred_by_profile_id=v_inviter.id, updated_at=now() where id=v_invitee.id;
  update public.clubs set bonus_access_until=v_club_until, updated_at=now() where id=v_club.id;

  return query select v_club.id, v_club.name, 15, v_inviter_until, v_club_until;
end;
$$;

revoke all on function public.redeem_club_referral(text, text) from public, anon, authenticated;

commit;
