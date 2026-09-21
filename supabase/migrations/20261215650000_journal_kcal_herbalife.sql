-- =============================================================================
-- Journal nutritionnel — bloc B, 9 (suite) : les kcal des 3 produits Herbalife
-- qui n'en avaient pas, lues sur leurs ÉTIQUETTES OFFICIELLES (21/09/2026).
-- Les protéines ne bougent pas : ce sont les chiffres du club (Thomas).
--
--   • Chips protéinées crème & oignon : étiquette Herbalife 142K (FR/CH),
--     1 sachet (30 g) = 135 kcal (448 kcal / 100 g) ; 12 g de protéines = le chiffre du club.
--   • Chips protéinées barbecue : étiquette 141K (FR/CH), 1 sachet (30 g) =
--     134 kcal (445 kcal / 100 g) ; 11 g de protéines = le chiffre du club.
--   • Rebuild Strength, chocolat : étiquette Herbalife UK 1437 (même produit
--     européen), 1 portion = 5 mesures (50 g) = 190 kcal. ⚠️ L'étiquette dit
--     25 g de protéines, le catalogue garde 24 g (chiffre du club) : à trancher
--     par Thomas.
-- Reste sans kcal : le croque-monsieur « fait maison » (CIQUAL 2020 n'a ni ses
-- glucides ni ses fibres ; la version préemballée n'est pas le même aliment).
-- =============================================================================

update public.journal_aliments a
   set kcal_portion = v.kcal,
       source = a.source || ' · kcal : ' || v.etiquette
  from (values
    ('chipsoig', 135.0, 'étiquette Herbalife 142K (1 sachet de 30 g)'),
    ('chipsbbq', 134.0, 'étiquette Herbalife 141K (1 sachet de 30 g)'),
    ('rebuild', 190.0, 'étiquette Herbalife UK 1437 (5 mesures, 50 g)')
  ) as v(cle, kcal, etiquette)
 where a.cle = v.cle and a.kcal_portion is null and a.prot_portion is not null;
