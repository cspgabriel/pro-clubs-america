create table if not exists public.profile_showcases (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  overall smallint check (overall between 1 and 99),
  positions text[] not null default '{}',
  archetypes text[] not null default '{}',
  photo_urls jsonb not null default '[]'::jsonb check (jsonb_typeof(photo_urls) = 'array'),
  youtube_urls jsonb not null default '[]'::jsonb check (jsonb_typeof(youtube_urls) = 'array'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists profile_showcases_updated_at_idx on public.profile_showcases(updated_at desc);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('profile-showcase', 'profile-showcase', true, 4194304, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = true, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
