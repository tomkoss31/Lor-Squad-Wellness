-- =============================================================================
-- Chantier Boutique HL SKIN — Étape 1 : seed catalogue gamme HL SKIN (2026-07-10)
-- =============================================================================
--
-- Seed des 6 produits de la gamme HL SKIN dans `shop_products`.
-- Prix / PV / contenance : source « Liste de prix distributeurs Herbalife
-- France, vigueur 10/03/2026 » (identiques à src/data/pvCatalog.ts).
--
-- ⚠️ tagline / description / benefits / faq / ingredient_hero = COPY PLACEHOLDER
-- rédigé pour démarrer — à valider/réécrire par Thomas. images = [] (photos à
-- venir). rating = null + reviews_count = 0 (pas d'avis inventés en base).
--
-- Idempotent : on conflict (slug) do update. Rejouable sans doublon.
-- =============================================================================

begin;

insert into public.shop_products
  (slug, legacy_catalog_id, name, tagline, description, concern, ingredient_hero,
   how_to, benefits, faq, price_ttc, pv, volume_label, badge, sort_order, active)
values
  (
    'serum-niacinamide', 'hlskin-niacinamide',
    'Sérum Niacinamide 10 %',
    'Resserre le grain, unifie le teint, régule le sébum.',
    'Le héros de la routine HL SKIN. Une concentration de niacinamide à 10 % pour un grain de peau resserré et un teint visiblement unifié, tout en respectant la barrière cutanée.',
    'eclat',
    'Niacinamide (vitamine B3) dosée à 10 % — la concentration prouvée efficace sans irriter.',
    'Matin & soir, 3-4 gouttes sur peau propre avant la crème.',
    '["Pores visiblement resserrés en 4 semaines","Teint unifié, taches atténuées","Toléré par les peaux sensibles"]'::jsonb,
    '[{"q":"Convient aux peaux sensibles ?","a":"Oui, 10 % est le seuil optimal efficacité / tolérance."},{"q":"Au bout de combien de temps ?","a":"Grain plus lisse dès 2 semaines, teint unifié vers 4 semaines."}]'::jsonb,
    64.50, 31.7, '30 ml', 'best-seller', 1, true
  ),
  (
    'collagen-booster', 'collagen-skin-booster',
    'Collagen Skin Booster',
    'La beauté qui se boit. Rebond et éclat de l''intérieur.',
    'Une cure de collagène marin à boire qui nourrit la peau là où les crèmes n''atteignent pas : souplesse, rebond et éclat, jour après jour.',
    'eclat',
    'Peptides de collagène marin hautement biodisponibles.',
    '1 dose par jour, de préférence le soir, en cure de 30 jours.',
    '["Collagène marin hautement assimilable","Souplesse et éclat en cure","Rituel du soir simple"]'::jsonb,
    '[{"q":"Au bout de combien de temps ?","a":"Les premiers effets éclat / souplesse apparaissent vers 3 semaines."},{"q":"Compatible grossesse ?","a":"Par précaution, demande l''avis de ton médecin."}]'::jsonb,
    84.50, 37.1, 'cure 30 doses', 'new', 2, true
  ),
  (
    'creme-tension', 'hlskin-creme-tension',
    'Crème Tension Ultime',
    'Effet repulpant et tenseur immédiat.',
    'Une crème anti-âge à l''effet tenseur immédiat : peau tendue, rebondie et lissée dès la première application, pour un fini velours.',
    'age',
    'Complexe tenseur + agents repulpants pour un effet « lifting » cosmétique.',
    'Matin et/ou soir sur l''ensemble du visage.',
    '["Peau tendue et rebondie dès l''application","Lisse les ridules","Fini velours non gras"]'::jsonb,
    '[{"q":"Effet immédiat ou durable ?","a":"Les deux : tenseur immédiat, repulpant sur la durée."}]'::jsonb,
    71.50, 35.2, '50 ml', null, 3, true
  ),
  (
    'contour-yeux', 'hlskin-contour-yeux',
    'Crème Contour des Yeux',
    'Décongestionne le regard, atténue les cernes.',
    'Un soin ciblé pour la peau fine du contour de l''œil : poches et cernes réduits au réveil, regard hydraté et défatigué.',
    'age',
    'Actifs décongestionnants + hydratation ciblée pour la zone du regard.',
    'Matin & soir, tapoter délicatement sous l''œil.',
    '["Poches et cernes réduits au réveil","Zone du regard hydratée","Application précise"]'::jsonb,
    '[{"q":"Sous le maquillage ?","a":"Oui, laisse pénétrer 1 minute avant le teint."}]'::jsonb,
    60.00, 26.7, '15 ml', null, 4, true
  ),
  (
    'gel-nettoyant', 'hlskin-gel-nettoyant',
    'Gel Nettoyant Resurfaçant',
    'Nettoie et lisse la surface sans dessécher.',
    'Un gel nettoyant resurfaçant quotidien qui décrasse en douceur et prépare la peau à recevoir le sérum, sans jamais tirailler.',
    'pores',
    'Actifs doux resurfaçants + base lavante respectueuse de la barrière cutanée.',
    'Matin & soir, masser sur peau humide puis rincer.',
    '["Nettoie en profondeur sans tirailler","Prépare la peau à absorber le sérum","Texture gel fondante"]'::jsonb,
    '[{"q":"Ça mousse ?","a":"Une mousse fine et douce, jamais décapante."}]'::jsonb,
    43.50, 21.3, '150 ml', null, 5, true
  ),
  (
    'lotion-mains-corps', 'hlskin-lotion-mains-corps',
    'Lotion Mains & Corps',
    'Hydratation fondante à l''aloe, absorption immédiate.',
    'Une lotion nourrissante mains et corps à l''aloe : absorption immédiate, aucun effet gras, parfum délicat. Le geste hydratation du quotidien.',
    'hydratation',
    'Aloe vera + agents hydratants pour une peau souple toute la journée.',
    'Aussi souvent que nécessaire sur mains et corps.',
    '["Absorption rapide, zéro effet gras","Parfum délicat","Format généreux"]'::jsonb,
    '[{"q":"Convient au visage ?","a":"Formulée pour le corps ; pour le visage, préfère la crème dédiée."}]'::jsonb,
    32.00, 15.9, '200 ml', null, 6, true
  )
on conflict (slug) do update set
  legacy_catalog_id = excluded.legacy_catalog_id,
  name            = excluded.name,
  tagline         = excluded.tagline,
  description     = excluded.description,
  concern         = excluded.concern,
  ingredient_hero = excluded.ingredient_hero,
  how_to          = excluded.how_to,
  benefits        = excluded.benefits,
  faq             = excluded.faq,
  price_ttc       = excluded.price_ttc,
  pv              = excluded.pv,
  volume_label    = excluded.volume_label,
  badge           = excluded.badge,
  sort_order      = excluded.sort_order,
  active          = excluded.active,
  updated_at      = now();

commit;
