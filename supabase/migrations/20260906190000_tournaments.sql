begin;

-- ============================================================
-- CAMPEONATOS
-- Inspirado no modelo do GGClubs: edicoes com ciclo de vida
-- explicito, formato configuravel por edicao e sorteio elastico.
-- Todo acesso passa pela ponte Firebase -> service_role.
-- ============================================================

create table public.tournaments (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null check (char_length(trim(name)) between 2 and 40),
  summary text check (char_length(summary) <= 240),
  rules text check (char_length(rules) <= 8000),
  banner_url text,
  crest_url text,

  -- Plataforma/pool. Mesmo dominio de public.clubs, mais 'crossplay'.
  platform text not null default 'common-gen5'
    check (platform in ('common-gen5', 'common-gen4', 'nx', 'crossplay')),
  country_code varchar(5) not null default 'BR',

  -- Formato configuravel por edicao. A validacao rica vive em
  -- functions/_lib/tournaments.ts; aqui fica so o discriminante.
  format_kind text not null default 'groups_knockout'
    check (format_kind in ('groups_knockout', 'knockout', 'league')),
  format jsonb not null default '{}'::jsonb,

  status text not null default 'draft'
    check (status in ('draft','pending_approval','rejected','open','closed','drawn','running','finished','cancelled')),

  -- Entrada gratuita hoje; a coluna existe para nao exigir migration
  -- quando a cobranca entrar. Nenhum checkout le isso ainda.
  price_cents integer not null default 0 check (price_cents >= 0),
  prize_cents jsonb not null default '{"first":0,"second":0,"third":0}'::jsonb,

  max_teams integer not null default 32 check (max_teams between 2 and 128),
  registered_count integer not null default 0 check (registered_count >= 0),

  organizer_profile_id uuid not null references public.profiles(id) on delete restrict,
  organizer_club_id uuid references public.clubs(id) on delete set null,
  created_by_admin boolean not null default false,
  approved_by_profile_id uuid references public.profiles(id) on delete set null,
  approved_at timestamptz,
  review_note text,

  registration_opens_at timestamptz not null,
  registration_closes_at timestamptz not null,
  draw_at timestamptz,
  starts_at timestamptz not null,

  drawn_at timestamptz,
  started_at timestamptz,
  finished_at timestamptz,
  cancelled_at timestamptz,
  -- O degrau da escada efetivamente sorteado (slots, grupos, classificados).
  drawn_format jsonb,
  champion_club_id uuid references public.clubs(id) on delete set null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  check (registration_closes_at > registration_opens_at),
  check (starts_at >= registration_closes_at)
);

create index tournaments_status_starts_idx on public.tournaments (status, starts_at desc);
create index tournaments_organizer_idx on public.tournaments (organizer_profile_id, created_at desc);
create index tournaments_platform_idx on public.tournaments (platform, country_code, status);

-- ------------------------------------------------------------

create table public.tournament_registrations (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  club_id uuid not null references public.clubs(id) on delete cascade,
  registered_by_profile_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'confirmed'
    check (status in ('confirmed','waitlisted','withdrawn','disqualified')),
  seed integer,
  group_label text,
  -- Classificacao da fase de grupos / liga. Recalculada a cada resultado.
  points integer not null default 0,
  played integer not null default 0,
  wins integer not null default 0,
  draws integer not null default 0,
  losses integer not null default 0,
  goals_for integer not null default 0,
  goals_against integer not null default 0,
  eliminated_at timestamptz,
  final_position integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tournament_id, club_id)
);

create index tournament_registrations_tournament_idx
  on public.tournament_registrations (tournament_id, status, group_label, points desc);
create index tournament_registrations_club_idx
  on public.tournament_registrations (club_id, created_at desc);

-- ------------------------------------------------------------

create table public.tournament_matches (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  stage text not null
    check (stage in ('group','league','round_of_64','round_of_32','round_of_16','quarter','semi','third_place','final')),
  round integer not null default 1,
  group_label text,
  -- Posicao na chave: identifica o confronto dentro do stage e alimenta a progressao.
  slot integer not null default 0,
  home_registration_id uuid references public.tournament_registrations(id) on delete set null,
  away_registration_id uuid references public.tournament_registrations(id) on delete set null,
  home_club_id uuid references public.clubs(id) on delete set null,
  away_club_id uuid references public.clubs(id) on delete set null,
  home_score integer check (home_score >= 0),
  away_score integer check (away_score >= 0),
  -- Mata-mata nao aceita empate. Os penaltis so sao lidos quando os
  -- gols empatam e o stage nao e de grupo/liga.
  home_penalties integer check (home_penalties >= 0),
  away_penalties integer check (away_penalties >= 0),
  status text not null default 'scheduled'
    check (status in ('scheduled','awaiting_result','completed','walkover','cancelled')),
  winner_registration_id uuid references public.tournament_registrations(id) on delete set null,
  -- Para onde o vencedor avanca. Nulo na final e nos jogos de grupo.
  next_match_id uuid references public.tournament_matches(id) on delete set null,
  next_slot text check (next_slot in ('home','away')),
  loser_next_match_id uuid references public.tournament_matches(id) on delete set null,
  loser_next_slot text check (loser_next_slot in ('home','away')),
  ea_match_id text,
  reported_by_profile_id uuid references public.profiles(id) on delete set null,
  scheduled_at timestamptz,
  reported_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (home_registration_id is null or home_registration_id <> away_registration_id)
);

create index tournament_matches_tournament_idx
  on public.tournament_matches (tournament_id, stage, round, slot);
create index tournament_matches_club_idx
  on public.tournament_matches (home_club_id, away_club_id, status);

-- ------------------------------------------------------------
-- RLS: nada de acesso direto. Tudo pelo bridge autenticado.
-- ------------------------------------------------------------

alter table public.tournaments enable row level security;
alter table public.tournament_registrations enable row level security;
alter table public.tournament_matches enable row level security;

revoke all on public.tournaments from anon, authenticated;
revoke all on public.tournament_registrations from anon, authenticated;
revoke all on public.tournament_matches from anon, authenticated;

grant all on public.tournaments to service_role;
grant all on public.tournament_registrations to service_role;
grant all on public.tournament_matches to service_role;

comment on table public.tournaments is
  'Edicoes de campeonato da comunidade. Formato configuravel por edicao; propostas de donos de clube nascem em pending_approval.';
comment on column public.tournaments.price_cents is
  'Inscricao paga ainda nao implementada. Coluna existe para a segunda fase; hoje toda edicao vale 0.';
comment on column public.tournaments.drawn_format is
  'O degrau da escada elastica escolhido no sorteio, congelado para a tela nao recalcular.';

commit;
