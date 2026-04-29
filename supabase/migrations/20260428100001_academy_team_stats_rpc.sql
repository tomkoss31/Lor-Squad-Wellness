-- =============================================================================
-- Chantier Academy polish K (2026-04-28)
--
-- RPC d agregation publique qui retourne 4 compteurs anonymes sur la
-- progression Academy de l equipe : total demarre / total termine /
-- termine ce mois / demarre cette semaine.
--
-- Aucune PII (pas de noms, pas d ID), juste des nombres. Utilise pour
-- afficher un bandeau motivation social sur /academy ("X distri ont
-- termine l Academy ce mois").
--
-- SECURITY DEFINER + grant execute aux authenticated. Pas de check
-- admin necessaire car l agregation est privacy-safe.
-- =============================================================================

begin;

create or replace function public.get_academy_team_stats()
returns table (
  total_started integer,
  total_completed integer,
  completed_this_month integer,
  started_this_week integer
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  return query
  select
    (select count(*)::int from public.user_tour_progress
       where tour_key = 'academy' and started_at is not null) as total_started,
    (select count(*)::int from public.user_tour_progress
       where tour_key = 'academy' and completed_at is not null) as total_completed,
    (select count(*)::int from public.user_tour_progress
       where tour_key = 'academy' and completed_at >= date_trunc('month', current_date)) as completed_this_month,
    (select count(*)::int from public.user_tour_progress
       where tour_key = 'academy' and started_at >= date_trunc('week', current_date)) as started_this_week;
end;
$$;

revoke all on function public.get_academy_team_stats() from public, anon;
grant execute on function public.get_academy_team_stats() to authenticated;

comment on function public.get_academy_team_stats is
  'Agregation anonyme de la progression Academy. 4 compteurs sans PII. Polish K (2026-04-28).';

commit;
