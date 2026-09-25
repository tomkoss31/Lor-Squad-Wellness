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
