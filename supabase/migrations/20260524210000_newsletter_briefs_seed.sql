-- =============================================================================
-- Chantier #8 étape 8.11 (2026-05-24) — Seed templates newsletter_briefs.
-- 4 templates saisonniers + 8 neutres mensuels (décision D4.3 brainstorm).
-- =============================================================================
--
-- Chaque brief contient des sections pré-remplies (jsonb) que l'admin peut
-- utiliser comme point de départ via la page de création.
--
-- Idempotent : ok à rejouer (ON CONFLICT key DO UPDATE).
-- =============================================================================

insert into public.newsletter_briefs (key, label, season, default_subtitle, default_sections, is_seasonal, active, position)
values

-- ─── 4 SAISONNIERS ──────────────────────────────────────────────────────────

('summer-prep', 'Préparation été', 'summer',
 'Hydratation, repas légers, voyages — tout pour bien préparer ta saison.',
 '[
   {"emoji":"💧","tag_label":"Conseil #1 · Hydratation","title":"L''eau, ton meilleur partenaire d''été","body_md":"Quand les températures grimpent, ton corps perd jusqu''à 1,5 L d''eau par heure rien qu''en transpirant.\n\n- 1,5 à 2 L par jour minimum\n- Bois par petites gorgées régulières\n- Évite les boissons trop sucrées\n- Ajoute citron, menthe, concombre pour le goût","saviez_vous_md":"Avoir soif = être déjà légèrement déshydraté. Anticipe en buvant régulièrement, même sans soif.","saviez_vous_label":"Le saviez-vous ?","is_public":true,"show_cta_bilan":false,"paywall_mode":"none","position":1},
   {"emoji":"🥗","tag_label":"Conseil #2 · Alimentation","title":"3 idées de repas légers en 10 minutes","body_md":"Les jours longs et la chaleur coupent l''appétit. Privilégie des plats **frais, riches en eau et faciles à digérer**.\n\n- **Bowl avocat-pois chiches** : avocat, pois chiches, tomates cerise, feta, basilic, citron\n- **Tartare de courgette-saumon** : courgette crue, saumon fumé, aneth, pignons\n- **Salade pastèque-feta-menthe** : pastèque, feta émiettée, menthe, pistaches","saviez_vous_md":"","saviez_vous_label":"Le saviez-vous ?","is_public":true,"show_cta_bilan":true,"paywall_mode":"none","position":2},
   {"emoji":"✈️","tag_label":"Conseil #3 · Voyage","title":"Voyage à l''étranger : prépare ton intestin","body_md":"Changer de pays = changer la flore intestinale.\n\n- **Probiotiques** : commence 5-7 jours avant le départ\n- **Eau en bouteille** uniquement dans les pays à risque\n- **Lave les fruits** ou pèle-les\n- **Évite** glaçons, salades crues, aliments tièdes","saviez_vous_md":"","saviez_vous_label":"Le saviez-vous ?","is_public":true,"show_cta_bilan":false,"paywall_mode":"none","position":3},
   {"emoji":"💪","tag_label":"Conseil #4 · Mouvement","title":"Bouger en vacances, sans s''épuiser","body_md":"Tu pars en vacances et tu veux maintenir ton énergie sans transformer ton séjour en stage commando ? Voici une routine simple, **15 minutes par jour**…\n\n- Réveil articulaire\n- Cardio doux (natation, marche)\n- Renforcement minimaliste","saviez_vous_md":"","saviez_vous_label":"Le saviez-vous ?","is_public":false,"show_cta_bilan":false,"paywall_mode":"teaser","position":4}
 ]'::jsonb,
 true, true, 1),

