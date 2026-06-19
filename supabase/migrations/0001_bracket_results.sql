-- ============================================================
-- POLLA MUNDIAL 2026 — Migración: bracket_results
-- Resultado OFICIAL de la predicción general (lo carga el admin).
-- Espeja la estructura de bracket_predictions, pero representa la realidad.
-- Aplicar en Supabase: SQL Editor → New query → pegar → Run
-- ============================================================

create table if not exists public.bracket_results (
  id int primary key default 1 check (id = 1),
  -- group_positions: { "A": ["ARG","MEX","KSA","POL"], ... } orden real 1..4
  group_positions jsonb not null default '{}'::jsonb,
  -- r32_third_place_assignments: { "<match_id>": "team_id" } 3° real que ocupó cada slot
  r32_third_place_assignments jsonb not null default '{}'::jsonb,
  -- *_winners: { "<match_id>": "team_id" } ganador real de cada partido KO
  r32_winners jsonb not null default '{}'::jsonb,
  r16_winners jsonb not null default '{}'::jsonb,
  qf_winners jsonb not null default '{}'::jsonb,
  sf_winners jsonb not null default '{}'::jsonb,
  -- finalists: ["ARG","BRA"]
  finalists jsonb not null default '[]'::jsonb,
  champion text references public.teams(id),
  is_finalized boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.bracket_results enable row level security;

-- Lectura para cualquiera autenticado; escritura solo admin
drop policy if exists "bracket_results read" on public.bracket_results;
create policy "bracket_results read" on public.bracket_results
  for select to authenticated using (true);
drop policy if exists "bracket_results write" on public.bracket_results;
create policy "bracket_results write" on public.bracket_results
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
