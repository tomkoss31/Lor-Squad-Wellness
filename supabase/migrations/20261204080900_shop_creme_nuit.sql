-- =============================================================================
-- Boutique HL SKIN — Crème de Nuit Revitalisante en vente (2026-07-11)
-- =============================================================================
--
-- La Crème de Nuit (SKU Herbalife 539K, 50 ml, catégorie « Beauté à tout âge »)
-- est bien commercialisée → on la passe de teaser « Bientôt » à vrai produit.
-- price_ttc = 60,00 € (confirmé Thomas 2026-07-11) + pv 35,20.
-- Aussi : le bucket product-images accepte désormais application/pdf (guide
-- affiliation) et sa limite passe à 15 Mo. Idempotent.
-- =============================================================================

begin;

insert into public.shop_products
  (slug, legacy_catalog_id, name, tagline, description, concern, ingredient_hero, how_to, benefits, faq, price_ttc, currency, pv, volume_label, images, badge, sort_order, active)
values (
  'creme-nuit',
  'hlskin-creme-nuit',
  $$Crème de Nuit Revitalisante$$,
  $$Le soin de nuit qui régénère et repulpe la peau pendant ton sommeil.$$,
  $$Crème de nuit riche inspirée de l'expertise coréenne : elle travaille pendant que tu dors pour régénérer, nourrir et repulper la peau. Au réveil, le teint est reposé, lisse et éclatant. Dernier geste de ta routine du soir. Testée dermatologiquement.$$,
  'age',
  $$Une texture riche et fondante, gorgée d'actifs nourrissants, qui accompagne la régénération naturelle de la peau pendant la nuit.$$,
  $$Le soir, en dernier geste, sur peau propre et sèche : masser une noisette sur le visage et le cou.$$,
  $$["Régénère la peau pendant le sommeil","Nourrit et repulpe en profondeur","Teint reposé, lisse et éclatant au réveil","Texture riche et fondante · anti-âge"]$$::jsonb,
  $$[{"q":"Matin ou soir ?","a":"Le soir, en tout dernier geste, sur peau propre. Elle agit pendant que tu dors."},{"q":"Après le sérum ?","a":"Oui : nettoie, applique ton sérum, puis scelle avec la Crème de Nuit."}]$$::jsonb,
  60.00, 'EUR', 35.20,
  $$50 ml$$,
  $$[{"url":"https://gqxnndwrdbghxflwmfxy.supabase.co/storage/v1/object/public/product-images/hlskin/creme-nuit/card-nuit.webp","kind":"packshot"}]$$::jsonb,
  'new', 7, true
)
on conflict (slug) do update set
  name=excluded.name, tagline=excluded.tagline, description=excluded.description, concern=excluded.concern,
  ingredient_hero=excluded.ingredient_hero, how_to=excluded.how_to, benefits=excluded.benefits, faq=excluded.faq,
  price_ttc=excluded.price_ttc, pv=excluded.pv, volume_label=excluded.volume_label, images=excluded.images,
  badge=excluded.badge, sort_order=excluded.sort_order, active=excluded.active, updated_at=now();

-- Bucket : accepter les PDF (guide affiliation) + relever la limite à 15 Mo.
update storage.buckets
set allowed_mime_types = array['image/png','image/jpeg','image/webp','image/avif','video/mp4','application/pdf'],
    file_size_limit = 15728640
where id='product-images';

commit;
