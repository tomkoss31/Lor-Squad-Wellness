-- =============================================================================
-- /rdv — deux manques trouvés en parcourant la page comme un prospect (2026-08-11)
--
-- 1. ON NE POUVAIT JAMAIS RÉSERVER LE JOUR MÊME.
--    `generate_series(1, v_days)` part de DEMAIN. Quelqu'un qui finit son bilan
--    en ligne à 9 h et qui est libre à 14 h ne voyait rien avant le lendemain.
--    C'est le moment où l'envie est la plus forte, et on la renvoyait à J+1.
--    On ouvre le jour même, avec un préavis : un créneau ne s'affiche que s'il
--    commence dans plus de 2 h. Sans ça on pouvait réserver à 9 h 15 alors
--    qu'il est 9 h 10 — le coach n'a pas le temps de voir passer la demande.
--    Le préavis est un paramètre : `p_min_notice_min`, réglable sans migration.
--
-- 2. LA PAGE NE SAVAIT RIEN DU COACH, à part son slug.
--    Le prospect choisissait « Présentiel » sans jamais voir d'adresse, et
--    « Visio » sans savoir comment il recevrait le lien. Et le titre disait
--    « Melanie t'attend » — le slug capitalisé, sans accent, alors que le
--    prénom est « Mélanie » en base.
--    D'où `get_coach_rdv_context_by_slug` : le strict nécessaire pour la page
--    de réservation (prénom exact, lieu, ville, durée du créneau). Volontai-
--    rement séparée de `get_coach_credibility_by_slug`, qui compte des bilans
--    et des clients dont cette page n'a que faire.
--
-- Aucune règle d'occupation touchée : `is_coach_slot_free` est intacte.
-- =============================================================================

-- Le 3e paramètre change la SIGNATURE : `create or replace` créerait une
-- surcharge au lieu de remplacer. Les deux coexisteraient, et un appel nommé à
-- deux arguments deviendrait ambigu — PostgREST refuse alors de choisir et la
-- page ne montre plus aucun créneau. On retire donc l'ancienne d'abord.
drop function if exists public.get_coach_availability_by_slug(text, integer);

create or replace function public.get_coach_availability_by_slug(
  p_slug text,
  p_days integer default 14,
  p_min_notice_min integer default 120
)
returns table(slot_start timestamptz, slot_end timestamptz)
language plpgsql
stable
security definer
set search_path to 'public'
as $function$
declare
  v_slug text;
  v_user_id uuid;
  v_slot_min int := 30;
  v_days int := least(greatest(coalesce(p_days, 14), 1), 30);
  -- Borné : 0 = « tout de suite » (assumé si un jour on le veut), 24 h max
  -- pour qu'un mauvais appel ne vide pas le calendrier sur une semaine.
  v_notice int := least(greatest(coalesce(p_min_notice_min, 120), 0), 1440);
begin
  v_slug := public.ls_normalize_slug(p_slug);
  if v_slug is null or length(v_slug) < 2 then
    return;
  end if;

  select id into v_user_id
    from public.users
    where active = true
      and role in ('distributor', 'admin', 'referent')
      and public.ls_normalize_slug(split_part(coalesce(name, ''), ' ', 1)) = v_slug
    order by created_at asc
    limit 1;

  if v_user_id is null then
    return;
  end if;

  return query
  with days as (
    -- 0 = aujourd'hui. C'est le seul changement de périmètre : les créneaux
    -- déjà passés (ou trop proches) tombent au filtre plus bas.
    select (current_date + d)::date as day_date
    from generate_series(0, v_days) as d
  ),
  avail as (
    select dd.day_date, a.start_min, a.end_min
    from days dd
    join public.coach_rdv_availability a
      on a.coach_user_id = v_user_id
     and a.weekday = extract(dow from dd.day_date)::int
  ),
  raw_slots as (
    select
      ((av.day_date + make_interval(mins => gs)) at time zone 'Europe/Paris') as s_start,
      ((av.day_date + make_interval(mins => gs + v_slot_min)) at time zone 'Europe/Paris') as s_end
    from avail av
    cross join lateral generate_series(av.start_min, av.end_min - v_slot_min, v_slot_min) as gs
  )
  select rs.s_start, rs.s_end
  from raw_slots rs
  where rs.s_start > now() + make_interval(mins => v_notice)
    and public.is_coach_slot_free(v_user_id, rs.s_start, rs.s_end)
  order by rs.s_start;
end;
$function$;

comment on function public.get_coach_availability_by_slug(text, integer, integer) is
  'Créneaux libres d''un coach, résolu par slug. Inclut le jour même, à partir de p_min_notice_min minutes (défaut 120). Publique : /rdv/:slug.';


-- ── Contexte affiché sur la page de réservation ─────────────────────────────
create or replace function public.get_coach_rdv_context_by_slug(p_slug text)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public'
as $function$
declare
  v_slug text;
  v_row record;
begin
  v_slug := public.ls_normalize_slug(p_slug);
  if v_slug is null or length(v_slug) < 2 then
    return null;
  end if;

  select
    split_part(coalesce(u.name, ''), ' ', 1) as first_name,
    nullif(btrim(coalesce(u.rdv_location, '')), '') as rdv_location,
    nullif(btrim(coalesce(u.city, '')), '')         as city
  into v_row
  from public.users u
  where u.active = true
    and u.role in ('distributor', 'admin', 'referent')
    and public.ls_normalize_slug(split_part(coalesce(u.name, ''), ' ', 1)) = v_slug
  order by u.created_at asc
  limit 1;

  if not found then
    return null;
  end if;

  -- Rien d'autre. Pas d'email, pas de téléphone, pas d'identifiant : cette
  -- fonction est appelée depuis une page publique par n'importe qui.
  return jsonb_build_object(
    'first_name',   v_row.first_name,
    'rdv_location', v_row.rdv_location,
    'city',         v_row.city,
    'slot_minutes', 30
  );
end;
$function$;

comment on function public.get_coach_rdv_context_by_slug(text) is
  'Prénom exact, lieu de RDV et ville d''un coach, par slug. Publique, en lecture seule, sans donnée de contact. Sert à /rdv/:slug.';

grant execute on function public.get_coach_rdv_context_by_slug(text) to anon, authenticated;
grant execute on function public.get_coach_availability_by_slug(text, integer, integer) to anon, authenticated;
