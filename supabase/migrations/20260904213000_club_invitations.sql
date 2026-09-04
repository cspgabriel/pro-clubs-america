begin;

create table public.club_invitations (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  inviter_profile_id uuid not null references public.profiles(id) on delete cascade,
  invitee_profile_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'declined', 'cancelled', 'expired')),
  expires_at timestamptz not null default (now() + interval '14 days'),
  responded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (inviter_profile_id <> invitee_profile_id)
);

create unique index club_invitations_pending_key
  on public.club_invitations (club_id, invitee_profile_id)
  where status = 'pending';
create index club_invitations_invitee_status_idx
  on public.club_invitations (invitee_profile_id, status, created_at desc);
create index club_invitations_club_status_idx
  on public.club_invitations (club_id, status, created_at desc);

alter table public.club_invitations enable row level security;
revoke all on public.club_invitations from anon, authenticated;
grant all on public.club_invitations to service_role;

create or replace function public.respond_club_invitation(
  p_invitation_id uuid,
  p_profile_id uuid,
  p_action text
)
returns table (invitation_id uuid, invitation_status text, club_id uuid, club_name text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invitation public.club_invitations%rowtype;
  v_profile public.profiles%rowtype;
  v_club public.clubs%rowtype;
begin
  if p_action not in ('accept', 'decline') then raise exception 'INVITATION_ACTION_INVALID'; end if;

  select * into v_invitation
  from public.club_invitations
  where id = p_invitation_id and invitee_profile_id = p_profile_id
  for update;
  if v_invitation.id is null then raise exception 'INVITATION_NOT_FOUND'; end if;
  if v_invitation.status <> 'pending' then raise exception 'INVITATION_ALREADY_RESOLVED'; end if;
  if v_invitation.expires_at <= now() then
    update public.club_invitations
    set status = 'expired', responded_at = now(), updated_at = now()
    where id = v_invitation.id;
    raise exception 'INVITATION_EXPIRED';
  end if;

  select * into v_profile from public.profiles where id = p_profile_id for update;
  select * into v_club from public.clubs where id = v_invitation.club_id;

  if p_action = 'accept' then
    if v_profile.club_id is not null and v_profile.club_id <> v_invitation.club_id then
      raise exception 'INVITEE_HAS_CLUB';
    end if;
    insert into public.club_members (club_id, profile_id, role, invited_by_profile_id)
    values (v_invitation.club_id, v_profile.id, 'player', v_invitation.inviter_profile_id)
    on conflict (profile_id) do update
      set club_id = excluded.club_id, role = 'player', invited_by_profile_id = excluded.invited_by_profile_id;
    update public.profiles
    set club_id = v_invitation.club_id,
        role = case when role = 'admin' then role else 'player' end,
        looking_for_club = false,
        updated_at = now()
    where id = v_profile.id;
    update public.club_invitations
    set status = 'accepted', responded_at = now(), updated_at = now()
    where id = v_invitation.id;
    update public.club_invitations
    set status = 'cancelled', responded_at = now(), updated_at = now()
    where invitee_profile_id = v_profile.id and status = 'pending' and id <> v_invitation.id;
  else
    update public.club_invitations
    set status = 'declined', responded_at = now(), updated_at = now()
    where id = v_invitation.id;
  end if;

  return query select v_invitation.id, case when p_action = 'accept' then 'accepted' else 'declined' end, v_club.id, v_club.name;
end;
$$;

create or replace function public.leave_community_club(p_profile_id uuid)
returns table (club_id uuid, club_name text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.profiles%rowtype;
  v_club public.clubs%rowtype;
begin
  select * into v_profile from public.profiles where id = p_profile_id for update;
  if v_profile.id is null then raise exception 'PROFILE_NOT_FOUND'; end if;
  if v_profile.club_id is null then raise exception 'PROFILE_WITHOUT_CLUB'; end if;
  if v_profile.role = 'owner' then raise exception 'OWNER_CANNOT_LEAVE'; end if;
  select * into v_club from public.clubs where id = v_profile.club_id;

  delete from public.club_members where profile_id = v_profile.id;
  update public.profiles
  set club_id = null,
      role = case when role = 'admin' then role else 'player' end,
      updated_at = now()
  where id = v_profile.id;

  return query select v_club.id, v_club.name;
end;
$$;

revoke all on function public.respond_club_invitation(uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.leave_community_club(uuid) from public, anon, authenticated;
grant execute on function public.respond_club_invitation(uuid, uuid, text) to service_role;
grant execute on function public.leave_community_club(uuid) to service_role;

comment on table public.club_invitations is
  'Targeted club roster invitations. All access goes through the Firebase-authenticated server bridge.';

commit;
