begin;

create table if not exists public.community_safety_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_profile_id uuid not null references public.profiles(id) on delete cascade,
  target_profile_id uuid not null references public.profiles(id) on delete cascade,
  reason text not null check (reason in ('abuse', 'offensive_content', 'spam', 'other')),
  status text not null default 'open' check (status in ('open', 'reviewing', 'resolved', 'dismissed')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  moderator_note text,
  check (reporter_profile_id <> target_profile_id)
);

create index if not exists community_safety_reports_target_open_idx
  on public.community_safety_reports (target_profile_id, created_at desc)
  where status in ('open', 'reviewing');

create table if not exists public.community_profile_blocks (
  blocker_profile_id uuid not null references public.profiles(id) on delete cascade,
  blocked_profile_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_profile_id, blocked_profile_id),
  check (blocker_profile_id <> blocked_profile_id)
);

alter table public.community_safety_reports enable row level security;
alter table public.community_profile_blocks enable row level security;
revoke all on public.community_safety_reports from anon, authenticated;
revoke all on public.community_profile_blocks from anon, authenticated;
grant all on public.community_safety_reports to service_role;
grant all on public.community_profile_blocks to service_role;

comment on table public.community_safety_reports is
  'Reports submitted from public community profiles for moderator review.';
comment on table public.community_profile_blocks is
  'One-way profile blocks that prevent new friendship requests.';

commit;
