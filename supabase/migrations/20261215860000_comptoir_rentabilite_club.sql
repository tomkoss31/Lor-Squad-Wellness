-- =============================================================================
-- Le comptoir du club — lot 4 : « Ce qui reste au club » (26/09/2026).
-- « go lot 4 et 5 d'affilée » de Thomas. Maquette v3 (SHZYSBaqfgWVqdMncgrcPG),
-- écran 5 : pour Thomas et Mel, le mois du club — les cartes encaissées, les
-- produits servis (visites × coût d'une visite), leurs propres ventes, et les
-- écarts Herbalife estimés sur ce que vendent les autres coachs.
--
-- LA RÈGLE : l'écart d'une coach = ses PV vendus au comptoir × (50 % − sa remise)
-- × 1,78 € (PV_TO_EUR_RATIO, le calcul que l'app fait déjà pour la lignée). Le vrai
-- montant arrive dans Bizworks. Le calcul vit dans le front (gains.ts, testé) :
-- la base rend les faits.
--
-- CE QUE FAIT CE FICHIER (additif) : club_rentabilite(mois), réservée au
-- propriétaire du club et aux admins (`_club_proprio`) ; null pour les autres.
--   · cartes   : les cartes de membre créées dans le mois (type, prix — le prix
--                manquant est complété par le front avec le tarif du club) ;
--   · visites  : les visites du mois des membres du club ;
--   · ventes   : les ventes du comptoir du mois (hors annulées), avec la vendeuse ;
--   · vendeurs : prénom, rang, et « proprio » (le propriétaire ou un admin :
--                leurs ventes sont « vos ventes », pas un écart) ;
--   · carte    : de quoi estimer le prix public et les PV de chaque produit.
-- =============================================================================

create or replace function public.club_rentabilite(p_mois date default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, extensions
as $$
declare
  v_club    uuid := public.bbc_mon_club();
  v_debut   date := date_trunc('month', coalesce(p_mois, (now() at time zone 'Europe/Paris')::date))::date;
  v_fin     date := (date_trunc('month', coalesce(p_mois, (now() at time zone 'Europe/Paris')::date)) + interval '1 month')::date;
  v_de      timestamptz;
  v_a       timestamptz;
  v_proprio uuid;
begin
  if (select auth.uid()) is null then
    raise exception 'non autorise';
  end if;
  if v_club is null or not public._club_proprio(v_club) then
    return null;
  end if;
  v_de := v_debut::timestamp at time zone 'Europe/Paris';
  v_a  := v_fin::timestamp at time zone 'Europe/Paris';
  select c.owner_user_id into v_proprio from public.clubs c where c.id = v_club;

  return jsonb_build_object(
    'mois', to_char(v_debut, 'YYYY-MM'),
    'cartes', coalesce((
      select jsonb_agg(jsonb_build_object('type', mc.card_type, 'prix', mc.price_eur))
        from public.member_cards mc
        join public.clients c on c.id = mc.client_id
       where c.club_id = v_club
         and mc.created_at >= v_de and mc.created_at < v_a), '[]'::jsonb),
    'visites', (
      select count(*)
        from public.club_visits v
        join public.clients c on c.id = v.client_id
       where c.club_id = v_club
         and v.visited_at >= v_de and v.visited_at < v_a),
    'carte', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', k.id, 'ref', k.ref_herbalife, 'portions', k.portions,
               'maison', k.maison, 'recette', k.recette))
        from public.club_carte k
       where k.club_id = v_club), '[]'::jsonb),
    'ventes', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', v.id, 'created_at', v.created_at, 'vendeur_id', v.vendeur_id,
               'total', v.total, 'lignes', v.lignes)
             order by v.created_at)
        from public.club_ventes v
       where v.club_id = v_club
         and v.annulee_at is null
         and v.created_at >= v_de and v.created_at < v_a), '[]'::jsonb),
    'vendeurs', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', u.id,
               'prenom', coalesce(nullif(split_part(btrim(coalesce(u.name, '')), ' ', 1), ''), 'Coach'),
               'rang', u.current_rank,
               'proprio', (u.id = v_proprio or u.role = 'admin')))
        from public.users u
       where u.id in (
         select distinct v.vendeur_id
           from public.club_ventes v
          where v.club_id = v_club
            and v.annulee_at is null
            and v.created_at >= v_de and v.created_at < v_a)), '[]'::jsonb)
  );
end;
$$;
revoke all on function public.club_rentabilite(date) from public, anon;
grant execute on function public.club_rentabilite(date) to authenticated;
