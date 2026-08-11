-- =============================================================================
-- club_prelaunch_cards_left — « il reste X places au tarif de pré-lancement »
--
-- Le site annonce la carte 30 visites à 185 € pour les 20 premiers membres.
-- Sans compteur, c'est une affirmation ; avec, c'est un fait qui se vérifie
-- tout seul et qui crée une vraie urgence (décision Thomas 2026-08-10).
--
-- CE QU'ON COMPTE : les cartes 30 réellement ATTRIBUÉES (`member_cards`).
-- C'est là que toute carte finit, quel qu'en soit le canal — vendue au
-- comptoir comme payée en ligne. Compter aussi les commandes en ligne payées
-- créerait un doublon dès que le coach attribue la carte, et il n'existe aucun
-- lien entre les deux tables pour dédoublonner.
--   ⚠ Conséquence assumée : entre un paiement en ligne et l'attribution dans
--   BBC (quelques heures, le mail interne le demande), le compteur annonce une
--   place de trop. Sur 20 places et une étape manuelle dans la journée, c'est
--   préférable à un compteur qui compte deux fois.
--
-- LE SEUIL EST EN BASE (`clubs.settings.prelaunch.slots`, défaut 20) : Thomas
-- peut le lever sans redéploiement, comme la capacité des créneaux et les
-- tarifs des cartes. « on jugera suivant le nombre de membres ».
--
-- SECURITY DEFINER parce que `member_cards` est protégée par RLS et que
-- l'appelant est un visiteur anonyme. Elle ne renvoie QU'UN ENTIER — aucune
-- donnée de membre ne peut fuir par là.
-- =============================================================================

create or replace function public.club_prelaunch_cards_left(p_slug text default 'verdun')
returns integer
language sql
stable
security definer
set search_path = public
as $$
  with club as (
    select id, owner_user_id, coalesce((settings -> 'prelaunch' ->> 'slots')::int, 20) as slots
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
      )
  );
$$;

comment on function public.club_prelaunch_cards_left(text) is
  'Places restantes au tarif de pré-lancement de la carte 30 visites. Seuil dans clubs.settings.prelaunch.slots (défaut 20). Ne renvoie qu''un entier — appelable par un visiteur anonyme.';

revoke all on function public.club_prelaunch_cards_left(text) from public;
grant execute on function public.club_prelaunch_cards_left(text) to anon, authenticated;

-- Seuil initial, explicite en base plutôt que laissé au défaut du code.
update public.clubs
set settings = jsonb_set(settings, '{prelaunch}', '{"slots": 20}'::jsonb, true)
where slug = 'verdun'
  and settings -> 'prelaunch' is null;
