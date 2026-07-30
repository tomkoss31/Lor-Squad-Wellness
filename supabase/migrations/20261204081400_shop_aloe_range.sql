-- =============================================================================
-- Gamme Aloé sur la boutique (2026-07-30)
-- =============================================================================
-- 6 produits Herbal Aloe / soins visage + 1 kit duo cheveux, dans une nouvelle
-- catégorie `aloe` (section dédiée + upsell). Prix & PV = catalogue interne
-- src/data/pvCatalog.ts (source de vérité prix Herbalife) :
--   gel apaisant 18,00/8,30 · shampoing 18,00/8,30 · après-shampoing 18,00/8,30
--   savon 18,50/8,30 · nettoyant apaisant 33,00/16,75 · masque argile 28,00/14,20
-- Le Gel Apaisant est mis en avant sur ses usages réels (piqûres, irritations,
-- allergies, coups de soleil, après-rasage) — retour terrain Thomas.
-- Visuels officiels 800px → webp 1080 carrés dans product-images/hlskin/<slug>/.
-- Idempotent (on conflict do update).
-- =============================================================================

insert into public.shop_products
  (slug, legacy_catalog_id, name, tagline, description, concern, ingredient_hero, how_to, benefits, faq, price_ttc, currency, pv, volume_label, images, badge, sort_order, active)
