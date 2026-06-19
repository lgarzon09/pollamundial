-- ============================================================
-- POLLA MUNDIAL 2026 — Esquema de base de datos
-- Aplicar este archivo en Supabase: SQL Editor → New query → pegar → Run
-- ============================================================

-- ---------- Extensiones ----------
create extension if not exists "pgcrypto";

-- ---------- Tipos ----------
do $$ begin
  create type match_stage as enum ('group', 'r32', 'r16', 'qf', 'sf', 'third_place', 'final');
exception when duplicate_object then null; end $$;

-- ---------- Tabla: groups (12 grupos A-L) ----------
create table if not exists public.groups (
  code text primary key check (code ~ '^[A-L]$'),
  name text not null
);

-- ---------- Tabla: teams (48 selecciones) ----------
create table if not exists public.teams (
  id text primary key,                          -- ej. 'ARG', 'BRA', 'MEX'
  name text not null,
  flag_emoji text,
  confederation text,                           -- CONMEBOL, UEFA, etc.
  group_code text references public.groups(code) on delete set null
);

-- ---------- Tabla: matches (104 partidos) ----------
create table if not exists public.matches (
  id int primary key,                           -- número de partido 1..104
  stage match_stage not null,
  group_code text references public.groups(code) on delete set null,
  home_team_id text references public.teams(id),
  away_team_id text references public.teams(id),
  home_placeholder text,                        -- ej. '1° Grupo A' (cuando aún no se conoce el equipo)
  away_placeholder text,
  kickoff_at timestamptz not null,
  venue text,
  city text,
  country text,
  -- Avance automático del ganador a la siguiente fase
  winner_to_match_id int references public.matches(id) deferrable initially deferred,
  winner_to_slot text check (winner_to_slot in ('home', 'away')),
  -- Avance del perdedor (sólo semifinales → tercer puesto)
  loser_to_match_id int references public.matches(id) deferrable initially deferred,
  loser_to_slot text check (loser_to_slot in ('home', 'away')),
  -- score_multiplier según la etapa (solo aplica a marcador exacto)
  score_multiplier numeric generated always as (
    case stage
      when 'group' then 1.0
      when 'r32' then 1.5
      when 'r16' then 2.0
      when 'qf' then 2.5
      when 'sf' then 3.0
      when 'third_place' then 3.0
      when 'final' then 4.0
    end
  ) stored,
  is_knockout boolean generated always as (stage <> 'group') stored
);
create index if not exists matches_kickoff_at_idx on public.matches (kickoff_at);

-- ---------- Tabla: match_results (cargados por admin) ----------
create table if not exists public.match_results (
  match_id int primary key references public.matches(id) on delete cascade,
  home_score_90 int not null check (home_score_90 >= 0),
  away_score_90 int not null check (away_score_90 >= 0),
  went_to_extra_time boolean not null default false,
  went_to_penalties boolean not null default false,
  winner_team_id text references public.teams(id), -- requerido si is_knockout
  is_finalized boolean not null default false,
  finalized_at timestamptz,
  updated_at timestamptz not null default now()
);

-- ---------- Trigger: propagar ganador/perdedor a la siguiente ronda ----------
create or replace function public.propagate_match_winner()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  m record;
  winner_id text;
  loser_id text;
begin
  if not NEW.is_finalized then return NEW; end if;

  select * into m from public.matches where id = NEW.match_id;
  if m.stage = 'group' then return NEW; end if; -- fase de grupos no propaga 1:1

  -- Determinar ganador y perdedor
  if NEW.went_to_extra_time or NEW.went_to_penalties then
    -- En partidos que se decidieron en alargue/penales, winner_team_id es fuente de verdad
    winner_id := NEW.winner_team_id;
    loser_id := case
      when m.home_team_id = NEW.winner_team_id then m.away_team_id
      when m.away_team_id = NEW.winner_team_id then m.home_team_id
    end;
  elsif NEW.home_score_90 > NEW.away_score_90 then
    winner_id := m.home_team_id;
    loser_id := m.away_team_id;
  elsif NEW.away_score_90 > NEW.home_score_90 then
    winner_id := m.away_team_id;
    loser_id := m.home_team_id;
  else
    -- empate en KO sin alargue: estado inconsistente, no propagar
    return NEW;
  end if;

  -- Propagar ganador al slot correspondiente del próximo partido
  if m.winner_to_match_id is not null and winner_id is not null then
    if m.winner_to_slot = 'home' then
      update public.matches set home_team_id = winner_id, home_placeholder = null
        where id = m.winner_to_match_id;
    elsif m.winner_to_slot = 'away' then
      update public.matches set away_team_id = winner_id, away_placeholder = null
        where id = m.winner_to_match_id;
    end if;
  end if;

  -- Propagar perdedor (sólo semis → tercer puesto)
  if m.loser_to_match_id is not null and loser_id is not null then
    if m.loser_to_slot = 'home' then
      update public.matches set home_team_id = loser_id, home_placeholder = null
        where id = m.loser_to_match_id;
    elsif m.loser_to_slot = 'away' then
      update public.matches set away_team_id = loser_id, away_placeholder = null
        where id = m.loser_to_match_id;
    end if;
  end if;

  return NEW;
