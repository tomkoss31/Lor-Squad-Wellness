# Audit du bilan sur iPhone — 13 écrans, un par un

**Date** : 2026-08-10 · **Écran de test** : 375 × 812 (iPhone 12/13/14)
**Méthode** : parcours réel des 13 étapes dans le navigateur avec un faux profil
(« Camille Testeur »), en mesurant les **styles calculés** — pas en lisant le code.
Aucune donnée n'a été écrite en base : le bilan n'a jamais été enregistré, et le
brouillon `localStorage` a été effacé à la fin.

> Tablette (768 × 1024) mesurée aussi : **3198 px** de défilement contre 4916 px sur
> iPhone pour la même étape, parce que les champs y passent à 1,58 par rangée au lieu
> de 1. **La tablette n'est pas le problème. L'iPhone si.**

---

## Le chiffre qui résume tout

**40 223 px de défilement cumulé** pour remplir un bilan, soit **~50 hauteurs d'écran**.

Et il ne reste que **449 px utiles** sur les 812 de l'iPhone, parce que 363 px sont
occupés en permanence par des barres collantes. Soit environ **77 gestes de pouce**
pour aller au bout d'un bilan, en rendez-vous, devant la cliente.

---

## 1. Les six défauts qui touchent TOUS les écrans

### S1 — « Suivante » peut ne rien faire, en silence 🔴 CRITIQUE

À l'étape 1, si aucun objectif n'est coché, `goToNextStep` affiche un message
(`NewAssessmentPage.tsx:706`). Mais ce message est rendu **tout en bas du contenu**
(`NewAssessmentPage.tsx:3765`), alors que le bouton est dans la barre collante.

Mesuré : le message existe, dit « Choisis au moins un objectif pour le client. »,
et s'affiche à **1259 px sous le bas de l'écran**. La page ne s'y déplace pas.
Il n'a **ni `role="alert"` ni `aria-live"`**.

**Ce que vit le coach** : il tape « Suivante » devant sa cliente, et il ne se passe
strictement rien. Ni image, ni son, ni vibration. L'app paraît plantée.

