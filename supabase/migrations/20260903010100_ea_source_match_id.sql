alter table public.ea_match_snapshots add column if not exists source_match_id text;
create index if not exists ea_match_snapshots_source_match_idx
  on public.ea_match_snapshots(platform, source_match_id) where source_match_id is not null;
