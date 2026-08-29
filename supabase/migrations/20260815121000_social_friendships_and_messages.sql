-- Migration: Social Friendships and Direct Messages
begin;

create table if not exists public.friendships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  friend_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'blocked')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, friend_id)
);

create table if not exists public.direct_messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles(id) on delete cascade,
  receiver_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists friendships_user_friend_idx on public.friendships(user_id, friend_id);
create index if not exists friendships_status_idx on public.friendships(status);
create index if not exists direct_messages_conversation_idx on public.direct_messages(sender_id, receiver_id, created_at desc);

alter table public.friendships enable row level security;
alter table public.direct_messages enable row level security;

revoke all on public.friendships from anon, authenticated;
revoke all on public.direct_messages from anon, authenticated;

commit;
