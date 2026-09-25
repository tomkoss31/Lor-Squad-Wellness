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

## Questions ouvertes

- Combien de clubs et de coachs hors lignée Thomas peut-il toucher en 12 mois ? (25 ou 100 ?)
- Le Playbook BBC appartient à qui ? (conditionne l'option formation)
- Protection de la distribution Herbalife : produit neutre (pas de nom ni de logo Herbalife), catalogue
  rempli par chaque club, société séparée.
- L'éditeur actuel dans l'app est SAS HTM FITLIFE : même société que « La Base Nutrition » ?
- Le code est sur le GitHub perso de Thomas : cession de droits vers la SAS qui vendra.
- Plan Vercel actuel : le Hobby est réservé à un usage non commercial (à revérifier).
- Holding ou non : questions à préparer pour l'expert-comptable.