values
  ('gel-apaisant-aloe', 'herbal-aloe-gel-apaisant',
   $$Gel Apaisant Herbal Aloe$$,
   $$LE geste d'urgence de la maison : piqûres, irritations, coups de soleil.$$,
   $$Le produit à toujours avoir sous la main. Gel non gras à 40 % d'aloe vera : il apaise et rafraîchit instantanément la peau agressée — piqûres d'insecte, irritations, réactions allergiques, petits bobos, coups de soleil, feu du rasoir, peau qui tire après la plage. Absorbe vite, ne colle pas, s'utilise autant de fois que nécessaire, sur le visage comme sur le corps, toute la famille.$$,
   'aloe',
   $$40 % de gel d'aloe vera — apaise, rafraîchit et hydrate les peaux agressées sans effet gras.$$,
   $$Applique une fine couche sur la zone concernée, aussi souvent que nécessaire. Effet fraîcheur immédiat. Astuce : garde-le au frigo l'été, et emporte-le en vacances.$$,
   $$["Apaise piqûres d'insecte et démangeaisons","Calme irritations, rougeurs et réactions cutanées","Soulage les coups de soleil et la peau qui chauffe","Après-rasage / après-épilation : stoppe le feu","Texture non grasse, absorption rapide · visage et corps","Toute la famille, aussi souvent que besoin"]$$::jsonb,
   $$[{"q":"On l'utilise pour quoi exactement ?","a":"C'est le produit à tout faire : piqûres d'insecte, irritations, allergies, petits bobos, coups de soleil, après-rasage, peau qui tire. Un incontournable de la trousse."},{"q":"Ça colle ?","a":"Non, c'est un gel non gras qui pénètre vite — tu peux te rhabiller juste après."},{"q":"Sur le visage ?","a":"Oui, visage et corps, et pour toute la famille."}]$$::jsonb,
   18.00, 'EUR', 8.30, $$200 ml$$,
   $$[{"url":"https://gqxnndwrdbghxflwmfxy.supabase.co/storage/v1/object/public/product-images/hlskin/herbal-aloe-gel-apaisant/card.webp","kind":"packshot"}]$$::jsonb,
   'best-seller', 30, true),

  ('shampoing-fortifiant-aloe', 'herbal-aloe-shampoing',
   $$Shampoing Fortifiant Herbal Aloe$$,
   $$Nettoie en douceur, fortifie et fait briller — sans alourdir.$$,
   $$Shampoing à l'aloe vera qui nettoie en douceur tout en fortifiant la fibre. Formulé sans sulfates ajoutés, il respecte le cuir chevelu (même sensible) et laisse les cheveux souples, brillants et faciles à coiffer. Idéal en duo avec l'après-shampoing.$$,
   'aloe',
   $$Aloe vera + provitamine B5 : hydratent la fibre et apaisent le cuir chevelu.$$,
   $$Sur cheveux mouillés, masse une noisette du cuir chevelu vers les pointes, rince. Enchaîne avec l'après-shampoing.$$,
   $$["Nettoie sans agresser le cuir chevelu","Fortifie la fibre et limite la casse","Cheveux souples et brillants, sans effet lourd","Sans sulfates ajoutés · cuir chevelu sensible"]$$::jsonb,
   $$[{"q":"Cheveux colorés ?","a":"Oui, formule douce sans sulfates ajoutés, elle respecte la couleur."},{"q":"Usage quotidien ?","a":"Oui, il est assez doux pour des lavages fréquents."}]$$::jsonb,
   18.00, 'EUR', 8.30, $$250 ml$$,
   $$[{"url":"https://gqxnndwrdbghxflwmfxy.supabase.co/storage/v1/object/public/product-images/hlskin/herbal-aloe-shampoing-fortifiant/card.webp","kind":"packshot"}]$$::jsonb,
   null, 31, true),

  ('apres-shampoing-aloe', 'herbal-aloe-apres-shampoing',
   $$Après-shampoing Fortifiant Herbal Aloe$$,
   $$Démêle, nourrit, protège — cheveux doux dès le rinçage.$$,
   $$L'après-shampoing qui termine le rituel : il démêle instantanément, nourrit la fibre et forme un bouclier contre la casse et la sécheresse. Cheveux visiblement plus doux, plus souples, plus faciles à coiffer, sans effet gras ni racines alourdies.$$,
   'aloe',
   $$Aloe vera + agents nourrissants : hydratent et protègent la fibre sans l'alourdir.$$,
   $$Après le shampoing, applique des mi-longueurs aux pointes, laisse 1 à 2 minutes, rince abondamment.$$,
   $$["Démêle instantanément","Nourrit et protège de la casse","Cheveux doux, souples, faciles à coiffer","Sans alourdir les racines"]$$::jsonb,
   $$[{"q":"Sur les racines ?","a":"Non, applique des mi-longueurs aux pointes pour ne pas alourdir."},{"q":"Cheveux fins ?","a":"Oui — sa texture légère nourrit sans plomber."}]$$::jsonb,
   18.00, 'EUR', 8.30, $$250 ml$$,
   $$[{"url":"https://gqxnndwrdbghxflwmfxy.supabase.co/storage/v1/object/public/product-images/hlskin/herbal-aloe-apres-shampoing/card.webp","kind":"packshot"}]$$::jsonb,
   null, 32, true),

  ('savon-mains-corps-aloe', 'herbal-aloe-savon',
   $$Savon Mains & Corps Herbal Aloe$$,
   $$Lave et hydrate en même temps — fini les mains qui tirent.$$,
   $$Savon liquide à l'aloe vera pour les mains et le corps : il nettoie efficacement tout en hydratant, donc la peau ne tire plus après lavage. Mousse onctueuse, parfum frais et discret. Parfait au lavabo, sous la douche, et pour les peaux sensibles ou les mains lavées 20 fois par jour.$$,
   'aloe',
   $$Aloe vera hydratant : nettoie en préservant le film protecteur de la peau.$$,
   $$Sur peau humide, fais mousser sur les mains ou le corps, rince. Utilisable aussi souvent que nécessaire.$$,
   $$["Nettoie sans dessécher","Hydrate pendant le lavage","Mousse onctueuse, parfum frais","Mains très sollicitées et peaux sensibles"]$$::jsonb,
   $$[{"q":"Mains ou corps ?","a":"Les deux : un seul flacon pour le lavabo et la douche."},{"q":"Peaux sensibles ?","a":"Oui, sa formule à l'aloe préserve le film hydratant de la peau."}]$$::jsonb,
   18.50, 'EUR', 8.30, $$250 ml$$,
   $$[{"url":"https://gqxnndwrdbghxflwmfxy.supabase.co/storage/v1/object/public/product-images/hlskin/herbal-aloe-savon-mains-corps/card.webp","kind":"packshot"}]$$::jsonb,
   null, 33, true),

  ('nettoyant-apaisant-aloe', 'soin-nettoyant-aloe',
   $$Nettoyant Apaisant à l'Aloe Vera$$,
   $$Démaquille et nettoie les peaux sensibles, tout en douceur.$$,
   $$Nettoyant visage crémeux à l'aloe vera, pensé pour les peaux sensibles ou réactives : il retire maquillage et impuretés sans frotter ni décaper. La peau est nette, souple, apaisée — jamais tiraillée. Étape 1 du rituel visage.$$,
   'aloe',
   $$Aloe vera apaisant : nettoie et calme les peaux sensibles sans les décaper.$$,
   $$Matin et soir, masse sur peau humide en mouvements circulaires, rince à l'eau tiède.$$,
   $$["Démaquille et nettoie en douceur","Apaise les peaux sensibles et réactives","Ne tiraille pas après le rinçage","Texture crémeuse · visage"]$$::jsonb,
   $$[{"q":"Peaux réactives ?","a":"C'est justement sa cible : l'aloe apaise pendant le nettoyage."},{"q":"Ça démaquille ?","a":"Oui, maquillage et impuretés du quotidien, sans frotter."}]$$::jsonb,
   33.00, 'EUR', 16.75, $$150 ml$$,
   $$[{"url":"https://gqxnndwrdbghxflwmfxy.supabase.co/storage/v1/object/public/product-images/hlskin/skin-nettoyant-apaisant-aloe/card.webp","kind":"packshot"}]$$::jsonb,
   null, 34, true),

  ('masque-argile-menthe', 'soin-masque-argile',
   $$Masque d'Argile Purifiant à la Menthe$$,
   $$Le coup d'éclat détox : pores resserrés, peau nette en 10 minutes.$$,
   $$Masque à l'argile et à la menthe qui absorbe l'excès de sébum et désincruste les pores. Effet fraîcheur immédiat, teint plus net et matifié dès le rinçage. Le rendez-vous détox 1 à 2 fois par semaine, notamment sur la zone T.$$,
   'aloe',
   $$Argile purifiante + menthe : absorbe le sébum, désincruste et rafraîchit.$$,
   $$1 à 2 fois par semaine : applique une couche uniforme sur visage propre (évite le contour des yeux), laisse 10 minutes, rince à l'eau tiède.$$,
   $$["Absorbe l'excès de sébum, matifie","Désincruste et resserre visiblement les pores","Effet fraîcheur menthe immédiat","Teint plus net dès le rinçage · 1-2 ×/semaine"]$$::jsonb,
   $$[{"q":"À quelle fréquence ?","a":"1 à 2 fois par semaine, en complément de ta routine quotidienne."},{"q":"Peau sèche ?","a":"Oui, en ciblant la zone T (front, nez, menton) plutôt que tout le visage."}]$$::jsonb,
   28.00, 'EUR', 14.20, $$120 ml$$,
   $$[{"url":"https://gqxnndwrdbghxflwmfxy.supabase.co/storage/v1/object/public/product-images/hlskin/skin-masque-argile-menthe/card.webp","kind":"packshot"}]$$::jsonb,
   null, 35, true)
