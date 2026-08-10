begin;

alter table public.profiles
  alter column bonus_access_until set default (now() + interval '15 days');

create unique index if not exists club_claims_one_approved_club_idx
  on public.club_claims(club_id)
  where status = 'approved';

comment on column public.profiles.bonus_access_until is
  'Premium trial or referral bonus expiration. New profiles start with 15 days.';
comment on index public.club_claims_one_approved_club_idx is
  'A club can have one approved owner claim; new valid claims are approved by the server immediately.';

commit;
