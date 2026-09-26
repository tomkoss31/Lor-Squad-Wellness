# Réflexion — monétisation et duplication de l'app (ouverte le 25/09/2026)

> Branche de réflexion `claude/app-monetization-duplication-419di7`. **Rien n'est codé.**
> Thomas : « on réfléchit seulement, on en parle point par point, on ne fait rien ».
> Ce fichier garde la mémoire de la discussion : décisions, constats, chiffres, questions.
> Il décrit une INTENTION, pas l'état du code (cf. CLAUDE.md, « Repères »).

## L'ordre de la discussion

1. La duplication : comment ça marche — **fait** (25/09)
2. À qui on vend — **tranché** (25/09)
3. Ce qui est inclus, ce qui est en option — à faire
4. L'« à emporter » (take away) : la caisse du club — à faire
5. Le prix — **premier chiffrage** (25/09), à affiner
6. La structure : SAS, holding, à qui appartient le code — à faire

## Décisions de Thomas (25/09)

- **Pour qui** : des coachs **hors de sa lignée** Herbalife, avec des **apps vierges**.
  (Supposé, à confirmer : sa propre équipe garde l'app incluse, comme le promet `/business`.)
- **Son rôle** : « web master, lecteur pas éditeur ».
- **Herbalife** : « pas forcément pour » la vente d'un produit dérivé hors cadre, « mais bon » :
  il faut le faire, le développement est une niche.
- **Inclus de base** : l'agenda partagé, la maintenance et les nouveautés.
- **Options évoquées** : site web + nom de domaine perso, personnalisation sur demande, formation
  (basics coach stagiaire / junior / partenaire), journal nutritionnel + Noaly.

## Point 1 — ce que dit le code (lu le 25/09)

**Modèle conseillé : une seule app, une seule base, chaque organisation dans sa bulle**
(plutôt qu'une copie par club : 29 migrations entre le 18 et le 24/09, × le nombre de clubs).

Déjà là :
- table `clubs` (juillet 2026) avec les réglages par club (`settings` : horaires, fériés, cartes) ;
- « créer un club » (`features/bbc/views/BbcClubs.tsx`, monté dans `BbcApp`) ;
- agenda, coachs et membres rangés par club (`coachs_du_club`, `clients.club_id`) ;
- l'échelle Membre → Stagiaire → Junior → Propriétaire → Roll out (`useBbcRole`) et la Formation BBC.

Manque (le vrai chantier) :
1. **« Admin » voit tout** : `is_admin()` (plus de 100 mentions dans les migrations) ouvre toute la base.
   Il faut un étage « organisation » au-dessus des clubs. Déjà noté par l'audit du 27/04.
2. **Des choses voulues entre nous deviendraient des fuites** (ex. PV du mois lisibles par tous les coachs).
3. **La marque est en dur** : 89 fichiers de `src/` citent labase360.fr, labase-nutrition.com ou Verdun ;
   `lib/branding.ts` = SAS HTM FITLIFE, SIRET, téléphone ; le site du club est écrit pour Verdun.
4. **Une option payante se verrouille côté serveur** (`app_level` masque un menu, ne protège rien).

Conséquence de « lecteur » (réponse du 25/09) : le rôle plateforme doit être **hors des bulles**. Ne pas lire
les données des membres par défaut (RGPD : la SAS est sous-traitante ; commercialement : un autre distributeur
ne confiera pas ses clientes à quelqu'un qui peut les lire). Accès support = ouvert par le club, temporaire, tracé.

## Point 4 (avant-première) — l'« à emporter » se branche sur l'existant

- `consumption_orders` : ventes comptoir (lignes, prix, PV, CA du mois), volontairement SANS fiche cliente.
- `pv_transactions` : type `reprise-sur-place` = qui a acheté quoi, quand, à quel prix.
- `pv_client_products` : « qui a quoi à la maison » (produit, départ, durée de référence 21 j → fin estimée).
- `herbalifeFormulas.ts` : rangs 25 / 35 / 42 / 50 %.
- ⚠️ Le pointage (`bbc_add_visit` → `bbc_agir_pour`) range la visite chez **la coach de la membre**, pas chez
  la personne en caisse : l'app ne sait pas qui a encaissé.
- Question ouverte : dans une vente, qui touche la marge — la coach de la membre, la stagiaire en caisse,
  le propriétaire du stock ?

## Point 5 — premier chiffrage (approximatif, HT, 25/09)

**Mesuré en base le 25/09** : Noaly a coûté **1,63 €** sur 30 jours (217 repas lus 1,48 €, 38 conseils 0,12 €,
le reste < 0,05 €) ; 2,26 € depuis le 11/06. Soit ≈ 0,7 c€ par repas lu, 0,3 c€ par conseil.
Échelle actuelle : 14 coachs actifs, 149 fiches, 15 membres du club, 1 club, base de 47 Mo, région eu-west-1.

**Faire tourner la machine (par mois)** — hypothèses :
| Poste | € / mois |
|---|---|
| Claude, formule Max (développement) | ~200 |
| Expert-comptable de la SAS | ~120 |
| Assurance RC Pro + cyber | ~50 |
| Supabase Pro + compute Small (Medium vers 50, Large vers 100 abonnés) | ~30 → 115 |
| Vercel Pro | ~20 |
| Resend (mails) | ~20 → 90 |
| Banque, domaine, petits outils | ~30 |
| **Total fixe** | **~470 → 650** |

Variable par abonné : Noaly 5 à 10 € pour un club actif (30 € au pire, plafonds déjà en place par membre),
Stripe ~3 %. En moyenne ~7 € par abonné.

**Formules d'exemple** (à discuter au point 3) :
- Coach : 39 €/mois — app coach, app cliente, agenda partagé, bilan en ligne, page de RDV.
- Club : 79 €/mois — tout « Coach » + mode club (pointage, cartes, cœurs, agenda du club, plusieurs coachs).
  Argument : moins qu'une carte de 10 visites (80 €).
- Option Noaly + journal : + 40 €/mois. Site + domaine : 490 € puis 15 €/mois. Mise en route : 190 € une fois.
  Personnalisation : sur devis. SMS : refacturés. Formation : en attente de la question du Playbook.
- Annuel : 2 mois offerts.

**Scénarios** (≈ 80 € encaissés par abonné en moyenne ; avant impôt sur les sociétés et avant de se payer ;
nombre d'abonnés supposé stable) :
| Abonnés | Encaissé / mois | Coûts / mois | Reste / mois | Reste / an |
|---|---|---|---|---|
| 7 | 560 € | ~520 € | ≈ 0 | point mort |
| 10 | 800 € | ~540 € | ~260 € | ~3 000 € |
| 25 | 2 000 € | ~650 € | ~1 350 € | ~16 000 € |
| 50 | 4 000 € | ~930 € | ~3 000 € | ~37 000 € |
| 100 | 8 000 € | ~1 350 € | ~6 600 € | ~80 000 € |

Le vrai coût = le temps de Thomas (support ~30 min par abonné et par mois au départ, + le développement).
Avant le premier euro : ~2 500 € (création de la SAS, CGV + contrat de sous-traitance RGPD, marque INPI)
+ plusieurs semaines de chantier (bulles, marque par organisation, paiement de l'abonnement, inscription).

### 50, 100, 1 000 abonnés (25/09, 3e échange)

Thomas : « aucune idée » du nombre qu'il peut toucher ; « l'outil est incroyable ; s'il est rentable, peu cher,
utile, il risque de marcher fort face à un outil de coaching. C'est possible. Imagine 50, 100, 1 000 ? »

Un « abonné » = un coach ou un club qui paie. 1 000 abonnés ≈ 30 000 à 100 000 personnes dans les apps.

| Abonnés | Encaissé / mois | Coûts / mois | Reste / mois | Reste / an |
|---|---|---|---|---|
| 50 | 4 000 € | ~930 € | ~3 000 € | ~37 000 € |
| 100 | 8 000 € | ~2 900 € (dont un mi-temps support ~1 500 €) | ~5 000 € | ~60 000 € |
| 1 000 | 80 000 € | ~42 000 € | ~38 000 € | ~450 000 € |

Coûts à 1 000 : équipe de 5 (2 support, 1 mise en route / vente, 2 dev) ~25 000 € ; hébergement, outils, avocat,
comptable, assurance, audit de sécurité ~4 500 € ; Noaly + Stripe ~7 500 € ; faire connaître l'app ~5 000 €.

Ce qui change à chaque palier :
- **50** — tenable seul avec Claude, à trois conditions : une base de TEST séparée (aujourd'hui dev et prod
  partagent la même base), l'hébergement payant, les bulles étanches testées comme l'audit du 29/07.
- **100** — un mi-temps au support, inscription et paiement sans Thomas, les tutos vidéo, un suivi des erreurs
  (aucun outil aujourd'hui : ni Sentry ni équivalent), une 2e personne capable de faire tourner la machine.
- **1 000** — une entreprise : équipe, autres pays francophones (catalogues et prix par pays, puis traduction),
  avis d'avocat sur l'hébergement de données de santé (HDS : si oui, changer d'hébergeur), et Herbalife le verra.

Conseil : ne pas viser 1 000, viser **5 clubs pilotes** hors lignée. Ils valident le prix, l'utilité et le
temps de support ; le reste, c'est les répéter.

### Le prix de lancement (25/09, 4e échange)

**Décision de Thomas** : « rien de gratuit, rien ne se donne ». Pas de prix réduit pour les pilotes : un prix bas
annoncé une fois devient la référence et ne se remonte jamais. Ordre prévu : créer l'entreprise, investir pour
dupliquer sur 5 clubs, puis plus.

Proposé pour le lancement (un seul paquet, pour un club) :
> App coach + app des membres + agenda partagé + journal nutritionnel avec Noaly, mises à jour et guide en ligne
> compris : **149 € HT / mois** (178,80 € TTC pour qui ne récupère pas la TVA) + **290 € de mise en route**
> (réglages, import des fiches, prise en main).

- Pourquoi pas 119 € : à 149 €, la machine se paie dès le 4e club (4 × 149 = 596 € > 470 € de frais + ~14 € par
  club) ; à 119 €, 5 clubs couvrent tout juste les frais, pendant la phase la plus chargée en support.
- Argument : moins de deux cartes de 10 visites (2 × 80 €).
- Mises en route : 5 × 290 = 1 450 € sur les ~2 500 € de départ ; le reste couvert en ~5 mois (≈ 205 € de reste
  par mois à 5 clubs).
- Dire « mises à jour et nouveautés incluses », pas « dev inclus » : un développement pour UN club = sur devis.
- Pas d'essai gratuit : une démo sur le club de Thomas (sa meilleure preuve).
- En parler dès maintenant = « en préparation » + liste des clubs intéressés, sans encaisser ni donner de date
  (la société n'existe pas encore). La liste mesure la demande.
- Plus tard : une formule moins chère pour un coach seul, sans club (point 3).

### Le prix, revu (25/09, 5e échange)

Thomas : « qui paie 149 € une app ? C'est vraiment cher, non ? » — pour un petit club, oui.
- Le marché (recherche web du 25/09) : logiciels de salles et studios = 49-100 €/mois pour les petites
  structures, 100-200 € les moyennes ; Deciplus à partir de 69-79 € HT (jusqu'à 299 €), bsport ~150 €.
- Le club de Thomas = **15 membres** dans l'app (mesuré le 25/09). Cartes ≈ 1 200 €/mois : 149 € = 12 %.

**Proposition revue — le prix suit la taille du club** (tout compris : app, agenda, journal + Noaly,
mises à jour, guide) :
| Membres actifs | Prix HT / mois |
|---|---|
| jusqu'à 30 | 69 € (moins qu'une carte de 10 visites) |
| 31 à 80 | 109 € |
| plus de 80 | 149 € |
+ 290 € de mise en route.

- Compatible avec « un prix ne se remonte jamais » : le prix de chaque palier ne bouge pas, mais le club
  change de palier en grandissant. Le revenu suit la réussite des clubs sans hausse de prix.
- Phase pilote : 5 petits clubs = 345 €/mois pour ~510 € de coûts → ~165 €/mois d'investissement,
  couverts ~9 mois par les 5 mises en route (1 450 €). Point mort ≈ 8 petits clubs.
- À 50 clubs (60 % petits, 30 % moyens, 10 % grands ≈ 89 € en moyenne) : ~3 000 à 3 500 €/mois de reste.
- Plancher ~69 € : le support prend autant de temps pour un petit club que pour un grand.

## Business validé (26/09)

Thomas : « OK pour le business de l'app ! » (après la proposition des paliers 69 / 109 / 149 € + 290 €).
Puis : « concernant l'optimisation de l'app, on commence par quoi ? »

## La duplication — l'ordre du chantier (partie BUSINESS, 26/09)

Thomas : « Garde ça en mémoire ! Ça appartient au business. » Ce chantier sert la vente de l'app ;
il ne se lance qu'avec le projet de duplication (SAS, hébergement payant).

1. **Dès maintenant, sans payer ni toucher à la prod :**
   a. le plan des bulles sur papier (qui voit quoi : propriétaire, coachs, stagiaire, membres, et Thomas en
      webmaster qui ne voit pas leurs clientes) → une maquette à valider ;
   b. la photographie de la STRUCTURE de la base (sans données) dans le dépôt. Aujourd'hui rien ne garantit
      qu'on puisse reconstruire la base depuis le dépôt : `clients` n'est créée par aucune des 469 migrations
      (elle vient de `supabase/schema.sql`, à côté de 5 autres fichiers SQL hors `migrations/`).
2. **Une base d'essai + un faux club** (essais ET démos : jamais de vraies clientes devant un prospect).
   Démarre avec l'hébergement payant de la plateforme : le plan gratuit n'autorise que 2 projets actifs
   pour tout le compte (La Base + Shakes & Drinks les occupent probablement).
3. **Les bulles**, construites et testées sur la base d'essai (le gros morceau).
4. **La marque de chaque club** (nom, logo, mentions, mails) + **les paliers vérifiés par le serveur**.
5. **Inscription, paiement de l'abonnement, mise en route**, guide en ligne.
6. **Avant le premier pilote** : la prod sur l'hébergement payant + alertes d'erreurs.
En parallèle, hors code : SAS, avocat (CGV, contrat RGPD), marque INPI. L'« à emporter » vient après.

## Point 4 — l'« à emporter » : par où commencer (26/09)

Thomas : « je parle seulement des idées que j'avais inscrites sur le suivi de la rentabilité, avec qui a
acheté quoi, quand ». C'est ÇA « l'optimisation de l'app » (distinct de la duplication).

Mesuré en base le 26/09 :
- les 14 coachs actifs ont leur rang (`users.current_rank`) : 4 à 25 %, 4 à 35 %, 1 à 42 %, 5 à 50 % ;
  la table `herbalife_margins` donne la marge de chaque rang → « sa marge selon son rang » est calculable ;
- l'écran Rentabilité (`get_users_rentability`) calcule CA + marge par coach, mais SEULEMENT sur les
  produits des fiches (`pv_client_products`, 514 lignes, vivant) : ni les cartes du club, ni le comptoir ;
- ventes comptoir (`consumption_orders`) : 25 ventes, dernière le 04/09, sans fiche cliente ;
- `pv_transactions` : 422 lignes (398 commandes, 24 reprises sur place), dernière le 24/08 ;
- cartes de membres : 17, dont 16 avec leur prix.

Manque : la question au pointage, le catalogue du club avec SES prix, le lien vente ↔ membre ↔ personne en
caisse, l'écran de rentabilité du club (propriétaire) et « ce que j'ai gagné » (stagiaire).

Règles proposées par défaut (à valider par Thomas) :
1. Les cartes de visites → le club ; les add-ons → la personne en caisse, avec sa marge selon son rang.
   **Question n°1 : elle vend SON stock ou celui du club ?**
2. Un seul prix par produit pour tout le club, fixé par le propriétaire ; pas de remise en caisse.
3. « À la maison » seulement pour ce qui dure (sachets F1, thé, aloé) : date d'achat + nombre de jours =
   date de fin → règle de Contacter « son F1 arrive au bout ». Barres, chips : dans le chiffre, pas à la maison.
4. L'upgrade sur place (grand thé-aloé) = un add-on, et il remplace la boisson du club dans son journal.
5. Le propriétaire voit tout le club ; une stagiaire ne voit que ses ventes et ce qu'elle a gagné.
6. Une seule caisse : avec une membre pointée = son « à emporter » ; sans membre = vente comptoir.

La liste attendue de Thomas (8 produits pour commencer) : nom · prix de vente au club · son prix de
revient à lui (50 %) · pour ce qui dure, combien de jours. Plus les upgrades et leur supplément.
Ensuite : maquette des 3 écrans (pointage, « À la maison » sur la fiche, rentabilité), puis le code.

### Règles validées et ce qu'il manque (26/09, suite)

**Thomas** : « ok pour les règles », **stock du club**, il envoie la liste. Qui encaisse quoi :
- la stagiaire (coach en formation) en caisse vend les « à emporter » ;
- le propriétaire encaisse les cartes de visites ;
- une stagiaire devient **junior** avec **10 membres actives en première ligne** (pas les cœurs de ses
  cœurs) : elle encaisse alors les cartes (de ses membres — à confirmer).
- « Faire vraiment attention à ne pas compliquer l'app : simple et ludique. »

Reste à trancher : sur un « à emporter » (stock du club), que gagne la stagiaire ? Proposition : la logique
de l'écart Herbalife — elle gagne sa marge selon son rang, le propriétaire garde la différence jusqu'à ses
50 %. Ex. un article à 4 € : coût club 2 €, stagiaire à 25 % → 1 €, propriétaire → 1 €.

Junior automatique : aujourd'hui `useBbcRole` décide « junior » par le pré-lancement ou la main du
propriétaire. La règle des 10 membres actives est calculable (`client_referrals.from_client_id` +
`referred_client_id` + visites), MAIS la base ne compte que **2 cœurs** (26/09) pour 15 membres :
personne ne note qui a amené qui. Idée : une question à la création d'une fiche, « Qui l'a amenée ? »
(un toucher) → le cœur est donné, la première ligne se compte, junior devient automatique.

**Les prix — ce qu'on a** :
- la recette du club (`bbcClubPrices.ts`) : F1 26 g (21 shakes / pot 550 g), PDM 14 g (42 / 588 g),
  thé 1,7 g (30 / 51 g), aloé 10 ml (47 / 473 ml) + le prix public de chaque contenant
  (`herbalifeCatalog`) → coût d'une portion au palier du club (50 %, `clubs.settings.palier_remise`) ;
- l'ancienne carte du club (26 lignes), retirée le 28/07 (commit `7525b6c`, voir `7525b6c^`) : 14 prix
  relevés sur le tarif du 25/06, surtout en-cas et énergie (chips 3,30 €, barre protéinée 2,30 €,
  Achieve 4,60 €, LiftOff Max 3,85 €, Rebuild 5,10 €, Immune Booster 2,50 €…), jamais validés dans l'app.
  `clubs.settings.carte` est vide en base : rien n'a été saisi.
- **Manque** : le prix à l'unité des « à emporter » (sachet F1, sachet PDM ½ ou entier, thé, aloé) et
  les **upgrades** avec leur supplément (les « grand format » de l'ancienne carte étaient des tailles de
  POT, pas de verre).
- Leçon du 28/07 (« ne pas surcharger l'app ») : 8 produits au comptoir, pas 26.

**Le journal qui se parle avec l'« à emporter »** (exemple de Thomas : Mélanie vient vendredi, club fermé
samedi et dimanche → 5 sachets F1 + 3 PDM (½) + des barres) :
- au pointage du vendredi, l'app connaît les horaires : « Club fermé 2 jours — elle prend de quoi tenir ? »,
  une quantité proposée que la stagiaire corrige d'un toucher ;
- chez elle, « Tes habituels » propose en tête « Shake F1 (tes sachets du club) » (l'aliment « Shake F1 +
  ½ sachet PDM », repère du club, existe) : un toucher = noté ET un sachet de moins à la maison ;
- à 1 sachet : elle le voit ; sa coach reçoit « son F1 arrive au bout » (Contacter) ;
- si elle ne note pas, l'app compte 1 sachet par jour depuis l'achat : le journal affine, il ne bloque pas ;
- au suivi, la coach voit si les shakes ont été pris les jours sans club (la vraie observance) ;
- règle : chez elle on PROPOSE, on ne pré-remplit jamais (seul le club pré-remplit, on sait qu'elle l'a pris).

### La carte du club, envoyée par Thomas (26/09)

Photo du tableau : `docs/reflexion/tableau-du-club-2026-09-26.jpg`. **Le tableau fait foi.** 34 lignes.

| Rubrique | Produit | Prix |
|---|---|---|
| Petit déj | Formula 1 (sachet) · PDM (sachet 2 doses) · Thermo (sachet 3 doses) | 3,80 · 4,50 · 4,10 € |
| Petit déj | Pack 6 jours (F1 + Thermo) · Pack 6 jours avec PDM · Aloé Vera (flacon) | 31 · 44 · 54,50 € |
| Accessoires | Shaker oublié · cuillère doseuse · shaker couleur · gourde 2 L | 3,50 · 2,50 · 13,50 · 19 € |
| Suppléments sur place | Collagène · fibre pomme (5 g) · fibre orange goji (3 g) + vit. C · Beta (cholestérol) · F3 PPP (5 g) · PDM · Créatine+ | 2,80 · 1,50 · 2,10 · 1,90 · 1,30 · 1,90 · 1 € |
| Encas (g = protéines) | Barres encas vanille amande / chocolat citron (10 g) | 2,30 € |
| Encas | Barres Achieve cookie / chocolat noir (21 g) | 4,60 € |
| Encas | Barres Formula 1 chocolat noir (13 g) / cranberry choco blanc (15 g) | 4,40 € |
| Encas | Chips protéinées barbecue (11 g) / crème oignons (12 g) | 2,80 € |
| Encas | Shake F1 à emporter (18 g) · Shake iced coffee à emporter (15 g) | 5,50 · 5,30 € |
| Compléments | Microbiotic Max · Immune Booster | 3,30 · 2,50 € |
| H24 | CR7 · LiftOff · LiftOff Max · Rebuild · Hydrate | 1,70 · 4 · 3,90 · 5,10 · 2,40 € |

Ce que la carte apprend (vérifié avec `herbalifeCatalog.ts`) :
- **Les prix = le prix public Herbalife ramené à la portion**, arrondi au-dessus : chips 27,50/10 = 2,75 →
  2,80 ; barres 31,50/14 = 2,25 → 2,30 ; Immune 51/21 = 2,43 → 2,50 ; Microbiotic 64,50/20 → 3,30 ;
  LiftOff Max 38,50/10 → 3,90 ; aloé = le flacon au prix public (54,50). Thermo = le thé 51 g :
  41/30 × 3 = **4,10 € pile**. Donc au palier 50 %, le club garde ~la moitié de ce qu'il vend.
- **Au-dessus du prix public** : sachet F1 3,80 € (public 3,02 → ~60 % de marge), sachet PDM 4,50 €
  (public 3,57 → ~60 %), shake F1 à emporter 5,50 € (F1 + PDM ≈ 2,40 € de coût à 50 %).
- **Les packs = la somme des sachets** : 6 F1 + 2 Thermo = 31,00 € ; + 3 PDM = 44,50 → vendu 44 €.
  → un pack 6 jours = 6 shakes F1 + 6 thés (+ 6 doses PDM) « à la maison ».
- Changés depuis l'ancienne carte du 25/06 : chips 3,30 → 2,80 ; CR7 1,40 → 1,70 ; LiftOff 1,95 → 4 ;
  café glacé 5,25 → 5,30.
- Pas dans le catalogue de l'app : Achieve (149K), fibre orange goji, collagène, barre F1 cranberry,
  accessoires. Portions par pot inconnues : Rebuild, CR7, F3, fibre pomme, café glacé, Beta, barre F1.

Comment chaque rubrique entre dans l'app :
- **Petit déj** (sachets, packs, aloé) → « À la maison » (le stock chez elle, relié au journal) ;
- **Suppléments sur place** → les upgrades, ajoutés au shake du jour (et à ses protéines dans le journal) ;
- **Encas, compléments, H24** → vendus à l'unité ; barres, chips et shakes à emporter vont aussi au journal ;
- **Accessoires** → dans le chiffre seulement.

Caisse simple malgré 34 lignes : d'abord SES habituels (Mélanie : F1 + PDM) et les 6 meilleures ventes en gros
boutons ; « Tout le tableau » à un toucher, rangé comme le tableau (mêmes 5 rubriques, mêmes couleurs) ;
5-6 sachets F1 → l'écran propose le pack 6 jours.

Reste à demander : le grand thé-aloé de Mélanie (absent du tableau) ; la part de la stagiaire ;
le prix d'achat des accessoires ; les portions par pot des 7 produits ci-dessus (liste précise avec la maquette).

## Questions ouvertes

- Combien de clubs de nutrition et de coachs Herbalife existent en France (et en francophonie) ? Ordre de
  grandeur à demander à l'upline / au réseau : c'est ce qui dit si 1 000 est un objectif ou un rêve.
- Qui seraient les 5 clubs pilotes ?
- Le Playbook BBC appartient à qui ? (conditionne l'option formation)
- Protection de la distribution Herbalife : produit neutre (pas de nom ni de logo Herbalife), catalogue
  rempli par chaque club, société séparée.
- L'éditeur actuel dans l'app est SAS HTM FITLIFE : même société que « La Base Nutrition » ?
- Le code est sur le GitHub perso de Thomas : cession de droits vers la SAS qui vendra.
- Plan Vercel actuel : le Hobby est réservé à un usage non commercial (à revérifier).
- Holding ou non : questions à préparer pour l'expert-comptable.
