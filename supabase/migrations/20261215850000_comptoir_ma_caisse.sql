-- =============================================================================
-- Le comptoir du club — lot 3 : « Ma caisse » (26/09/2026).
-- « go lot 3 » de Thomas. Maquette v3 (SHZYSBaqfgWVqdMncgrcPG), écran 4 « La
-- caisse de Romane » : ce qu'elle a vendu et gagné aujourd'hui, son mois, ses PV,
-- et ce qui lui manque pour le rang suivant.
--
-- LA RÈGLE (Thomas, 26/09) : la coach vend au prix du club ce qu'elle a acheté
-- sur sa plateforme avec SA remise. Ce qu'elle gagne sur une unité = le prix du
-- club − le prix public de l'unité × (1 − sa remise). Le calcul vit dans le front
-- (src/features/bbc/caisse/gains.ts, pur et testé) : le prix public et les PV
-- viennent du catalogue de l'app (herbalifeCatalog.ts, pvCatalog.ts), que la base
-- ne connaît pas. La base rend les faits : ses ventes, la carte, son rang.
--
-- CE QUE FAIT CE FICHIER (additif)
--   1. club_carte.recette : ce qu'une unité contient, en doses de la recette du
--      club, pour les produits sans référence Herbalife — le grand thé-aloé (une
--      dose de thé + une d'aloé) et le shake F1 à emporter (F1 + PDM).
--   2. club_ma_caisse(mois) : les ventes de la coach QUI APPELLE sur le mois (hors
--      annulées), avec le prénom de la membre, la carte du club et son rang.
--      Elle ne voit que les siennes ; le club entier, c'est le lot 4.
-- =============================================================================

-- ── 1. Ce qu'une unité contient, quand elle n'a pas de référence ────────────
alter table public.club_carte add column if not exists recette jsonb;
alter table public.club_carte drop constraint if exists club_carte_recette_objet;
alter table public.club_carte add constraint club_carte_recette_objet
  check (recette is null or jsonb_typeof(recette) = 'object');

comment on column public.club_carte.recette is
  'Doses de la recette du club dans une unité ({"the": 1, "aloe": 1}), pour estimer son coût et ses PV quand le produit n''a pas de référence Herbalife.';

update public.club_carte set recette = '{"the": 1, "aloe": 1}'::jsonb
 where nom = 'Grand thé-aloé' and recette is null;
update public.club_carte set recette = '{"f1": 1, "pdm": 1}'::jsonb
 where nom = 'Shake F1 à emporter' and recette is null;

-- ── 2. Ma caisse : mes ventes du mois, la carte, mon rang ───────────────────
create or replace function public.club_ma_caisse(p_mois date default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, extensions
as $$
declare
  v_moi   uuid := (select auth.uid());
  v_club  uuid := public.bbc_mon_club();
  v_debut date := date_trunc('month', coalesce(p_mois, (now() at time zone 'Europe/Paris')::date))::date;
  v_fin   date := (date_trunc('month', coalesce(p_mois, (now() at time zone 'Europe/Paris')::date)) + interval '1 month')::date;
begin
  if v_moi is null then
    raise exception 'non autorise';
  end if;
  return jsonb_build_object(
    'mois', to_char(v_debut, 'YYYY-MM'),
    'rang', (select u.current_rank from public.users u where u.id = v_moi),
    'carte', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', k.id, 'ref', k.ref_herbalife, 'portions', k.portions,
               'maison', k.maison, 'recette', k.recette))
        from public.club_carte k
       where k.club_id = v_club), '[]'::jsonb),
    'ventes', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', v.id, 'created_at', v.created_at, 'client_id', v.client_id,
               'membre', nullif(btrim(coalesce(c.first_name, '') || ' ' ||
                                coalesce(nullif(left(btrim(coalesce(c.last_name, '')), 1), '') || '.', '')), ''),
               'total', v.total, 'lignes', v.lignes)
             order by v.created_at desc)
        from public.club_ventes v
        left join public.clients c on c.id = v.client_id
       where v.vendeur_id = v_moi
         and v.annulee_at is null
         and v.created_at >= (v_debut::timestamp at time zone 'Europe/Paris')
         and v.created_at <  (v_fin::timestamp at time zone 'Europe/Paris')), '[]'::jsonb)
  );
end;
$$;
revoke all on function public.club_ma_caisse(date) from public, anon;
grant execute on function public.club_ma_caisse(date) to authenticated;
