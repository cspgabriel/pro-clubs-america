-- E-mail marketing: consentimento (LGPD) e log de envios com dedupe.
-- Aditiva e idempotente. Acesso exclusivo do service_role.

create table if not exists public.email_consent (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  email text not null,
  transactional boolean not null default true,
  marketing boolean not null default true,
  unsubscribe_token uuid not null default gen_random_uuid(),
  unsubscribed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists email_consent_unsubscribe_token_key
  on public.email_consent (unsubscribe_token);

create table if not exists public.email_events (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles(id) on delete set null,
  email text not null,
  flow text not null,
  dedupe_key text not null,
  provider_id text,
  status text not null default 'sent' check (status in ('sent', 'failed', 'skipped')),
  error text,
  created_at timestamptz not null default now()
);

-- Garante idempotencia: o mesmo e-mail de um fluxo nunca sai duas vezes.
create unique index if not exists email_events_dedupe_key_idx
  on public.email_events (dedupe_key);
create index if not exists email_events_profile_flow_idx
  on public.email_events (profile_id, flow, created_at desc);

alter table public.email_consent enable row level security;
alter table public.email_events enable row level security;

revoke all on public.email_consent from anon, authenticated;
revoke all on public.email_events from anon, authenticated;