**Correctif** : `role="alert"` + `aria-live="assertive"`, et faire défiler jusqu'au
message (ou mieux : l'afficher dans la barre collante elle-même, là où le doigt est).

---

### S2 — Aucun champ du bilan n'a de libellé associé 🔴

Dans `AssessmentFieldV2.tsx`, le `<label>` (ligne 100) n'a pas de `htmlFor`,
l'`<input>` (ligne 137) n'a pas d'`id`, et l'input n'est pas imbriqué dans le label.

**102 usages répartis sur 14 fichiers** — donc bien au-delà du bilan.

Quatre conséquences concrètes sur iPhone :

| | |
|---|---|
| **VoiceOver** | annonce « champ de texte » sans nom — 18 fois sur la seule étape 1 |
| **Taper le libellé** | ne met pas le focus : une cible de 375 px de large perdue |
| **Pas d'`autoComplete`** | iOS ne propose ni le nom, ni l'email, ni le téléphone |
| **Pas d'`enterKeyHint`** | la touche entrée dit « retour » au lieu de « suivant » |

**Correctif** : un `useId()` dans le composant, `htmlFor`/`id` appariés, plus les
attributs `autoComplete` / `inputMode` / `enterKeyHint` passés en props. **Un seul
fichier à corriger pour tout le bilan.**

---

### S3 — La barre de navigation flotte à 80 px du bas, pour rien 🟠

`NewAssessmentPage.tsx:3891` : `className="sticky bottom-20 …"`.
`bottom-20` = 80 px, réservés pour dégager la navigation basse de l'app.

**Mesuré : il n'y a aucune navigation basse sur cette page** (`bottomNavTrouvee: null`).

Ces 80 px ne sont donc pas vides — le formulaire continue **dessous**. Au body scan,
un vrai `<input>` tapable se trouve à y = 800, dans cette bande, sous une barre qui
signale visuellement « fin de page ». Le contenu passe *sous* la barre au lieu de
s'arrêter avant.

**Correctif** : `bottom-0` sur cette page + un padding de fin de contenu égal à la
hauteur de la barre, pour que rien ne passe dessous.

---

### S4 — Le tiroir de menu fermé reste focusable 🟠

`.lb-drawer` fermé est en `translateX(-360px)` — hors écran — mais garde
`visibility: visible` et `pointer-events: auto`. Il porte `aria-hidden="true"`
**sans `inert`**, et ses **15 éléments focusables prennent effectivement le focus**
(vérifié : `element.focus()` réussit).

C'est la combinaison explicitement interdite par WCAG : au clavier ou en balayage
VoiceOver, on entre dans un menu invisible et on ne comprend plus où on est.

**Correctif** : ajouter l'attribut `inert` quand le tiroir est fermé. Une ligne.

---

### S5 — 363 px de barres collantes = 45 % de l'écran 🟠

Cinq couches se superposent en permanence :

| Élément | Hauteur | z-index |
|---|---|---|
| `header.lb-header` | 64 px | 30 |
| `div.step-rail-wrapper` (le rail des 13 étapes) | **146 px** | 40 |
| la barre collante « Étape X / 13 » + Précédente/Suivante + Enregistrer | **153 px** | 20 |
| bouton flottant « 📝 Mes notes » | 113 × 44 | 30 |
| bouton flottant Noaly ✨ | 52 × 52 | 60 |

**Le rail et la barre du bas affichent tous les deux « Étape X / 13 »** — c'est un
doublon qui coûte 146 px. Et le bouton Noaly chevauche horizontalement la zone du
bouton « Suivante » (x 307-335 contre 192-335), tout en tronquant le titre de
l'étape dans la barre (« Body s… » sur la capture).

---

### S6 — Texte jusqu'à 9 px, et des accents manquants 🟡

Tailles relevées dans le contenu du bilan (hors en-tête) : **9 px** (« Best seller »,
« Programme »), 10 px, 10,5 px, 11 px, 11,5 px, 12 px. Le minimum recommandé par
Apple est 11 pt.

Et plusieurs libellés ont perdu leurs accents alors que le reste de l'app est
accentué :

> « Tes besoins **detectes** » · « Le programme **coeur** » · « **Proteines** cible »
> · « **Calcule** sur ton poids actuel » · « Bilan sans **demarrage** immediat »

---

## 2. Écran par écran

| # | Titre | Défilement | Écrans | Champs | À corriger sur cet écran |
|---|---|---|---|---|---|
| 1 | Informations client | **4982 px** | 6,1 | 18 | `Taille` et `Poids cible` pré-remplis à **0** au lieu de vide ; astérisque décorative collée au mot (« Téléphone\* ») alors que `required` est à `false` ; 3 champs `number` sans `inputMode` ; **18 champs sur 3721 px** |
| 2 | Habitudes de vie & repas | 3515 px | 4,3 | 7 | 502 px par champ ; 2 champs `number` sans `inputMode` |
| 3 | Qualité alimentaire & boissons | 3612 px | 4,4 | 4 | « Le vrai moment de craquage » = **690 px sans un seul champ** |
| 4 | Santé, objectif, activité & freins | 3472 px | 4,3 | 7 | 3 sections de 627 à 846 px |
| 5 | Composition des repas | 2467 px | 3,0 | 0 | 3 écrans de lecture pure — candidat au repli |
| 6 | **Body scan** | 2344 px | 2,9 | 8 | ✅ le mieux fait : `inputMode="decimal"` correct, 293 px/champ. Mais 8 cartes empilées, et la barre collante coupe « Masse grasse » en deux |
| 7 | Place à la dégustation | 1667 px | 2,1 | 0 | — |
| 8 | Recommandations | 2540 px | 2,7 | 7 | 1 cible tactile sous 44 px ; section de 1169 px |
| 9 | Petit-déjeuner La Base 360 | 1939 px | 2,4 | 4 | — |
| 10 | Notre concept de rééquilibrage | 1469 px | 1,8 | 0 | — |
| 11 | **Le programme proposé** | **6588 px** | **6,6** | 0 | 🔴 **le pire écran.** « Consommes-tu du lait ? » prend **1478 px pour une question binaire** ; le catalogue produit fait **2581 px** ; **7 boutons « + Ajouter » à 38 px** (sous les 44 px d'Apple) — et c'est l'écran qui décide du chiffre d'affaires |
| 12 | La suite du suivi | 3661 px | 4,4 | 2 | « Voilà ce qui attend Camille » = **1063 px sans un seul champ** |
| 13 | Félicitations | 1967 px | 2,4 | 0 | — |

---

## 3. Répondre au « trop de scroll »

Quatre leviers, chiffrés sur l'étape 1 :

| # | Levier | Gain |
|---|---|---|
| 1 | Fusionner le rail (146 px) et la barre du bas (153 px) — ils disent la même chose. Le rail devient un filet de progression de 4 px sous l'en-tête ; la navigation descend en barre compacte de 56 px collée en bas. | **−239 px de chrome**, soit +53 % de contenu par écran |
| 2 | Deux champs courts par rangée sur mobile (Prénom/Nom, Taille/Poids, Jour/Mois) — la tablette le fait déjà | −600 px |
| 3 | Densité des champs : 88 px → ~68 px | −360 px |
| 4 | Replier les sections sans champ derrière un « ⓘ Pourquoi cette question ? » | −500 px |

Résultat attendu sur l'étape 1 : **9,9 gestes de défilement → 4,0**. Deux fois et
demie moins de scroll, sans rien retirer du contenu.

---

## 4. Ordre de bataille proposé

**Lot 1 — ce qui casse le rendez-vous** (rapide, invisible, sans maquette)
1. S1 : `role="alert"` + défilement vers le message de blocage
2. S2 : `htmlFor`/`id` + `autoComplete`/`inputMode`/`enterKeyHint` dans `AssessmentFieldV2`
3. S3 : `bottom-0` + padding de fin
4. S4 : `inert` sur le tiroir fermé
5. Étape 1 : champs numériques vides au lieu de `0`
6. Boutons « + Ajouter » : 38 → 44 px

**Lot 2 — le scroll** (maquette cliquable d'abord, testée à 390 px)
Les 4 leviers ci-dessus, à valider visuellement avant de coder.

**Lot 3 — la copie**
Accents manquants, astérisques décoratives, tailles sous 11 px.
