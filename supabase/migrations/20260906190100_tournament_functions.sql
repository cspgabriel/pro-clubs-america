begin;

-- ============================================================
-- CAMPEONATOS · logica transacional
-- O sorteio e montado em TypeScript (functions/_lib/tournaments.ts)
-- e chega aqui pronto: esta camada so garante atomicidade e as
-- regras que nao podem depender do cliente.
-- ============================================================

-- Quem pode falar pelo clube: dono, capitao ou admin da plataforma.
create or replace function public.can_manage_club(p_profile public.profiles, p_club_id uuid)
returns boolean
language sql
immutable
as $$
  select p_club_id is not null
     and (p_profile.role = 'admin'
       or (p_profile.club_id = p_club_id and p_profile.role in ('owner', 'captain')));
$$;

-- ------------------------------------------------------------
-- Inscricao
-- ------------------------------------------------------------

create or replace function public.register_club_in_tournament(
  p_tournament_id uuid,
  p_club_id uuid,
  p_profile_id uuid
)
returns table (registration_id uuid, registration_status text, registered_total integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tournament public.tournaments%rowtype;
  v_profile public.profiles%rowtype;
  v_club public.clubs%rowtype;
  v_existing public.tournament_registrations%rowtype;
  v_status text;
  v_id uuid;
  v_total integer;
begin
  select * into v_tournament from public.tournaments where id = p_tournament_id for update;
  if v_tournament.id is null then raise exception 'TOURNAMENT_NOT_FOUND'; end if;

  select * into v_profile from public.profiles where id = p_profile_id;
  if v_profile.id is null then raise exception 'PROFILE_NOT_FOUND'; end if;

  select * into v_club from public.clubs where id = p_club_id;
  if v_club.id is null then raise exception 'CLUB_NOT_FOUND'; end if;

  if not public.can_manage_club(v_profile, p_club_id) then
    raise exception 'NOT_CLUB_MANAGER';
  end if;

  if v_tournament.status <> 'open' then raise exception 'REGISTRATION_CLOSED'; end if;
  if now() < v_tournament.registration_opens_at then raise exception 'REGISTRATION_NOT_OPEN'; end if;
  if now() >= v_tournament.registration_closes_at then raise exception 'REGISTRATION_ENDED'; end if;

  -- 'crossplay' aceita qualquer plataforma; as demais exigem o mesmo pool.
  if v_tournament.platform <> 'crossplay' and v_club.platform <> v_tournament.platform then
    raise exception 'PLATFORM_MISMATCH';
  end if;

  select * into v_existing
  from public.tournament_registrations
  where tournament_id = p_tournament_id and club_id = p_club_id
  for update;

  if v_existing.id is not null and v_existing.status <> 'withdrawn' then
    raise exception 'ALREADY_REGISTERED';
  end if;

  -- Lotou vira fila de espera, e nao erro: a desistencia de um libera o proximo.
  v_status := case when v_tournament.registered_count >= v_tournament.max_teams
                   then 'waitlisted' else 'confirmed' end;

  if v_existing.id is not null then
    update public.tournament_registrations
    set status = v_status,
        registered_by_profile_id = p_profile_id,
        updated_at = now()
    where id = v_existing.id
    returning id into v_id;
  else
    insert into public.tournament_registrations (tournament_id, club_id, registered_by_profile_id, status)
    values (p_tournament_id, p_club_id, p_profile_id, v_status)
    returning id into v_id;
  end if;

  if v_status = 'confirmed' then
    update public.tournaments
    set registered_count = registered_count + 1, updated_at = now()
    where id = p_tournament_id
    returning registered_count into v_total;
  else
    v_total := v_tournament.registered_count;
  end if;

  registration_id := v_id;
  registration_status := v_status;
  registered_total := v_total;
  return next;
end;
$$;

-- ------------------------------------------------------------
-- Desistencia
-- ------------------------------------------------------------

create or replace function public.withdraw_club_from_tournament(
  p_tournament_id uuid,
  p_club_id uuid,
  p_profile_id uuid
)
returns table (registration_id uuid, promoted_club_id uuid, registered_total integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tournament public.tournaments%rowtype;
  v_profile public.profiles%rowtype;
  v_registration public.tournament_registrations%rowtype;
  v_next public.tournament_registrations%rowtype;
  v_total integer;
begin
  select * into v_tournament from public.tournaments where id = p_tournament_id for update;
  if v_tournament.id is null then raise exception 'TOURNAMENT_NOT_FOUND'; end if;
  if v_tournament.status not in ('open', 'closed') then raise exception 'WITHDRAW_TOO_LATE'; end if;

  select * into v_profile from public.profiles where id = p_profile_id;
  if v_profile.id is null then raise exception 'PROFILE_NOT_FOUND'; end if;
  if not public.can_manage_club(v_profile, p_club_id) then raise exception 'NOT_CLUB_MANAGER'; end if;

  select * into v_registration
  from public.tournament_registrations
  where tournament_id = p_tournament_id and club_id = p_club_id
  for update;
  if v_registration.id is null then raise exception 'REGISTRATION_NOT_FOUND'; end if;
  if v_registration.status = 'withdrawn' then raise exception 'ALREADY_WITHDRAWN'; end if;

  update public.tournament_registrations
  set status = 'withdrawn', group_label = null, seed = null, updated_at = now()
  where id = v_registration.id;

  if v_registration.status = 'confirmed' then
    -- A vaga aberta promove o primeiro da fila, na ordem em que entrou.
    select * into v_next
    from public.tournament_registrations
    where tournament_id = p_tournament_id and status = 'waitlisted'
    order by created_at asc
    limit 1
    for update;

    if v_next.id is not null then
      update public.tournament_registrations
      set status = 'confirmed', updated_at = now()
      where id = v_next.id;
      promoted_club_id := v_next.club_id;
    else
      update public.tournaments
      set registered_count = greatest(registered_count - 1, 0), updated_at = now()
      where id = p_tournament_id;
    end if;
  end if;

  select t.registered_count into v_total from public.tournaments t where t.id = p_tournament_id;
  registration_id := v_registration.id;
  registered_total := v_total;
  return next;
end;
$$;

-- ------------------------------------------------------------
-- Aprovacao de proposta feita por dono de clube
-- ------------------------------------------------------------

create or replace function public.review_tournament(
  p_tournament_id uuid,
  p_admin_profile_id uuid,
  p_action text,
  p_note text default null
)
returns table (reviewed_id uuid, reviewed_status text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tournament public.tournaments%rowtype;
  v_admin public.profiles%rowtype;
  v_status text;
begin
  if p_action not in ('approve', 'reject') then raise exception 'REVIEW_ACTION_INVALID'; end if;

  select * into v_admin from public.profiles where id = p_admin_profile_id;
  if v_admin.id is null or v_admin.role <> 'admin' then raise exception 'NOT_ADMIN'; end if;

  select * into v_tournament from public.tournaments where id = p_tournament_id for update;
  if v_tournament.id is null then raise exception 'TOURNAMENT_NOT_FOUND'; end if;
  if v_tournament.status <> 'pending_approval' then raise exception 'TOURNAMENT_NOT_PENDING'; end if;

  v_status := case when p_action = 'approve' then 'open' else 'rejected' end;

  update public.tournaments
  set status = v_status,
      approved_by_profile_id = p_admin_profile_id,
      approved_at = case when p_action = 'approve' then now() else null end,
      review_note = p_note,
      updated_at = now()
  where id = p_tournament_id;

  reviewed_id := p_tournament_id;
  reviewed_status := v_status;
  return next;
end;
$$;

-- ------------------------------------------------------------
-- Sorteio · o payload chega pronto do TypeScript
-- ------------------------------------------------------------

create or replace function public.apply_tournament_draw(
  p_tournament_id uuid,
  p_payload jsonb
)
returns table (drawn_id uuid, match_count integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tournament public.tournaments%rowtype;
  v_group jsonb;
  v_match jsonb;
  v_count integer := 0;
begin
  select * into v_tournament from public.tournaments where id = p_tournament_id for update;
  if v_tournament.id is null then raise exception 'TOURNAMENT_NOT_FOUND'; end if;
  if v_tournament.status not in ('open', 'closed') then raise exception 'DRAW_NOT_ALLOWED'; end if;

  -- Um sorteio refeito apaga o anterior por inteiro. Nao existe
  -- sorteio parcial: meia chave e pior do que chave nenhuma.
  delete from public.tournament_matches m where m.tournament_id = p_tournament_id;

  update public.tournament_registrations r
  set group_label = null, seed = null, points = 0, played = 0, wins = 0, draws = 0,
      losses = 0, goals_for = 0, goals_against = 0, eliminated_at = null,
      final_position = null, updated_at = now()
  where r.tournament_id = p_tournament_id;

  for v_group in select * from jsonb_array_elements(coalesce(p_payload->'groups', '[]'::jsonb))
  loop
    update public.tournament_registrations r
    set group_label = nullif(v_group->>'groupLabel', ''),
        seed = (v_group->>'seed')::integer,
        updated_at = now()
    where r.id = (v_group->>'registrationId')::uuid
      and r.tournament_id = p_tournament_id;
  end loop;

  -- Passo 1: grava os confrontos sem os vinculos de progressao,
  -- porque next_match_id aponta para linhas desta mesma insercao.
  for v_match in select * from jsonb_array_elements(coalesce(p_payload->'matches', '[]'::jsonb))
  loop
    insert into public.tournament_matches (
      id, tournament_id, stage, round, group_label, slot,
      home_registration_id, away_registration_id, home_club_id, away_club_id,
      status, scheduled_at
    )
    select
      (v_match->>'id')::uuid,
      p_tournament_id,
      v_match->>'stage',
      coalesce((v_match->>'round')::integer, 1),
      nullif(v_match->>'groupLabel', ''),
      coalesce((v_match->>'slot')::integer, 0),
      nullif(v_match->>'homeRegistrationId', '')::uuid,
      nullif(v_match->>'awayRegistrationId', '')::uuid,
      (select r.club_id from public.tournament_registrations r where r.id = nullif(v_match->>'homeRegistrationId', '')::uuid),
      (select r.club_id from public.tournament_registrations r where r.id = nullif(v_match->>'awayRegistrationId', '')::uuid),
      'scheduled',
      nullif(v_match->>'scheduledAt', '')::timestamptz;
    v_count := v_count + 1;
  end loop;

  -- Passo 2: agora que todas existem, liga a arvore.
  for v_match in select * from jsonb_array_elements(coalesce(p_payload->'matches', '[]'::jsonb))
  loop
    update public.tournament_matches m
    set next_match_id = nullif(v_match->>'nextMatchId', '')::uuid,
        next_slot = nullif(v_match->>'nextSlot', ''),
        loser_next_match_id = nullif(v_match->>'loserNextMatchId', '')::uuid,
        loser_next_slot = nullif(v_match->>'loserNextSlot', ''),
        updated_at = now()
    where m.id = (v_match->>'id')::uuid;
  end loop;

  update public.tournaments
  set status = 'drawn',
      drawn_at = now(),
      drawn_format = p_payload->'drawnFormat',
      updated_at = now()
  where id = p_tournament_id;

  drawn_id := p_tournament_id;
  match_count := v_count;
  return next;
end;
$$;

-- ------------------------------------------------------------
-- Classificacao · recalculada do zero a cada resultado
-- ------------------------------------------------------------

create or replace function public.recalc_tournament_standings(p_tournament_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Recalcular tudo custa uma varredura de dezenas de linhas e
  -- elimina a classe inteira de bugs de placar corrigido.
  update public.tournament_registrations r
  set points = 0, played = 0, wins = 0, draws = 0, losses = 0,
      goals_for = 0, goals_against = 0, updated_at = now()
  where r.tournament_id = p_tournament_id;

  with played_rows as (
    select m.home_registration_id as reg, m.home_score as gf, m.away_score as ga
    from public.tournament_matches m
    where m.tournament_id = p_tournament_id
      and m.stage in ('group', 'league')
      and m.status = 'completed'
      and m.home_registration_id is not null
    union all
    select m.away_registration_id, m.away_score, m.home_score
    from public.tournament_matches m
    where m.tournament_id = p_tournament_id
      and m.stage in ('group', 'league')
      and m.status = 'completed'
      and m.away_registration_id is not null
  ), totals as (
    select reg,
           count(*)::int as played,
           sum(case when gf > ga then 1 else 0 end)::int as wins,
           sum(case when gf = ga then 1 else 0 end)::int as draws,
           sum(case when gf < ga then 1 else 0 end)::int as losses,
           sum(gf)::int as goals_for,
           sum(ga)::int as goals_against
    from played_rows
    group by reg
  )
  update public.tournament_registrations r
  set played = t.played,
      wins = t.wins,
      draws = t.draws,
      losses = t.losses,
      goals_for = t.goals_for,
      goals_against = t.goals_against,
      points = t.wins * 3 + t.draws,
      updated_at = now()
  from totals t
  where r.id = t.reg;
end;
$$;

-- ------------------------------------------------------------
-- Resultado
-- ------------------------------------------------------------

create or replace function public.report_tournament_match(
  p_match_id uuid,
  p_profile_id uuid,
  p_home_score integer,
  p_away_score integer,
  p_home_penalties integer default null,
  p_away_penalties integer default null
)
returns table (reported_id uuid, reported_status text, winner_id uuid, tournament_state text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_match public.tournament_matches%rowtype;
  v_tournament public.tournaments%rowtype;
  v_profile public.profiles%rowtype;
  v_is_knockout boolean;
  v_winner uuid;
  v_loser uuid;
  v_next_status text;
begin
  select * into v_match from public.tournament_matches where id = p_match_id for update;
  if v_match.id is null then raise exception 'MATCH_NOT_FOUND'; end if;

  select * into v_tournament from public.tournaments where id = v_match.tournament_id for update;
  if v_tournament.status not in ('drawn', 'running') then raise exception 'TOURNAMENT_NOT_RUNNING'; end if;

  select * into v_profile from public.profiles where id = p_profile_id;
  if v_profile.id is null then raise exception 'PROFILE_NOT_FOUND'; end if;

  if not (public.can_manage_club(v_profile, v_match.home_club_id)
       or public.can_manage_club(v_profile, v_match.away_club_id)) then
    raise exception 'NOT_MATCH_PARTICIPANT';
  end if;

  -- Placar ja lancado so muda por admin: a correcao existe, mas nao
  -- fica na mao de quem perdeu.
  if v_match.status = 'completed' and v_profile.role <> 'admin' then
    raise exception 'RESULT_ALREADY_REPORTED';
  end if;
  if v_match.home_registration_id is null or v_match.away_registration_id is null then
    raise exception 'MATCH_NOT_READY';
  end if;
  if p_home_score is null or p_away_score is null or p_home_score < 0 or p_away_score < 0 then
    raise exception 'SCORE_INVALID';
  end if;

  v_is_knockout := v_match.stage not in ('group', 'league');

  if v_is_knockout and p_home_score = p_away_score then
    -- Mata-mata nao termina empatado: sem penaltis nao ha quem avancar.
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
      status = 'completed',
      winner_registration_id = v_winner,
      reported_by_profile_id = p_profile_id,
      reported_at = now(),
      updated_at = now()
  where id = p_match_id;

  if v_tournament.status = 'drawn' then
    update public.tournaments
    set status = 'running', started_at = coalesce(started_at, now()), updated_at = now()
    where id = v_tournament.id;
    v_next_status := 'running';
  else
    v_next_status := v_tournament.status;
  end if;

  if not v_is_knockout then
    perform public.recalc_tournament_standings(v_tournament.id);
  else
    -- Progressao: o vencedor ocupa o lado reservado no proximo confronto.
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

    -- O perdedor da semi cai na disputa de terceiro, quando ela existe.
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
      v_next_status := 'finished';
    elsif v_match.stage = 'third_place' then
      update public.tournament_registrations set final_position = 3, updated_at = now() where id = v_winner;
      update public.tournament_registrations set final_position = 4, updated_at = now() where id = v_loser;
    end if;
  end if;

  reported_id := p_match_id;
  reported_status := 'completed';
  winner_id := v_winner;
  tournament_state := v_next_status;
  return next;
end;
$$;

-- ------------------------------------------------------------
-- Grupos -> mata-mata
-- Quem classificou e conta de ordenacao, feita no TypeScript com o
-- criterio de desempate da edicao. Aqui so pousa o resultado.
-- ------------------------------------------------------------

create or replace function public.seed_tournament_knockout(
  p_tournament_id uuid,
  p_payload jsonb
)
returns table (seeded_id uuid, seeded_count integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tournament public.tournaments%rowtype;
  v_slot jsonb;
  v_count integer := 0;
begin
  select * into v_tournament from public.tournaments where id = p_tournament_id for update;
  if v_tournament.id is null then raise exception 'TOURNAMENT_NOT_FOUND'; end if;
  if v_tournament.status not in ('drawn', 'running') then raise exception 'TOURNAMENT_NOT_RUNNING'; end if;

  -- Semear duas vezes reescreveria uma chave ja em disputa.
  if exists (
    select 1 from public.tournament_matches m
    where m.tournament_id = p_tournament_id
      and m.stage not in ('group', 'league')
      and m.status = 'completed'
  ) then
    raise exception 'KNOCKOUT_ALREADY_STARTED';
  end if;

  if exists (
    select 1 from public.tournament_matches m
    where m.tournament_id = p_tournament_id
      and m.stage = 'group'
      and m.status <> 'completed'
  ) then
    raise exception 'GROUP_STAGE_UNFINISHED';
  end if;

  for v_slot in select * from jsonb_array_elements(coalesce(p_payload->'slots', '[]'::jsonb))
  loop
    if v_slot->>'side' = 'home' then
      update public.tournament_matches m
      set home_registration_id = (v_slot->>'registrationId')::uuid,
          home_club_id = (select r.club_id from public.tournament_registrations r where r.id = (v_slot->>'registrationId')::uuid),
          updated_at = now()
      where m.id = (v_slot->>'matchId')::uuid and m.tournament_id = p_tournament_id;
    else
      update public.tournament_matches m
      set away_registration_id = (v_slot->>'registrationId')::uuid,
          away_club_id = (select r.club_id from public.tournament_registrations r where r.id = (v_slot->>'registrationId')::uuid),
          updated_at = now()
      where m.id = (v_slot->>'matchId')::uuid and m.tournament_id = p_tournament_id;
    end if;
    v_count := v_count + 1;
  end loop;

  -- Quem jogou a fase de grupos e nao aparece na chave esta eliminado.
  update public.tournament_registrations r
  set eliminated_at = now(), updated_at = now()
  where r.tournament_id = p_tournament_id
    and r.status = 'confirmed'
    and r.group_label is not null
    and r.eliminated_at is null
    and r.id not in (
      select (s->>'registrationId')::uuid
      from jsonb_array_elements(coalesce(p_payload->'slots', '[]'::jsonb)) s
    );

  seeded_id := p_tournament_id;
  seeded_count := v_count;
  return next;
end;
$$;

-- ------------------------------------------------------------

revoke all on function public.seed_tournament_knockout(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.seed_tournament_knockout(uuid, jsonb) to service_role;

revoke all on function public.can_manage_club(public.profiles, uuid) from public, anon, authenticated;
revoke all on function public.register_club_in_tournament(uuid, uuid, uuid) from public, anon, authenticated;
revoke all on function public.withdraw_club_from_tournament(uuid, uuid, uuid) from public, anon, authenticated;
revoke all on function public.review_tournament(uuid, uuid, text, text) from public, anon, authenticated;
revoke all on function public.apply_tournament_draw(uuid, jsonb) from public, anon, authenticated;
revoke all on function public.recalc_tournament_standings(uuid) from public, anon, authenticated;
revoke all on function public.report_tournament_match(uuid, uuid, integer, integer, integer, integer) from public, anon, authenticated;

grant execute on function public.can_manage_club(public.profiles, uuid) to service_role;
grant execute on function public.register_club_in_tournament(uuid, uuid, uuid) to service_role;
grant execute on function public.withdraw_club_from_tournament(uuid, uuid, uuid) to service_role;
grant execute on function public.review_tournament(uuid, uuid, text, text) to service_role;
grant execute on function public.apply_tournament_draw(uuid, jsonb) to service_role;
grant execute on function public.recalc_tournament_standings(uuid) to service_role;
grant execute on function public.report_tournament_match(uuid, uuid, integer, integer, integer, integer) to service_role;

commit;
