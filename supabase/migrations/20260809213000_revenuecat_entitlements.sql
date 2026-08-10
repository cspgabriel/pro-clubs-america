-- RevenueCat is the source of truth for paid access. Firebase UID is used as
-- RevenueCat app_user_id; payment secrets and webhooks remain server-side.

begin;

create table if not exists public.subscription_entitlements (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  revenuecat_customer_id text not null,
  entitlement_id text not null check (entitlement_id in ('player_pro', 'club_pro', 'club_premium')),
  product_id text,
  store text not null check (store in ('stripe', 'app_store', 'play_store', 'promotional', 'unknown')),
  status text not null default 'active' check (status in ('active', 'grace_period', 'billing_issue', 'expired', 'cancelled')),
  purchased_at timestamptz,
  expires_at timestamptz,
  last_event_id text,
  updated_at timestamptz not null default now(),
  unique (profile_id, entitlement_id)
);

create table if not exists public.revenuecat_webhook_events (
  event_id text primary key,
  event_type text not null,
  app_user_id text not null,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  processing_error text
);

alter table public.subscription_entitlements enable row level security;
alter table public.revenuecat_webhook_events enable row level security;
revoke all on public.subscription_entitlements from anon, authenticated;
revoke all on public.revenuecat_webhook_events from anon, authenticated;

comment on table public.subscription_entitlements is
  'Server-maintained cache of RevenueCat entitlements; never toggled directly by the client.';
comment on table public.revenuecat_webhook_events is
  'Idempotency ledger for authenticated RevenueCat webhook events.';

commit;