('back-to-school', 'Rentrée énergie', 'autumn',
 'Routine sommeil, alimentation pour reprendre le rythme, immunité famille.',
 '[
   {"emoji":"😴","tag_label":"Conseil #1 · Sommeil","title":"Reprendre un rythme de sommeil après l''été","body_md":"L''été casse la routine. La rentrée demande un reset progressif (pas brutal).\n\n- Re-cale ton heure de coucher 15 min plus tôt chaque jour\n- Coupe les écrans 30 min avant\n- Lumière du matin = signal cortisol\n- Pas de café après 14h pendant 2 semaines","saviez_vous_md":"7-9 h de sommeil régulier = +20% de productivité mesurable au bureau.","saviez_vous_label":"Le saviez-vous ?","is_public":true,"show_cta_bilan":false,"paywall_mode":"none","position":1},
   {"emoji":"🍱","tag_label":"Conseil #2 · Alimentation","title":"Lunch box rentrée : 5 idées qui tiennent","body_md":"Le piège : sandwich ou plat préparé qui te plombe à 14h.\n\n- **Bowl quinoa + poulet + légumes rôtis**\n- **Wrap dinde-avocat-épinards**\n- **Salade lentilles-feta-tomates**\n- **Buddha bowl pois chiches**\n- **Tortilla œufs-courgettes-pommes de terre**","saviez_vous_md":"","saviez_vous_label":"","is_public":true,"show_cta_bilan":true,"paywall_mode":"none","position":2},
   {"emoji":"🛡","tag_label":"Conseil #3 · Immunité","title":"Préparer son immunité avant les premiers virus","body_md":"Septembre = retour des collègues malades, école qui ramène tout. Anticipe.\n\n- Vitamine D (rare en France entre oct-mars)\n- Vitamine C alimentaire (kiwi, poivron, brocoli)\n- Zinc (huîtres, viande rouge, légumes secs)\n- Sommeil >7h\n- Marche extérieure 20 min/jour","saviez_vous_md":"80% du système immunitaire vit dans l''intestin. Probiotiques + fibres = bouclier solide.","saviez_vous_label":"Le saviez-vous ?","is_public":true,"show_cta_bilan":false,"paywall_mode":"none","position":3}
 ]'::jsonb,
 true, true, 2),

('winter-immunity', 'Boost immunité hiver', 'winter',
 'Renforcer ses défenses, garder l''énergie quand les jours raccourcissent.',
 '[
   {"emoji":"☀️","tag_label":"Conseil #1 · Vitamine D","title":"Vitamine D : pourquoi tout le monde en manque l''hiver","body_md":"En France entre octobre et mars, le soleil ne fait plus assez d''angle pour que ta peau synthétise la vitamine D.\n\n- 80% des Français sont en carence en hiver\n- Symptômes : fatigue, baisse moral, immunité faible\n- Apport recommandé : 1000-2000 UI/jour\n- Sources alimentaires : saumon, sardines, jaune d''œuf","saviez_vous_md":"La vitamine D est techniquement une hormone, pas une vitamine. Elle régule plus de 200 gènes.","saviez_vous_label":"Le saviez-vous ?","is_public":true,"show_cta_bilan":true,"paywall_mode":"none","position":1},
   {"emoji":"🍵","tag_label":"Conseil #2 · Hydratation","title":"Boire chaud, plus que jamais","body_md":"L''hiver on a moins soif mais l''air sec du chauffage déshydrate autant que la chaleur d''été.\n\n- Tisanes (thym, gingembre, citron)\n- Bouillon maison (collagène + minéraux)\n- 1,5 L/jour minimum, chaud de préférence\n- Évite trop de café (diurétique)","saviez_vous_md":"","saviez_vous_label":"","is_public":true,"show_cta_bilan":false,"paywall_mode":"none","position":2},
   {"emoji":"🥦","tag_label":"Conseil #3 · Légumes d''hiver","title":"3 légumes oubliés à remettre au menu","body_md":"L''hiver a ses super-aliments locaux et bon marché.\n\n- **Chou kale** : vitamine C, K, antioxydants\n- **Topinambour** : prébiotiques, ami de l''intestin\n- **Panais** : fibres + minéraux, doux comme la carotte","saviez_vous_md":"","saviez_vous_label":"","is_public":false,"show_cta_bilan":false,"paywall_mode":"teaser","position":3}
 ]'::jsonb,
 true, true, 3),

('new-year-fresh', 'Nouvelle année, nouveau toi', 'spring',
 'Reset post-fêtes, objectifs réalistes, énergie de printemps qui revient.',
 '[
   {"emoji":"🔄","tag_label":"Conseil #1 · Reset","title":"Reset janvier sans se faire violence","body_md":"Après les fêtes, le corps réclame du doux, pas du flagellant.\n\n- 1 semaine sans alcool ni sucre raffiné\n- Beaucoup d''eau + tisanes\n- Légumes de saison vapeur, poissons blancs\n- Sommeil >8h\n- Pas de régime drastique → effet rebond garanti","saviez_vous_md":"Le foie a besoin de 4-6 semaines pour vraiment se régénérer. Sois patient(e) avec toi.","saviez_vous_label":"Le saviez-vous ?","is_public":true,"show_cta_bilan":true,"paywall_mode":"none","position":1},
   {"emoji":"🎯","tag_label":"Conseil #2 · Objectifs","title":"3 objectifs qui tiennent (et pas 50 qu''on lâche)","body_md":"Le piège classique : liste de 20 résolutions impossibles à tenir 3 semaines.\n\n- **1 objectif corps** (sommeil OU sport OU alimentation, pas les 3)\n- **1 objectif mental** (lecture, méditation, gratitude)\n- **1 objectif relationnel** (1 appel/semaine à un proche)\n\nMaximum 3. Tu valides en mars, tu ajoutes en avril.","saviez_vous_md":"","saviez_vous_label":"","is_public":true,"show_cta_bilan":false,"paywall_mode":"none","position":2},
   {"emoji":"☀️","tag_label":"Conseil #3 · Lumière","title":"Lumière matinale = ton meilleur reset hormonal","body_md":"10-15 min de lumière dehors le matin (même nuageux) → cascade hormonale toute la journée.\n\n- Cortisol propre = énergie\n- Mélatonine décalée = bon sommeil le soir\n- Sérotonine = humeur stable","saviez_vous_md":"","saviez_vous_label":"","is_public":false,"show_cta_bilan":false,"paywall_mode":"teaser","position":3}
 ]'::jsonb,
 true, true, 4),

