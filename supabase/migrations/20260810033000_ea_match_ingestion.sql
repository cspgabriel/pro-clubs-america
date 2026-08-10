begin;

create table if not exists public.ea_crawl_runs (
  id uuid primary key default gen_random_uuid(),
  source text not null default 'ea-public-clubs',
  parser_version text not null,
  status text not null default 'running'
    check (status in ('running', 'succeeded', 'partial', 'failed', 'blocked')),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  clubs_processed integer not null default 0 check (clubs_processed >= 0),
  players_observed integer not null default 0 check (players_observed >= 0),
  matches_observed integer not null default 0 check (matches_observed >= 0),
  error_count integer not null default 0 check (error_count >= 0),
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.ea_match_snapshots (
  id uuid primary key default gen_random_uuid(),
  source_fingerprint text not null unique,
  platform text not null check (platform in ('common-gen5', 'common-gen4', 'nx')),
  mode text not null check (mode in ('leagueMatch', 'friendlyMatch', 'playoffMatch')),
  played_at timestamptz not null,
  home_ea_club_id text not null,
  home_club_id uuid references public.clubs(id) on delete set null,
  home_club_name text not null,
  away_ea_club_id text not null,
  away_club_id uuid references public.clubs(id) on delete set null,
  away_club_name text not null,
  home_score integer not null check (home_score between 0 and 99),
  away_score integer not null check (away_score between 0 and 99),
  competition text not null default 'EA Clubs',
  source_url text not null,
  players jsonb not null default '[]'::jsonb,
  parser_version text not null,
  ingest_run_id uuid references public.ea_crawl_runs(id) on delete set null,
  observed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ea_match_snapshots_played_idx
  on public.ea_match_snapshots(played_at desc);
create index if not exists ea_match_snapshots_clubs_mode_idx
  on public.ea_match_snapshots(home_club_id, away_club_id, mode, played_at desc);

create table if not exists public.ea_crawl_queue (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null unique references public.clubs(id) on delete cascade,
  priority integer not null default 10,
  status text not null default 'queued'
    check (status in ('queued', 'running', 'succeeded', 'failed', 'blocked')),
  next_run_at timestamptz not null default now(),
  last_attempt_at timestamptz,
  last_success_at timestamptz,
  attempts integer not null default 0,
  last_error text,
  updated_at timestamptz not null default now()
);

create table if not exists public.ea_source_submissions (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  submitted_by_profile_id uuid not null references public.profiles(id) on delete cascade,
  club_id uuid not null references public.clubs(id) on delete cascade,
  ea_url text not null,
  ea_club_id text not null,
  platform text not null check (platform in ('common-gen5', 'common-gen4', 'nx')),
  status text not null default 'queued'
    check (status in ('queued', 'processing', 'matched', 'invalid', 'blocked')),
  snapshot_id uuid references public.ea_match_snapshots(id) on delete set null,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (match_id, ea_url)
);

insert into public.ea_crawl_queue (club_id, priority)
select id, case when verified then 20 else 10 end
from public.clubs
on conflict (club_id) do nothing;

create or replace function public.reconcile_ea_friendly(p_snapshot_id uuid)
returns table (matched_match_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  snapshot public.ea_match_snapshots%rowtype;
  candidate public.matches%rowtype;
begin
  select * into snapshot
  from public.ea_match_snapshots
  where id = p_snapshot_id and mode = 'friendlyMatch';

  if snapshot.id is null or snapshot.home_club_id is null or snapshot.away_club_id is null then
    return query select null::uuid;
    return;
  end if;

  select * into candidate
  from public.matches
  where status = 'waiting_ea_verification'
    and (
      (home_club_id = snapshot.home_club_id and away_club_id = snapshot.away_club_id)
      or
      (home_club_id = snapshot.away_club_id and away_club_id = snapshot.home_club_id)
    )
    and scheduled_at between snapshot.played_at - interval '36 hours'
                         and snapshot.played_at + interval '36 hours'
  order by abs(extract(epoch from (scheduled_at - snapshot.played_at))) asc
  for update skip locked
  limit 1;

  if candidate.id is null then
    return query select null::uuid;
    return;
  end if;

  update public.matches
  set status = 'completed',
      home_score = case when candidate.home_club_id = snapshot.home_club_id then snapshot.home_score else snapshot.away_score end,
      away_score = case when candidate.home_club_id = snapshot.home_club_id then snapshot.away_score else snapshot.home_score end,
      ea_match_id = snapshot.source_fingerprint,
      played_at = snapshot.played_at,
      confirmed_at = now(),
      updated_at = now()
  where id = candidate.id;

  return query select candidate.id;
end;
$$;

alter table public.ea_crawl_runs enable row level security;
alter table public.ea_match_snapshots enable row level security;
alter table public.ea_crawl_queue enable row level security;
alter table public.ea_source_submissions enable row level security;
revoke all on public.ea_crawl_runs, public.ea_match_snapshots, public.ea_crawl_queue, public.ea_source_submissions from anon, authenticated;
revoke all on function public.reconcile_ea_friendly(uuid) from public, anon, authenticated;
grant execute on function public.reconcile_ea_friendly(uuid) to service_role;

comment on table public.ea_match_snapshots is
  'Normalized observations from an authorized public-source collector. Friendly rows may confirm a waiting community match.';
comment on function public.reconcile_ea_friendly(uuid) is
  'Matches a public EA friendly to one waiting challenge by both clubs and a bounded time window; manual scores remain impossible.';

commit;
