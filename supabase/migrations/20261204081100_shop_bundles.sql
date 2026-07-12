-- =============================================================================
-- Kits/bundles boutique HL SKIN (2026-07-12)
-- =============================================================================
-- Un bundle = une entrée shop_products avec son prix pack + la liste des produits
-- inclus (bundle_items jsonb, slugs). Le panier + create-shop-checkout le traitent
-- comme un produit normal (prix recalculé serveur depuis price_ttc) → zéro modif
-- checkout. Levier panier moyen (AOV). Idempotent.
-- =============================================================================

alter table public.shop_products add column if not exists bundle_items jsonb;

comment on column public.shop_products.bundle_items is
  'Si non NULL : ce produit est un KIT. Tableau JSON des slugs produits inclus (affichage). Le prix pack = price_ttc.';

insert into public.shop_products
  (slug, legacy_catalog_id, name, tagline, description, concern, price_ttc, currency, pv, volume_label, images, badge, bundle_items, sort_order, active)
values
  ('duo-eclat', 'hlskin-kit-duo-eclat',
   $$Duo Éclat$$,
   $$Le nettoyage + le sérum star, pour un teint frais dès la 1re semaine.$$,
   $$Le duo essentiel pour révéler l'éclat : le Gel Nettoyant Resurfaçant + le Sérum Niacinamide 10 %. Nettoie en douceur puis unifie et illumine le teint. L'entrée idéale dans la routine coréenne.$$,
   null, 97.00, 'EUR', 53.00, $$2 produits$$, '[]'::jsonb, 'kit',
   $$["gel-nettoyant","serum-niacinamide"]$$::jsonb, 20, true),

  ('routine-essentielle', 'hlskin-kit-routine-essentielle',
   $$Routine Essentielle$$,
   $$Nettoyer · Cibler · Hydrater — la routine coréenne en 3 gestes.$$,
   $$La routine complète à l'essentiel : Gel Nettoyant + Sérum Niacinamide 10 % + Crème Tension Ultime. Le trio nettoyer / cibler / hydrater pour une peau nette, repulpée et éclatante, matin et soir.$$,
   null, 159.00, 'EUR', 88.20, $$3 produits$$, '[]'::jsonb, 'kit',
   $$["gel-nettoyant","serum-niacinamide","creme-tension"]$$::jsonb, 21, true),

  ('rituel-anti-age', 'hlskin-kit-rituel-anti-age',
   $$Rituel Anti-âge$$,
   $$Le trio « Beauté à tout âge » : fermeté, contour, nuit régénérante.$$,
   $$Le rituel ciblé signes de l'âge : Crème Tension Ultime + Crème Contour des Yeux + Crème de Nuit Revitalisante. Rides, fermeté, regard, régénération nocturne — la peau travaille jour et nuit.$$,
   null, 169.00, 'EUR', 97.10, $$3 produits$$, '[]'::jsonb, 'kit',
   $$["creme-tension","contour-yeux","creme-nuit"]$$::jsonb, 22, true)
on conflict (slug) do update set
  name=excluded.name, tagline=excluded.tagline, description=excluded.description,
  price_ttc=excluded.price_ttc, pv=excluded.pv, volume_label=excluded.volume_label,
  badge=excluded.badge, bundle_items=excluded.bundle_items, sort_order=excluded.sort_order,
  active=excluded.active, updated_at=now();
