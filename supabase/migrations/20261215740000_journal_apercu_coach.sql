-- =============================================================================
-- Journal nutritionnel — l'aperçu du coach (22/09/2026, maquette validée par
-- Thomas : « c'est pas mal comme ça, on essaie, on verra »).
--
-- L'écran « Co-pilote › Journal » liste toutes les clientes et met EN TÊTE
-- celles qui tiennent vraiment leur journal. Cette fonction ne rend QUE ces
-- dernières (une ligne par cliente qui a noté dans les 7 derniers jours) : la
-- liste complète vient du front (visibleClients, la même que « Dossiers
-- clients »), la fonction n'y ajoute que l'état du journal. Quelques dizaines
-- de lignes au plus : rien de lourd pour le Nano.
--
-- « Elle a noté » un jour = la règle du rappel de 20 h (journal_rappel_cibles) :
-- un repas qu'elle a écrit elle-même (origine membre ou noaly), de l'eau ou du
-- sport. Le pré-rempli du club seul compte à part (2) : il dit qu'elle est
-- passée au club, pas qu'elle tient son journal. Une ligne ajoutée par la
-- coach ne compte pas : « ceux qui le remplissent RÉELLEMENT » (Thomas).
--
-- SECURITY INVOKER : le RLS décide (journal_lignes_coach / journal_jours_coach
-- = sous-requête sur clients). Une coach ne voit que ses clientes, un admin
-- toutes — exactement comme journal_semaine_coach.
-- =============================================================================

create or replace function public.journal_apercu_coach()
returns table (
  client_id   uuid,
  jours       smallint[],  -- 7 cases, de J-6 à aujourd'hui : 1 = elle a noté · 2 = pré-rempli du club seul · 0 = rien
  jours_notes integer,     -- nombre de jours où elle a noté
  prot_moy    integer,     -- protéines moyennes (g) des jours où elle a noté un REPAS (le pré-rempli du club compris : elle l'a pris) ;
                           -- un jour « eau seulement » ne compte pas, il ferait chuter la moyenne à tort
  derniere    date         -- dernier jour où elle a noté
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
           coalesce(j.club_prerempli, false)                    as du_club
      from public.journal_jours j, bornes b
     where j.jour between b.auj - 6 and b.auj
  ),
  etat as (
    select coalesce(l.client_id, j.client_id)                      as client_id,
           coalesce(l.jour, j.jour)                                as jour,
           coalesce(l.a_elle, false) or coalesce(j.a_elle, false)   as a_elle,
           coalesce(l.a_elle, false)                               as a_repas,
           coalesce(l.du_club, false) or coalesce(j.du_club, false) as du_club,
           coalesce(l.prot, 0)                                     as prot
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
  )
  select a.client_id,
         array(
           select (case when e.a_elle then 1 when e.du_club then 2 else 0 end)::smallint
             from bornes b
             cross join generate_series(6, 0, -1) g
             left join etat e on e.client_id = a.client_id and e.jour = b.auj - g
            order by g desc
         ) as jours,
         a.jours_notes,
         a.prot_moy,
         a.derniere
    from actives a
    join public.clients c on c.id = a.client_id;
$$;

revoke all on function public.journal_apercu_coach() from public, anon;
grant execute on function public.journal_apercu_coach() to authenticated;

comment on function public.journal_apercu_coach() is
  'Co-pilote › Journal : les clientes qui tiennent leur journal (7 derniers jours). SECURITY INVOKER, le RLS décide.';
