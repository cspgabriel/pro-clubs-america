begin;
alter table public.profiles
  add column nickname text check (nickname ~ '^[a-z0-9][a-z0-9-]{1,22}[a-z0-9]$'),
  add column gaming_platform text check (gaming_platform in ('ps5','xbox-series','pc','ps4','xbox-one','switch-2','switch')),
  add column preferred_position text check (preferred_position in ('GOL','ZAG','LE','LD','VOL','MC','MEI','ME','MD','PE','PD','ATA')),
  add column looking_for_club boolean not null default false;
create unique index profiles_nickname_key on public.profiles (nickname) where nickname is not null;
create index profiles_looking_for_club_idx on public.profiles (created_at desc) where looking_for_club;

create table public.profile_private_contacts (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  phone text check (phone ~ '^\+[1-9][0-9]{7,14}$'),
  updated_at timestamptz not null default now()
);
alter table public.profile_private_contacts enable row level security;
revoke all on public.profile_private_contacts from anon, authenticated;
grant all on public.profile_private_contacts to service_role;
comment on table public.profile_private_contacts is 'Private contact. Access only through the authenticated server bridge; never expose in community or market responses.';

create function public.save_profile_preferences(p_profile_id uuid, p_updates jsonb, p_write_phone boolean default false, p_phone text default null)
returns setof public.profiles language plpgsql security invoker set search_path = public as $$
begin
  return query update public.profiles set
    country_slug = coalesce(p_updates->>'country_slug', country_slug),
    country_code = coalesce(p_updates->>'country_code', country_code),
    locale = coalesce(p_updates->>'locale', locale),
    full_name = coalesce(p_updates->>'full_name', full_name),
    nickname = case when p_updates ? 'nickname' then p_updates->>'nickname' else nickname end,
    gaming_platform = case when p_updates ? 'gaming_platform' then p_updates->>'gaming_platform' else gaming_platform end,
    preferred_position = case when p_updates ? 'preferred_position' then p_updates->>'preferred_position' else preferred_position end,
    looking_for_club = coalesce((p_updates->>'looking_for_club')::boolean, looking_for_club),
    club_id = case when p_updates ? 'club_id' then (p_updates->>'club_id')::uuid else club_id end,
    role = coalesce(p_updates->>'role', role),
    onboarding_completed_at = coalesce((p_updates->>'onboarding_completed_at')::timestamptz, onboarding_completed_at),
    updated_at = now()
  where id = p_profile_id returning *;
  if not found then raise exception 'PROFILE_NOT_FOUND'; end if;
  if p_write_phone then
    insert into public.profile_private_contacts (profile_id, phone) values (p_profile_id, nullif(p_phone, ''))
    on conflict (profile_id) do update set phone = excluded.phone, updated_at = now();
  end if;
end;
$$;
revoke all on function public.save_profile_preferences(uuid,jsonb,boolean,text) from public, anon, authenticated;
grant execute on function public.save_profile_preferences(uuid,jsonb,boolean,text) to service_role;
commit;
