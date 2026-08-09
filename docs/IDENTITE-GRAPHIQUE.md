# Identité graphique — La Base 360 & Breakfast Club

**Document de référence.** À ouvrir avant tout chantier visuel, et à donner tel quel à un
outil de design ou à un prestataire.

> Dernière mise à jour : **9 août 2026** — logo La Base 360 arrêté, palette « passe de chaleur » en place.
> Toutes les valeurs viennent du code réel en production (`src/styles/globals.css`,
> `src/styles/bbc-tokens.css`, `src/pages/ClubLandingPage.css`).

**Ce document est autosuffisant.** Tout ce qu'il faut pour travailler est dedans — y compris **le
logo lui-même, en SVG prêt à coller** (annexe A) et un **récapitulatif à copier-coller** (section 10).
On le donne tel quel à un outil de design, à une IA ou à un prestataire : **on ne redessine rien, on
réutilise ce qui existe.**

---

## Sommaire

1. [Les trois systèmes — ne pas les mélanger](#1-les-trois-systèmes)
2. [Le logo La Base 360](#2-le-logo-la-base-360)
3. [La Base 360 — couleurs](#3-la-base-360--couleurs)
4. [La Base 360 — typographie](#4-la-base-360--typographie)
5. [La Base 360 — formes et matière](#5-la-base-360--formes-et-matière)
6. [Breakfast Club — site public](#6-breakfast-club--site-public)
7. [Mode BBC — dans l'application](#7-mode-bbc--dans-lapplication)
8. [Les règles à ne jamais casser](#8-les-règles-à-ne-jamais-casser)
9. [Où sont les fichiers](#9-où-sont-les-fichiers)
10. [Récapitulatif à copier-coller](#10-récapitulatif-à-copier-coller)

---

## 1. Les trois systèmes

Trois univers visuels coexistent. Ils partagent une famille de couleurs mais sont
**implémentés séparément** — ne jamais faire fuiter les tokens de l'un dans l'autre.

| # | Système | Où | Pour qui | Ambiance |
|---|---|---|---|---|
| 1 | **La Base 360** | app coach + app client (PWA) | le distributeur au travail, son client | sombre, chaleureux, premium |
| 2 | **Breakfast Club — site** | `thebreakfast-club.com` · `/club` · `/reserver` | un prospect qui ne connaît pas le club | clair, crème + orange, accueillant |
| 3 | **Mode BBC — dans l'app** | onglet Mode BBC + PWA membre | le coach du club, le membre | sombre, même famille que ① |

**Le piège** : ② et ③ s'appellent tous les deux « Breakfast Club » mais n'ont **rien en commun
techniquement**. Le site est en crème et orange ; le mode dans l'app est en vert profond. C'est voulu :
le site vend, l'app travaille.

---

## 2. Le logo La Base 360

### Le symbole

Un **B blanc plein** dans un **anneau turquoise ouvert en haut à droite**, avec une **barre vert
citron inclinée à 45°** posée dans l'ouverture.

**Pourquoi cette forme** : l'anneau ouvert empêche le logo de tomber dans le « encore une lettre dans
un rond ». Le B plein garde son contraste à toutes les tailles — c'est ce qui le rend lisible en
favicon 16 px, là où un trait fin ou un dégradé disparaît.

### Les trois versions

| Fichier | Anneau | Barre | Lettre | Quand l'utiliser |
|---|---|---|---|---|
| `logo-mark.svg` | `#2DD4BF` | `#C5F82A` | `#FFFFFF` | **Par défaut** — fond sombre |
| `logo-mark-light.svg` | `#0D9488` | `#6D8C0B` | `#17201C` | Fond clair, papier blanc |
| `logo-mark-mono.svg` | `currentColor` | `currentColor` | `currentColor` | Broderie, tampon, gravure, fax — une seule couleur |

### Géométrie (pour le reproduire)

Sur un carré de 200 × 200 :
- **Anneau** : cercle de rayon 80 centré en (100, 100), trait de 13, extrémités arrondies.
  Ouvert sur ~55° entre 1 h et 2 h.
- **Barre** : 48 × 13, coins arrondis (r = 6,5), centrée en (159, 41), inclinée à −45°.
- **Lettre** : B massif, hauteur ~99, calé à gauche sur x = 66.

### Le lockup (symbole + texte)

Le texte **n'est pas dans le SVG** — c'est volontaire. Un SVG contenant du texte ne s'affiche
correctement que si la police est installée sur la machine qui l'ouvre. Dans l'app, Anton est déjà
chargé : on compose donc le lockup en HTML (symbole + vrai texte), toujours net et parfaitement aligné.

```
[symbole]   LA BASE 360           ← Anton, majuscules
            THE WELLNESS NUTRITION CLUB   ← JetBrains Mono, interlettrage .24em
```

- **Horizontal** : en-têtes, signature e-mail, bandeau de site
- **Empilé** (symbole au-dessus, texte centré dessous) : print, réseaux sociaux, kakémono

### Ce qu'il ne faut pas faire

- ❌ Ne pas **fermer** l'anneau — l'ouverture est la signature
- ❌ Ne pas mettre d'**ombre portée**, de relief, de reflet satiné (rendu 100 % plat)
- ❌ Ne pas **remplacer le B blanc par un dégradé** — testé, ça devient illisible sous 32 px
- ❌ Ne pas **déformer** ni changer les proportions entre l'anneau et la lettre
- ❌ Ne pas poser le symbole **fond sombre** sur un fond clair (utiliser la version claire)

### ⚠️ Les anciens fichiers sont périmés

Le dossier `public/brand/labase360/` contient encore l'**ancien logo** (cercle dégradé
émeraude → cyan → violet, pastille « 360 »). Cette palette a été **abandonnée le 5 août 2026**.
Ne pas s'en servir comme référence. Tant que le remplacement n'est pas fait, l'app affiche
encore ces icônes.

---

## 3. La Base 360 — couleurs

### Mode sombre (par défaut)

Fond **vert profond**, pas noir ni bleu-nuit. C'est la signature actuelle : elle vient du site du
club, pour que l'app et le club se ressemblent.

| Rôle | Hex | Token CSS |
|---|---|---|
| Fond de page | `#162624` | `--ls-bg` |
| Surface (cartes) | `#1E3330` | `--ls-surface` |
| Surface 2 (champs) | `#26403B` | `--ls-surface2` |
| Bordure | `rgba(244,239,228,.10)` | `--ls-border` |
| Bordure marquée | `rgba(244,239,228,.17)` | `--ls-border2` |
| Texte | `#F4EFE4` | `--ls-text` |
| Texte atténué | `#9BAAA3` | `--ls-text-muted` |
| Texte discret | `#74847C` | `--ls-text-hint` |

**Accents**

| Couleur | Hex | Sens | Token |
|---|---|---|---|
| Teal | `#2DD4BF` | structure, couleur signature | `--ls-teal` |
| Lime | `#C5F82A` | **victoires uniquement** | `--ls-lime` |
| Corail | `#F2775F` | urgence, alerte | `--ls-coral` |
| Sauge | `#93A67E` | calme, état neutre positif | `--ls-sage` |
| Ambre | `#E8A93A` | attention, silence | `--ls-amber` |
| Violet | `#A78BFA` | XP, gamification | `--ls-purple` |

### Mode clair

Le clair n'est **pas** une inversion du sombre : fond crème, encre vert-noir, et ce sont les
**ombres douces** qui séparent les blocs — pas des bordures grises.

| Rôle | Hex |
|---|---|
| Fond de page | `#FAF7F0` |
| Surface | `#FFFFFF` |
| Surface 2 | `#F5F1EB` |
| Bordure | `rgba(30,51,48,.07)` *(quasi invisible, volontaire)* |
| Texte | `#17201C` |
| Texte atténué | `#55605A` |
| Texte discret | `#8A938D` |

**Accents assombris** (pour tenir sur du clair) : teal `#0D9488` · lime `#6D8C0B` *(devient olive —
le lime vif est illisible sur blanc)* · corail `#D9553C` · sauge `#5F7154` · ambre `#B7791F` ·
violet `#6D28D9`

**Ombres** (jamais du noir, toujours teintées vert) :
```
petite   0 8px 20px -16px rgba(30,51,48,.30)
moyenne  0 20px 44px -32px rgba(30,51,48,.34)
```

### ⚠️ Le doré est abandonné

Décision du 5 août 2026. Le token `--ls-gold` existe encore mais **pointe vers le teal** — c'est un
filet de sécurité technique au cas où un usage aurait été manqué. **Ne jamais lui redonner une valeur
dorée, ne jamais réintroduire de doré dans un nouveau chantier.**

---

## 4. La Base 360 — typographie

Quatre familles, quatre rôles stricts. Ne pas les substituer.

| Police | Rôle | Réglages |
|---|---|---|
| **Anton** | Titres | Un seul poids (400 — la police n'en a pas d'autre). **Toujours en majuscules**, `letter-spacing: .01em`, interlignage 1.0 à 1.06 |
| **Syne** | Signature éditoriale | Titres premium, montants mis en avant. Poids 500 à 800 |
| **DM Sans** | Corps de texte, UI | Boutons, labels, paragraphes — le texte de tous les jours |
| **JetBrains Mono** | Données, étiquettes | Chiffres alignés, horodatages, « eyebrows » en petites capitales espacées (`letter-spacing: .12em` à `.2em`, taille 9–11 px) |

**Import** (déjà dans `index.html`) :
```
Anton
Syne:ital,wght@0,500;0,600;0,700;0,800;1,500;1,600
DM+Sans:ital,opsz,wght@0,9..40,300..700;1,9..40,300..700
JetBrains+Mono:wght@400;500;600
```

*D'autres polices (Sora, Playfair Display, Fraunces, Cormorant, Cinzel, Caveat) restent chargées pour
des pages publiques ponctuelles. **Ne pas les utiliser** dans un nouveau chantier de l'app.*

---

## 5. La Base 360 — formes et matière

```
Rayon standard        8px      (--ls-radius)
Rayon large          16px      (--ls-radius-lg)
Rayon des pastilles  ~22% du côté   (icônes d'app)
Boutons pilule       999px     (CTA principaux)
```

**Namespace « Salle des Opérations »** (`--ls-ops-*`) : le cockpit d'onboarding distributeur a sa
propre déclinaison, isolée du reste. Mêmes verts, accent lime, polices Anton + JetBrains Mono.
Ne pas y toucher depuis un autre chantier.

---

## 6. Breakfast Club — site public

L'univers que voit un **prospect**. Volontairement chaud, clair, « petit-déjeuner » — à l'opposé du
sombre de l'app.

### Logo

Le wordmark calligraphique **avec le cœur rouge** — script serif italique pour « The Breakfast Club »,
sans-serif capitales pour « LA BASE ».

| Fichier | Format | Usage |
|---|---|---|
| `logo-heart.png` | 1180 × 756 | **Principal** — page d'accueil |
| `logo-wordmark.png` | 1180 × 756 | Texte seul, fond clair |
| `logo-wordmark-dark.png` | 1180 × 756 | Texte seul, fond sombre |
| `logo-mark.png` | 1232 × 1232 | Médaillon carré (header de l'app) |
| `logo-medaillon.png` | 1232 × 1232 | Médaillon alternatif |
| `favicon.svg` | 32 × 32 | Cœur seul — `#E5352B` sur `#17201C` |

**Le rouge du cœur : `#E5352B`.**

### Couleurs

| Rôle | Hex |
|---|---|
| Crème (fond) | `#FCF8F1` |
| Crème alt (bandes) | `#F0E7D7` |
| Vert sombre (bandes) | `#1E3330` |
| Carte sombre | `#26403B` |
| Pied de page | `#162624` |
| Encre | `#17201C` |
| Texte courant | `#1E3330` |
| Sur fond sombre | `#F4EFE4` / `#C3CCC7` / `#8FA09B` |

**Accents**

| Couleur | Hex | Usage |
|---|---|---|
| Orange | `#FF6A2B` | CTA principal |
| Orange survol | `#FF3B2E` | |
| Lien | `#E0532A` | |
| **Dégradé CTA** | `linear-gradient(135deg, #FF7A2F, #FF1E3C)` | boutons |
| Rose | `#F5178F` *(foncé `#C1136F`)* | accent secondaire |
| Sauge | `#93A67E` *(foncé `#5F7154`)* | accent doux |
| Jaune | `#F1E27E` | pastilles « eyebrow » |
| Ambre | `#E8A93A` | |
| Pêche | `#F6C6A0` | chiffres en filigrane |

### Typographie

| Police | Rôle |
|---|---|
| **Anton** | Titres H1/H2/H3 — majuscules, poids 400, `letter-spacing: .005em`, interlignage 1.06 |
| **Poppins** | Corps — poids 400 à 700, italique inclus |

### Composants signature

- **Pastille « eyebrow »** au-dessus de chaque titre : pilule 999px, fond jaune/orange/rose/sauge/pêche,
  texte 12 px majuscules `letter-spacing: .2em`
- **CTA** : pilule, dégradé orange → rouge, ombre colorée `0 16px 34px -14px rgba(255,45,60,.6)`
- **Cartes** : rayon 22px, ombre `0 34px 60px -34px rgba(30,51,48,.34)`, filet d'accent 5px en haut
- **Chiffre fantôme** : grand nombre Anton en pêche très clair, en fond de carte
- **Image encadrée** : fond teinté décalé derrière la photo (`::before` sauge/rose/orange à 30 %)

---

## 7. Mode BBC — dans l'application

Namespace isolé `--ls-bbc-*`. Même famille verte que l'app, avec **cinq accents porteurs de sens**.

### Sombre (défaut)

| Rôle | Hex |
|---|---|
| Fond | `#162624` |
| Surface 1 | `#1E3330` |
| Surface 2 | `#26403B` |
| Surface 3 | `#2E4A44` |
| Bordure | `rgba(244,239,228,.12)` |
| Texte | `#F4EFE4` |
| Texte atténué | `rgba(244,239,228,.68)` |

### Les cinq accents — chacun dit quelque chose

| Couleur | Hex | Signification |
|---|---|---|
| Lime | `#C5F82A` | **le club** |
| Teal | `#2DD4BF` | **un membre** |
| Corail | `#F2775F` | **urgent** |
| Ambre | `#E8A93A` | **personne n'ouvre / silence** |
| Violet | `#A78BFA` | **un rituel** |

*Ne pas en ajouter un sixième sans raison métier : chaque teinte porte une information.*

### Clair

Fond `#FAF7F0` · surfaces `#FFFFFF` / `#F5F1EB` / `#EFEAE1` · texte `#17201C`
Accents : lime `#6D8C0B` · teal `#0D9488` · corail `#D9553C` · ambre `#B7791F` · violet `#6D28D9`

### Typographie

**Anton** (titres) · **JetBrains Mono** (labels) · **Inter** (corps — ⚠️ différent du DM Sans de
l'app 360, c'est volontaire et propre au mode BBC).

---

## 8. Les règles à ne jamais casser

1. **Le lime est réservé aux victoires.** Jamais en fond de sauce, jamais en couleur de base — sinon
   ça devient une canette d'energy drink. Le **teal** est la couleur de structure.
2. **Jamais de couleur en dur dans un composant.** Toujours `var(--ls-*)`. Une couleur écrite en
   `#HEXVALUE` dans un `.tsx` ne suit pas le thème clair/sombre — c'est un bug, pas un choix.
3. **Pas de doré.** Abandonné le 5 août 2026.
4. **Les trois systèmes ne se mélangent pas.** Un token `--ls-bbc-*` ne sort pas du mode BBC ; les
   couleurs du site club ne rentrent pas dans l'app.
5. **Tout changement visible passe par une maquette** validée avant code (règle de travail établie).
6. **Le clair n'est pas l'inverse du sombre.** Fond crème, ombres douces teintées vert, bordures
   presque invisibles.
7. **Anton toujours en majuscules.** C'est une police de titre, elle n'a qu'un poids.

---

## 9. Où sont les fichiers

| Quoi | Où |
|---|---|
| **Ce document** | `docs/IDENTITE-GRAPHIQUE.md` *(dans le dépôt, versionné)* |
| Tokens app 360 | `src/styles/globals.css` |
| Tokens mode BBC | `src/styles/bbc-tokens.css` |
| Tokens PWA client | `src/styles/pwa2.css` |
| Styles site club | `src/pages/ClubLandingPage.css` |
| Logos BBC | `public/brand/breakfast-club/` |
| Logos La Base 360 | `public/brand/labase360/` ⚠️ *encore l'ancienne palette* |
| Polices | importées dans `index.html` |

---

## 10. Récapitulatif à copier-coller

À donner tel quel à un outil de design ou un prestataire.

```
LA BASE 360 — APPLICATION (sombre par défaut)
fond #162624 · surface #1E3330 · surface2 #26403B · texte #F4EFE4
teal #2DD4BF (structure) · lime #C5F82A (victoires SEULEMENT)
corail #F2775F (urgence) · sauge #93A67E · ambre #E8A93A · violet #A78BFA
clair : fond #FAF7F0 · surface #FFFFFF · texte #17201C
        teal #0D9488 · lime #6D8C0B · corail #D9553C
titres : Anton MAJUSCULES · corps : DM Sans · données : JetBrains Mono
         éditorial : Syne
logo : B blanc plein dans anneau teal ouvert en haut-droite + barre lime à 45°
       rendu 100% plat, aucune ombre, aucun dégradé

BREAKFAST CLUB — SITE PUBLIC (clair, chaleureux)
fond crème #FCF8F1 · bandes #F0E7D7 / #1E3330 · encre #17201C
orange #FF6A2B · CTA dégradé #FF7A2F → #FF1E3C
rose #F5178F · sauge #93A67E · jaune #F1E27E · pêche #F6C6A0
titres : Anton MAJUSCULES · corps : Poppins
logo : wordmark calligraphique + cœur rouge #E5352B

MODE BBC — DANS L'APP (sombre, famille de l'app 360)
fond #162624 · surfaces #1E3330 / #26403B / #2E4A44 · texte #F4EFE4
lime #C5F82A = le club · teal #2DD4BF = un membre
corail #F2775F = urgent · ambre #E8A93A = silence · violet #A78BFA = rituel
titres : Anton · corps : Inter · labels : JetBrains Mono
```

---

## Annexe A — Le logo La Base 360, prêt à coller

⚠️ **Ce n'est PAS une consigne pour refaire le logo — c'est le logo lui-même, écrit en texte.**
Le symbole EST ce bloc SVG. Le coller quelque part = afficher le vrai logo, à l'identique, net à
toutes les tailles. On ne le redessine jamais : **on colle ce bloc, point.**
*(C'est même la seule façon d'afficher le vrai logo dans un artefact Claude Design, qui ne peut pas
charger de fichier image externe — un SVG collé dans le code, si.)*

### Version principale (fond sombre)

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" role="img" aria-label="La Base 360">
  <path d="M 176.3 71.6 A 80 80 0 1 1 128.3 23.6" fill="none" stroke="#2DD4BF" stroke-width="13" stroke-linecap="round"/>
  <rect x="-24" y="-6.5" width="48" height="13" rx="6.5" fill="#C5F82A" transform="translate(159 41) rotate(-45)"/>
  <path fill-rule="evenodd" fill="#FFFFFF" d="M 66 52 L 111 52 C 131 52 144 63.5 144 77 C 144 88 137 95.5 127 99.5 C 139.5 103 149 112.5 149 126 C 149 140.5 135 151 113 151 L 66 151 Z M 87 70 L 87 91 L 109 91 C 118.5 91 124 86.5 124 80.5 C 124 74.5 118.5 70 109 70 Z M 87 110 L 87 133 L 112 133 C 122 133 128 128 128 121.5 C 128 115 122 110 112 110 Z"/>
</svg>
```

### Version fond clair

Mêmes tracés — seules changent les 3 couleurs : anneau `#0D9488`, barre `#6D8C0B`, lettre `#17201C`.

### Version une seule couleur

Mêmes tracés — remplacer les 3 couleurs par `currentColor` (le logo prend alors la couleur du texte
qui l'entoure : idéal pour broderie, tampon, gravure).

### À quoi correspond chaque ligne (pour info — pas une consigne)

Utile seulement si un jour il faut ajuster une couleur ou une taille. Sinon, ignorer et coller le bloc.

1. **L'anneau** — un arc de cercle (rayon 80, centre 100/100) ouvert de ~55° en haut à droite.
2. **La barre** — un rectangle arrondi 48 × 13, tourné à −45°, posé dans l'ouverture.
3. **La lettre B** — un tracé plein (`fill-rule="evenodd"` : le contour + les deux trous soustraits).

### Le lockup complet

Le texte « LA BASE 360 » se compose **à côté** du SVG, en HTML, avec la police **Anton** (majuscules),
et la tagline « THE WELLNESS NUTRITION CLUB » en **JetBrains Mono** (`letter-spacing: .24em`). Ne pas
intégrer le texte dans le SVG (il ne s'afficherait correctement que si la police est installée sur la
machine qui l'ouvre).

---

## Annexe B — Le logo Breakfast Club

Le logo BBC est un **PNG déjà dessiné** (le wordmark calligraphique avec le cœur) — on l'**utilise
tel quel**, on ne le refait pas. Fichiers dans `public/brand/breakfast-club/`, voir le tableau de la
[section 6](#6-breakfast-club--site-public). Seule couleur à retenir : le **cœur rouge `#E5352B`**.

- **Sur un vrai site, dans Figma, sur un support imprimé** → on pointe directement le fichier PNG. Rien à faire de plus.
- **Dans un artefact Claude Design** (qui ne charge pas d'image externe) → il faut coller le PNG en
  base64 dans le code. Ce n'est pas dans ce document (ça pèserait ~185 Ko) : demander la version
  base64 de `logo-heart.png` au moment où on en a besoin.