end;
$$;

drop trigger if exists on_match_result_finalized on public.match_results;
create trigger on_match_result_finalized
  after insert or update on public.match_results
  for each row execute function public.propagate_match_winner();

-- ---------- Tabla: profiles (extiende auth.users) ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text not null,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

-- Trigger: crear profile cuando se crea un usuario en auth.users
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  admin_emails text[] := string_to_array(
    coalesce(current_setting('app.admin_email', true), 'dgarzonf@unal.edu.co'),
    ','
  );
begin
  insert into public.profiles (id, email, display_name, is_admin)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    new.email = any(admin_emails)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- Tabla: match_predictions ----------
create table if not exists public.match_predictions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  match_id int not null references public.matches(id) on delete cascade,
  home_score_90 int not null check (home_score_90 >= 0),
  away_score_90 int not null check (away_score_90 >= 0),
  predicted_blowout boolean not null default false,
  blowout_team_id text references public.teams(id),
  -- En KO: si el marcador a 90 min predicho es empate, el usuario elige ganador KO explícitamente.
  -- Si no es empate, el ganador KO predicho se deriva del equipo con más goles (no requiere este campo).
  ko_winner_team_id text references public.teams(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, match_id),
  -- Si predijo goleada, el equipo de goleada debe ser local o visitante del partido
  -- (se valida en aplicación; constraint suave)
  check (
    (predicted_blowout = false and blowout_team_id is null) or
    (predicted_blowout = true and blowout_team_id is not null)
  )
);
create index if not exists match_predictions_match_idx on public.match_predictions(match_id);
create index if not exists match_predictions_user_idx on public.match_predictions(user_id);

-- ---------- Tabla: bracket_predictions (esquema inicial, 1 por usuario) ----------
create table if not exists public.bracket_predictions (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  -- group_positions: { "A": ["ARG","MEX","KSA","POL"], "B": [...] } posiciones 1..4
  group_positions jsonb not null default '{}'::jsonb,
  -- r32_third_place_assignments: { "<match_id>": "team_id" }
  -- Qué equipo de 3° lugar de los grupos candidatos va a cada slot R32 que dice "3° X/Y/Z/W/V"
  r32_third_place_assignments jsonb not null default '{}'::jsonb,
  -- r32_winners: { "<match_id>": "ARG", ... }
  r32_winners jsonb not null default '{}'::jsonb,
  r16_winners jsonb not null default '{}'::jsonb,
  qf_winners jsonb not null default '{}'::jsonb,
  sf_winners jsonb not null default '{}'::jsonb,
  -- finalists: ["ARG","BRA"]
  finalists jsonb not null default '[]'::jsonb,
  champion text references public.teams(id),
  top_scorer text,             -- nombre libre del jugador
  golden_ball text,
  golden_glove text,
  young_player text,
  revelation_team text references public.teams(id),
  submitted_at timestamptz,    -- cuando submits, queda lock
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- Tabla: tournament_results (premios oficiales, 1 fila) ----------
create table if not exists public.tournament_results (
  id int primary key default 1 check (id = 1),
  top_scorer text,
  golden_ball text,
  golden_glove text,
  young_player text,
  revelation_team text references public.teams(id),
  is_finalized boolean not null default false,
  updated_at timestamptz not null default now()
);

-- ---------- Tabla: bracket_results (resultado OFICIAL de la predicción general) ----------
-- Espeja bracket_predictions pero representa la realidad. La carga el admin.
create table if not exists public.bracket_results (
  id int primary key default 1 check (id = 1),
  group_positions jsonb not null default '{}'::jsonb,
  r32_third_place_assignments jsonb not null default '{}'::jsonb,
  r32_winners jsonb not null default '{}'::jsonb,
  r16_winners jsonb not null default '{}'::jsonb,
  qf_winners jsonb not null default '{}'::jsonb,
  sf_winners jsonb not null default '{}'::jsonb,
  finalists jsonb not null default '[]'::jsonb,
  champion text references public.teams(id),
  is_finalized boolean not null default false,
  updated_at timestamptz not null default now()
);

-- ---------- Tabla: settings (singleton) ----------
create table if not exists public.settings (
  id int primary key default 1 check (id = 1),
  tournament_name text not null default 'Polla Mundial 2026',
  tournament_start_at timestamptz not null,
  match_prediction_cutoff_minutes int not null default 10,
  updated_at timestamptz not null default now()
);

-- ---------- Helpers ----------
-- Devuelve si el partido m ya está bloqueado para predecir (kickoff - cutoff_minutes <= now())
create or replace function public.match_is_locked(m_id int)
returns boolean
language sql stable
as $$
  select (m.kickoff_at - (s.match_prediction_cutoff_minutes || ' minutes')::interval) <= now()
  from public.matches m, public.settings s where m.id = m_id and s.id = 1;
$$;

create or replace function public.bracket_is_locked()
returns boolean
language sql stable
as $$
  select tournament_start_at <= now() from public.settings where id = 1;
$$;

create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false);
$$;

