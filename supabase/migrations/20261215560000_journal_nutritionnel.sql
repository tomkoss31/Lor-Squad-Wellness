-- =============================================================================
-- Le journal nutritionnel (chantier du 21/09/2026 — maquette v7 validée par
-- Thomas : « super boulot, tu peux commencer à coder »).
--
-- CE QUE ÇA REMPLACE : le carnet papier que les membres remplissent puis
-- recopient sur la feuille « Journal nutritionnel » — qui se perd. La membre
-- note ses repas dans son espace (onglet « Journal », à la place de
-- « Conseils »), la coach les voit dans sa fiche.
--
-- LES RÈGLES DE THOMAS (21/09) — elles sont dans le code, pas seulement ici :
--   • Protéines = POIDS du dernier bilan × coefficient réglé par la coach :
--     1,2 activité normale · 1,4 très active · 1,5 prise de muscle · 2 sport
--     intensif (journal_reglages, 1,2 par défaut).
--   • Eau = 1 L par 30 kg. La boisson du club (thé + aloé, 40 cl) compte :
--     cochée d'office quand la visite est pointée.
--   • Le shake n'existe qu'en COMBO — jamais « F1 seul » (9 g). Repère du club
--     imprimé partout : F1 + ½ sachet PDM = 18 g.
--   • +5 XP par défi du jour (journée notée · protéines · eau · journée
--     complète · très active), une fois par jour : l'échelle de l'humeur.
--     Un « +40 par jour » ferait passer Légende en deux semaines.
--
-- LE CATALOGUE (journal_aliments) : 95 aliments CIQUAL 2020 (ANSES), valeurs
-- « Protéines, N × facteur de Jones » et « Énergie, règlement UE 1169/2011 »,
-- relevées le 21/09 dans la table officielle ; le skyr (absent de CIQUAL) à
-- la moyenne des étiquettes ; 18 produits Herbalife aux étiquettes FR + les
-- chiffres du club. Chaque ligne garde sa source (colonne `source`).
-- Les protéines d'une ligne sont calculées ICI, côté serveur, puis figées :
-- une correction du catalogue ne réécrit pas l'historique.
--
-- L'HUMEUR : elle vivait dans `client_mood_log`, supprimée le 11/12 comme
-- « table vide sans lecteur » — alors que l'Accueil de l'espace standard
-- appelle toujours `record_client_mood` / `get_client_mood_today`. Depuis,
-- ces deux fonctions échouaient et l'humeur n'était enregistrée nulle part
-- (seuls les +5 XP passaient). Elles écrivent désormais dans journal_jours :
-- l'humeur de l'Accueil et celle du journal sont LA MÊME donnée.
--
-- SÉCURITÉ (règles du 29/07) :
--   • la membre n'a pas de session : tout passe par des fonctions `security
--     definer` qui EXIGENT son jeton (même motif que get_client_messages_by_token) ;
--   • la coach lit par le RLS : elle voit le journal des clientes qu'elle voit
--     déjà (sous-requête sur `clients`, qui applique SON RLS) — aucune règle
--     d'accès nouvelle à maintenir ;
--   • les fonctions internes (`_journal_*`) ne sont PAS exécutables par anon ni
--     authenticated : elles prennent un client_id, elles fuiraient.
-- =============================================================================

-- ─── 1. Le catalogue ─────────────────────────────────────────────────────────
create table if not exists public.journal_aliments (
  cle          text primary key,
  nom          text not null,
  famille      text,                    -- variantes échangeables : 'f1', 'pdm'
  herbalife    boolean not null default false,
  prot_portion numeric(5,1),            -- produits à portion fixe (Herbalife)
  kcal_portion numeric(6,1),
  prot_100g    numeric(5,2),            -- aliments pesés
  kcal_100g    numeric(6,1),
  portions     smallint[],              -- grammes proposés
  unite        text,                    -- « 1 œuf ≈ 50 g »
  indice       text,                    -- « le repère du club »
  rangs        jsonb not null default '{}'::jsonb, -- ordre de suggestion par créneau
  source       text not null,
  actif        boolean not null default true,
  constraint journal_aliments_une_seule_mesure check ((prot_portion is not null) <> (prot_100g is not null))
);
alter table public.journal_aliments enable row level security;
revoke all on public.journal_aliments from anon, authenticated;
grant select on public.journal_aliments to anon, authenticated;
drop policy if exists journal_aliments_lecture on public.journal_aliments;
-- Données publiques (un catalogue d'aliments), aucune donnée de cliente.
create policy journal_aliments_lecture on public.journal_aliments
  for select to anon, authenticated using (actif);

-- Le catalogue (généré depuis la table CIQUAL 2020 officielle et les étiquettes Herbalife FR).
insert into public.journal_aliments
  (cle, nom, famille, herbalife, prot_portion, kcal_portion, prot_100g, kcal_100g, portions, unite, indice, rangs, source)
values
  ('poulet', 'Poulet (blanc), cuit', null, false, null, null, 30.1, 141.0, '{100,150,200}', null, null, '{"repas": 1}'::jsonb, 'CIQUAL 2020 · 36018 · Poulet, filet, sans peau, sauté/poêlé'),
  ('cuisse_poulet', 'Cuisse de poulet, rôtie', null, false, null, null, 24.8, 171.0, '{100,150}', '1 cuisse ≈ 150 g', null, '{}'::jsonb, 'CIQUAL 2020 · 36006 · Poulet, cuisse, viande, rôti/cuit au four'),
  ('dinde', 'Dinde (escalope), cuite', null, false, null, null, 28.5, 124.0, '{100,150}', null, null, '{}'::jsonb, 'CIQUAL 2020 · 36306 · Dinde, escalope, sautée/poêlée'),
  ('jambon_blanc', 'Jambon blanc', null, false, null, null, 20.5, 117.0, '{40,80,120}', '1 tranche ≈ 40 g', null, '{}'::jsonb, 'CIQUAL 2020 · 28902 · Jambon cuit, supérieur, découenné'),
  ('jambon_cru', 'Jambon cru', null, false, null, null, 25.9, 225.0, '{20,40,60}', '1 tranche ≈ 20 g', null, '{}'::jsonb, 'CIQUAL 2020 · 28800 · Jambon cru'),
  ('steak', 'Steak de bœuf, grillé', null, false, null, null, 27.6, 128.0, '{100,150}', null, null, '{}'::jsonb, 'CIQUAL 2020 · 6200 · Boeuf, steak ou bifteck, grillé'),
  ('steak_hache5', 'Steak haché 5 %, cuit', null, false, null, null, 25.5, 155.0, '{100,125}', '1 steak haché ≈ 100 g', null, '{"repas": 6}'::jsonb, 'CIQUAL 2020 · 6251 · Boeuf, steak haché 5% MG, cuit'),
  ('steak_hache15', 'Steak haché 15 %, cuit', null, false, null, null, 23.6, 239.0, '{100,125}', '1 steak haché ≈ 100 g', null, '{}'::jsonb, 'CIQUAL 2020 · 6255 · Boeuf, steak haché 15% MG, cuit'),
  ('porc', 'Filet mignon de porc, cuit', null, false, null, null, 26.1, 168.0, '{100,150}', null, null, '{}'::jsonb, 'CIQUAL 2020 · 28203 · Porc, filet mignon, cuit'),
  ('veau', 'Escalope de veau, cuite', null, false, null, null, 31.0, 147.0, '{100,150}', null, null, '{}'::jsonb, 'CIQUAL 2020 · 6520 · Veau, escalope, cuite'),
  ('saucisse', 'Saucisse type Knack', null, false, null, null, 12.4, 291.0, '{35,70,105}', '1 saucisse ≈ 35 g', null, '{}'::jsonb, 'CIQUAL 2020 · 30742 · Saucisse de Strasbourg ou Knack'),
  ('lardons', 'Lardons, cuits', null, false, null, null, 23.8, 324.0, '{30,50}', null, null, '{}'::jsonb, 'CIQUAL 2020 · 28504 · Lardon nature, cuit'),
  ('poisson_blanc', 'Poisson blanc (cabillaud), cuit', null, false, null, null, 23.1, 98.9, '{100,130,160}', null, null, '{"repas": 2}'::jsonb, 'CIQUAL 2020 · 25997 · Cabillaud, cuit, sans précision (aliment moyen)'),
  ('colin', 'Colin (lieu), cuit', null, false, null, null, 24.4, 100.0, '{100,130,160}', null, null, '{}'::jsonb, 'CIQUAL 2020 · 26192 · Lieu jaune ou colin, cuit'),
  ('saumon', 'Saumon, cuit', null, false, null, null, 23.0, 205.0, '{100,130,160}', null, null, '{"repas": 3}'::jsonb, 'CIQUAL 2020 · 25996 · Saumon, cuit, sans précision (aliment moyen)'),
  ('saumon_fume', 'Saumon fumé', null, false, null, null, 22.0, 178.0, '{30,60,90}', '1 tranche ≈ 30 g', null, '{}'::jsonb, 'CIQUAL 2020 · 26037 · Saumon fumé'),
  ('thon', 'Thon au naturel (boîte)', null, false, null, null, 26.8, 111.0, '{50,100,140}', null, null, '{"repas": 4}'::jsonb, 'CIQUAL 2020 · 26039 · Thon, au naturel, appertisé, égoutté'),
  ('sardines', 'Sardines à l''huile (boîte)', null, false, null, null, 24.4, 207.0, '{50,100}', null, null, '{}'::jsonb, 'CIQUAL 2020 · 26034 · Sardine, à l''huile, appertisée, égouttée'),
  ('maquereau', 'Maquereau, cuit', null, false, null, null, 21.5, 228.0, '{100,130}', null, null, '{}'::jsonb, 'CIQUAL 2020 · 26019 · Maquereau, rôti/cuit au four'),
  ('truite', 'Truite, cuite', null, false, null, null, 26.6, 183.0, '{100,130}', null, null, '{}'::jsonb, 'CIQUAL 2020 · 27006 · Truite, rôtie/cuite au four'),
  ('crevettes', 'Crevettes, cuites', null, false, null, null, 19.0, 93.8, '{80,120,200}', null, null, '{}'::jsonb, 'CIQUAL 2020 · 10007 · Crevette, cuite'),
  ('surimi', 'Surimi', null, false, null, null, 8.31, 125.0, '{45,90}', '1 bâtonnet ≈ 15 g', null, '{}'::jsonb, 'CIQUAL 2020 · 26046 · Surimi, bâtonnets, tranche ou râpé saveur crabe'),
  ('oeuf', 'Œuf', null, false, null, null, 13.5, 134.0, '{50,100,150}', '1 œuf ≈ 50 g', null, '{"pdj": 23, "repas": 5}'::jsonb, 'CIQUAL 2020 · 22010 · Oeuf, dur'),
  ('blanc_oeuf', 'Blanc d''œuf, cuit', null, false, null, null, 10.3, 47.3, '{30,60,90}', '1 blanc ≈ 30 g', null, '{}'::jsonb, 'CIQUAL 2020 · 22008 · Oeuf, blanc (blanc d''oeuf), cuit'),
  ('fromage_blanc0', 'Fromage blanc 0 %', null, false, null, null, 7.95, 49.4, '{100,150,200}', null, null, '{"pdj": 20, "enc": 20}'::jsonb, 'CIQUAL 2020 · 19644 · Fromage blanc nature, 0% MG'),
  ('fromage_blanc3', 'Fromage blanc 3 %', null, false, null, null, 8.03, 76.9, '{100,150,200}', null, null, '{}'::jsonb, 'CIQUAL 2020 · 19646 · Fromage blanc nature, 3% MG environ'),
  ('yaourt', 'Yaourt nature', null, false, null, null, 3.96, 45.5, '{125,250}', '1 pot = 125 g', null, '{"pdj": 22}'::jsonb, 'CIQUAL 2020 · 19593 · Yaourt, lait fermenté ou spécialité laitière, nature'),
  ('yaourt0', 'Yaourt nature 0 %', null, false, null, null, 4.82, 39.4, '{125,250}', '1 pot = 125 g', null, '{}'::jsonb, 'CIQUAL 2020 · 19594 · Yaourt, lait fermenté ou spécialité laitière, nature, 0% MG'),
  ('yaourt_grec', 'Yaourt à la grecque', null, false, null, null, 3.32, null, '{125,150}', null, null, '{}'::jsonb, 'CIQUAL 2020 · 19860 · Yaourt à la grecque, nature'),
  ('petit_suisse', 'Petit-suisse nature', null, false, null, null, 9.95, 88.8, '{60,120}', '1 petit-suisse = 60 g', null, '{}'::jsonb, 'CIQUAL 2020 · 19664 · Fromage frais type petit suisse, nature, 4% MG environ'),
  ('lait', 'Lait demi-écrémé', null, false, null, null, 3.38, 47.0, '{150,250}', '1 bol ≈ 250 ml', null, '{"pdj": 26}'::jsonb, 'CIQUAL 2020 · 19041 · Lait demi-écrémé, UHT'),
  ('lait_ecreme', 'Lait écrémé', null, false, null, null, 3.51, 33.4, '{150,250}', null, null, '{}'::jsonb, 'CIQUAL 2020 · 19050 · Lait écrémé, UHT'),
  ('boisson_soja', 'Boisson au soja', null, false, null, null, 3.42, 44.2, '{150,250}', null, null, '{}'::jsonb, 'CIQUAL 2020 · 18901 · Boisson au soja, nature, enrichie en calcium, préemballée'),
  ('emmental', 'Emmental', null, false, null, null, 27.9, 373.0, '{20,30,40}', null, null, '{}'::jsonb, 'CIQUAL 2020 · 12115 · Emmental ou emmenthal'),
  ('comte', 'Comté', null, false, null, null, 27.2, 418.0, '{20,30,40}', null, null, '{}'::jsonb, 'CIQUAL 2020 · 12110 · Comté'),
  ('camembert', 'Camembert', null, false, null, null, 19.5, 280.0, '{30,60}', '1 portion ≈ 30 g', null, '{}'::jsonb, 'CIQUAL 2020 · 12001 · Camembert, sans précision'),
  ('mozzarella', 'Mozzarella', null, false, null, null, 16.5, 227.0, '{60,125}', '1 boule ≈ 125 g', null, '{}'::jsonb, 'CIQUAL 2020 · 19590 · Mozzarella au lait de vache'),
  ('feta', 'Feta', null, false, null, null, 15.1, 285.0, '{30,50}', null, null, '{}'::jsonb, 'CIQUAL 2020 · 12066 · Feta AOP'),
  ('chevre_frais', 'Chèvre frais', null, false, null, null, 16.1, null, '{30,50}', null, null, '{}'::jsonb, 'CIQUAL 2020 · 12800 · Fromage de chèvre frais, au lait pasteurisé (type bûchette fraîche)'),
  ('parmesan', 'Parmesan', null, false, null, null, 31.1, 406.0, '{10,20}', null, null, '{}'::jsonb, 'CIQUAL 2020 · 12120 · Parmesan'),
  ('ricotta', 'Ricotta', null, false, null, null, 8.79, null, '{50,100}', null, null, '{}'::jsonb, 'CIQUAL 2020 · 19585 · Ricotta'),
  ('tofu', 'Tofu nature', null, false, null, null, 13.4, 148.0, '{100,150}', null, null, '{}'::jsonb, 'CIQUAL 2020 · 20904 · Tofu nature, préemballé'),
  ('lentilles', 'Lentilles, cuites', null, false, null, null, 10.1, 127.0, '{100,150,200}', null, null, '{"repas": 7}'::jsonb, 'CIQUAL 2020 · 20587 · Lentille verte, bouillie/cuite à l''eau'),
  ('pois_chiches', 'Pois chiches, cuits', null, false, null, null, 8.31, 147.0, '{100,150,200}', null, null, '{}'::jsonb, 'CIQUAL 2020 · 20507 · Pois chiche, bouilli/cuit à l''eau'),
  ('haricots_rouges', 'Haricots rouges, cuits', null, false, null, null, 9.63, 116.0, '{100,150,200}', null, null, '{}'::jsonb, 'CIQUAL 2020 · 20503 · Haricot rouge, bouilli/cuit à l''eau'),
  ('quinoa', 'Quinoa, cuit', null, false, null, null, 4.66, 149.0, '{100,150,200}', null, null, '{}'::jsonb, 'CIQUAL 2020 · 9341 · Quinoa, bouilli/cuit à l''eau, non salé'),
  ('riz', 'Riz blanc, cuit', null, false, null, null, 2.92, 145.0, '{100,150,200}', null, null, '{"repas": 8}'::jsonb, 'CIQUAL 2020 · 9104 · Riz blanc, cuit, non salé'),
  ('riz_complet', 'Riz complet, cuit', null, false, null, null, 3.21, 158.0, '{100,150,200}', null, null, '{}'::jsonb, 'CIQUAL 2020 · 9103 · Riz complet, cuit, non salé'),
  ('pates', 'Pâtes, cuites', null, false, null, null, 3.99, 126.0, '{100,150,200}', null, null, '{"repas": 9}'::jsonb, 'CIQUAL 2020 · 9811 · Pâtes sèches standard, cuites, non salées'),
  ('pates_completes', 'Pâtes complètes, cuites', null, false, null, null, 4.55, 128.0, '{100,150,200}', null, null, '{}'::jsonb, 'CIQUAL 2020 · 9871 · Pâtes sèches, au blé complet, cuites, non salées'),
  ('pommes_de_terre', 'Pommes de terre, cuites', null, false, null, null, 1.8, 80.5, '{100,150,200}', null, null, '{}'::jsonb, 'CIQUAL 2020 · 4003 · Pomme de terre, bouillie/cuite à l''eau'),
  ('patate_douce', 'Patate douce, cuite', null, false, null, null, 1.69, 62.8, '{100,150,200}', null, null, '{}'::jsonb, 'CIQUAL 2020 · 4102 · Patate douce, cuite'),
  ('semoule', 'Semoule, cuite', null, false, null, null, 3.42, 122.0, '{100,150,200}', null, null, '{}'::jsonb, 'CIQUAL 2020 · 9611 · Semoule de blé dur, cuite, non salée'),
  ('boulgour', 'Boulgour, cuit', null, false, null, null, 3.73, 111.0, '{100,150,200}', null, null, '{}'::jsonb, 'CIQUAL 2020 · 9691 · Boulgour de blé, cuit, non salé'),
  ('baguette', 'Baguette', null, false, null, null, 8.27, 287.0, '{40,80,120}', '1/4 de baguette ≈ 60 g', null, '{}'::jsonb, 'CIQUAL 2020 · 7001 · Pain, baguette, courante'),
  ('pain_complet', 'Pain complet', null, false, null, null, 8.38, 244.0, '{30,60,90}', '1 tranche ≈ 30 g', null, '{"pdj": 24, "repas": 11}'::jsonb, 'CIQUAL 2020 · 7110 · Pain complet ou intégral (à la farine T150)'),
  ('pain_mie', 'Pain de mie', null, false, null, null, 7.13, 278.0, '{25,50,75}', '1 tranche ≈ 25 g', null, '{}'::jsonb, 'CIQUAL 2020 · 7200 · Pain de mie, courant'),
  ('avoine', 'Flocons d''avoine', null, false, null, null, 13.3, 367.0, '{30,40,60}', null, null, '{"pdj": 25}'::jsonb, 'CIQUAL 2020 · 9311 · Flocon d''avoine'),
  ('muesli', 'Muesli', null, false, null, null, 7.49, 418.0, '{30,50}', null, null, '{}'::jsonb, 'CIQUAL 2020 · 32004 · Muesli (aliment moyen)'),
  ('biscotte', 'Biscotte', null, false, null, null, 9.8, 409.0, '{8,16,24}', '1 biscotte ≈ 8 g', null, '{}'::jsonb, 'CIQUAL 2020 · 7300 · Biscotte classique'),
  ('galette_riz', 'Galette de riz soufflé', null, false, null, null, 7.32, 385.0, '{8,16,24}', '1 galette ≈ 8 g', null, '{}'::jsonb, 'CIQUAL 2020 · 7352 · Galette de riz soufflé complet'),
  ('haricots_verts', 'Haricots verts, cuits', null, false, null, null, 2.0, 29.4, '{100,150,200}', null, null, '{"repas": 10}'::jsonb, 'CIQUAL 2020 · 20030 · Haricot vert, cuit'),
  ('brocoli', 'Brocoli, cuit', null, false, null, null, 2.5, 23.5, '{100,150,200}', null, null, '{}'::jsonb, 'CIQUAL 2020 · 20302 · Brocoli, bouilli/cuit à l''eau, croquant'),
  ('courgette', 'Courgette, cuite', null, false, null, null, 0.93, 15.5, '{100,150,200}', null, null, '{}'::jsonb, 'CIQUAL 2020 · 20021 · Courgette, pulpe et peau, cuite'),
  ('epinards', 'Épinards, cuits', null, false, null, null, 3.2, null, '{100,150,200}', null, null, '{}'::jsonb, 'CIQUAL 2020 · 20027 · Épinard, cuit'),
  ('champignons', 'Champignons, cuits', null, false, null, null, 2.17, 28.7, '{100,150}', null, null, '{}'::jsonb, 'CIQUAL 2020 · 20102 · Champignon de Paris ou champignon de couche, bouilli/cuit à l''eau'),
  ('petits_pois', 'Petits pois, cuits', null, false, null, null, 6.38, 80.3, '{100,150}', null, null, '{}'::jsonb, 'CIQUAL 2020 · 20326 · Petits pois, bouillis/cuits à l''eau'),
  ('poelee_legumes', 'Poêlée de légumes', null, false, null, null, 2.6, 81.2, '{150,200,250}', null, null, '{}'::jsonb, 'CIQUAL 2020 · 20262 · Poêlée de légumes assaisonnés sans champignon, surgelée, crue'),
  ('carottes', 'Carottes', null, false, null, null, 0.63, 40.2, '{80,100,150}', null, null, '{}'::jsonb, 'CIQUAL 2020 · 20009 · Carotte, crue'),
  ('tomate', 'Tomate', null, false, null, null, 0.86, 19.3, '{100,150}', '1 tomate ≈ 100 g', null, '{}'::jsonb, 'CIQUAL 2020 · 20047 · Tomate, crue'),
  ('concombre', 'Concombre', null, false, null, null, 0.64, 15.6, '{100,150}', null, null, '{}'::jsonb, 'CIQUAL 2020 · 20019 · Concombre, pulpe et peau, cru'),
  ('salade', 'Salade verte', null, false, null, null, 1.01, null, '{50,100}', null, null, '{}'::jsonb, 'CIQUAL 2020 · 25604 · Salade verte, crue, sans assaisonnement'),
  ('soupe_legumes', 'Soupe de légumes', null, false, null, null, 0.76, 39.4, '{250,300}', '1 bol ≈ 250 ml', null, '{}'::jsonb, 'CIQUAL 2020 · 25903 · Soupe aux légumes variés, préemballée à réchauffer'),
  ('pomme', 'Pomme', null, false, null, null, 0.25, null, '{150}', '1 pomme ≈ 150 g', null, '{}'::jsonb, 'CIQUAL 2020 · 13039 · Pomme, pulpe et peau, crue'),
  ('banane', 'Banane', null, false, null, null, 1.06, 90.5, '{100,120}', '1 banane ≈ 120 g', null, '{"pdj": 27}'::jsonb, 'CIQUAL 2020 · 13005 · Banane, pulpe, crue'),
  ('orange', 'Orange', null, false, null, null, 0.75, 45.5, '{150}', '1 orange ≈ 150 g', null, '{}'::jsonb, 'CIQUAL 2020 · 13034 · Orange, pulpe, crue'),
  ('kiwi', 'Kiwi', null, false, null, null, 0.88, 60.5, '{75,150}', '1 kiwi ≈ 75 g', null, '{}'::jsonb, 'CIQUAL 2020 · 13021 · Kiwi, pulpe et graines, cru'),
  ('fraises', 'Fraises', null, false, null, null, 0.63, 38.6, '{100,150}', null, null, '{}'::jsonb, 'CIQUAL 2020 · 13014 · Fraise, crue'),
  ('poire', 'Poire', null, false, null, null, 0.49, null, '{150}', '1 poire ≈ 150 g', null, '{}'::jsonb, 'CIQUAL 2020 · 13037 · Poire, pulpe et peau, crue'),
  ('raisin', 'Raisin', null, false, null, null, 0.72, null, '{100,150}', null, null, '{}'::jsonb, 'CIQUAL 2020 · 13112 · Raisin, cru'),
  ('compote', 'Compote', null, false, null, null, 0.25, 80.1, '{100}', '1 pot ≈ 100 g', null, '{}'::jsonb, 'CIQUAL 2020 · 13185 · Compote ou assimilé, tout type de fruits, teneur en sucre (allégée en sucres ou non, sans sucres ajoutés...) inconnue (aliment moyen)'),
  ('amandes', 'Amandes', null, false, null, null, 18.8, null, '{15,20,30}', '1 poignée ≈ 20 g', null, '{}'::jsonb, 'CIQUAL 2020 · 15000 · Amande (avec peau)'),
  ('noix', 'Noix', null, false, null, null, 13.3, null, '{15,20,30}', '1 poignée ≈ 20 g', null, '{}'::jsonb, 'CIQUAL 2020 · 15005 · Noix, séchée, cerneaux'),
  ('noisettes', 'Noisettes', null, false, null, null, 14.4, null, '{15,20,30}', '1 poignée ≈ 20 g', null, '{}'::jsonb, 'CIQUAL 2020 · 15004 · Noisette'),
  ('cajou', 'Noix de cajou', null, false, null, null, 17.4, 618.0, '{15,20,30}', '1 poignée ≈ 20 g', null, '{}'::jsonb, 'CIQUAL 2020 · 15054 · Noix de cajou, grillée, non salée'),
  ('beurre_cacahuete', 'Beurre de cacahuète', null, false, null, null, 22.2, null, '{15,30}', '1 c. à soupe ≈ 15 g', null, '{}'::jsonb, 'CIQUAL 2020 · 15202 · Beurre de cacahuète ou Pâte d''arachide'),
  ('pizza', 'Pizza (fromage)', null, false, null, null, 8.93, 227.0, '{150,300}', '1 part ≈ 150 g', null, '{}'::jsonb, 'CIQUAL 2020 · 25404 · Pizza au fromage ou Pizza margherita, préemballée'),
  ('quiche', 'Quiche lorraine', null, false, null, null, 8.96, 274.0, '{150}', '1 part ≈ 150 g', null, '{}'::jsonb, 'CIQUAL 2020 · 25405 · Quiche lorraine, préemballée'),
  ('lasagnes', 'Lasagnes bolognaise', null, false, null, null, 6.29, 134.0, '{250,350}', null, null, '{}'::jsonb, 'CIQUAL 2020 · 25081 · Lasagnes ou cannelloni à la viande (bolognaise)'),
  ('croque_monsieur', 'Croque-monsieur', null, false, null, null, 14.3, null, '{150}', '1 croque ≈ 150 g', null, '{}'::jsonb, 'CIQUAL 2020 · 25400 · Croque-monsieur, fait maison'),
  ('sandwich_jambon', 'Sandwich jambon-beurre', null, false, null, null, 9.93, 285.0, '{200,250}', '1 sandwich ≈ 250 g', null, '{}'::jsonb, 'CIQUAL 2020 · 25517 · Sandwich baguette, jambon, beurre'),
  ('kebab', 'Kebab (sandwich)', null, false, null, null, 15.2, 233.0, '{300,400}', null, null, '{}'::jsonb, 'CIQUAL 2020 · 25428 · Sandwich grec ou Kebab, pita, crudités'),
  ('chocolat_noir', 'Chocolat noir', null, false, null, null, 6.63, null, '{10,20,40}', '1 carré ≈ 5 g', null, '{}'::jsonb, 'CIQUAL 2020 · 31005 · Chocolat noir à moins de 70% de cacao, à croquer, tablette'),
  ('croissant', 'Croissant', null, false, null, null, 6.65, 375.0, '{60}', '1 croissant ≈ 60 g', null, '{}'::jsonb, 'CIQUAL 2020 · 7602 · Croissant, sans précision'),
  ('biscuit', 'Biscuit sec', null, false, null, null, 6.77, null, '{10,20,30}', '1 biscuit ≈ 10 g', null, '{}'::jsonb, 'CIQUAL 2020 · 24001 · Biscuit sec nature'),
  ('skyr', 'Skyr nature', null, false, null, null, 10.0, 60.0, '{100,150}', null, null, '{"pdj": 21, "enc": 21}'::jsonb, 'Absent de CIQUAL 2020 — moyenne des étiquettes du commerce (≈ 10 g / 100 g)'),
  ('f1demi', 'Shake F1 + ½ sachet PDM', 'f1', true, 18, 157, null, null, null, null, 'le repère du club', '{"pdj": 1, "enc": 5}'::jsonb, 'Repère du club (Thomas) : F1 26 g + ½ sachet PDM'),
  ('f1plein', 'Shake F1 + 1 sachet PDM (28 g)', 'f1', true, 25.5, 211, null, null, null, null, 'besoins élevés', '{"pdj": 2}'::jsonb, 'Herbalife FR · étiquettes 4466 + 2600 (18 + 7,5)'),
  ('f1lait', 'Shake F1 + lait ½ écrémé', 'f1', true, 18, 227, null, null, null, null, '250 ml de lait', '{"pdj": 3}'::jsonb, 'Herbalife FR · étiquette 4466'),
  ('f1soja', 'Shake F1 + lait de soja', 'f1', true, 16, 214, null, null, null, null, '250 ml, enrichi', '{"pdj": 4}'::jsonb, 'Herbalife FR · étiquette 4466'),
  ('barre', 'Barre aux protéines', null, true, 10, 139, null, null, null, '1 barre = 35 g', null, '{"enc": 1}'::jsonb, 'Herbalife FR · étiquette 3976'),
  ('achieve', 'Barre Achieve (sport)', null, true, 21, 204, null, null, null, '1 barre = 60 g', null, '{"enc": 2}'::jsonb, 'Herbalife FR · étiquettes 149k / 150k'),
  ('pdmdemi', 'PDM · ½ sachet en shake', 'pdm', true, 7.5, 54, null, null, null, null, null, '{"enc": 3}'::jsonb, 'Herbalife FR · étiquette 2600'),
  ('pdmplein', 'PDM · 1 sachet en shake (28 g)', 'pdm', true, 15, 108, null, null, null, null, null, '{"enc": 4}'::jsonb, 'Herbalife FR · étiquette 2600'),
  ('chipsbbq', 'Chips protéinées BBQ', null, true, 11, null, null, null, null, '1 sachet = 30 g', null, '{"enc": 6}'::jsonb, 'Chiffre du club (Thomas)'),
  ('chipsoig', 'Chips protéinées crème & oignon', null, true, 12, null, null, null, null, '1 sachet = 30 g', null, '{"enc": 7}'::jsonb, 'Chiffre du club (Thomas)'),
  ('rebuild', 'Rebuild Strength (après le sport)', null, true, 24, null, null, null, null, null, null, '{"enc": 8}'::jsonb, 'Chiffre du club (Thomas) + page Herbalife FR'),
  ('triblend', 'Tri Blend Select (shake)', null, true, 20, 151, null, null, null, '3 cuillères = 40 g', null, '{}'::jsonb, 'Herbalife FR · étiquette 013k'),
  ('icedcoffee', 'High Protein Iced Coffee', null, true, 15, 80, null, null, null, '2 cuillères = 22 g', null, '{}'::jsonb, 'Herbalife FR · étiquette 012k'),
  ('f3', 'Formula 3 (1 cuillère)', null, true, 5, 23, null, null, null, '1 cuillère = 6 g', null, '{}'::jsonb, 'Herbalife FR · étiquette 0242'),
  ('pancake', 'Pancake protéiné (préparation à cuisiner)', null, true, 12, 104, null, null, null, '1 pancake = 24 g de préparation', null, '{}'::jsonb, 'Herbalife FR · étiquette 528k'),
  ('f1express_choco', 'Barre repas F1 Express chocolat', null, true, 13, 207, null, null, null, '1 barre = 56 g', null, '{}'::jsonb, 'Herbalife FR · étiquette 4472'),
  ('f1express_cranberry', 'Barre repas F1 Express cranberry', null, true, 15, 209, null, null, null, '1 barre = 56 g', null, '{}'::jsonb, 'Herbalife FR · étiquette 4473'),
  ('betaheart', 'Beta Heart (1 cuillère)', null, true, 2, 25, null, null, null, '1 cuillère = 7,6 g', null, '{}'::jsonb, 'Herbalife FR · étiquette 0267')
on conflict (cle) do nothing;

-- ─── 2. Les jours, les lignes, les réglages, les remarques ───────────────────
create table if not exists public.journal_jours (
  client_id      uuid not null references public.clients(id) on delete cascade,
  jour           date not null,
  verres         smallint not null default 0 check (verres between 0 and 20),
  boisson_club   boolean not null default false,
  -- Le pointage du jour a déjà été reporté (shake + boisson). S'il a été
  -- retiré ensuite, on ne le remet pas : la membre a le dernier mot.
  club_prerempli boolean not null default false,
  activite       text check (activite in ('repos','15','30','45','60')),
  humeur         text check (humeur in ('great','good','okay','tired','tough')),
  maj_le         timestamptz not null default now(),
  primary key (client_id, jour)
);

create table if not exists public.journal_lignes (
  id        uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  jour      date not null,
  creneau   text not null check (creneau in ('pdj','enc1','dej','enc2','din','aut')),
  aliment   text not null references public.journal_aliments(cle),
  libelle   text not null,                         -- le nom au moment de la saisie
  grammes   numeric(6,1) check (grammes is null or grammes between 1 and 2000),
  quantite  smallint not null default 1 check (quantite between 1 and 5),
  prot_g    numeric(6,1) not null,                 -- calculé ici, puis figé
  origine   text not null default 'membre' check (origine in ('membre','club','noaly','coach')),
  cree_le   timestamptz not null default now()
);
create index if not exists journal_lignes_client_jour on public.journal_lignes (client_id, jour);

create table if not exists public.journal_reglages (
  client_id      uuid primary key references public.clients(id) on delete cascade,
  coef_proteines numeric(2,1) not null default 1.2 check (coef_proteines in (1.2, 1.4, 1.5, 2.0)),
  maj_par        uuid default auth.uid(),
  maj_le         timestamptz not null default now()
);

create table if not exists public.journal_remarques (
  id            uuid primary key default gen_random_uuid(),
  client_id     uuid not null references public.clients(id) on delete cascade,
  coach_user_id uuid not null default auth.uid(),
  texte         text not null check (length(btrim(texte)) between 1 and 1000),
  changements   text[] not null default '{}'
                check (changements <@ array['calories','proteines','eau','exercice','autre']),
  cree_le       timestamptz not null default now()
);
create index if not exists journal_remarques_client on public.journal_remarques (client_id, cree_le desc);

-- RLS : la membre n'y touche jamais en direct (fonctions à jeton) ; la coach
-- lit et écrit ce qu'elle a le droit de voir chez `clients`.
alter table public.journal_jours     enable row level security;
alter table public.journal_lignes    enable row level security;
alter table public.journal_reglages  enable row level security;
alter table public.journal_remarques enable row level security;
revoke all on public.journal_jours, public.journal_lignes, public.journal_reglages, public.journal_remarques from anon, authenticated;
grant select on public.journal_jours, public.journal_lignes, public.journal_reglages, public.journal_remarques to authenticated;
grant insert, update on public.journal_reglages to authenticated;
grant insert on public.journal_remarques to authenticated;

drop policy if exists journal_jours_coach on public.journal_jours;
create policy journal_jours_coach on public.journal_jours for select to authenticated
  using (exists (select 1 from public.clients c where c.id = journal_jours.client_id));
drop policy if exists journal_lignes_coach on public.journal_lignes;
create policy journal_lignes_coach on public.journal_lignes for select to authenticated
  using (exists (select 1 from public.clients c where c.id = journal_lignes.client_id));
drop policy if exists journal_reglages_coach_lit on public.journal_reglages;
create policy journal_reglages_coach_lit on public.journal_reglages for select to authenticated
  using (exists (select 1 from public.clients c where c.id = journal_reglages.client_id));
drop policy if exists journal_reglages_coach_cree on public.journal_reglages;
create policy journal_reglages_coach_cree on public.journal_reglages for insert to authenticated
  with check (exists (select 1 from public.clients c where c.id = journal_reglages.client_id));
drop policy if exists journal_reglages_coach_change on public.journal_reglages;
create policy journal_reglages_coach_change on public.journal_reglages for update to authenticated
  using (exists (select 1 from public.clients c where c.id = journal_reglages.client_id))
  with check (exists (select 1 from public.clients c where c.id = journal_reglages.client_id));
drop policy if exists journal_remarques_coach_lit on public.journal_remarques;
create policy journal_remarques_coach_lit on public.journal_remarques for select to authenticated
  using (exists (select 1 from public.clients c where c.id = journal_remarques.client_id));
drop policy if exists journal_remarques_coach_ecrit on public.journal_remarques;
create policy journal_remarques_coach_ecrit on public.journal_remarques for insert to authenticated
  with check (coach_user_id = (select auth.uid())
              and exists (select 1 from public.clients c where c.id = journal_remarques.client_id));

-- ─── 3. Les objectifs (la formule de Thomas, un seul endroit) ────────────────
-- Miroir front : src/features/journal/journalCalculs.ts (`objectifs`).
create or replace function public._journal_objectifs(p_poids numeric, p_coef numeric)
returns jsonb language sql immutable set search_path = public, extensions as $$
  select jsonb_build_object(
    'poids', p_poids,
    'coef', p_coef,
    'proteines', case when p_poids is null then null else round(p_poids * p_coef)::int end,
    'eau_l', case when p_poids is null then 2.0 else round(p_poids / 30.0, 1) end
  );
$$;

-- Le poids du dernier bilan pesé (même source que la fiche : assessments).
create or replace function public._journal_poids(p_client uuid)
returns numeric language sql stable security definer set search_path = public, extensions as $$
  select replace(a.body_scan->>'weight', ',', '.')::numeric
    from public.assessments a
   where a.client_id = p_client
     and (a.body_scan->>'weight') ~ '^[0-9]+([.,][0-9]+)?$'
     and replace(a.body_scan->>'weight', ',', '.')::numeric > 0
   order by a.date desc nulls last, a.created_at desc
   limit 1;
$$;

create or replace function public._journal_objectifs_client(p_client uuid)
returns jsonb language sql stable security definer set search_path = public, extensions as $$
  select public._journal_objectifs(
    public._journal_poids(p_client),
    coalesce((select r.coef_proteines from public.journal_reglages r where r.client_id = p_client), 1.2)
  );
$$;

-- ─── 4. Les briques internes (jamais appelables par anon / authenticated) ────
create or replace function public._journal_client(p_token text)
returns uuid language plpgsql stable security definer set search_path = public, extensions as $$
declare v text;
begin
  v := public._resolve_client_id_from_token(p_token);
  if v is null then raise exception 'jeton invalide'; end if;
  return v::uuid;
exception when invalid_text_representation then
  raise exception 'jeton invalide';
end;
$$;

-- Le journal se corrige sur 7 jours (aujourd'hui + les 6 d'avant), jamais dans le futur.
create or replace function public._journal_jour(p_jour date)
returns date language plpgsql stable set search_path = public, extensions as $$
declare v_auj date := (now() at time zone 'Europe/Paris')::date; v date := coalesce(p_jour, v_auj);
begin
  if v > v_auj or v < v_auj - 6 then raise exception 'jour hors du journal'; end if;
  return v;
end;
$$;

-- BBC : la visite pointée ce jour-là devient le petit-déj (shake du club) et la
-- boisson du club (40 cl). Une seule fois — si la membre l'a retiré, c'est retiré.
create or replace function public._journal_prerempli_club(p_client uuid, p_jour date)
returns void language plpgsql security definer set search_path = public, extensions as $$
begin
  if exists (
       select 1 from public.club_visits v
        where v.client_id = p_client
          and (v.visited_at at time zone 'Europe/Paris')::date = p_jour)
     and not coalesce((select j.club_prerempli from public.journal_jours j
                        where j.client_id = p_client and j.jour = p_jour), false)
  then
    insert into public.journal_jours (client_id, jour, boisson_club, club_prerempli)
    values (p_client, p_jour, true, true)
    on conflict (client_id, jour) do update set boisson_club = true, club_prerempli = true, maj_le = now();
    insert into public.journal_lignes (client_id, jour, creneau, aliment, libelle, quantite, prot_g, origine)
    select p_client, p_jour, 'pdj', a.cle, a.nom, 1, a.prot_portion, 'club'
      from public.journal_aliments a where a.cle = 'f1demi';
  end if;
end;
$$;

create or replace function public._journal_etat(p_client uuid, p_jour date)
returns jsonb language sql stable security definer set search_path = public, extensions as $$
  select jsonb_build_object(
    'jour', p_jour,
    'aujourdhui', (now() at time zone 'Europe/Paris')::date,
    'objectifs', public._journal_objectifs_client(p_client),
    'lignes', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', l.id, 'creneau', l.creneau, 'aliment', l.aliment, 'libelle', l.libelle,
               'grammes', l.grammes, 'quantite', l.quantite, 'prot_g', l.prot_g, 'origine', l.origine)
             order by l.cree_le)
        from public.journal_lignes l where l.client_id = p_client and l.jour = p_jour), '[]'::jsonb),
    'veille', coalesce((
      select jsonb_agg(jsonb_build_object(
               'creneau', l.creneau, 'aliment', l.aliment, 'libelle', l.libelle,
               'grammes', l.grammes, 'quantite', l.quantite, 'prot_g', l.prot_g)
             order by l.cree_le)
        from public.journal_lignes l where l.client_id = p_client and l.jour = p_jour - 1), '[]'::jsonb),
    'verres', coalesce((select j.verres from public.journal_jours j where j.client_id = p_client and j.jour = p_jour), 0),
    'boisson_club', coalesce((select j.boisson_club from public.journal_jours j where j.client_id = p_client and j.jour = p_jour), false),
    'activite', (select j.activite from public.journal_jours j where j.client_id = p_client and j.jour = p_jour),
    'humeur', (select j.humeur from public.journal_jours j where j.client_id = p_client and j.jour = p_jour),
    'remarque', (
      select jsonb_build_object('texte', r.texte, 'changements', r.changements, 'le', r.cree_le,
                                'coach', nullif(split_part(btrim(coalesce(u.name, '')), ' ', 1), ''))
        from public.journal_remarques r
        left join public.users u on u.id = r.coach_user_id
       where r.client_id = p_client
       order by r.cree_le desc limit 1),
    'xp_total', (select coalesce(sum(e.xp_amount), 0)::int from public.client_xp_events e where e.client_id = p_client::text)
  );
$$;

-- Les défis du jour : paie ce qui vient d'être atteint, une fois par jour
-- (le plafond vit dans record_client_xp, clé de dédoublonnage datée).
create or replace function public._journal_defis(p_token text, p_client uuid)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare
  v_auj   date := (now() at time zone 'Europe/Paris')::date;
  v_obj   jsonb := public._journal_objectifs_client(p_client);
  v_prot  numeric;
  v_eau   numeric;
  v_j     public.journal_jours%rowtype;
  v_gains jsonb := '[]'::jsonb;
  v_cles  text[] := '{}';
  v_cle   text;
  r       jsonb;
begin
  select coalesce(sum(prot_g), 0) into v_prot from public.journal_lignes where client_id = p_client and jour = v_auj;
  select * into v_j from public.journal_jours where client_id = p_client and jour = v_auj;
  -- Calculé à part : un « case … then » dans la condition d'un « if … then »
  -- trompe le lecteur PL/pgSQL (il s'arrête au premier « then »).
  v_eau := coalesce(v_j.verres, 0) * 0.25 + (case when coalesce(v_j.boisson_club, false) then 0.4 else 0 end);

  if exists (select 1 from public.journal_lignes where client_id = p_client and jour = v_auj and origine <> 'club') then
    v_cles := array_append(v_cles, 'journal_note'); end if;
  if (v_obj->>'proteines') is not null and v_prot >= (v_obj->>'proteines')::numeric then
    v_cles := array_append(v_cles, 'journal_proteines'); end if;
  if v_eau >= (v_obj->>'eau_l')::numeric - 0.05 then
    v_cles := array_append(v_cles, 'journal_eau'); end if;
  if exists (select 1 from public.journal_lignes where client_id = p_client and jour = v_auj and creneau = 'pdj')
     and exists (select 1 from public.journal_lignes where client_id = p_client and jour = v_auj and creneau = 'dej')
     and exists (select 1 from public.journal_lignes where client_id = p_client and jour = v_auj and creneau = 'din')
     and exists (select 1 from public.journal_lignes where client_id = p_client and jour = v_auj and creneau in ('enc1','enc2')) then
    v_cles := array_append(v_cles, 'journal_complete'); end if;
  if v_j.activite = '60' then v_cles := array_append(v_cles, 'journal_actif'); end if;

  foreach v_cle in array v_cles loop
    r := public.record_client_xp(p_token, v_cle);
    if coalesce((r->>'gained_xp')::int, 0) > 0 then
      v_gains := v_gains || jsonb_build_object('cle', v_cle, 'xp', (r->>'gained_xp')::int);
    end if;
  end loop;
  return v_gains;
end;
$$;

revoke all on function public._journal_poids(uuid) from public, anon, authenticated;
revoke all on function public._journal_objectifs_client(uuid) from public, anon, authenticated;
revoke all on function public._journal_client(text) from public, anon, authenticated;
revoke all on function public._journal_prerempli_club(uuid, date) from public, anon, authenticated;
revoke all on function public._journal_etat(uuid, date) from public, anon, authenticated;
revoke all on function public._journal_defis(text, uuid) from public, anon, authenticated;

-- ─── 5. Ce que la membre appelle (avec son jeton) ────────────────────────────
create or replace function public.journal_jour(p_token text, p_jour date default null)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare v_client uuid := public._journal_client(p_token); v_jour date := public._journal_jour(p_jour);
begin
  perform public._journal_prerempli_club(v_client, v_jour);
  return public._journal_etat(v_client, v_jour);
end;
$$;

create or replace function public.journal_ajouter(
  p_token text, p_jour date, p_creneau text, p_aliment text,
  p_grammes numeric default null, p_quantite integer default 1)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare
  v_client uuid := public._journal_client(p_token);
  v_jour   date := public._journal_jour(p_jour);
  a        public.journal_aliments%rowtype;
  v_q      int := greatest(1, least(5, coalesce(p_quantite, 1)));
  v_g      numeric;
  v_prot   numeric;
  v_gains  jsonb;
begin
  if p_creneau is null or p_creneau not in ('pdj','enc1','dej','enc2','din','aut') then
    raise exception 'creneau inconnu'; end if;
  select * into a from public.journal_aliments where cle = p_aliment and actif;
  if not found then raise exception 'aliment inconnu'; end if;
  if a.prot_portion is not null then
    v_g := null;
    v_prot := a.prot_portion * v_q;
  else
    v_g := round(coalesce(p_grammes, 0), 1);
    if v_g < 1 or v_g > 2000 then raise exception 'quantite invalide'; end if;
    v_q := 1;
    v_prot := round(a.prot_100g * v_g / 100, 1);
  end if;
  insert into public.journal_lignes (client_id, jour, creneau, aliment, libelle, grammes, quantite, prot_g, origine)
  values (v_client, v_jour, p_creneau, a.cle, a.nom, v_g, v_q, v_prot, 'membre');
  v_gains := public._journal_defis(p_token, v_client);
  return public._journal_etat(v_client, v_jour) || jsonb_build_object('gains', v_gains);
end;
$$;

create or replace function public.journal_modifier(
  p_token text, p_ligne uuid, p_aliment text default null,
  p_grammes numeric default null, p_quantite integer default null)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare
  v_client uuid := public._journal_client(p_token);
  l        public.journal_lignes%rowtype;
  a        public.journal_aliments%rowtype;
  v_q      int;
  v_g      numeric;
  v_prot   numeric;
  v_gains  jsonb;
begin
  select * into l from public.journal_lignes where id = p_ligne and client_id = v_client;
  if not found then raise exception 'ligne introuvable'; end if;
  perform public._journal_jour(l.jour);
  select * into a from public.journal_aliments where cle = coalesce(p_aliment, l.aliment);
  if not found then raise exception 'aliment inconnu'; end if;
  if a.prot_portion is not null then
    v_g := null;
    v_q := greatest(1, least(5, coalesce(p_quantite, l.quantite, 1)));
    v_prot := a.prot_portion * v_q;
  else
    v_g := round(coalesce(p_grammes, l.grammes, 0), 1);
    if v_g < 1 or v_g > 2000 then raise exception 'quantite invalide'; end if;
    v_q := 1;
    v_prot := round(a.prot_100g * v_g / 100, 1);
  end if;
  update public.journal_lignes
     set aliment = a.cle, libelle = a.nom, grammes = v_g, quantite = v_q, prot_g = v_prot
   where id = p_ligne;
  v_gains := public._journal_defis(p_token, v_client);
  return public._journal_etat(v_client, l.jour) || jsonb_build_object('gains', v_gains);
end;
$$;

create or replace function public.journal_retirer(p_token text, p_ligne uuid)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare v_client uuid := public._journal_client(p_token); l public.journal_lignes%rowtype;
begin
  select * into l from public.journal_lignes where id = p_ligne and client_id = v_client;
  if not found then raise exception 'ligne introuvable'; end if;
  perform public._journal_jour(l.jour);
  delete from public.journal_lignes where id = p_ligne;
  return public._journal_etat(v_client, l.jour) || jsonb_build_object('gains', '[]'::jsonb);
end;
$$;

-- « Pareil qu'hier » : recopie le créneau de la veille en un geste.
create or replace function public.journal_reprendre_veille(p_token text, p_jour date, p_creneau text)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare v_client uuid := public._journal_client(p_token); v_jour date := public._journal_jour(p_jour); v_gains jsonb;
begin
  if p_creneau is null or p_creneau not in ('pdj','enc1','dej','enc2','din','aut') then
    raise exception 'creneau inconnu'; end if;
  insert into public.journal_lignes (client_id, jour, creneau, aliment, libelle, grammes, quantite, prot_g, origine)
  select v_client, v_jour, l.creneau, l.aliment, l.libelle, l.grammes, l.quantite, l.prot_g, 'membre'
    from public.journal_lignes l
   where l.client_id = v_client and l.jour = v_jour - 1 and l.creneau = p_creneau
   order by l.cree_le;
  v_gains := public._journal_defis(p_token, v_client);
  return public._journal_etat(v_client, v_jour) || jsonb_build_object('gains', v_gains);
end;
$$;

create or replace function public.journal_eau(p_token text, p_jour date, p_verres integer, p_boisson_club boolean default null)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare v_client uuid := public._journal_client(p_token); v_jour date := public._journal_jour(p_jour); v_gains jsonb;
begin
  insert into public.journal_jours (client_id, jour, verres, boisson_club)
  values (v_client, v_jour, greatest(0, least(20, coalesce(p_verres, 0))), coalesce(p_boisson_club, false))
  on conflict (client_id, jour) do update
     set verres = excluded.verres,
         boisson_club = coalesce(p_boisson_club, public.journal_jours.boisson_club),
         maj_le = now();
  v_gains := public._journal_defis(p_token, v_client);
  return public._journal_etat(v_client, v_jour) || jsonb_build_object('gains', v_gains);
end;
$$;

create or replace function public.journal_activite(p_token text, p_jour date, p_activite text)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare v_client uuid := public._journal_client(p_token); v_jour date := public._journal_jour(p_jour); v_gains jsonb;
begin
  if p_activite is not null and p_activite not in ('repos','15','30','45','60') then
    raise exception 'activite inconnue'; end if;
  insert into public.journal_jours (client_id, jour, activite) values (v_client, v_jour, p_activite)
  on conflict (client_id, jour) do update set activite = excluded.activite, maj_le = now();
  v_gains := public._journal_defis(p_token, v_client);
  return public._journal_etat(v_client, v_jour) || jsonb_build_object('gains', v_gains);
end;
$$;

-- L'humeur d'un jour du journal. Aujourd'hui, c'est aussi celle de l'Accueil
-- (même ligne) et elle rapporte l'XP « humeur » du jour.
create or replace function public.journal_humeur(p_token text, p_jour date, p_humeur text)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare
  v_client uuid := public._journal_client(p_token);
  v_jour   date := public._journal_jour(p_jour);
  v_gains  jsonb := '[]'::jsonb;
  r        jsonb;
begin
  if p_humeur is not null and p_humeur not in ('great','good','okay','tired','tough') then
    raise exception 'humeur inconnue'; end if;
  insert into public.journal_jours (client_id, jour, humeur) values (v_client, v_jour, p_humeur)
  on conflict (client_id, jour) do update set humeur = excluded.humeur, maj_le = now();
  if p_humeur is not null and v_jour = (now() at time zone 'Europe/Paris')::date then
    r := public.record_client_xp(p_token, 'mood_checkin');
    if coalesce((r->>'gained_xp')::int, 0) > 0 then
      v_gains := jsonb_build_array(jsonb_build_object('cle', 'mood_checkin', 'xp', (r->>'gained_xp')::int));
    end if;
  end if;
  return public._journal_etat(v_client, v_jour) || jsonb_build_object('gains', v_gains);
end;
$$;

grant execute on function public.journal_jour(text, date) to anon, authenticated;
grant execute on function public.journal_ajouter(text, date, text, text, numeric, integer) to anon, authenticated;
grant execute on function public.journal_modifier(text, uuid, text, numeric, integer) to anon, authenticated;
grant execute on function public.journal_retirer(text, uuid) to anon, authenticated;
grant execute on function public.journal_reprendre_veille(text, date, text) to anon, authenticated;
grant execute on function public.journal_eau(text, date, integer, boolean) to anon, authenticated;
grant execute on function public.journal_activite(text, date, text) to anon, authenticated;
grant execute on function public.journal_humeur(text, date, text) to anon, authenticated;

-- ─── 6. L'humeur de l'Accueil retrouve un endroit où s'écrire ────────────────
-- Même signature qu'avant (l'Accueil standard les appelle déjà) ; p_comment
-- n'a plus de colonne : l'Accueil l'envoie toujours à null.
create or replace function public.record_client_mood(p_token text, p_mood_key text, p_comment text default null)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare
  v_client  uuid;
  v_jour    date := (now() at time zone 'Europe/Paris')::date;
  v_was_new boolean;
  v_xp      jsonb;
begin
  if p_mood_key not in ('great','good','okay','tired','tough') then
    return jsonb_build_object('error', 'invalid_mood_key');
  end if;
  begin
    v_client := public._resolve_client_id_from_token(p_token)::uuid;
  exception when others then
    v_client := null;
  end;
  if v_client is null then
    return jsonb_build_object('error', 'invalid_token');
  end if;
  select j.humeur is null into v_was_new from public.journal_jours j where j.client_id = v_client and j.jour = v_jour;
  v_was_new := coalesce(v_was_new, true);
  insert into public.journal_jours (client_id, jour, humeur) values (v_client, v_jour, p_mood_key)
  on conflict (client_id, jour) do update set humeur = excluded.humeur, maj_le = now();
  v_xp := public.record_client_xp(p_token, 'mood_checkin');
  return jsonb_build_object('success', true, 'mood_key', p_mood_key, 'was_new', v_was_new, 'xp', v_xp);
end;
$$;

create or replace function public.get_client_mood_today(p_token text)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare
  v_client uuid;
  v_humeur text;
begin
  begin
    v_client := public._resolve_client_id_from_token(p_token)::uuid;
  exception when others then
    v_client := null;
  end;
  if v_client is null then
    return jsonb_build_object('error', 'invalid_token');
  end if;
  select j.humeur into v_humeur from public.journal_jours j
   where j.client_id = v_client and j.jour = (now() at time zone 'Europe/Paris')::date;
  return jsonb_build_object('mood_key', v_humeur, 'comment', null, 'has_today', v_humeur is not null);
end;
$$;

-- ─── 7. Ce que la coach appelle (RLS du coach, pas de passe-droit) ───────────
create or replace function public.journal_semaine_coach(p_client_id uuid)
returns jsonb language plpgsql stable security invoker set search_path = public, extensions as $$
declare
  v_auj   date := (now() at time zone 'Europe/Paris')::date;
  v_poids numeric;
  v_coef  numeric;
begin
  -- Le RLS de `clients` décide : une coach qui ne voit pas la cliente ne voit pas son journal.
  if not exists (select 1 from public.clients c where c.id = p_client_id) then
    raise exception 'non autorise';
  end if;
  select replace(a.body_scan->>'weight', ',', '.')::numeric into v_poids
    from public.assessments a
   where a.client_id = p_client_id
     and (a.body_scan->>'weight') ~ '^[0-9]+([.,][0-9]+)?$'
     and replace(a.body_scan->>'weight', ',', '.')::numeric > 0
   order by a.date desc nulls last, a.created_at desc
   limit 1;
  select r.coef_proteines into v_coef from public.journal_reglages r where r.client_id = p_client_id;
  return jsonb_build_object(
    'aujourdhui', v_auj,
    'objectifs', public._journal_objectifs(v_poids, coalesce(v_coef, 1.2)),
    'jours', (
      select jsonb_agg(jsonb_build_object(
               'jour', d.jour,
               'verres', coalesce(j.verres, 0),
               'boisson_club', coalesce(j.boisson_club, false),
               'activite', j.activite,
               'humeur', j.humeur,
               'lignes', coalesce((
                  select jsonb_agg(jsonb_build_object(
                           'creneau', l.creneau, 'libelle', l.libelle, 'grammes', l.grammes,
                           'quantite', l.quantite, 'prot_g', l.prot_g, 'origine', l.origine)
                         order by l.cree_le)
                    from public.journal_lignes l
                   where l.client_id = p_client_id and l.jour = d.jour), '[]'::jsonb))
             order by d.jour)
        from (select (v_auj - g)::date as jour from generate_series(6, 0, -1) g) d
        left join public.journal_jours j on j.client_id = p_client_id and j.jour = d.jour),
    'remarque', (
      select jsonb_build_object('texte', r.texte, 'changements', r.changements, 'le', r.cree_le)
        from public.journal_remarques r
       where r.client_id = p_client_id
       order by r.cree_le desc limit 1)
  );
end;
$$;

create or replace function public.journal_regler_coef(p_client_id uuid, p_coef numeric)
returns jsonb language plpgsql security invoker set search_path = public, extensions as $$
begin
  if p_coef is null or p_coef not in (1.2, 1.4, 1.5, 2.0) then raise exception 'coefficient inconnu'; end if;
  insert into public.journal_reglages (client_id, coef_proteines, maj_par, maj_le)
  values (p_client_id, p_coef, (select auth.uid()), now())
  on conflict (client_id) do update
     set coef_proteines = excluded.coef_proteines, maj_par = excluded.maj_par, maj_le = now();
  return public.journal_semaine_coach(p_client_id);
end;
$$;

create or replace function public.journal_envoyer_remarque(p_client_id uuid, p_texte text, p_changements text[] default '{}')
returns jsonb language plpgsql security invoker set search_path = public, extensions as $$
begin
  insert into public.journal_remarques (client_id, coach_user_id, texte, changements)
  values (p_client_id, (select auth.uid()), btrim(coalesce(p_texte, '')), coalesce(p_changements, '{}'));
  return public.journal_semaine_coach(p_client_id);
end;
$$;

revoke all on function public.journal_semaine_coach(uuid) from public, anon;
revoke all on function public.journal_regler_coef(uuid, numeric) from public, anon;
revoke all on function public.journal_envoyer_remarque(uuid, text, text[]) from public, anon;
grant execute on function public.journal_semaine_coach(uuid) to authenticated;
grant execute on function public.journal_regler_coef(uuid, numeric) to authenticated;
grant execute on function public.journal_envoyer_remarque(uuid, text, text[]) to authenticated;

-- ─── 8. L'XP : les 5 défis du journal, +5 chacun, une fois par jour ─────────
-- Recopie À L'IDENTIQUE de la version en production (lue le 21/09) ; seules
-- les 5 lignes « journal_* » sont nouvelles. Miroir UI : src/features/client-xp/actions.ts.
create or replace function public.record_client_xp(p_token text, p_action_key text)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_client_id text;
  v_xp int := 0;
  v_dedup_key text;
  v_today text := to_char(now() at time zone 'Europe/Paris', 'YYYY-MM-DD');
  v_week  text := to_char(now() at time zone 'Europe/Paris', 'IYYY-"W"IW');
  v_inserted_id uuid;
  v_total_xp int := 0;
begin
  -- 1. Resolve client_id via le helper canonique (cascade 3 tables, casts text-safe).
  v_client_id := public._resolve_client_id_from_token(p_token);

  if v_client_id is null then
    return jsonb_build_object('error', 'invalid_token');
  end if;

  -- 2. Map action_key → xp + dedup strategy.
  case p_action_key
    -- Caps "1x lifetime"
    when 'first_login'         then v_xp := 50;  v_dedup_key := 'first_login';
    when 'install_pwa'         then v_xp := 50;  v_dedup_key := 'install_pwa';
    when 'sandbox_completed'   then v_xp := 100; v_dedup_key := 'sandbox_completed';
    when 'tutorial_completed'  then v_xp := 30;  v_dedup_key := 'tutorial_completed';
    when 'silhouette_complete' then v_xp := 50;  v_dedup_key := 'silhouette_complete';
    when 'telegram_joined'     then v_xp := 30;  v_dedup_key := 'telegram_joined';
    when 'anniversary_1m'      then v_xp := 200; v_dedup_key := 'anniversary_1m';
    when 'anniversary_3m'      then v_xp := 500; v_dedup_key := 'anniversary_3m';
    when 'anniversary_6m'      then v_xp := 800; v_dedup_key := 'anniversary_6m';
    when 'google_review'       then v_xp := 200; v_dedup_key := 'google_review';
    when 'tab_agenda'          then v_xp := 5;   v_dedup_key := 'tab_agenda';
    when 'tab_pv'              then v_xp := 5;   v_dedup_key := 'tab_pv';
    when 'tab_evolution'       then v_xp := 5;   v_dedup_key := 'tab_evolution';
    when 'tab_conseils'        then v_xp := 5;   v_dedup_key := 'tab_conseils';
    when 'message_sent'        then v_xp := 15;  v_dedup_key := 'message_sent';
    -- Cap "1x/jour"
    when 'mood_checkin'        then v_xp := 5;   v_dedup_key := 'mood_checkin_' || v_today;
    -- Journal nutritionnel (21/09/2026) — les défis du jour, cap "1x/jour"
    when 'journal_note'        then v_xp := 5;   v_dedup_key := 'journal_note_' || v_today;
    when 'journal_proteines'   then v_xp := 5;   v_dedup_key := 'journal_proteines_' || v_today;
    when 'journal_eau'         then v_xp := 5;   v_dedup_key := 'journal_eau_' || v_today;
    when 'journal_complete'    then v_xp := 5;   v_dedup_key := 'journal_complete_' || v_today;
    when 'journal_actif'       then v_xp := 5;   v_dedup_key := 'journal_actif_' || v_today;
    -- Cap "1x/semaine"
    when 'measurement_added'   then v_xp := 10;  v_dedup_key := 'measurement_added_' || v_week;
    when 'weekly_weigh_in'     then v_xp := 20;  v_dedup_key := 'weigh_in_' || v_week;
    -- Cap "yearly"
    when 'happy_birthday'      then v_xp := 100; v_dedup_key := 'happy_birthday_' || to_char(now() at time zone 'Europe/Paris', 'YYYY');
    -- Cap "no_cap"
    when 'photo_uploaded'      then v_xp := 50;  v_dedup_key := 'photo_' || extract(epoch from now())::text;
    -- VIP V2 (2026-04-28)
    when 'vip_sandbox_completed'  then v_xp := 20;   v_dedup_key := 'vip_sandbox_completed';
    when 'vip_intentions_filled'  then v_xp := 30;   v_dedup_key := 'vip_intentions_filled';
    when 'vip_first_referral'     then v_xp := 100;  v_dedup_key := 'vip_first_referral';
    when 'vip_silver_reached'     then v_xp := 200;  v_dedup_key := 'vip_silver_reached';
    when 'vip_gold_reached'       then v_xp := 500;  v_dedup_key := 'vip_gold_reached';
    when 'vip_ambassador_reached' then v_xp := 1000; v_dedup_key := 'vip_ambassador_reached';
    else
      return jsonb_build_object('error', 'unknown_action', 'action_key', p_action_key);
  end case;

  insert into public.client_xp_events (client_id, action_key, xp_amount, dedup_key)
  values (v_client_id, p_action_key, v_xp, v_dedup_key)
  on conflict (client_id, dedup_key) do nothing
  returning id into v_inserted_id;

  select coalesce(sum(xp_amount), 0)::int into v_total_xp
  from public.client_xp_events
  where client_id = v_client_id;

  if v_inserted_id is null then
    return jsonb_build_object(
      'gained_xp', 0,
      'total_xp', v_total_xp,
      'action_key', p_action_key,
      'already_gained', true
    );
  end if;

  return jsonb_build_object(
    'gained_xp', v_xp,
    'total_xp', v_total_xp,
    'action_key', p_action_key,
    'already_gained', false
  );
end;
$function$;
