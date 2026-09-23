-- =============================================================================
-- Le journal : trouver les produits, et trois de plus (23/09/2026).
--
-- Thomas prend un Formula 3 le matin, le cherche dans le journal et ne le trouve
-- pas — alors qu'il Y EST. Deux raisons :
--   · la recherche ne regarde que le NOM écrit : « formule 3 » ou « F3 » ne
--     trouvent pas « Formula 3 » ;
--   · F3 et Beta Heart n'avaient de rang dans AUCUN repas (`rangs = {}`) : ils
--     n'apparaissaient donc jamais dans les suggestions, seulement par recherche.
--
-- 1. Colonne `synonymes` : les mots qu'on tape vraiment (formule 3, F3, PPP,
--    PDM, béta heart…). Le front cherche dans le nom ET dans les synonymes.
-- 2. F3, Beta Heart et les trois nouveaux prennent un rang au petit-déjeuner et
--    en encas, derrière les quatre shakes F1 (rangs 1 à 4), avant les aliments
--    hors Herbalife (20+).
-- 3. Trois produits demandés par Thomas, aux valeurs des ÉTIQUETTES Herbalife FR
--    (jamais un chiffre de mémoire) :
--      · Boisson multi-fibres (SKU 2554) : 1 cuillère 6,8 g → 18 kcal, 0,2 g de
--        protéines, 5 g de fibres ;
--      · Thé instantané classique (SKU 178K) : portion 1,7 g → 6 kcal, 0 g ;
--      · Boisson concentrée à l'aloe vera (SKU 0006) : 15 ml → 22 kcal, 0 g.
--    Zéro protéine ne veut pas dire zéro intérêt : la membre note ce qu'elle
--    prend vraiment, et les kcal s'affichent en gris.
-- =============================================================================

alter table public.journal_aliments add column if not exists synonymes text;
comment on column public.journal_aliments.synonymes is
  'Les mots qu''on tape vraiment (formule 3, f3, ppp…). La recherche du journal lit le nom ET ceci.';

-- ── 1. Les trois produits demandés ──────────────────────────────────────────
insert into public.journal_aliments
  (cle, nom, famille, herbalife, prot_portion, kcal_portion, prot_100g, kcal_100g, portions, unite, indice, rangs, source, actif)
values
  -- ⚠️ `journal_aliments_une_seule_mesure` : à la portion OU aux 100 g, jamais les deux.
  -- Ces trois-là se prennent à la dose → portion ; les valeurs aux 100 g restent dans `source`.
  ('multifibres', 'Boisson multi-fibres', null, true, 0.2, 18, null, null, null,
   '1 cuillère = 6,8 g', '5 g de fibres', '{"pdj": 7, "enc": 8}'::jsonb,
   'Herbalife FR · étiquette 2554 : portion 6,8 g dans 150 ml = 18 kcal, 0,2 g de protéines, 5 g de fibres (100 g : 268 kcal, 2,6 g)', true),
  ('the_instantane', 'Thé instantané aux plantes', null, true, 0, 6, null, null, null,
   '1 portion = 1,7 g', 'le thé du club', '{"pdj": 8, "enc": 9}'::jsonb,
   'Herbalife FR · étiquette 178K : portion 1,7 g = 6 kcal, 0 g de protéines (100 g : 354 kcal, 13 g)', true),
  ('aloe', 'Aloe concentré', null, true, 0, 22, null, null, null,
   '1 portion = 15 ml (3 bouchons)', 'dans 120 ml d''eau', '{"pdj": 9, "enc": 10}'::jsonb,
   'Herbalife FR · étiquette 0006 : portion 15 ml = 22 kcal, 0 g de protéines (100 ml : 147 kcal, 0 g)', true)
on conflict (cle) do update
  set nom = excluded.nom, prot_portion = excluded.prot_portion, kcal_portion = excluded.kcal_portion,
      prot_100g = null, kcal_100g = null, unite = excluded.unite,
      indice = excluded.indice, rangs = excluded.rangs, source = excluded.source, actif = true;

-- ── 2. F3 et Beta Heart sortent de l'ombre ──────────────────────────────────
update public.journal_aliments set rangs = '{"pdj": 5, "enc": 6}'::jsonb where cle = 'f3';
update public.journal_aliments set rangs = '{"pdj": 6, "enc": 7}'::jsonb where cle = 'betaheart';

-- ── 3. Les synonymes (ce que les doigts tapent) ─────────────────────────────
update public.journal_aliments set synonymes = v.mots
  from (values
    ('f3',                  'formule 3 f3 ppp protein powder personalized poudre proteinee'),
    ('betaheart',           'beta heart betaheart avoine beta-glucane fibre'),
    ('multifibres',         'multi fibres multifibre fibres fibre pomme transit'),
    ('the_instantane',      'the the vert instantane thermo boisson plantes'),
    ('aloe',                'aloe vera aloes concentre boisson'),
    ('pdmdemi',             'pdm protein drink mix proteine en poudre demi sachet'),
    ('pdmplein',            'pdm protein drink mix proteine en poudre sachet entier'),
    ('f1demi',              'formula 1 formule 1 f1 shake club petit dejeuner'),
    ('f1plein',             'formula 1 formule 1 f1 shake pdm'),
    ('f1lait',              'formula 1 formule 1 f1 shake lait'),
    ('f1soja',              'formula 1 formule 1 f1 shake soja vegetal'),
    ('triblend',            'tri blend select vegan shake vegetal'),
    ('rebuild',             'rebuild strength recuperation apres sport h24'),
    ('icedcoffee',          'iced coffee cafe glace high protein'),
    ('pancake',             'pancake pancakes crepe proteine'),
    ('barre',               'barre proteinee protein bar encas'),
    ('achieve',             'barre achieve sport h24'),
    ('f1express_choco',     'barre repas f1 express chocolat'),
    ('f1express_cranberry', 'barre repas f1 express cranberry canneberge'),
    ('chipsbbq',            'chips protein bbq barbecue'),
    ('chipsoig',            'chips protein creme oignon')
  ) as v(cle, mots)
 where journal_aliments.cle = v.cle;
