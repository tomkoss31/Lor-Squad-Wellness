-- =============================================================================
-- club_prelaunch_cards_left — exclure les cartes des coachs (demande Thomas)
--
-- Une carte reprise par Thomas ou Mélanie ne doit pas manger une des 20 places
-- de pré-lancement : ce sont eux qui servent le club, pas des membres.
--
-- POURQUOI UNE LISTE ET PAS UNE DÉTECTION AUTOMATIQUE
-- Cherché avant d'écrire, sur les données réelles : la fiche client d'un coach
-- n'est reliée à son compte par RIEN.
--   · `clients.linked_user_id` → nul sur la fiche de Thomas (une seule fiche
--     du projet l'utilise, celle d'une distributrice) ;
--   · l'email de la fiche ne correspond à aucun `users.email` ;
--   · le nom de la fiche ne correspond à aucun `users.name`.
-- Deviner à partir de ces trois signaux aurait donné une règle qui se trompe
-- en silence — dans un sens (compter un coach) comme dans l'autre (décompter
-- un vrai membre homonyme). Une liste explicite ne se trompe jamais toute
-- seule, et elle se lit.
--
-- `clubs.settings.prelaunch.exclude_client_ids` : tableau d'identifiants de
-- fiches. Réglable en base, sans redéploiement. Pour ajouter Mélanie le jour
-- où elle prend une carte, il suffit d'y pousser l'id de sa fiche.
-- =============================================================================

create or replace function public.club_prelaunch_cards_left(p_slug text default 'verdun')
returns integer
language sql
stable
security definer
set search_path = public
as $$
  with club as (
    select
      owner_user_id,
      coalesce((settings -> 'prelaunch' ->> 'slots')::int, 20) as slots,
      coalesce(
        (settings -> 'prelaunch' ->> 'since')::timestamptz,
        (settings -> 'discovery' ->> 'opening_date')::timestamptz,
        now()
      ) as depuis,
      coalesce(settings -> 'prelaunch' -> 'exclude_client_ids', '[]'::jsonb) as exclus
    from public.clubs
    where slug = p_slug and active
    limit 1
  )
  select greatest(
    0,
    (select slots from club)
    - (
        select count(*)::int
        from public.member_cards mc
        where mc.card_type = 30
          and mc.coach_user_id = (select owner_user_id from club)
          and mc.created_at >= (select depuis from club)
          and not ((select exclus from club) ? mc.client_id::text)
      )
  );
$$;

comment on function public.club_prelaunch_cards_left(text) is
  'Places restantes au tarif de pré-lancement de la carte 30 visites. Réglages dans clubs.settings.prelaunch : slots (défaut 20), since (défaut = ouverture du club), exclude_client_ids (fiches des coachs). Ne renvoie qu''un entier — appelable par un visiteur anonyme.';

revoke all on function public.club_prelaunch_cards_left(text) from public;
grant execute on function public.club_prelaunch_cards_left(text) to anon, authenticated;

-- Seed : la fiche du propriétaire du club (Thomas). Retrouvée par son nom ET
-- son rattachement au club, plutôt qu'un identifiant nu — on peut relire cette
-- ligne dans six mois et comprendre qui elle désigne.
update public.clubs cl
set settings = jsonb_set(
      cl.settings,
      '{prelaunch,exclude_client_ids}',
      coalesce(
        (select jsonb_agg(distinct c.id::text)
         from public.clients c
         where c.distributor_id = cl.owner_user_id
           and c.ebe_bbc is true
           and lower(trim(c.first_name || ' ' || c.last_name)) = 'thomas houbert'),
        '[]'::jsonb
      ),
      true
    )
where cl.slug = 'verdun'
  and cl.settings -> 'prelaunch' -> 'exclude_client_ids' is null;