-- ---------- Row Level Security ----------
alter table public.profiles enable row level security;
alter table public.teams enable row level security;
alter table public.groups enable row level security;
alter table public.matches enable row level security;
alter table public.match_results enable row level security;
alter table public.match_predictions enable row level security;
alter table public.bracket_predictions enable row level security;
alter table public.tournament_results enable row level security;
alter table public.bracket_results enable row level security;
alter table public.settings enable row level security;

-- profiles: cualquiera autenticado puede leer; solo el dueño actualiza su nombre
drop policy if exists "profiles select" on public.profiles;
create policy "profiles select" on public.profiles for select to authenticated using (true);
drop policy if exists "profiles update own" on public.profiles;
create policy "profiles update own" on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id and is_admin = (select is_admin from public.profiles where id = auth.uid()));

-- teams, groups, matches: lectura pública (no requiere login)
drop policy if exists "teams read" on public.teams;
create policy "teams read" on public.teams for select to anon, authenticated using (true);
drop policy if exists "groups read" on public.groups;
create policy "groups read" on public.groups for select to anon, authenticated using (true);
drop policy if exists "matches read" on public.matches;
create policy "matches read" on public.matches for select to anon, authenticated using (true);
-- Admin puede editar metadata de partidos (kickoff_at, equipos asignados a slots KO, etc.)
drop policy if exists "matches admin update" on public.matches;
create policy "matches admin update" on public.matches for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- match_results: lectura para todos
drop policy if exists "match_results read" on public.match_results;
create policy "match_results read" on public.match_results for select to anon, authenticated using (true);
-- escritura: solo admin
drop policy if exists "match_results write" on public.match_results;
create policy "match_results write" on public.match_results for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- tournament_results: lectura para todos, escritura admin
drop policy if exists "tournament_results read" on public.tournament_results;
create policy "tournament_results read" on public.tournament_results for select to anon, authenticated using (true);
drop policy if exists "tournament_results write" on public.tournament_results;
create policy "tournament_results write" on public.tournament_results for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- bracket_results: lectura para autenticados, escritura admin
drop policy if exists "bracket_results read" on public.bracket_results;
create policy "bracket_results read" on public.bracket_results for select to authenticated using (true);
drop policy if exists "bracket_results write" on public.bracket_results;
create policy "bracket_results write" on public.bracket_results for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- settings: lectura para todos
drop policy if exists "settings read" on public.settings;
create policy "settings read" on public.settings for select to anon, authenticated using (true);
drop policy if exists "settings write" on public.settings;
create policy "settings write" on public.settings for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- match_predictions: el dueño puede leer/escribir/actualizar las suyas (hasta cutoff).
drop policy if exists "match_predictions own" on public.match_predictions;
create policy "match_predictions own" on public.match_predictions for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and not public.match_is_locked(match_id));

-- match_predictions: ver predicciones de otros solo después del cutoff
drop policy if exists "match_predictions read others after cutoff" on public.match_predictions;
create policy "match_predictions read others after cutoff" on public.match_predictions for select to authenticated
  using (public.match_is_locked(match_id));

-- bracket_predictions: el dueño puede leer/escribir hasta que el torneo inicia
drop policy if exists "bracket_predictions own" on public.bracket_predictions;
create policy "bracket_predictions own" on public.bracket_predictions for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and not public.bracket_is_locked());

-- bracket_predictions: ver brackets de otros solo después del lock
drop policy if exists "bracket_predictions read after lock" on public.bracket_predictions;
create policy "bracket_predictions read after lock" on public.bracket_predictions for select to authenticated
  using (public.bracket_is_locked());
