> **Plan de construction CRM Board V2** — issu de l'analyse détaillée des maquettes
> Claude Design (21/08). Trois artboards inventoriés composant par composant
> (structure 6a, filtres + carte enrichie + drag 3a/3b, correspondance données)
> et croisés avec le code réel. Deux artboards (responsive détaillé, fiche lead
> plein écran + thème clair) restent à inventorier — leurs grandes lignes sont
> dans §1.2/1.3 et §4.3.
>
> ⚠️ C'est une RÉÉCRITURE de src/pages/CrmPage.tsx (2047 lignes), pas un ajout.
> Elle supprime l'empilement actuel — décision produit de Thomas, pas encore prise.

# PLAN DE CONSTRUCTION — Réécriture de l'écran `/crm`

Racine de travail : `C:\Users\tomko\Documents\Lor'Squad Wellness\` (worktree `.claude\worktrees\claude-design-website-e35bf2\`).
Fichier à remplacer : `src\pages\CrmPage.tsx` (2 047 lignes aujourd'hui).
Règle de traduction posée par Thomas le 20/08 et déjà appliquée dans `CrmBoiteArrivee.tsx` / `CrmJaugeEntonnoir.tsx` : **structure de la maquette, couleurs de l'app** (`var(--ls-*)`, zéro hex dans les `.tsx`).

---

## 1. LA STRUCTURE CIBLE

### 1.1 Desktop ≥ 1280 px — deux colonnes, plus jamais une pile

La maquette 6a est figée à 1 880 px : `aside` 360 px `flex:none` (19,1 %) + entonnoir `flex:1` (80,9 %), 5 colonnes `flex:1 min-width:0` (≈ 15,2 % de l'écran chacune). On garde les **ratios**, pas les pixels.

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ ASIDE  «📥 Arrivées»          │  BARRE D'OUTILS                              │
│ 320px fixe (18–20 %)          │  Entonnoir · [🔍 recherche] ·(auto)· 👤 Moi ▾│
│  ├ en-tête + badge «N à       │  · ⋯ Filtres (N) · + Lead                    │
│  │  valider»                  ├──────────────────────────────────────────────┤
│  ├ pile de cartes d'arrivée   │  JAUGE : Ce mois / N leads │ 5 segments      │
│  │  (scroll interne)          ├──────────────────────────────────────────────┤
│  └ pied «11 points d'entrée»  │  BOARD — 5 colonnes flex:1 min-width:0       │
│    (margin-top:auto)          │  Nouveau│Contacté│À relancer│RDV calé│Converti│
│                               │                                    └ Perdus  │
│                               │                                    └ Endormis│
└───────────────────────────────┴──────────────────────────────────────────────┘
```

- **Aside** : `width:320px; flex:none;` (360 px de la maquette rapporté à un écran réel de 1 440–1 680 px = trop gourmand ; 320 px conserve le ratio ~20 %). `display:flex; flex-direction:column;` — en-tête, pile scrollable (`overflow-y:auto; flex:1`), pied poussé par `margin-top:auto`. **Se masque entièrement quand 0 lead `enAttente`** (comportement déjà en place, `CrmPage.tsx:540-548`) ; le board reprend alors 100 %.
- **Colonne entonnoir** : `flex:1; min-width:0;` — trois bandes empilées (barre / jauge / board), la troisième en `flex:1`.
- **Board** : `display:flex; gap:12px;` 5 enfants `flex:1; min-width:0`. **`min-width:0` est obligatoire** : sans lui, une carte au nom long fait déborder la ligne et casse le partage égal.
- **Panneau lead docké** (au clic sur une carte) : 3ᵉ colonne `width:360px; flex:none`, à droite du board — **jamais en overlay** (exigence explicite de la maquette). Le board tombe alors à `flex:1` sur une largeur réduite ; en dessous de 1 440 px avec panneau ouvert, le board passe en `overflow-x:auto` avec colonnes `min-width:240px` plutôt que d'écraser les cartes.
- **Verticalité** : le board scrolle par colonne (`overflow-y:auto` sur la pile de cartes, en-tête de colonne `position:sticky; top:0`), pas la page entière. Chaque colonne rend **2 cartes max + pied « + N autres »** (dépliage sur place, pas de navigation).

### 1.2 iPad (768 → 1 279 px)