on conflict (slug) do update set
  name=excluded.name, tagline=excluded.tagline, description=excluded.description, concern=excluded.concern,
  ingredient_hero=excluded.ingredient_hero, how_to=excluded.how_to, benefits=excluded.benefits, faq=excluded.faq,
  price_ttc=excluded.price_ttc, pv=excluded.pv, volume_label=excluded.volume_label, images=excluded.images,
  badge=excluded.badge, sort_order=excluded.sort_order, active=excluded.active, updated_at=now();

-- Kit duo cheveux (shampoing + après-shampoing) — pack demandé par Thomas.
insert into public.shop_products
  (slug, legacy_catalog_id, name, tagline, description, concern, price_ttc, currency, pv, volume_label, images, badge, bundle_items, sort_order, active)
values
  ('duo-cheveux-aloe', 'hlskin-kit-duo-cheveux',
   $$Duo Cheveux Herbal Aloe$$,
   $$Shampoing + après-shampoing : le rituel cheveux complet.$$,
   $$Le duo qui va ensemble : le Shampoing Fortifiant nettoie et fortifie, l'Après-shampoing démêle et protège. Cheveux souples, brillants, faciles à coiffer — à prix groupé.$$,
   'aloe', 32.00, 'EUR', 16.60, $$2 produits$$, '[]'::jsonb, 'kit',
   $$["shampoing-fortifiant-aloe","apres-shampoing-aloe"]$$::jsonb, 36, true)
on conflict (slug) do update set
  name=excluded.name, tagline=excluded.tagline, description=excluded.description, concern=excluded.concern,
  price_ttc=excluded.price_ttc, pv=excluded.pv, volume_label=excluded.volume_label,
  badge=excluded.badge, bundle_items=excluded.bundle_items, sort_order=excluded.sort_order,
  active=excluded.active, updated_at=now();
