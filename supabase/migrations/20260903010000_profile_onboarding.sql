alter table public.profiles add column if not exists onboarding_completed_at timestamptz;

-- Existing accounts keep access. New accounts must complete the two-step flow.
update public.profiles set onboarding_completed_at = now()
where onboarding_completed_at is null;

comment on column public.profiles.onboarding_completed_at is
  'Server-confirmed completion of language and existing-club selection. Not an authorization grant.';
