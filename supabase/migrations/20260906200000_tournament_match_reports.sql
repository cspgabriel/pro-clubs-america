begin;

-- ============================================================
-- SUMULA BILATERAL
--
-- Ate aqui o primeiro capitao que lancasse o placar o definia, e o
-- adversario nao tinha como contestar. Num ambiente competitivo isso e
-- explorave: quem perde tem incentivo para lancar antes e mentir.
--
-- A partir daqui **cada clube lanca a sua sumula**. Placares iguais
-- confirmam o resultado sozinhos, sem ninguem no meio. Placares
-- diferentes abrem disputa, e so a organizacao decide — com
-- justificativa obrigatoria, que fica gravada.
--
-- Segue a pesquisa de produto de 04/09/2026
-- (docs/changes/20260904-public-landing/tournaments-research.md).
-- ============================================================

-- 'disputed' e um estado novo do confronto: tem os dois placares, e
-- eles nao batem.
alter table public.tournament_matches
  drop constraint if exists tournament_matches_status_check;
alter table public.tournament_matches
  add constraint tournament_matches_status_check
  check (status in ('scheduled','awaiting_result','disputed','completed','walkover','cancelled'));

alter table public.tournament_matches
  -- De onde veio o placar que esta valendo. 'agreed' e o caminho feliz:
  -- os dois capitaes disseram a mesma coisa e ninguem precisou arbitrar.
  add column if not exists result_source text
    check (result_source in ('agreed','organizer','walkover')),
  add column if not exists disputed_at timestamptz,
  add column if not exists resolved_by_profile_id uuid references public.profiles(id) on delete set null,
  add column if not exists resolution_note text;

comment on column public.tournament_matches.result_source is
  'agreed = as duas sumulas bateram; organizer = a organizacao arbitrou; walkover = W.O.';

-- ------------------------------------------------------------