-- ─── 8 NEUTRES MENSUELS (squelette minimaliste) ─────────────────────────────

('neutral-march', 'Édition mars (neutre)', 'neutral', 'Conseils nutrition & bien-être du mois.',
 '[{"emoji":"🌱","tag_label":"Conseil #1","title":"Titre conseil 1","body_md":"À rédiger.","saviez_vous_md":"","saviez_vous_label":"","is_public":true,"show_cta_bilan":false,"paywall_mode":"none","position":1}]'::jsonb,
 false, true, 10),

('neutral-april', 'Édition avril (neutre)', 'neutral', 'Conseils nutrition & bien-être du mois.',
 '[{"emoji":"🌿","tag_label":"Conseil #1","title":"Titre conseil 1","body_md":"À rédiger.","saviez_vous_md":"","saviez_vous_label":"","is_public":true,"show_cta_bilan":false,"paywall_mode":"none","position":1}]'::jsonb,
 false, true, 11),

('neutral-may', 'Édition mai (neutre)', 'neutral', 'Conseils nutrition & bien-être du mois.',
 '[{"emoji":"🌻","tag_label":"Conseil #1","title":"Titre conseil 1","body_md":"À rédiger.","saviez_vous_md":"","saviez_vous_label":"","is_public":true,"show_cta_bilan":false,"paywall_mode":"none","position":1}]'::jsonb,
 false, true, 12),

('neutral-june', 'Édition juin (neutre)', 'neutral', 'Conseils nutrition & bien-être du mois.',
 '[{"emoji":"🌸","tag_label":"Conseil #1","title":"Titre conseil 1","body_md":"À rédiger.","saviez_vous_md":"","saviez_vous_label":"","is_public":true,"show_cta_bilan":false,"paywall_mode":"none","position":1}]'::jsonb,
 false, true, 13),

('neutral-september', 'Édition septembre (neutre)', 'neutral', 'Conseils nutrition & bien-être du mois.',
 '[{"emoji":"📚","tag_label":"Conseil #1","title":"Titre conseil 1","body_md":"À rédiger.","saviez_vous_md":"","saviez_vous_label":"","is_public":true,"show_cta_bilan":false,"paywall_mode":"none","position":1}]'::jsonb,
 false, true, 14),

('neutral-october', 'Édition octobre (neutre)', 'neutral', 'Conseils nutrition & bien-être du mois.',
 '[{"emoji":"🎃","tag_label":"Conseil #1","title":"Titre conseil 1","body_md":"À rédiger.","saviez_vous_md":"","saviez_vous_label":"","is_public":true,"show_cta_bilan":false,"paywall_mode":"none","position":1}]'::jsonb,
 false, true, 15),

('neutral-november', 'Édition novembre (neutre)', 'neutral', 'Conseils nutrition & bien-être du mois.',
 '[{"emoji":"🍂","tag_label":"Conseil #1","title":"Titre conseil 1","body_md":"À rédiger.","saviez_vous_md":"","saviez_vous_label":"","is_public":true,"show_cta_bilan":false,"paywall_mode":"none","position":1}]'::jsonb,
 false, true, 16),

('neutral-february', 'Édition février (neutre)', 'neutral', 'Conseils nutrition & bien-être du mois.',
 '[{"emoji":"❄️","tag_label":"Conseil #1","title":"Titre conseil 1","body_md":"À rédiger.","saviez_vous_md":"","saviez_vous_label":"","is_public":true,"show_cta_bilan":false,"paywall_mode":"none","position":1}]'::jsonb,
 false, true, 17)

on conflict (key) do update set
  label = excluded.label,
  season = excluded.season,
  default_subtitle = excluded.default_subtitle,
  default_sections = excluded.default_sections,
  is_seasonal = excluded.is_seasonal,
  active = excluded.active,
  position = excluded.position;
