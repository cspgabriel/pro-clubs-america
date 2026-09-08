begin;

create table if not exists public.account_deletion_requests (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles(id) on delete set null,
  firebase_uid text not null,
  email text not null,
  status text not null default 'requested'
    check (status in ('requested', 'processing', 'completed', 'cancelled')),
  requested_at timestamptz not null default now(),
  handled_at timestamptz,
  note text
);

create unique index if not exists account_deletion_requests_open_uid_key
  on public.account_deletion_requests (firebase_uid)
  where status in ('requested', 'processing');

alter table public.account_deletion_requests enable row level security;
revoke all on public.account_deletion_requests from anon, authenticated;
grant all on public.account_deletion_requests to service_role;

comment on table public.account_deletion_requests is
  'Requests initiated by the authenticated account. Processing deletes account data and Firebase identity through the approved support procedure.';

commit;