- **Aside → bandeau replié** en tête de l'entonnoir, pleine largeur, une ligne : `📥 5 arrivées à valider · 1 RDV club · 1 doublon · Ouvrir ▾`. Déplié, il rend les mêmes cartes en grille 2 colonnes.
- **Board → scroll horizontal** : colonnes `flex:0 0 260px`, `overflow-x:auto` sur le conteneur, `scroll-snap-type:x mandatory` + `scroll-snap-align:start` sur chaque colonne. Le libellé de la colonne reste sticky en haut.
- **Jauge** : les 4 taux intercalaires disparaissent (`display:none` déjà codé dans `CrmJaugeEntonnoir.tsx`, media query `max-width:1023.98px`) ; segments en `flex-basis:calc(50% - 4px)` → 2 lignes de 2-3.
- **Panneau lead** : passe en tiroir droit de 360 px superposé (overlay assumé ici — il n'y a plus la place de le docker), fermeture par tap hors zone.
- **Drag & drop** : conservé, saisie par **appui long** (`touch-action:none` sur la poignée uniquement, sinon on tue le scroll de la colonne).
- **Cibles** : tout bouton passe à `min-height:44px` sous 1 024 px, **par classe CSS jamais par style en ligne** (piège payé le 18/08 sur la barre de relances — un style en ligne bat une media query).

### 1.3 Téléphone (< 768 px)

Le board **n'existe pas**. On rend `CrmFileDuJour` :

```
Aujourd'hui
11 gestes — commence en haut.            [Entonnoir ›]
┌ 📥 À valider · 2 ────────── tout voir → ┐  (tiroir horizontal, scroll-snap)
📥 Arrivées ▸ 2 cartes en carrousel
🔴 En retard · 3      ──────────── (zone "relancer" de zones.ts)
  Laure P. 🔥 · 3 j · Pas de réponse · −9 kg     [📱] [🎯]
📅 RDV du jour · 1
🆕 Jamais contacté · 2
Puis 5 relances calées demain — rien à faire aujourd'hui 👌
```

- Source du rangement : **`src/features/crm/zones.ts`** (`grouperParZone`, 6 zones déjà écrites : `jamais / relancer / rdv / semaine / plusTard / refermes`) — c'est exactement la file du jour de la maquette 2d, elle existe déjà.
- Ligne : `min-height:48px`, **1 à 2 gestes max** à droite (`📱 WhatsApp`, `🎯 Et alors ?`).
- « Et alors ? » = **bottom-sheet** montant du bas (`FeuilleQualification` existante, à re-emballer dans une feuille) ; c'est le seul mécanisme de déplacement sur téléphone, le drag est retiré.
- Sections `semaine` / `plusTard` repliées par défaut.

### 1.4 CE QUI DISPARAÎT de l'écran actuel

L'écran d'aujourd'hui empile onze blocs verticalement (`CrmPage.tsx` lignes 514 → 1 190). Sort du flux principal :

| Bloc actuel | Ligne | Devient |
|---|---|---|
| Repli `🗓️ Rendez-vous demandés` → `RdvBookingsWidget` + `ClubDiscoveryWidget` | 555-572 | **Supprimé de `/crm`**. Chaque réservation devient une **carte d'arrivée violette** avec `✓ Confirmer + email`. C'est le point 2 de la maquette : « plus de widget séparé, plus de nom en double ». ⚠️ l'email d'acceptation ne part que de là — la migration doit porter le geste, pas seulement le supprimer. |
| Chips filtres par source + **5 compteurs par statut** | 765-806 | Compteurs → **absorbés par la jauge** (déjà les mêmes chiffres). Chips source → **sélecteur `Source ▾`** dans le panneau Filtres. |
| Stats par source + barres de conversion | 807-838 | **Sortent de `/crm`** → `/admin/audience` ou le panneau Filtres replié. Ce n'est pas un écran de travail. |
| Section « Curieux » (bilan commencé, pas fini) | 839-919 | **Cartes d'arrivée neutres** « Bilan commencé, arrêté à l'étape 2/6 » + bouton unique `🌿 Relancer en douceur`. |
| `Tabs` Actifs / Historique / Endormis | 920-947 | **Supprimé.** « Refermés » = colonne Converti + **deux lignes repliées `Perdus N` / `💤 Endormis N`** sous elle. |
| `Tabs` Liste / Pipeline | 948-992 | **Supprimé.** C'est la **largeur** qui décide : file sur téléphone, board au-dessus. Deux modes concurrents = deux implémentations à maintenir (règle B9). |
| Sélecteur de tri (`OPTIONS_DE_TRI`) | dans `CrmLeadsListView` | **Supprimé du board** (l'ordre est celui de la colonne : plus vieux en haut). Conservé dans la file mobile. |
| Filtre par ligne (`scope` me/l1/l2/all) | 717-764 | Fusionné dans le **sélecteur `Coach ▾`** du panneau Filtres + la puce `👤 Moi ▾` de la barre. Un seul endroit. |
| Pavé « cap du jour » (3 lignes de texte) | 514-539 | Une ligne dans la barre d'outils sur desktop ; **reste en tête sur téléphone** (c'est là qu'il sert). |
| `LeadCard` interne (≈ 400 lignes, lignes 1195-1589) avec menu déroulant d'actions, sélecteur de statut, sélecteur de source, bloc message IA | 1195-1589 | **Éclaté** : la carte devient muette (2 actions max), tout le reste passe dans le **panneau lead**. |

**Solde** : de 11 blocs empilés à **3 zones simultanées** (arrivées / entonnoir / détail).

---

## 2. INVENTAIRE DES COMPOSANTS À ÉCRIRE

Convention de nommage : français, dossier `src/components/crm/` pour le rendu, `src/features/crm/` pour la logique pure testable (contrat déjà en place : fonctions pures, `maintenant: Date` en paramètre).

### 2.1 Structure

| Composant | Rôle | Écran | Existe ? |
|---|---|---|---|
| `CrmPage.tsx` | Orchestrateur : data, filtres, sélection, routage responsive. Doit **maigrir de 2 047 → ~450 lignes** | tous | ⚠️ à réécrire |
| `CrmEcranBoard.tsx` | La coquille 2/3 colonnes desktop+iPad (aside / entonnoir / panneau) | desktop, iPad | ❌ **à écrire** |
| `CrmBarreOutils.tsx` | Titre, recherche, `👤 Moi ▾`, `⋯ Filtres (N)`, `+ Lead` — dans cet ordre | desktop, iPad | ❌ à écrire (logique dispersée aujourd'hui lignes 584-620) |
| `CrmFileDuJour.tsx` | La file unique mobile, alimentée par `zones.ts` | téléphone | ❌ à écrire |
| `CrmLigneFile.tsx` | Une ligne de file : nom, phrase d'état, 1-2 gestes | téléphone | ❌ à écrire (proche de `CrmLeadsListView`, à en extraire) |

### 2.2 Boîte d'arrivée

| Composant | Rôle | Existe ? |
|---|---|---|
| `CrmBoiteArrivee.tsx` | Panneau + pile + pied « 11 points d'entrée » | ✅ **existe**, mesuré au pixel sur la maquette (`src/components/crm/CrmBoiteArrivee.tsx`) |
| `CrmCarteArrivee.tsx` | À **extraire** de `CrmBoiteArrivee` : une carte + son jeu de boutons variable | ⚠️ inline aujourd'hui |
| Geste `✓ Confirmer + email` | Confirme la réservation club **et** envoie l'email | ⚠️ la logique existe dans `RdvBookingsWidget.tsx` — **à déplacer**, pas à réécrire |
| Geste `⇥ Fusionner les 2` | Fusion de doublon à l'arrivée | ❌ **à écrire**. La *détection* existe (`CrmPage.tsx:265-307`, clé email OU téléphone normalisé `-9` chiffres) ; la *fusion* n'existe pas — aujourd'hui on **regroupe l'affichage** sans rien écrire en base |
| Geste `📱 Demander le numéro à X` | Ouvre WhatsApp vers le parrain (`lead.parrainPhone`) | ⚠️ donnée présente, geste à câbler |
| Geste `🌿 Relancer en douceur` | Relance d'un bilan abandonné | ⚠️ `useCuriousLeads` + `crmResponseTemplates` existent |
| Geste `Attribuer à…` | 4ᵉ geste annoncé par l'encart 1, **sans contrôle dans la maquette** | ❌ à trancher (cf. §6) — `tableSupportsAssignment` (`src/lib/leadRouting.ts`) dit déjà quelles tables l'acceptent |

### 2.3 Entonnoir

| Composant | Rôle | Existe ? |
|---|---|---|
| `CrmJaugeEntonnoir.tsx` | 5 segments cliquables + taux + barres | ✅ **existe** (`JaugeFiltre = {etape, relance}`) — reste : la **largeur des barres** (cf. §6) |
| `CrmColonneEtape.tsx` | En-tête teinté (pastille 7 px, libellé, effectif Syne 13/800), pile, pied `+ N autres`, états de drop | ❌ **à écrire** (aujourd'hui inline, lignes 1050-1118) |
| `CrmCarteLead.tsx` | **LE composant central** — cf. §3 | ❌ **à écrire** (remplace `LeadCard` interne, 1195-1589) |
| `CrmLignesRefermees.tsx` | `Perdus N` / `💤 Endormis N` repliées + note de recyclage 3 mois | ❌ à écrire |
| `CrmPanneauLead.tsx` | Panneau docké : identité, étapes, Noaly, actions, historique, navigation ↑↓ | ⚠️ `CrmLeadDetailPage.tsx` (1 306 L) fait déjà tout ça en pleine page → **extraire les blocs**, garder la route `/crm/leads/:key` comme « ↗ Fiche complète » |
| `CrmPanneauFiltres.tsx` | Tiroir : 4 familles de chips + 3 sélecteurs + bandeau résultat + `💾 Sauver comme vue` | ⚠️ logique complète dans `src/features/crm/filtresQualification.ts` (températures, 4 signaux, objectifs, vues localStorage) ; **le rendu est à refaire** (aujourd'hui empilé dans la page, 624-716) |
| `FeuilleQualification.tsx` | « Et alors ? » — 6 réponses, chacune pose sa date | ✅ **existe** (`src/features/crm/FeuilleQualification.tsx`) — reste : variante **bottom-sheet** mobile |
| `EtatRdvBloc.tsx` | Bloc après-RDV (Venue / Réfléchit / Pas venue) | ✅ **existe** — à **redescendre dans la carte** de la colonne RDV calé |

### 2.4 Logique (features/lib) — presque tout est là

| Module | Ce qu'il donne | État |
|---|---|---|
| `src/hooks/useCrmLeads.ts` | Agrégation 11 sources, `CrmLead` (60+ champs), `accepter`, `qualifier`, `updateStatus`, `setDormant`, `deleteLead` | ✅ |
| `src/features/crm/qualification.ts` | 6 réponses `REPONSES` (`pas_de_reponse` 1 j · `rappellera` 3 j · `ne_sait_pas` 7 j · `pas_maintenant` 30 j · `plus_interesse` ∅ · `rdv` ∅), `dateDeRetour`, `quandRevient` | ✅ |
| `src/features/crm/ecrireQualification.ts` | Traduction des statuts par table (`online_bilans.lead_status = 'contact'`, `prospect_leads` ne connaît pas `qualified`) | ✅ **critique** |
| `src/features/crm/echeances.ts` | `groupeDe` → `aujourdhui / semaine / plusTard / refermes` | ✅ |
| `src/features/crm/zones.ts` | 6 zones par GESTE + `phraseEtat()` (la phrase sous le nom) | ✅ |
| `src/features/crm/etapes.ts` | « Quoi faire dans l'ordre », **une seule étape `maintenant`** | ✅ (panneau lead) |
| `src/lib/leadScoring.ts` | `score /10`, `temperature`, `raison` en 3 mots | ✅ (mais **pas** le /100 additif de la maquette) |
| `src/lib/leadActivity.ts` | `stagnationDays`, `isStagnant` (seuils 3 j `new` / 2 j sinon) | ✅ |
| `src/features/crm/filtresQualification.ts` | Prédicats + `passe()` + vues sauvées | ✅ |
| `src/lib/crmMessages.ts`, `crmResponseTemplates.ts` | WhatsApp/SMS pré-rédigés par source | ✅ |
| `src/features/crm/nomPropre.ts` | `nomAffiche(prenom, nom)` — casse propre, particules | ✅ |
| `src/features/crm/agendaLien.ts` | Lien Google Agenda | ✅ |

**À écrire côté logique** : `fusionDoublons.ts` (quelle fiche survit, quels champs se reportent, quoi faire des deux `id` en base) et `partsJauge.ts` (largeur des barres — cf. §6).

---

## 3. LA CARTE LEAD, ÉLÉMENT PAR ÉLÉMENT

`src/components/crm/CrmCarteLead.tsx` — utilisée dans les 5 colonnes du board, et (en variante compacte) dans la file mobile. C'est le composant le plus vu de l'app CRM.

### 3.1 Enveloppe

```
fond          var(--ls-surface2)              (maquette #12161d)
bordure       1px solid var(--ls-border)      (maquette #232a34)
LISERÉ GAUCHE 3px solid <teinte>              ← porte l'information
rayon         11px
padding       11px 12px
gap interne   7px, colonne
```

**Règle du liseré, et elle est ambiguë dans la maquette** (3a le met à la température, 3b et 6a le mettent à l'étape). **Trancher : le liseré porte l'ÉTAPE** (couleur de la colonne) — sauf anomalie, qui **prend le dessus**. Sabrina L. est dans « Nouveau » (lime) mais son liseré est corail parce qu'elle pourrit ; Karim T. est dans « Contacté » (teal) mais son liseré est ambre parce qu'il n'a pas de suite. Cette hiérarchie est le cœur du design : **l'anomalie prime sur l'étape**.

### 3.2 Composition, de haut en bas

| # | Élément | Contenu | Source |
|---|---|---|---|
| 1 | **Ligne d'identité** `flex; gap:7; align-items:center` | `nomAffiche()` — Syne 13,5px/700, encre pleine | `firstName` + `lastName` |
| 1b | Météo | `🔥 / 🌤️ / ❄️`, 11px, **`aria-hidden` + libellé texte pour le lecteur d'écran** | `TEMP_META[computeLeadScore(l).temperature]` |
| 1c | Badge score *(optionnel)* | `🔥 82` sur fond teinté, rayon **6px** (pas pilule), 10,5px/800, `title=` la raison | `computeLeadScore().score` — ⚠️ **/10 aujourd'hui, pas /100** |
| 1d | Badge anomalie | poussé à droite `margin-left:auto`, **fond PLEIN** + encre sombre | cf. 3.4 |
| 2 | **Ligne de source** | `🌱 Bilan online — ce qu'il a répondu :` / `🤝 Reco · via Jeremy` / `🎁 Colis` — 11,5px, `var(--ls-text-muted)` | `CRM_SOURCE_META[source]` + `viaName` |
| 3 | **Pastilles de motif** `flex-wrap; gap:4` | `Perte de poids` · `Sommeil` — pilules `rayon 999`, fond teal 12 %, texte teal, 10px/700 | `bilanObjectives[]` / `objectif` / `funnelAnswers` |
| 4 | **Ligne de métriques** | `🎯 −8 kg · 🔥 8/10 · 34 ans` — 10px, muted, séparateur `·` | `bilanWeightTarget`, `bilanMotivation`, `bilanAge` |
| 5 | **Badge de suite** `align-self:flex-start` | `→ 1er contact aujourd'hui` / `↻ relance lun. 24 · 9 h` / `📅 demain 14 h · préparer` — fond teinté 12-15 %, rayon 6, 10,5px/700 | `phraseEtat()` (zones.ts) + `quandRevient()` |
| 6 | **Actions** — **0 par défaut**, 2 maximum | n'apparaissent que sur les cartes urgentes / après-RDV | cf. 3.4 |

**Ce qui NE figure PAS sur la carte** : sélecteur de statut, sélecteur de source, menu `⋯`, bloc message IA, boutons endormir/supprimer. Tout ça vit dans le panneau lead. C'est le principal gain de lisibilité contre l'écran actuel.

### 3.3 Ligne « Pourquoi 82 » (carte enrichie, artboard 3a)

11px, `var(--ls-text-hint)`, texte plat : `Pourquoi 82 : bilan complet (+30) · motivation 8/10 (+20) · a demandé un rappel (+25) · arrivée récente (+7)`. **Non implémentable en l'état** : `computeLeadScore()` renvoie un score borné 0-10 et une `raison` de deux motifs, pas des contributions additives. Deux options — (a) l'afficher **dans le panneau lead** avec le barème actuel réécrit en `{label, points}[]`, (b) la reporter. Recommandation : (a), c'est ~30 lignes dans `leadScoring.ts` et ça rend le score auditable, ce qui est tout l'argument de la maquette.

### 3.4 Les variantes, exhaustivement

| Variante | Déclencheur (code) | Enveloppe | Badge | Actions |
|---|---|---|---|---|
| **Saine** | rien de ce qui suit | liseré = teinte d'étape | badge de suite teinté | aucune |
| **Sans suite prévue** | `porteLeSignal(l,"sansSuite")` = vivant && `!relanceDueAt` | bordure `--ls-amber` 35 %, **liseré ambre** (écrase l'étape) | `⚠ aucune suite prévue`, fond ambre 16 %, texte ambre, 800 | `🎯 Et alors ?` |
| **Qui pourrit** | `stagnationDays(l) >= 5` (maquette dit 5 j+ ; `isStagnant()` dit 3/2 — **aligner sur 5** pour le board, garder 3/2 pour la liste ou uniformiser) | fond **teinté corail** (`color-mix(in srgb, var(--ls-coral) 6%, var(--ls-surface2))`), bordure corail 35 %, **liseré corail** | `🕸️ 6 j sans mouvement`, **fond corail PLEIN**, encre `--ls-coral-ink` | aucune |
| **En retard** | `relanceDue` && retard ≥ 1 j | idem « pourrit » **+ ombre colorée** `0 8px 24px -14px` corail 40 % — la seule carte élevée du board | `3 j de retard`, fond plein, 800 | **2 boutons** : `WhatsApp` (`#25D366` → cf. §6) et `Et alors ?` |
| **Échéance du jour** | retard = 0 | enveloppe normale, liseré corail | `aujourd'hui`, fond corail 16 % | aucune |
| **RDV à venir** | `rdv === "aVenir"` \|\| `derniereReponse === "rdv"` \|\| `status === "qualified"` | liseré `--ls-purple` | `📅 demain 14 h · préparer` (mention « préparer » si < 48 h) | aucune |
| **RDV passé** | `etatRdvDe(l.rdv, now) === "passe"` && `derniereReponse === null` | bordure ambre 40 %, **liseré ambre** | `RDV passé hier — et alors ?`, ambre 16 %, 800 | **3 issues empilées** : `✅ Venue → fiche client` (pleine largeur, teinté `--ls-amber`/converti) puis `🤔 Réfléchit · 7 j` + `👻 Pas venue` côte à côte. Réutilise `EtatRdvBloc.tsx` |
| **Converti** | `status === "converted"` | liseré `--ls-amber` (la maquette met du doré `#C9A84C`, **purgé de l'app**) | `il y a 2 j`, ambre 14 %, 700 | aucune. Ligne de contexte : `Programme 3 mois · fiche client créée` |
| **Perdu / Endormi** | `status === "lost"` / `dormant` | **pas de carte** — comptés dans les lignes repliées | — | — |
| **Froid / abandonné** | maquette : `opacity:.85` sur Chloé D. | **ne pas coder** l'opacité (cf. §6) ; utiliser la météo `❄️` | — | — |
| **En cours de drag** | HTML5 `dragstart` | `rotate(-2.5deg) translateY(-6px)`, fond `--ls-surface3`, bordure = teinte de la **colonne cible**, liseré = teinte de la colonne **d'origine**, ombre `0 24px 50px -12px` + halo, `cursor:grabbing` | inchangé | — |
| **Fantôme laissé** | position d'origine | `1.5px dashed var(--ls-border-strong)`, fond `rgba(255,255,255,.015)`, `padding:22px`, aucun contenu | — | — |
| **Voisines pendant un drag** | drag actif | `opacity:.6` | — | — |

### 3.5 Le contrat du drop — déjà écrit, à ne pas casser

`CrmPage.tsx:467-501` (`handleDrop`) est **le comportement cible de la maquette, déjà en prod** :
1. Cible `converted` → **refus** + toast « La conversion passe par la fiche » (colonne verrouillée 🔒).
2. Statut non supporté par la table → refus.
3. Table non qualifiable (reco, intention) → ancien chemin, statut sec.
4. Sinon → **ouvre `FeuilleQualification`**. ⚠️ **la colonne cible ne décide de rien** : déposer sur « Contacté » puis répondre « pas de réponse » laisse la carte à relancer. Ne pas « corriger » ça.

---

## 4. LES DONNÉES

### 4.1 DISPONIBLES — lues telles quelles depuis `CrmLead` (`src/hooks/useCrmLeads.ts:74-196`)

| Élément d'écran | Champ |
|---|---|
| Nom affiché | `firstName`, `lastName` → `nomAffiche()` |
| Source + emoji | `source` → `CRM_SOURCE_META` (les 11 points d'entrée sont **exactement** les 11 clés de ce Record) |
| Contact + type | `contact`, `contactIsPhone` |
| Ville | `city` |
| « via X » | `viaName`, `parrainPhone`, `parrainClientId` |
| Propriétaire | `ownerUserId` (+ `users` du contexte) |
| Étape | `status` (`new/contacted/qualified/converted/lost`) |
| Date de suite | `relanceDueAt`, `relanceDue` |
| Dernier appel | `derniereReponse` → `REPONSE_PAR_CLE[].resume` |
| Boîte d'arrivée | `enAttente` (posé par le hook, ligne 930) |
| Mis de côté | `dormant` |
| Arrivée / dernier contact | `createdAt`, `contactedAt` |
| RDV | `rdv` (`RdvLie`), `rdvLabel`, `abandonAvantCreneau` |
| Bilan online | `bilanObjectives[]`, `bilanWeightTarget`, `bilanMotivation`, `bilanAge`, `bilanCoachSlug`, `resultToken` |
| Rappel demandé | `callbackRequestedAt`, `engagement {score, tier, signals}` |
| Funnel | `funnelAnswers`, `colisAnswers`, `funnelScore`, `funnelTemperature`, `funnelProfile` |
| Club | `objectif`, `peopleCount`, `partnerName`, `partnerObjectif`, `coachSlug`, `consentRecontact` |
| Provenance déclarée | `provenanceCanal` (`PROVENANCE_META`), `provenancePar`, `provenanceLibre` |

### 4.2 CALCULABLES — dérivées, aucune migration

| Élément | Fonction | Fichier |
|---|---|---|
| Température + raison | `computeLeadScore(lead)` | `src/lib/leadScoring.ts` |
| Jours sans mouvement | `stagnationDays(lead)` (proxy `contactedAt ?? createdAt`) | `src/lib/leadActivity.ts` |
| Retard de relance | `-ecartEnJours(relanceDueAt, now)` | `src/features/crm/echeances.ts` |
| Zone / phrase d'état | `zoneDe()`, `phraseEtat()` | `src/features/crm/zones.ts` |
| Prochain geste | `etapeEnCours()` | `src/features/crm/etapes.ts` |
| État du RDV | `etatRdvDe(rdv, now)` | `src/features/crm/etapes.ts` |
| « il y a 25 min / 4 h / hier » | `depuis()` | `CrmBoiteArrivee.tsx` (à extraire dans un util partagé) |
| Effectifs des 5 segments + Perdus/Endormis | `filter` sur `leads` | `CrmJaugeEntonnoir.tsx` |
| Taux de passage (instantané) | part de ceux « allés au moins à l'étape suivante » | `CrmJaugeEntonnoir.tsx` ⚠️ **ce n'est pas le taux de cohorte de la maquette** |
| Compteurs par chip de filtre | `passe()` par valeur | `filtresQualification.ts` |
| Détection de doublon | clé email OU tél normalisé 9 derniers chiffres | `CrmPage.tsx:279-286` — **à extraire dans `features/crm/doublons.ts`** |
| Téléphone masqué `06 51 •• •• 08` | formateur à écrire (3 lignes) | nouveau |
| « bilan arrêté à l'étape 2/6 » | `useCuriousLeads` | `src/hooks/useCuriousLeads.ts` |

### 4.3 ABSENTES — ce qu'il faut créer, et où

| Donnée manquante | Où elle apparaît dans la maquette | Ce qu'il faut créer |
|---|---|---|
| **« Veut commencer quand »** (cette semaine / ce mois / plus tard / sait pas) — présenté comme LE critère de tri des CRM | Filtre 3a (4 chips) + pastille de carte `⚡ veut commencer cette semaine` | **1 question au bilan en ligne** (`src/pages/BilanOnlinePage.tsx`) + colonne `online_bilans.start_horizon text` + `prospect_leads.metadata.start_horizon` + migration + edge `submit-online-bilan`. **Tunnel public → recette à part.** Sans la donnée, ne PAS afficher le filtre (`filtresQualification.ts` documente déjà ce refus) |
| **Canal + moment préféré** (`préfère 📱 WhatsApp le soir`) | Ligne méta de la carte enrichie 3a | 1 question de fin de bilan (« on te répond où ? ») + colonne `contact_channel` / `contact_window` |
| **Score /100 et sa décomposition additive** (`74/100`, `Pourquoi 82 : … (+30) …`) | Carte d'arrivée Marc L., carte enrichie 3a | Refactor de `computeLeadScore()` : renvoyer `contributions: {label, points}[]` et un `score100`. Aucune migration — pur front |
| **Historique des changements d'étape** | Taux de passage « 71 % », « ↳ 45 % » | Table `crm_lead_events (lead_table, lead_id, from_status, to_status, at, by)` + écriture dans `ecrireQualification.ts`. ⚠️ **vérifié le 20/08 : rien en base**. Sans elle le pourcentage affiché est un instantané, et l'infobulle doit le dire (c'est déjà le cas) |
| **Fusion de doublons** | Bouton `⇥ Fusionner les 2` | Décision produit + RPC : quelle fiche survit, quels champs se reportent, la perdante passe-t-elle en `dormant` ou est-elle supprimée ? **Deux tables différentes possibles** (`prospect_leads` + `online_bilans`) → une fusion inter-tables n'a pas de home naturel. Piste la moins chère : marquer la perdante `dormant=true` + `notes += "fusionnée avec X"`, ne rien supprimer |
| **Attribution depuis l'inbox** | Encart 1 (« accepter, attribuer, fusionner ou refuser ») | Aucun contrôle dans la maquette. `tableSupportsAssignment()` existe. À spécifier ou à retirer du texte de l'encart |
| **Durée estimée d'un geste** (« ≈ 25 min ») | File du jour mobile | **Ne pas l'inventer** — décision déjà prise et documentée dans `CrmPage.tsx`, on garde le décompte et la ventilation par zone |
| **Largeur des barres de jauge** (100/82/64/42/28 %) | Jauge | Ne se déduit pas des compteurs (le 1er segment est à 100 % alors qu'il a le plus petit effectif). Choisir une règle explicite : `part = atteint(rang) / total` (décroissante par construction, c'est un entonnoir) |
| **Recyclage automatique à 3 mois** | Note du pied de colonne Converti | Cron + edge (`crm-recyclage-notifier`) ou champ `dormant_since` relu par `crm-relance-notifier`. **Ne pas afficher la promesse tant que le cron n'existe pas** |

---

## 5. L'ORDRE DE CONSTRUCTION

Principe : **chaque lot est visible à l'écran et livrable seul**, en réutilisant les composants déjà mesurés (`CrmBoiteArrivee`, `CrmJaugeEntonnoir`, `FeuilleQualification`) plutôt qu'en attendant la carte parfaite. Branche depuis `origin/dev/thomas-test` à jour ; validation `npm run build` (pas `tsc --noEmit` : `noUnusedLocals` strict).

**Lot 1 — La coquille (le plus gros gain, le moins de risque)**
`CrmEcranBoard` + `CrmBarreOutils`. Deux colonnes desktop, aside 320 px, entonnoir `flex:1`. On y branche **tels quels** `CrmBoiteArrivee` et `CrmJaugeEntonnoir`, et sous eux la `CrmLeadsListView` actuelle en attendant les colonnes. On **supprime** dans le même lot : les 2 widgets RDV repliés (après avoir déplacé le geste `Confirmer + email` en carte d'arrivée), les 5 compteurs par statut, les stats par source, les deux `Tabs`. → À la fin du lot, l'écran ne s'empile plus. C'est ce qu'on montre à Thomas.

**Lot 2 — `CrmCarteLead`**
Le composant de §3, avec **les 4 variantes qui existent déjà en données** : saine / sans suite / pourrit / en retard. Testée d'abord dans la liste actuelle (elle y remplace `LeadCard`, dont les 400 lignes disparaissent). Aucun changement de layout : on ne fait qu'échanger une carte contre une autre.

**Lot 3 — Les colonnes**
`CrmColonneEtape` × 5 + `CrmLignesRefermees`. On rebranche `handleDrop` (déjà correct) et les états `dépose ici` / `🔒`. La `CrmLeadsListView` **disparaît du desktop** ici, pas avant.

**Lot 4 — Le panneau lead docké**
`CrmPanneauLead` par extraction de `CrmLeadDetailPage.tsx` (blocs Noaly, étapes `etapesDuLead`, actions, historique). La route `/crm/leads/:key` reste et devient `↗ Fiche complète`. Navigation ↑↓ entre cartes sans refermer.

**Lot 5 — Le panneau Filtres**
`CrmPanneauFiltres` en tiroir. Les prédicats sont écrits ; c'est du rendu + le compteur par chip + `💾 Sauver comme vue` (le nommage manque dans la maquette : prompt simple). Fusionne au passage le filtre par ligne dans `Coach ▾`.

**Lot 6 — Le téléphone**
`CrmFileDuJour` + `CrmLigneFile` + `FeuilleQualification` en bottom-sheet + tiroir horizontal des arrivées. Le drag est retiré sous 768 px.

**Lot 7 — Les gestes manquants de l'inbox**
`Confirmer + email` (déplacé au lot 1, **enrichi** ici), `Fusionner`, `Demander le numéro`, `Relancer en douceur`. La fusion en dernier : c'est la seule qui écrit une décision irréversible.

**Peut attendre (chantiers séparés, pas des lots)**
- Question « veut commencer quand » au bilan en ligne → tunnel public, recette propre.
- Canal / moment préféré.
- Table `crm_lead_events` et les vrais taux de passage.
- Score /100 + décomposition (sauf si Thomas le veut tôt : c'est bon marché).
- Cron de recyclage à 3 mois.

---

## 6. LES PIÈGES

**Palette — le doré n'existe plus.** La maquette utilise `#C9A84C` pour **deux choses différentes** : le label « lead BBC » sur la carte Nadia et **toute la colonne Converti**. L'app a purgé le doré (`project_identite_v2`). `CrmJaugeEntonnoir` a déjà tranché : **Converti = `--ls-amber`**. Faire pareil partout, et ne pas réintroduire un troisième usage pour « lead BBC » (le club, c'est `--ls-purple`).

**Palette — les correspondances qui tombent juste, et celles qui ne tombent pas.** `--ls-purple` = `#A78BFA` **exactement** la maquette. `--ls-teal` = `#2DD4BF` exactement. En revanche `--ls-lime` = `#c5f82a` ≠ `#C6F24E`, `--ls-coral` = `#F2775F` ≠ `#F87171`, `--ls-amber` = `#E8A93A` ≠ `#F5B544`. Écarts assumés : **on ne code pas les hex de la maquette**.

**Thème clair — le vrai risque.** En `html.theme-light`, les tokens basculent violemment : lime `#5E7A09`, coral `#BC432C`, purple `#6D28D9`, amber `#9A631A`, et les encres `--ls-*-ink` passent **toutes à `#FFFFFF`**. Un fond plein corail avec `--ls-coral-ink` marche dans les deux thèmes ; un fond plein corail avec une encre codée en dur ne marche que dans un seul. **Tous les badges pleins doivent utiliser le couple `var(--ls-X)` / `var(--ls-X-ink)`.** Sept tokens étaient sous le seuil lisible en clair « depuis toujours » (cf. `reference_contraste_theme_clair`) — vérifier chaque nouveau fond teinté à 6-16 %, c'est là que ça casse.

**Contraste — mesurer en calculé, pas en JS.** Piège documenté du chantier CRM Board V2 : **basculer le thème par JS ne recalcule pas les `color-mix()` en ligne**. Toute mesure de contraste doit se faire sur les styles **calculés**, après un vrai rechargement dans le thème visé. Précédent concret dans le code : le bouton `⋯ Plus de filtres` a été passé en neutre parce que le violet mesurait **4,08:1** sur son propre fond teinté (`CrmPage.tsx:610-612`).

**Cibles tactiles — et le piège du style en ligne.** La maquette est pensée à la souris : boutons 35 px, chips `padding:6px 13px`, segments de jauge 35 px. Sous 1 024 px, tout passe à **44 px minimum**. ⚠️ **Par classe CSS avec `!important` dans une media query, jamais par style en ligne** — un style en ligne bat la media query, piège déjà payé le 18/08 sur la barre de relances. Le motif correct est déjà dans `CrmBoiteArrivee.tsx` (`.crm-arr-btn`) et `CrmJaugeEntonnoir.tsx` (`.crm-jauge-seg`) : le copier.

**Annotations à ne surtout pas coder.** Les pastilles rondes numérotées **1 → 6** sont posées *dans* les cartes (Anthony M., Sabrina L.) et *dans* la jauge : ce sont les repères de commentaire de la maquette. Les coder afficherait un décompte qui ne veut rien dire. Idem : eyebrow, H1, chapô, les 6 encarts explicatifs, les pilules « 3a · … » / « 3b · … », le bloc « D'où viennent ces infos », la note « Techniquement : … ». **En revanche** les pastilles rondes **7×7 px** des en-têtes de colonne sont bien du produit.

**Taux de passage — le chiffre qui ment.** `71 % · 45 % · 38 % · 60 %` ne se déduisent pas des compteurs `6 → 11 → 8 → 5 → 4`, et **rien en base ne permet de les calculer** (aucune table d'événements, aucune colonne de transition). Ce qui est affiché aujourd'hui est un **instantané**, et l'infobulle l'écrit en toutes lettres. Ne pas laisser un lot « brancher les vrais taux » sans la table `crm_lead_events` en préalable.

**Score /100 vs /10.** La maquette affiche `74/100` et `🔥 82`. `computeLeadScore()` renvoie **0-10**. Afficher le score brut sur 10 à côté d'une maquette qui montre 82 fera dire « c'est pas le bon chiffre ». Soit on renormalise ×10 à l'affichage, soit on refactore. Décider **avant** le lot 2.

**Seuils incohérents entre maquette et code.** « Sans mouvement **5 j+** » (chip de filtre, et badge `🕸️ 6 j`) vs `isStagnant()` qui déclenche à **3 j** (`new`) / **2 j** (contacté). Deux vérités dans le même écran = un coach qui ne comprend pas pourquoi une carte est rouge sans être dans le filtre. **Aligner sur un seul seuil** (recommandé : 5 j pour le visuel du board, et documenter).

**Vert WhatsApp `#25D366`.** C'est la seule couleur légitime hors palette (couleur de marque tierce, reconnue). L'isoler dans un token dédié `--ls-whatsapp` plutôt qu'un hex éparpillé — sinon le prochain `grep -r "#[0-9A-F]" src/` le prendra pour une régression.

**Opacités décoratives.** `opacity:.85` sur la carte Chloé D. et `opacity:.6` sur les cartes voisines : la première est de la **hiérarchie de maquette** (ne pas coder — un lead froid se dit avec `❄️`, pas en le rendant illisible), la seconde est un **état de drag réel** (à coder). Ne pas confondre. Idem `opacity:.45` sur la colonne verrouillée : à 45 % le cadenas et le texte de refus tombent sous le seuil de lisibilité — préférer 0,7 + un fond neutre.

**Le badge « 5 à valider » et le plafond.** Dans la maquette, 5 cartes = 5 à valider. En prod, l'inbox peut en contenir 30. Il faut **un compteur exact** (le badge) et **une pile plafonnée+scrollable** (l'aside). Sans ça la colonne de gauche devient plus haute que le board.

**Les 11 puces de points d'entrée** n'ont aucun état actif : c'est un **inventaire**, pas un filtre. Ne pas les rendre cliquables « puisqu'elles sont là » — le filtre par source vit dans le panneau Filtres.

**Traduction de statut par table — la mine.** `online_bilans` n'a pas de colonne `status` (c'est `lead_status`) et dit `'contact'`, pas `'contacted'` ; `prospect_leads` **n'accepte pas `'qualified'` du tout**. Un statut hors liste fait rejeter **tout** l'update, donc la date de relance avec. Toute écriture passe par `src/features/crm/ecrireQualification.ts` (`statutPour`, `colonneStatut`, `statutAccepte`) — jamais en direct. Conséquence visible : un lead colis avec un RDV n'a que `derniereReponse === "rdv"` pour le prouver, ce que `zoneDe()` teste déjà explicitement.

**Drag sur iPad.** `touch-action:none` posé sur la carte entière tue le scroll vertical de la colonne. Le poser sur une **poignée** ou n'activer le drag qu'après appui long. Sur téléphone, pas de drag du tout.

**Ne pas ancrer d'UI sur la présence d'un bloc filtrable.** Piège déjà vécu dans `AppLayout` (le CTA « + Nouveau bilan » ancré sur l'item `/developpement`). Ici : l'aside disparaît quand l'inbox est vide — **le bouton `+ Lead` doit vivre dans la barre d'outils**, pas dans l'aside.

**Migrations.** Si le lot 7 ou un chantier « données absentes » crée du SQL : vérifier les doublons de numéro (`ls supabase/migrations/*.sql | sed 's|.*/||' | cut -c1-14 | sort | uniq -d`) et **ne pas faire de `db push --include-all`** — `supabase_migrations.schema_migrations` s'arrête à `20261203270000` alors que 46 migrations postérieures sont appliquées.