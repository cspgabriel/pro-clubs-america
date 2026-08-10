begin;

-- Remove the single noon placeholder imported before the crawler captured the
-- authoritative timestamp and full player payload for this same result.
delete from public.ea_match_snapshots
where id = '42e933b3-76dc-4e10-857f-6781e3a0d823'
  and home_ea_club_id = '171630'
  and away_club_name = 'Tropa'
  and home_score = 7
  and away_score = 3
  and jsonb_array_length(players) = 0;

commit;
