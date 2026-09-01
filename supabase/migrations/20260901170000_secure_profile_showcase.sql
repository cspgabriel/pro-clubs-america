alter table public.profile_showcases enable row level security;
revoke all on public.profile_showcases from anon, authenticated;
