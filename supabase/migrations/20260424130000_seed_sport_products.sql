-- Chantier Prise de masse (2026-04-24) : seed produits sport dans pv_products.
ALTER TABLE public.pv_products ADD COLUMN IF NOT EXISTS category text;
ALTER TABLE public.pv_products ADD COLUMN IF NOT EXISTS volume_label text;
INSERT INTO public.pv_products (id, name, category, price_public, pv, quantite_label, duree_reference_jours, active) VALUES
  ('barres-proteinees-achieve','Barres Protéinées Achieve H24','sport',27.50,0,'boîte de 6 barres',30,true),
  ('liftoff-max','Liftoff Max H24','sport',38.50,0,'boîte de 10 sachets',30,true),
  ('rebuild-strength','Rebuild Strength','sport',83.50,0,'sachet 1000g',30,true),
  ('creatine-plus','Créatine+','sport',39.50,0,'sachet 228g',30,true),
  ('hydrate','Hydrate','sport',47.50,0,'boîte',30,true),
  ('cr7-drive','CR7 Drive','sport',27.50,0,'boîte 540g',30,true),
  ('collagene-skin-booster','Collagène Skin Booster','sport',84.50,0,'pot',30,true),
  ('shaker-herbalife','Shaker Herbalife','accessoire',30.00,0,'unité',365,true)
ON CONFLICT (id) DO UPDATE SET
  name=excluded.name, category=excluded.category, price_public=excluded.price_public,
  quantite_label=excluded.quantite_label, duree_reference_jours=excluded.duree_reference_jours, active=excluded.active;
UPDATE public.pv_products SET volume_label=quantite_label WHERE volume_label IS NULL;
