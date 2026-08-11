-- =============================================================================
-- club_prelaunch_cards_left — ne compter que les cartes DU pré-lancement
--
-- Le compteur affichait « il reste 19 places » dès sa mise en ligne, sans
-- qu'aucune carte n'ait jamais été vendue. En cherchant le paiement manquant :
-- la carte comptée était celle de THOMAS lui-même, attribuée le 25/07 en
-- montant le mode BBC, 11 visites déjà pointées. Le coach n'est pas l'un des
-- « 20 premiers membres » — et sa carte est antérieure à l'offre.
--
-- Le compteur prend donc une date de départ, `clubs.settings.prelaunch.since` :
-- seules les cartes 30 créées À PARTIR de cette date entrent dans le compte.
-- Réglable en base comme le seuil, sans redéploiement.
--
-- Valeur posée : la date d'ouverture du club déjà enregistrée
-- (`settings.discovery.opening_date`), qui est le vrai début de l'offre. Sans
-- elle, la fonction retombe sur `now()` — c'est-à-dire qu'elle ne compte rien
-- de rétroactif, ce qui est le repli le plus sûr : mieux vaut un compteur qui
-- démarre à 20 qu'un compteur qui déduit des cartes sans rapport.
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
      ) as depuis
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
      )
  );
$$;

comment on function public.club_prelaunch_cards_left(text) is
  'Places restantes au tarif de pré-lancement de la carte 30 visites. Seuil et date de départ dans clubs.settings.prelaunch (slots, since) ; à défaut, la date d''ouverture du club. Ne renvoie qu''un entier — appelable par un visiteur anonyme.';

revoke all on function public.club_prelaunch_cards_left(text) from public;
grant execute on function public.club_prelaunch_cards_left(text) to anon, authenticated;

-- Départ explicite du pré-lancement = l'ouverture du club, déjà en base.
update public.clubs
set settings = jsonb_set(
      settings,
      '{prelaunch,since}',
      to_jsonb(coalesce(settings -> 'discovery' ->> 'opening_date', '2026-08-01')),
      true
    )
where slug = 'verdun'
  and settings -> 'prelaunch' ->> 'since' is null;
