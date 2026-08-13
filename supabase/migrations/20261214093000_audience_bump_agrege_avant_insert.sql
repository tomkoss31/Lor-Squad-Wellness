-- =============================================================================
-- Correctif immédiat de `audience_bump` : « ON CONFLICT DO UPDATE cannot
-- affect row a second time ».
--
-- Trouvé en envoyant un vrai paquet à l'edge déployée, pas en relisant le SQL.
-- Un paquet contient très souvent DEUX FOIS la même clé :
--   · un visiteur qui revient sur la page d'accueil pendant sa session ;
--   · plusieurs URL inconnues, qui se rangent TOUTES sous « /autre ».
-- Postgres refuse alors l'insert en entier, et comme l'edge répond 200 exprès
-- (ne jamais gêner le visiteur), le paquet était perdu EN SILENCE.
--
-- Le regroupement se fait donc ici, avant l'insert — jamais dans le
-- navigateur, qui n'a pas à connaître la forme de la table.
-- =============================================================================

create or replace function public.audience_bump(p_events jsonb)
returns integer
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_n integer := 0;
begin
  if p_events is null or jsonb_typeof(p_events) <> 'array' then
    return 0;
  end if;
  if jsonb_array_length(p_events) > 60 then
    raise exception 'audience_bump: paquet trop gros (%)', jsonb_array_length(p_events);
  end if;

  with e as (
    select * from jsonb_to_recordset(p_events) as x(
      type text, cle text, coach_user_id uuid,
      vues int, visites int, sorties int, duree_ms bigint, duree_n int,
      tunnel text, etape text, rang smallint, n int
    )
  ),
  agg_pages as (
    select e.type, e.cle, e.coach_user_id,
           sum(coalesce(e.vues,0))::int     as vues,
           sum(coalesce(e.visites,0))::int  as visites,
           sum(coalesce(e.sorties,0))::int  as sorties,
           sum(coalesce(e.duree_ms,0))::bigint as duree_ms,
           sum(coalesce(e.duree_n,0))::int  as duree_n
      from e
     where e.type in ('page','clic') and e.cle is not null
     group by e.type, e.cle, e.coach_user_id
  ),
  agg_etapes as (
    select e.tunnel, e.etape, max(coalesce(e.rang,0))::smallint as rang,
           e.coach_user_id, sum(coalesce(e.n,1))::int as n
      from e
     where e.type is null and e.tunnel is not null and e.etape is not null
     group by e.tunnel, e.etape, e.coach_user_id
  ),
  pages as (
    insert into public.audience_daily
      (jour, type, cle, coach_user_id, vues, visites, sorties, duree_ms, duree_n)
    select current_date, a.type, a.cle, a.coach_user_id,
           a.vues, a.visites, a.sorties,
           -- Plafond de 10 min PAR VUE, appliqué après regroupement.
           least(a.duree_ms, 600000::bigint * greatest(a.duree_n,1)),
           a.duree_n
      from agg_pages a
    on conflict (jour, type, cle, coach_user_id) do update set
      vues     = public.audience_daily.vues     + excluded.vues,
      visites  = public.audience_daily.visites  + excluded.visites,
      sorties  = public.audience_daily.sorties  + excluded.sorties,
      duree_ms = public.audience_daily.duree_ms + excluded.duree_ms,
      duree_n  = public.audience_daily.duree_n  + excluded.duree_n,
      maj_at   = now()
    returning 1
  ),
  etapes as (
    insert into public.audience_funnel_daily (jour, tunnel, etape, rang, coach_user_id, n)
    select current_date, a.tunnel, a.etape, a.rang, a.coach_user_id, a.n
      from agg_etapes a
    on conflict (jour, tunnel, etape, coach_user_id) do update set
      n      = public.audience_funnel_daily.n + excluded.n,
      maj_at = now()
    returning 1
  )
  select (select count(*) from pages) + (select count(*) from etapes) into v_n;

  return v_n;
end;
$$;

-- ⚠️ `create or replace function` REDONNE l'exécution à `public`. Sans ce
-- revoke, n'importe qui sur Internet pourrait gonfler les compteurs.
revoke all on function public.audience_bump(jsonb) from public, anon, authenticated;
