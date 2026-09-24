-- =============================================================================
-- Co-pilote › Journal, plus vivant (24/09/2026, maquette ForqHsP3stVu45NSEvPnZZ
-- validée : « c'est quand même plus dans l'esprit de l'app, go fais-le »).
--
-- « 46 g, c'est bien ou pas ? » — la liste ne pouvait pas le dire : elle n'avait
-- ni l'objectif de la cliente, ni le détail jour par jour. `journal_apercu_coach`
-- rend en plus :
--   · obj_prot / obj_eau : ses objectifs (même calcul que son journal :
--     _journal_objectifs, poids du dernier bilan pesé × son coefficient) ;
--   · prot_jours / eau_jours : 7 valeurs, de J-6 à aujourd'hui (g, litres).
-- Toujours SECURITY INVOKER : le RLS de la coach décide. ⚠️ Toute fonction
-- appelée d'ici doit être exécutable par `authenticated` (piège du 24/09) :
-- _journal_objectifs l'est.
-- =============================================================================

drop function if exists public.journal_apercu_coach();
create function public.journal_apercu_coach()
returns table (
  client_id   uuid,
  jours       smallint[],   -- 7 cases : 1 = elle a noté · 2 = pré-rempli du club seul · 0 = rien
  jours_notes integer,
  prot_moy    integer,      -- moyenne des jours à REPAS
  derniere    date,
  prot_jours  numeric[],    -- protéines de chaque jour (g)
  eau_jours   numeric[],    -- eau de chaque jour (L) : verres × 25 cl + boisson du club 40 cl
  obj_prot    integer,      -- son objectif de protéines (g) — null sans bilan pesé
  obj_eau     numeric       -- son objectif d'eau (L)
)
language sql
stable
security invoker
set search_path = public, extensions
as $$
  with bornes as (
    select (now() at time zone 'Europe/Paris')::date as auj
  ),
  par_lignes as (
    select l.client_id, l.jour,
           bool_or(l.origine in ('membre', 'noaly')) as a_elle,
           bool_or(l.origine = 'club')               as du_club,
           sum(l.prot_g)                             as prot
      from public.journal_lignes l, bornes b
     where l.jour between b.auj - 6 and b.auj
     group by l.client_id, l.jour
  ),
  par_jours as (
    select j.client_id, j.jour,
           (coalesce(j.verres, 0) > 0 or j.activite is not null) as a_elle,
           coalesce(j.club_prerempli, false)                    as du_club,
           coalesce(j.verres, 0) * 0.25 + case when coalesce(j.boisson_club, false) then 0.4 else 0 end as eau
      from public.journal_jours j, bornes b
     where j.jour between b.auj - 6 and b.auj
  ),
  etat as (
    select coalesce(l.client_id, j.client_id)                      as client_id,
           coalesce(l.jour, j.jour)                                as jour,
           coalesce(l.a_elle, false) or coalesce(j.a_elle, false)   as a_elle,
           coalesce(l.a_elle, false)                               as a_repas,
           coalesce(l.du_club, false) or coalesce(j.du_club, false) as du_club,
           coalesce(l.prot, 0)                                     as prot,
           coalesce(j.eau, 0)                                      as eau
      from par_lignes l
      full join par_jours j on j.client_id = l.client_id and j.jour = l.jour
  ),
  actives as (
    select e.client_id,
           (count(*) filter (where e.a_elle))::integer           as jours_notes,
           (round(avg(e.prot) filter (where e.a_repas)))::integer as prot_moy,
           max(e.jour) filter (where e.a_elle)                   as derniere
      from etat e
     group by e.client_id
    having bool_or(e.a_elle)
  ),
  objectifs as (
    select a.client_id,
           public._journal_objectifs(
             (select replace(s.body_scan->>'weight', ',', '.')::numeric
                from public.assessments s
               where s.client_id = a.client_id
                 and (s.body_scan->>'weight') ~ '^[0-9]+([.,][0-9]+)?$'
                 and replace(s.body_scan->>'weight', ',', '.')::numeric > 0
               order by s.date desc nulls last, s.created_at desc
               limit 1),
             coalesce((select r.coef_proteines from public.journal_reglages r where r.client_id = a.client_id), 1.2)
           ) as o
      from actives a
  )
  select a.client_id,
         array(
           select (case when e.a_elle then 1 when e.du_club then 2 else 0 end)::smallint
             from bornes b cross join generate_series(6, 0, -1) g
             left join etat e on e.client_id = a.client_id and e.jour = b.auj - g
            order by g desc
         ) as jours,
         a.jours_notes,
         a.prot_moy,
         a.derniere,
         array(
           select round(coalesce(e.prot, 0), 1)
             from bornes b cross join generate_series(6, 0, -1) g
             left join etat e on e.client_id = a.client_id and e.jour = b.auj - g
            order by g desc
         ) as prot_jours,
         array(
           select round(coalesce(e.eau, 0), 2)
             from bornes b cross join generate_series(6, 0, -1) g
             left join etat e on e.client_id = a.client_id and e.jour = b.auj - g
            order by g desc
         ) as eau_jours,
         (o.o->>'proteines')::integer as obj_prot,
         (o.o->>'eau_l')::numeric     as obj_eau
    from actives a
    join public.clients c on c.id = a.client_id
    left join objectifs o on o.client_id = a.client_id;
$$;

revoke all on function public.journal_apercu_coach() from public, anon;
grant execute on function public.journal_apercu_coach() to authenticated;

comment on function public.journal_apercu_coach() is
  'Co-pilote › Journal : les clientes qui tiennent leur journal (7 derniers jours), avec leurs objectifs et le détail jour par jour. SECURITY INVOKER, le RLS décide.';
