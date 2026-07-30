-- =============================================================================
-- Reclassement des 2 soins visage + kit Rituel Peau Nette (2026-07-30)
-- =============================================================================
-- Le Nettoyant Apaisant Aloe et le Masque d'Argile Menthe sont des soins VISAGE
-- (gamme HL SKIN), pas de l'Herbal Aloe corps/cheveux : ils passent de `aloe` à
-- `eclat`, avec les autres soins visage (nettoyer → purifier → cibler). La
-- catégorie `aloe` reste honnête : apaiser, corps & cheveux. Décision Thomas.
-- + Kit routine visage demandé (« nettoyant, masque, crème ») : Rituel Peau Nette
--   112 € vs 125,50 € à l'unité (−13,50 €). PV = somme (convention kits).
-- Idempotent.
-- =============================================================================

update public.shop_products set concern='eclat', updated_at=now()
where slug in ('nettoyant-apaisant-aloe','masque-argile-menthe');

insert into public.shop_products
  (slug, legacy_catalog_id, name, tagline, description, concern, price_ttc, currency, pv, volume_label, images, badge, bundle_items, sort_order, active)
values
  ('rituel-peau-nette', 'hlskin-kit-rituel-peau-nette',
   $$Rituel Peau Nette$$,
   $$Nettoyer · Purifier · Illuminer — la routine anti-imperfections.$$,
   $$La routine complète pour une peau nette : le Nettoyant Apaisant retire maquillage et impuretés sans décaper, le Masque d'Argile désincruste les pores 1 à 2 fois par semaine, le Sérum Niacinamide 10 % unifie le teint et réduit les imperfections au quotidien. Le trio qui règle le grain de peau.$$,
   'eclat', 112.00, 'EUR', 62.65, $$3 produits$$, '[]'::jsonb, 'kit',
   $$["nettoyant-apaisant-aloe","masque-argile-menthe","serum-niacinamide"]$$::jsonb, 23, true)
on conflict (slug) do update set
  name=excluded.name, tagline=excluded.tagline, description=excluded.description, concern=excluded.concern,
  price_ttc=excluded.price_ttc, pv=excluded.pv, volume_label=excluded.volume_label,
  badge=excluded.badge, bundle_items=excluded.bundle_items, sort_order=excluded.sort_order,
  active=excluded.active, updated_at=now();
