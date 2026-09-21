-- =============================================================================
-- Journal nutritionnel — bloc B, 8 : « elle a lâché son journal », une 7e règle
-- pour « Contacter aujourd'hui » (maquette Jt3RNaarpnav5XRGzhrTwz, validée par
-- Thomas le 21/09/2026 : « 3 ok pour 3 jours »).
--
-- Pour chaque personne dont la coach voit le journal (SON RLS : security
-- invoker, comme journal_semaine_coach) : la dernière ligne notée par elle
-- (origine membre ou noaly — le shake pré-rempli au club ne compte pas), le
-- nombre de jours notés dans les 7 jours qui finissent à cette ligne, et si elle
-- a DÉJÀ été relancée pour son journal depuis (une ligne `bbc_contacts` à la
-- clé `membre:<id>:journal`, avant aujourd'hui) : on ne la repropose pas tant
-- qu'elle n'a pas repris. La règle elle-même est dans src/features/bbc/contacter.ts.
-- =============================================================================

create or replace function public.journal_signaux_club()
returns table (client_id uuid, derniere_ligne date, jours_notes integer, deja_relancee boolean)
language sql stable security invoker set search_path = public, extensions as $$
  with auj as (select (now() at time zone 'Europe/Paris')::date as d),
  jours as (
    select distinct jl.client_id, jl.jour
      from public.journal_lignes jl, auj
     where jl.origine in ('membre', 'noaly')
       and jl.jour between auj.d - 21 and auj.d
  ),
  dern as (select j.client_id, max(j.jour) as derniere from jours j group by j.client_id)
  select d.client_id,
         d.derniere,
         (select count(*) from jours j where j.client_id = d.client_id and j.jour between d.derniere - 6 and d.derniere)::int,
         exists (select 1
                   from public.bbc_contacts b, auj
                  where b.cible = 'membre:' || d.client_id || ':journal'
                    and (b.fait_at at time zone 'Europe/Paris')::date >= d.derniere
                    and (b.fait_at at time zone 'Europe/Paris')::date < auj.d)
    from dern d;
$$;
revoke all on function public.journal_signaux_club() from public, anon;
grant execute on function public.journal_signaux_club() to authenticated;
