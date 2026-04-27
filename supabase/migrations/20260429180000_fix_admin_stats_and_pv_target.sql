-- =============================================================================
-- Fix Statistiques admin + ajout champ monthly_pv_target (2026-04-29)
--
-- Problème 1 : la RPC get_admin_stats() référençait `pv_client_transactions`
-- qui n'existe pas (la vraie table s'appelle `pv_transactions`). Postgres
-- catchait l'undefined_table et renvoyait
--   { "error": "Certaines tables ne sont pas encore créées" }
-- du coup l'onglet Statistiques affichait juste ce message — alors que
-- toutes les tables EXISTENT bien.
--
-- Problème 2 : `users.monthly_pv_target` était lu côté front (Co-pilote
-- jauge PV) mais n'avait jamais été créé en base → impossible de
-- personnaliser le seuil PV. Ajout de la colonne (default 13000) +
-- exposition dans Paramètres > Profil.
-- =============================================================================

begin;

-- ─── 1. Colonne monthly_pv_target ────────────────────────────────────────────
alter table public.users
  add column if not exists monthly_pv_target integer not null default 2500;

comment on column public.users.monthly_pv_target is
  'Seuil PV mensuel cible affiche dans la jauge Co-pilote. Defaut 2500 (palier Success Builder qualifiant). Editable par chaque user dans Parametres > Profil.';

-- ─── 2. Recreate RPC get_admin_stats avec le bon nom de table ────────────────
drop function if exists public.get_admin_stats();

create or replace function public.get_admin_stats()
returns jsonb
language plpgsql
security definer
as $$
declare
  result jsonb;
  start_month timestamptz;
  three_months_ago timestamptz;
begin
  if not public.is_admin() then
    raise exception 'Statistiques admin réservées.' using errcode = '42501';
  end if;

  start_month := date_trunc('month', now());
  three_months_ago := now() - interval '3 months';

  with
  distri_count as (
    select count(*) as total,
      count(*) filter (where active) as active_total,
      count(*) filter (where created_at >= start_month) as new_month
    from public.users
    where role in ('distributor', 'referent')
  ),
  retention as (
    select
      count(*) filter (
        where created_at <= three_months_ago
          and active
          and (last_access_at is null or last_access_at >= now() - interval '30 days')
      )::numeric as retained,
      nullif(count(*) filter (where created_at <= three_months_ago), 0)::numeric as base_pop
    from public.users
    where role in ('distributor', 'referent')
  ),
  clients_stats as (
    select
      count(*) as total,
      count(*) filter (where created_at >= start_month) as new_month
    from public.clients
  ),
  assessments_stats as (
    select count(*) as month_count
    from public.assessments
    where created_at >= start_month
  ),
  prospect_conv as (
    select
      count(*) filter (where status = 'converted')::numeric as converted,
      nullif(count(*), 0)::numeric as total
    from public.prospects
  ),
  pv_stats as (
    select coalesce(sum(pv), 0) as month_pv
    from public.pv_transactions
    where date >= start_month
  ),
  top_distri as (
    select jsonb_agg(
      jsonb_build_object('id', u.id, 'name', u.name, 'pv', t.pv_sum)
      order by t.pv_sum desc
    ) as top
    from (
      select responsible_id, sum(pv) as pv_sum
      from public.pv_transactions
      where date >= start_month
      group by responsible_id
      order by pv_sum desc
      limit 5
    ) t
    join public.users u on u.id = t.responsible_id
  ),
  msgs_stats as (
    select count(*) as month_count
    from public.client_messages
    where created_at >= start_month
  ),
  protocol_stats as (
    select count(*) as month_count
    from public.follow_up_protocol_log
    where sent_at >= start_month
  )
  select jsonb_build_object(
    'team', jsonb_build_object(
      'total', (select total from distri_count),
      'active_month', (select active_total from distri_count),
      'new_month', (select new_month from distri_count),
      'retention_3m_pct', (
        select case
          when (select base_pop from retention) is null then null
          else round(100.0 * (select retained from retention) / (select base_pop from retention), 1)
        end
      )
    ),
    'clients', jsonb_build_object(
      'total', (select total from clients_stats),
      'new_month', (select new_month from clients_stats),
      'assessments_month', (select month_count from assessments_stats),
      'conversion_pct', (
        select case
          when (select total from prospect_conv) is null then null
          else round(100.0 * (select converted from prospect_conv) / (select total from prospect_conv), 1)
        end
      )
    ),
    'pv', jsonb_build_object(
      'month_total', (select month_pv from pv_stats),
      'top5', coalesce((select top from top_distri), '[]'::jsonb)
    ),
    'activity', jsonb_build_object(
      'messages_month', (select month_count from msgs_stats),
      'protocol_sent_month', (select month_count from protocol_stats)
    ),
    'generated_at', now()
  ) into result;

  return result;
exception when undefined_table then
  return jsonb_build_object(
    'error', 'Certaines tables ne sont pas encore créées',
    'generated_at', now()
  );
end;
$$;

grant execute on function public.get_admin_stats() to authenticated;

commit;