create table public.tournament_match_reports (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.tournament_matches(id) on delete cascade,
  registration_id uuid not null references public.tournament_registrations(id) on delete cascade,
  club_id uuid not null references public.clubs(id) on delete cascade,
  reported_by_profile_id uuid not null references public.profiles(id) on delete cascade,
  -- Sempre na perspectiva do confronto (mandante x visitante), nunca na
  -- de quem esta lancando · e o que permite comparar as duas sumulas
  -- sem inverter nada.
  home_score integer not null check (home_score between 0 and 99),
  away_score integer not null check (away_score between 0 and 99),
  home_penalties integer check (home_penalties between 0 and 99),
  away_penalties integer check (away_penalties between 0 and 99),
  evidence_url text,
  note text check (char_length(note) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Um clube tem uma sumula por confronto. Reenviar corrige a propria.
  unique (match_id, registration_id)
);

create index tournament_match_reports_match_idx
  on public.tournament_match_reports (match_id, created_at desc);

alter table public.tournament_match_reports enable row level security;
revoke all on public.tournament_match_reports from anon, authenticated;
grant all on public.tournament_match_reports to service_role;

comment on table public.tournament_match_reports is
  'Sumula de cada clube. Duas iguais confirmam o resultado; divergentes abrem disputa.';

-- ------------------------------------------------------------
-- Nucleo compartilhado: grava o placar, atualiza a tabela e faz a
-- progressao. Chamado tanto pelo acordo automatico quanto pela
-- arbitragem da organizacao, para os dois caminhos nunca divergirem.
-- ------------------------------------------------------------

create or replace function public.apply_tournament_match_result(
  p_match_id uuid,
  p_home_score integer,
  p_away_score integer,
  p_home_penalties integer,
  p_away_penalties integer,
  p_source text,
  p_actor_profile_id uuid,
  p_note text default null
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_match public.tournament_matches%rowtype;
  v_tournament public.tournaments%rowtype;
  v_is_knockout boolean;
  v_winner uuid;
  v_loser uuid;
  v_status text;
begin
  select * into v_match from public.tournament_matches where id = p_match_id for update;
  if v_match.id is null then raise exception 'MATCH_NOT_FOUND'; end if;
  if v_match.home_registration_id is null or v_match.away_registration_id is null then
    raise exception 'MATCH_NOT_READY';
  end if;

  select * into v_tournament from public.tournaments where id = v_match.tournament_id for update;
  if v_tournament.status not in ('drawn', 'running') then raise exception 'TOURNAMENT_NOT_RUNNING'; end if;

  if p_home_score is null or p_away_score is null or p_home_score < 0 or p_away_score < 0 then
    raise exception 'SCORE_INVALID';
  end if;

  v_is_knockout := v_match.stage not in ('group', 'league');

  if v_is_knockout and p_home_score = p_away_score then
    if p_home_penalties is null or p_away_penalties is null or p_home_penalties = p_away_penalties then
      raise exception 'KNOCKOUT_NEEDS_PENALTIES';
    end if;
  end if;

  if v_is_knockout then
    if p_home_score > p_away_score
       or (p_home_score = p_away_score and p_home_penalties > p_away_penalties) then
      v_winner := v_match.home_registration_id;
      v_loser := v_match.away_registration_id;
    else
      v_winner := v_match.away_registration_id;
      v_loser := v_match.home_registration_id;
    end if;
  end if;

  update public.tournament_matches
  set home_score = p_home_score,
      away_score = p_away_score,
      home_penalties = case when v_is_knockout then p_home_penalties else null end,
      away_penalties = case when v_is_knockout then p_away_penalties else null end,
      status = case when p_source = 'walkover' then 'walkover' else 'completed' end,
      result_source = p_source,
      winner_registration_id = v_winner,
      disputed_at = null,
      resolved_by_profile_id = case when p_source = 'agreed' then null else p_actor_profile_id end,
      resolution_note = p_note,
      reported_by_profile_id = coalesce(reported_by_profile_id, p_actor_profile_id),
      reported_at = now(),
      updated_at = now()
  where id = p_match_id;

  if v_tournament.status = 'drawn' then
    update public.tournaments
    set status = 'running', started_at = coalesce(started_at, now()), updated_at = now()
    where id = v_tournament.id;
    v_status := 'running';
  else
    v_status := v_tournament.status;
  end if;

  if not v_is_knockout then
    perform public.recalc_tournament_standings(v_tournament.id);
    return v_status;
  end if;

  -- Progressao do mata-mata.
  if v_match.next_match_id is not null then
    if v_match.next_slot = 'home' then
      update public.tournament_matches
      set home_registration_id = v_winner,
          home_club_id = (select r.club_id from public.tournament_registrations r where r.id = v_winner),
          updated_at = now()
      where id = v_match.next_match_id;
    else
      update public.tournament_matches
      set away_registration_id = v_winner,
          away_club_id = (select r.club_id from public.tournament_registrations r where r.id = v_winner),
          updated_at = now()
      where id = v_match.next_match_id;
    end if;
  end if;

  if v_match.loser_next_match_id is not null then
    if v_match.loser_next_slot = 'home' then
      update public.tournament_matches
      set home_registration_id = v_loser,
          home_club_id = (select r.club_id from public.tournament_registrations r where r.id = v_loser),
          updated_at = now()
      where id = v_match.loser_next_match_id;
    else
      update public.tournament_matches
      set away_registration_id = v_loser,
          away_club_id = (select r.club_id from public.tournament_registrations r where r.id = v_loser),
          updated_at = now()
      where id = v_match.loser_next_match_id;
    end if;
  else
    update public.tournament_registrations
    set eliminated_at = now(), updated_at = now()
    where id = v_loser and eliminated_at is null;
  end if;

  if v_match.stage = 'final' then
    update public.tournament_registrations set final_position = 1, updated_at = now() where id = v_winner;
    update public.tournament_registrations set final_position = 2, updated_at = now() where id = v_loser;
    update public.tournaments
    set status = 'finished',
        finished_at = now(),
        champion_club_id = (select r.club_id from public.tournament_registrations r where r.id = v_winner),
        updated_at = now()
    where id = v_tournament.id;
    v_status := 'finished';
  elsif v_match.stage = 'third_place' then
    update public.tournament_registrations set final_position = 3, updated_at = now() where id = v_winner;
    update public.tournament_registrations set final_position = 4, updated_at = now() where id = v_loser;
  end if;

  return v_status;
end;
$$;

-- ------------------------------------------------------------
-- O capitao lanca a sua sumula
-- ------------------------------------------------------------

create or replace function public.submit_tournament_match_report(
  p_match_id uuid,
  p_profile_id uuid,
  p_home_score integer,
  p_away_score integer,
  p_home_penalties integer default null,
  p_away_penalties integer default null,
  p_evidence_url text default null,
  p_note text default null
)
returns table (report_id uuid, match_state text, agreed boolean, tournament_state text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_match public.tournament_matches%rowtype;
  v_profile public.profiles%rowtype;
  v_registration uuid;
  v_club uuid;
  v_other public.tournament_match_reports%rowtype;
  v_id uuid;
  v_state text;
  v_tournament_state text;
begin
  select * into v_match from public.tournament_matches where id = p_match_id for update;
  if v_match.id is null then raise exception 'MATCH_NOT_FOUND'; end if;
  if v_match.home_registration_id is null or v_match.away_registration_id is null then
    raise exception 'MATCH_NOT_READY';
  end if;

  select * into v_profile from public.profiles where id = p_profile_id;
  if v_profile.id is null then raise exception 'PROFILE_NOT_FOUND'; end if;

  -- Qual dos dois lados esta falando. Admin nao lanca sumula por
  -- ninguem: para corrigir existe resolve_tournament_match.
  if v_profile.club_id = v_match.home_club_id and v_profile.role in ('owner','captain') then
    v_registration := v_match.home_registration_id;
    v_club := v_match.home_club_id;
  elsif v_profile.club_id = v_match.away_club_id and v_profile.role in ('owner','captain') then
    v_registration := v_match.away_registration_id;
    v_club := v_match.away_club_id;
  else
    raise exception 'NOT_MATCH_PARTICIPANT';
  end if;

  -- Resultado ja fechado nao volta pela sumula; volta pela arbitragem.
  if v_match.status in ('completed','walkover','cancelled') then
    raise exception 'RESULT_ALREADY_CLOSED';
  end if;

  if p_home_score is null or p_away_score is null
     or p_home_score < 0 or p_away_score < 0 or p_home_score > 99 or p_away_score > 99 then
    raise exception 'SCORE_INVALID';
  end if;

  if v_match.stage not in ('group','league') and p_home_score = p_away_score then
    if p_home_penalties is null or p_away_penalties is null or p_home_penalties = p_away_penalties then
      raise exception 'KNOCKOUT_NEEDS_PENALTIES';
    end if;
  end if;

  insert into public.tournament_match_reports (
    match_id, registration_id, club_id, reported_by_profile_id,
    home_score, away_score, home_penalties, away_penalties, evidence_url, note
  )
  values (
    p_match_id, v_registration, v_club, p_profile_id,
    p_home_score, p_away_score, p_home_penalties, p_away_penalties,
    nullif(trim(coalesce(p_evidence_url, '')), ''),
    nullif(trim(coalesce(p_note, '')), '')
  )
  on conflict (match_id, registration_id) do update
    set home_score = excluded.home_score,
        away_score = excluded.away_score,
        home_penalties = excluded.home_penalties,
        away_penalties = excluded.away_penalties,
        evidence_url = excluded.evidence_url,
        note = excluded.note,
        reported_by_profile_id = excluded.reported_by_profile_id,
        updated_at = now()
  returning id into v_id;

  -- A sumula do outro lado.
  select * into v_other
  from public.tournament_match_reports
  where match_id = p_match_id and registration_id <> v_registration
  limit 1;

  if v_other.id is null then
    update public.tournament_matches
    set status = 'awaiting_result', disputed_at = null, updated_at = now()
    where id = p_match_id;
    report_id := v_id;
    match_state := 'awaiting_result';
    agreed := false;
    tournament_state := null;
    return next;
    return;
  end if;

  if v_other.home_score = p_home_score
     and v_other.away_score = p_away_score
     and coalesce(v_other.home_penalties, -1) = coalesce(p_home_penalties, -1)
     and coalesce(v_other.away_penalties, -1) = coalesce(p_away_penalties, -1) then
    -- Os dois disseram a mesma coisa. Ninguem precisa arbitrar.
    v_tournament_state := public.apply_tournament_match_result(
      p_match_id, p_home_score, p_away_score, p_home_penalties, p_away_penalties,
      'agreed', p_profile_id, null
    );
    v_state := 'completed';
    agreed := true;
  else
    update public.tournament_matches
    set status = 'disputed',
        disputed_at = coalesce(disputed_at, now()),
        updated_at = now()
    where id = p_match_id;
    v_state := 'disputed';
    agreed := false;
  end if;

  report_id := v_id;
  match_state := v_state;
  tournament_state := v_tournament_state;
  return next;
end;
$$;

-- ------------------------------------------------------------
-- A organizacao arbitra
-- ------------------------------------------------------------

create or replace function public.resolve_tournament_match(
  p_match_id uuid,
  p_profile_id uuid,
  p_home_score integer,
  p_away_score integer,
  p_home_penalties integer default null,
  p_away_penalties integer default null,
  p_note text default null,
  p_walkover boolean default false
)
returns table (resolved_match_id uuid, resolved_state text, tournament_state text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_match public.tournament_matches%rowtype;
  v_profile public.profiles%rowtype;
  v_tournament public.tournaments%rowtype;
  v_note text;
  v_state text;
begin
  select * into v_match from public.tournament_matches where id = p_match_id;
  if v_match.id is null then raise exception 'MATCH_NOT_FOUND'; end if;

  select * into v_tournament from public.tournaments where id = v_match.tournament_id;
  select * into v_profile from public.profiles where id = p_profile_id;
  if v_profile.id is null then raise exception 'PROFILE_NOT_FOUND'; end if;

  if not (v_profile.role = 'admin' or v_profile.id = v_tournament.organizer_profile_id) then
    raise exception 'NOT_TOURNAMENT_ORGANIZER';
  end if;

  -- Justificativa obrigatoria: decisao de arbitro sem motivo escrito e o
  -- que transforma disputa de placar em disputa de confianca.
  v_note := nullif(trim(coalesce(p_note, '')), '');
  if v_note is null or char_length(v_note) < 5 then raise exception 'RESOLUTION_NOTE_REQUIRED'; end if;

  v_state := public.apply_tournament_match_result(
    p_match_id, p_home_score, p_away_score, p_home_penalties, p_away_penalties,
    case when p_walkover then 'walkover' else 'organizer' end,
    p_profile_id, left(v_note, 500)
  );

  resolved_match_id := p_match_id;
  resolved_state := case when p_walkover then 'walkover' else 'completed' end;
  tournament_state := v_state;
  return next;
end;
$$;

-- ------------------------------------------------------------
-- O modelo unilateral sai de cena.
-- ------------------------------------------------------------

drop function if exists public.report_tournament_match(uuid, uuid, integer, integer, integer, integer);

revoke all on function public.apply_tournament_match_result(uuid, integer, integer, integer, integer, text, uuid, text) from public, anon, authenticated;
revoke all on function public.submit_tournament_match_report(uuid, uuid, integer, integer, integer, integer, text, text) from public, anon, authenticated;
revoke all on function public.resolve_tournament_match(uuid, uuid, integer, integer, integer, integer, text, boolean) from public, anon, authenticated;

grant execute on function public.apply_tournament_match_result(uuid, integer, integer, integer, integer, text, uuid, text) to service_role;
grant execute on function public.submit_tournament_match_report(uuid, uuid, integer, integer, integer, integer, text, text) to service_role;
grant execute on function public.resolve_tournament_match(uuid, uuid, integer, integer, integer, integer, text, boolean) to service_role;

commit;
