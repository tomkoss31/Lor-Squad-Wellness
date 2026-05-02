# Design System — Lor'Squad Wellness

> Audit read-only du design system tel qu'il est **réellement utilisé**
> dans le code (pas seulement déclaré). Source de vérité unique pour
> garder la cohérence visuelle entre toutes les pages.
>
> Branche : `dev/thomas-test` · Date : 2026-05-01 · Stack : React 18 +
> Vite + Tailwind 3 + CSS variables `--ls-*` + composants inline-style.

---

## Table des matières

1. [Palette couleurs](#1-palette-couleurs)
2. [Typographie](#2-typographie)
3. [Espacements, rayons, ombres](#3-espacements-rayons-ombres)
4. [Composants récurrents](#4-composants-récurrents)
5. [Patterns UI spécifiques](#5-patterns-ui-spécifiques)
6. [Responsive](#6-responsive)
7. [Dark mode / Light mode](#7-dark-mode--light-mode)
8. [Inconsistances trouvées](#8-inconsistances-trouvées)
9. [Références visuelles](#9-références-visuelles)
10. [Recommandations pour `/formation`](#10-recommandations-pour-formation)

---

## 1. Palette couleurs

### 1.1 Source de vérité

Trois définitions coexistent — **les variables CSS `--ls-*` sont la
source unique consommée par les composants. Tailwind est rarement
utilisé pour les couleurs sémantiques de marque.**

| Source | Path | Usage réel |
|---|---|---|
| Variables CSS `--ls-*` | `src/styles/globals.css:5-71` | Consommée par >250 composants |
| Tailwind `lor.*` + `glow.*` | `tailwind.config.js:5-29` | Quasi non utilisée, héritée d'un ancien chantier |
| Hardcoded inline `style={{...}}` | partout | Anti-pattern résiduel (cf. §8) |

### 1.2 Palette dark (défaut)

`src/styles/globals.css:5-39`

```css
:root {
  --ls-bg:           #0B0D11;   /* fond global */
  --ls-surface:      #13161C;   /* cards, sidebar */
  --ls-surface2:     #1A1E27;   /* inputs, hover surfaces */
  --ls-border:       rgba(255,255,255,0.07);
  --ls-border2:      rgba(255,255,255,0.12);
  --ls-text:         #F0EDE8;   /* titre + corps principal */
  --ls-text-muted:   #7A8099;   /* secondaire */
  --ls-text-hint:    #4A5068;   /* éticales, légendes */
  --ls-gold:         #C9A84C;   /* accent primaire (CTA, actif) */
  --ls-teal:         #2DD4BF;   /* positif, sport, "active" */
  --ls-coral:        #FB7185;   /* danger, alerte, perdu */
  --ls-purple:       #A78BFA;   /* neutre secondaire, "en pause" */
  --ls-gold-bg:      rgba(201,168,76,0.1);
  --ls-teal-bg:      rgba(45,212,191,0.1);
  --ls-coral-bg:     rgba(251,113,133,0.1);
  --ls-purple-bg:    rgba(167,139,250,0.1);
  --ls-input-bg:     #1A1E27;
  --ls-sidebar-bg:   #13161C;
  --ls-icon:         #7A8099;
  --ls-icon-active:  #F0EDE8;
  --ls-gold-rgb:     201, 168, 76;
  --ls-teal-rgb:     45, 212, 191;
  --ls-coral-rgb:    251, 113, 133;
  --ls-purple-rgb:   167, 139, 250;
  --ls-gold-contrast:#0B0D11;
  --ls-teal-contrast:#0B0D11;
}
```

### 1.3 Palette light

`src/styles/globals.css:41-71`

```css
html.theme-light {
  --ls-bg:         #F4F2EE;
  --ls-surface:    #FFFFFF;
  --ls-surface2:   #F0EDE8;
  --ls-border:     rgba(0,0,0,0.08);
  --ls-text:       #111827;
  --ls-text-muted: #6B7280;
  --ls-text-hint:  #9CA3AF;
  --ls-gold:       #B8922A;   /* gold foncé pour contraste sur blanc */
  --ls-teal:       #0D9488;
  --ls-coral:      #DC2626;
  --ls-purple:     #7C3AED;
  --ls-gold-contrast: #FFFFFF;
}
```

### 1.4 Swatch summary

| Token | Dark | Light | Rôle | Exemples |
|---|---|---|---|---|
| `--ls-gold` | `#C9A84C` | `#B8922A` | Accent primaire de marque, CTA principal, état actif sidebar, gradient orange 2026 | Logo, "+ Nouveau bilan", item nav actif, FAB Bilan, éticales `eyebrow-label` |
| `--ls-teal` | `#2DD4BF` | `#0D9488` | "Positif", sport, lifecycle `active`, "en cours" | Hero Co-pilote action, kanban `active`, badges sport, formation niveau N1 |
| `--ls-coral` | `#FB7185` | `#DC2626` | Danger, urgence, retard, perdu | Badge "En retard", lifecycle `lost`, bandeau erreur, type `video` formation |
| `--ls-purple` | `#A78BFA` | `#7C3AED` | Neutre secondaire, "en pause", avancé | Lifecycle `paused`, formation niveau N3, "Avancé" |
| `--ls-text` | `#F0EDE8` | `#111827` | Titre, corps principal | Tous textes Syne / Poids 700 |
| `--ls-text-muted` | `#7A8099` | `#6B7280` | Secondaire | Sous-titres, descriptions cards |
| `--ls-text-hint` | `#4A5068` | `#9CA3AF` | Tertiaire / éticales | `eyebrow-label`, dates, footers |
| `--ls-bg` | `#0B0D11` | `#F4F2EE` | Fond app + scrollbar dark track |
| `--ls-surface` | `#13161C` | `#FFFFFF` | Cards, sidebar, glass-panel |
| `--ls-surface2` | `#1A1E27` | `#F0EDE8` | Inputs, surfaces hover, surface-soft |

### 1.5 Couleurs gradient orange (CTA "Nouveau bilan")

Chantier 2026-04-24, **NON tokenisée** — hardcodée dans 4+ composants :

```ts
background: 'linear-gradient(135deg, #EF9F27 0%, #BA7517 100%)'
boxShadow:  '0 2px 6px rgba(186,117,23,0.25)'
hover:      '0 4px 12px rgba(186,117,23,0.35)'
```

Trouvable dans :
- `src/components/layout/AppLayout.tsx:254` (sidebar "+ Nouveau bilan")
- `src/components/ui/EmptyState.tsx:138, 170` (CTA gold `<a>` et `<button>`)
- `src/components/layout/BottomNav.tsx:83` (couleur `#BA7517` du FAB Bilan)
- `src/lib/heroGradient.ts:56-62` (palette `gold` time-of-day)

Voir §8 — c'est une cible de tokenisation prioritaire.

### 1.6 Couleur "logout"

Hardcodée elle aussi dans `AppLayout.tsx:388-403` et `BottomNav.tsx:311` :
- Foreground : `#E24B4A` / `#A32D2D` (mobile)
- Background : `rgba(226,75,74,0.12)` / `#FCEBEB` (mobile)

### 1.7 Tailwind heritage (`tailwind.config.js`)

```js
colors: {
  ink: "#0B0D11", panel: "#13161C", "panel-alt": "#1A1E27",
  glow: { blue: "#2DD4BF", amber: "#C9A84C", red: "#FB7185", green: "#2DD4BF" },
  lor: { bg, surface, surface2, gold, gold2: '#F0C96A', teal, purple, coral, text, muted, hint }
}
```

`lor.gold2: #F0C96A` est définie mais **n'est utilisée nulle part** dans le code TS/TSX (grep zéro résultat). À supprimer ou à promouvoir en token CSS.

---

## 2. Typographie

### 2.1 Familles de police

`index.html:54-56` charge Google Fonts :

```html
<link href="https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700&display=swap" rel="stylesheet">
```

Mapping `tailwind.config.js:35-39` :

```js
fontFamily: {
  display: ["Syne", "sans-serif"],
  body:    ["DM Sans", "sans-serif"],
  sans:    ["DM Sans", "sans-serif"],
}
```

Base CSS `globals.css:792-795` :

```css
html { font-family: 'DM Sans', sans-serif; }
body { font-family: 'DM Sans', sans-serif; ... }
h1, h2, h3, h4, .font-display { font-family: 'Syne', sans-serif; }
```

**Règle pratique** :
- **Syne** (700/800) — chiffres KPI, titres de page, labels gros chiffres, watermark numéro de niveau
- **DM Sans** (300/400/500/600/700) — tout le reste, y compris CTA boutons et labels uppercase

### 2.2 Échelle des tailles (px) — basée sur l'usage réel

| Rôle | Taille | Poids | Famille | Source |
|---|---|---|---|---|
| H1 page (PageHeading) | `1.6rem` mobile / `2rem` md / `2.4rem` xl | 700 | Syne | `PageHeading.tsx:11-13` |
| H1 hero premium | 32px | 800 | Syne | `PremiumHero.tsx:138-139` |
| H3 card titre formation | 19px | 800 | Syne | `ParcoursLevelCard.tsx:138-139` |
| H3 card titre catégorie | 16px | 700 | Syne | `CategoryCard.tsx:123` |
| H3 EmptyState | 21px (compact 16) | 800 | Syne | `EmptyState.tsx:101` |
| KPI gros chiffre | `1.9rem` | 700 | Syne | `MetricTile.tsx:26-28` |
| Body principal | 14px (mobile 16px iOS) | 400 | DM Sans | `globals.css:809, 929` |
| Body card | 12.5–13px | 400 | DM Sans | partout |
| Eyebrow label | 11px (10px hero) | 500-700 | DM Sans uppercase | `globals.css:850-856`, `PremiumHero.tsx:108-118` |
| Badge `StatusBadge` | 11px | 500 | DM Sans uppercase | `StatusBadge.tsx:26` |
| Sidebar item | 13px | 400/500 (actif) | DM Sans | `AppLayout.tsx:288-296` |
| Footer profil sidebar | 12px (nom) / 10px (rôle) | 500 / 400 | DM Sans | `AppLayout.tsx:368-373` |
| Bottom nav label | 9px | 500-600 | DM Sans | `BottomNav.tsx:131-138` |
| Watermark gros chiffre | 72px | 900 | Syne | `ParcoursLevelCard.tsx:107-109` |
| Empty emoji | 64px (compact 44) | — | — | `EmptyState.tsx:88-90` |

### 2.3 Letter-spacing

| Contexte | Valeur | Exemple |
|---|---|---|
| Eyebrow uppercase | `0.18em` | `.eyebrow-label` (`globals.css:854`) |
| Hero eyebrow | `2px` (≈ 0.2em à 10px) | `PremiumHero.tsx:110` |
| Badge (StatusBadge) | `0.03em` | `StatusBadge.tsx:26-28` |
| Nav sidebar header "NAVIGATION" | `1.5px` | `AppLayout.tsx:222` |
| Bottom nav label | `0.04em` | `BottomNav.tsx:137` |
| Niveau formation eyebrow | `0.14em` | `ParcoursLevelCard.tsx:127` |
| Catégorie formation eyebrow | `0.08em` | `CategoryCard.tsx:115` |
| H1 hero | `-0.02em` (tight) | `PremiumHero.tsx:142` |
| H1 PageHeading | `-0.03em` | `PageHeading.tsx:13` |
| H3 niveau formation | `-0.01em` | `ParcoursLevelCard.tsx:144` |

**Pattern** : `text-transform: uppercase` + `letter-spacing` positif pour
les éticales et badges. Espacement négatif (`-0.01em` à `-0.03em`) pour
les gros titres Syne afin d'éviter le "creux" visuel.

### 2.4 Pattern eyebrow

Classe utilitaire `globals.css:850-856` :

```css
.eyebrow-label {
  font-size: 11px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.18em;
  color: #4A5068;  /* hardcodé, devrait être var(--ls-text-hint) */
}
```

Variante hero (`PremiumHero.tsx:107-131`) — eyebrow avec dot pulse devant :

```tsx
<span style={{ width: 6, height: 6, borderRadius: 999,
  background: g.primary, boxShadow: `0 0 8px ${g.glow}` }} />
{eyebrow}
```

---

## 3. Espacements, rayons, ombres

### 3.1 Échelle d'espacement

Pas de système strict 4/8 — usage mixte Tailwind (`gap-4`, `p-5`)
et inline (`padding: 18`, `gap: 12`). Les valeurs récurrentes :

| px | Usage |
|---|---|
| 2 | gap items très serrés |
| 4 / 6 | gap intra-row |
| 8 | gap inputs / gap kanban cards |
| 10 / 12 | padding card compact, gap header |
| 14 / 16 | padding card standard |
| 18 / 22 | padding card formation, hero |
| 24 / 26 | padding card desktop premium |
| 28 | padding hero premium |

### 3.2 Border-radius

`globals.css:35-36` déclare deux tokens **non utilisés en pratique** :
```css
--ls-radius: 8px;
--ls-radius-lg: 16px;
```

Les rayons réellement utilisés (inline) :

| px | Composant |
|---|---|
| 6 / 8 | small badge, type-badge `ResourceCard.tsx:111` |
| 9 | logo carré sidebar `AppLayout.tsx:203` |
| 10 | button compact, choice-pill, icon-btn (`globals.css:946`) |
| 12 | card kanban, sidebar nav rounded-r, drawer item |
| 14 | `Button` ui (`Button.tsx:24` `rounded-[14px]`), card MetricTile |
| 16 | EmptyState halo, card formation, surface-soft |
| 18 / 20 | drawer mobile, surface-soft, hero card |
| 24 | card glass-panel desktop (`Card.tsx:21`), hero PremiumHero |
| 26 / 28 | card sm:`rounded-[26px]`, mobile header glass-panel |
| 999 / 50% | pill, avatar, dot, toggle |

### 3.3 Ombres

`globals.css:37-38` (dark) :

```css
--ls-shadow-sm: 0 1px 2px rgba(0,0,0,0.04), 0 1px 1px rgba(0,0,0,0.02);
--ls-shadow-md: 0 4px 12px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04);
```

`globals.css:67-68` (light) :

```css
--ls-shadow-sm: 0 1px 2px rgba(0,0,0,0.06), 0 1px 1px rgba(0,0,0,0.04);
--ls-shadow-md: 0 4px 14px rgba(0,0,0,0.1), 0 2px 6px rgba(0,0,0,0.05);
```

Tailwind hérité (`tailwind.config.js:30-34`) :
```js
soft: "0 10px 30px rgba(0,0,0,0.22)"
panel: "0 18px 48px rgba(0,0,0,0.22)"
luxe: "0 2px 12px rgba(0,0,0,0.16), 0 18px 48px rgba(0,0,0,0.22)"
```

Et 2 utilitaires CSS `globals.css:883-884` :
```css
.shadow-soft { box-shadow: 0 2px 12px rgba(0,0,0,0.3); }
.shadow-luxe { box-shadow: 0 8px 32px rgba(0,0,0,0.45), 0 2px 8px rgba(0,0,0,0.3); }
```

**Pattern hover lift** récurrent (formation, kanban, card client) :

```ts
onMouseEnter: transform = "translateY(-1px)" ou "-2px"
              boxShadow = `0 8px 24px color-mix(... ${accent} 18%, transparent)`
```

---

## 4. Composants récurrents

### 4.1 `<Button>` (`src/components/ui/Button.tsx`)

3 variants : `primary` (gold), `secondary` (surface2 outline), `ghost`.

```tsx
// Button.tsx:21-37
"inline-flex min-h-[46px] items-center justify-center gap-2
 rounded-[14px] px-5 py-2.5 text-sm font-semibold
 transition-all duration-200
 disabled:opacity-50 disabled:cursor-not-allowed
 active:scale-[0.98] focus-visible:outline-none"

variant === "primary" → "bg-[var(--ls-gold)] text-[var(--ls-gold-contrast)]
                        font-bold shadow-[var(--ls-shadow-sm)]
                        hover:brightness-105 hover:shadow-[var(--ls-shadow-md)]
                        focus-visible:ring-2 focus-visible:ring-[rgba(var(--ls-gold-rgb),0.45)]"
```

**Min-height 46px** + `active:scale-[0.98]` + halo focus gold AA.

### 4.2 `<Card>` (`src/components/ui/Card.tsx`)

Glass-panel rounded 24px, padding 5-6, ombre `--ls-shadow-sm`. Mode
`interactive={true}` ajoute la classe `ls-card-interactive` (lift + shadow-md).

```tsx
// Card.tsx:18-29
"glass-panel rounded-[24px] p-5 sm:rounded-[26px] sm:p-6
 shadow-[var(--ls-shadow-sm)]"
+ interactive && "ls-card-interactive"
```

`.glass-panel` (`globals.css:858-863`) :
```css
border: 1px solid var(--ls-border);
background: var(--ls-surface);
backdrop-filter: blur(20px);
```

### 4.3 `<PageHeading>` (`src/components/ui/PageHeading.tsx`)

3 lignes : eyebrow `.eyebrow-label`, H1 Syne 1.6→2.4rem bold tracking
tight, description optionnelle muted.

```tsx
<p className="eyebrow-label">{eyebrow}</p>
<h1 className="text-[1.6rem] font-bold leading-tight tracking-[-0.03em]
               text-white md:text-[2rem] xl:text-[2.4rem]"
    style={{ fontFamily: "Syne, sans-serif" }}>{title}</h1>
<p className="max-w-2xl text-sm leading-7 text-[var(--ls-text-muted)]">
   {description}</p>
```

⚠ La classe `text-white` est hardcodée — en mode light, c'est l'override
`html.theme-light .text-white { color: var(--ls-text) }` (`globals.css:186-188`)
qui sauve la mise. Pas idéal.

### 4.4 `<PremiumHero>` (`src/components/ui/PremiumHero.tsx`)

Hero animé avec mesh gradient time-of-day + shine animé. Identité
`"gold" | "teal" | "purple" | "neutral"` détermine la palette via
`getHeroGradient()` (`src/lib/heroGradient.ts`).

Structure :
- Container `border-radius: 24px`, `padding: 26px 28px`, ombre
  `0 1px 0 0 ${g.glow}, 0 12px 36px -12px rgba(0,0,0,0.10)`
- Eyebrow 10px / letter-spacing 2px / dot pulse 6px gold
- H1 32px Syne 800 avec gradient text `WebkitBackgroundClip: "text"`
- Subtitle 13px DM Sans muted
- `rightSlot` pour CTA / KPI à droite
- `children` pour stats grid sous le header

Utilisé sur Co-pilote, Agenda, Messages, PV, Team.

### 4.5 `<MetricTile>` (`src/components/ui/MetricTile.tsx`) — KPI cards

```tsx
// MetricTile.tsx:20-33
<div className="rounded-[14px] bg-[var(--ls-surface)] p-5
                border border-[var(--ls-border)]"
     style={{ borderTop: `2px solid ${color}` }}>
  <p className="eyebrow-label mb-3">{label}</p>
  <p className="text-[1.9rem] font-bold leading-none mb-2"
     style={{ color: valueColor, fontFamily: "Syne, sans-serif" }}>
    {value}
  </p>
  <p className="text-[11px] text-[var(--ls-text-hint)]">{hint}</p>
</div>
```

**Pattern KPI** : fond surface, bordure top 2px colorée par accent, label
éticale, gros chiffre Syne coloré, hint 11px hint. Accents : `blue` /
`green` → teal · `red` → coral · `amber` → gold · `muted`.

### 4.6 `<StatusBadge>` (`src/components/ui/StatusBadge.tsx`)

Pill 11px uppercase tracking 0.03em. Tones :

```ts
// StatusBadge.tsx:12-19
blue/green: bg rgba(teal-rgb, 0.12)   fg var(--ls-teal)
red:        bg rgba(coral-rgb, 0.12)  fg var(--ls-coral)
amber:      bg rgba(gold-rgb, 0.12)   fg var(--ls-gold)
purple:     bg rgba(purple-rgb, 0.12) fg var(--ls-purple)
gray:       bg surface2               fg text-muted
```

Note : `blue` et `green` mappent **tous deux** vers teal — il n'existe
qu'une couleur "positive" dans le système.

### 4.7 `<EmptyState>` (`src/components/ui/EmptyState.tsx`)

Carte premium avec emoji animé `float` 4s, halo radial gold, titre Syne
21px (16 compact), description muted, CTA gold gradient pill 999.

CTA gradient hardcodé (`EmptyState.tsx:138, 170`) :
```ts
background: "linear-gradient(135deg, #EF9F27 0%, #BA7517 100%)"
boxShadow:  "0 6px 16px -4px rgba(186,117,23,0.45),
             inset 0 1px 0 rgba(255,255,255,0.20)"
```

### 4.8 Sidebar desktop (`src/components/layout/AppLayout.tsx`)

Aside `width: 252px`, sticky top-5, height `calc(100vh - 2.5rem)`,
border-radius 24, grid 3 rows `auto / minmax(0, 1fr) / auto`. 3 zones :

**Zone 1 — Logo** (`AppLayout.tsx:201-213`) :
- Carré 34×34 gold rounded 9px avec étoile SVG noire
- Titre Syne 14 800 "Lor'Squad" avec "Squad" en gold, sous-titre "Wellness" 10px hint letter-spacing 0.5px

**Zone 2 — Navigation** (`AppLayout.tsx:217-334`) :
- Header section "NAVIGATION" 9px hint uppercase letter-spacing 1.5px
- 8 items : Co-pilote · Academy · Agenda · Messagerie · Dossiers clients · Suivi PV · Mon équipe (admin) · Formation · Paramètres
- Item actif : `borderLeft: '3px solid var(--ls-gold)'`, `background: rgba(201,168,76,0.08)`, color `--ls-text`, font-weight 500, icône gold
- Item inactif : color `--ls-text-muted`, font-weight 400, icône même couleur que texte
- Hover inactif : `background: var(--ls-surface2)`
- Badge rouge inline : `background: rgba(220,38,38,0.1)`, color `#DC2626`, fontSize 9, padding 2/7, borderRadius 10
- **CTA "Nouveau bilan"** inséré juste avant Formation : padding 11/14, borderRadius 12, gradient orange `#EF9F27 → #BA7517`, color blanc, shadow `0 2px 6px rgba(186,117,23,0.25)`

**Zone 3 — Footer sticky** (`AppLayout.tsx:340-420`) :
- `<CoachInstallPwaButton>` (PWA install)
- `<SidebarStreakBadge>` (gamification)
- Ligne profil avatar 30×30 (gradient teal `#2DD4BF → #0D9488` ou photo) + nom 12px + rôle 10px hint + bouton Sortir compact
- Bouton Sortir : padding 6/10, borderRadius 8, bg `rgba(226,75,74,0.12)`, border `rgba(226,75,74,0.35)`, color `#E24B4A`, hover bg solide rouge texte blanc
- `<ThemeToggle>` en dessous

### 4.9 Sidebar mobile (header bandeau)

`AppLayout.tsx:449-548` — visible <xl, glass-panel rounded-[28px], affiché horizontalement avec :
- Logo blason image + nom
- Bouton toggle thème 42×42 + bouton Installer
- Carte profil rgba(255,255,255,0.03) rounded 20 + StatusBadge rôle
- Nav pills horizontales scrollables, item actif `bg-[rgba(201,168,76,0.16)] text-white`
- Bouton "Se déconnecter" full-width transparent

### 4.10 `<BottomNav>` (`src/components/layout/BottomNav.tsx`)

Tab bar mobile (lg:hidden xl:hidden), fixed bottom, 5 items + drawer
"Plus".

`BottomNav.tsx:166-180` :
```ts
background: "var(--ls-sidebar-bg)"
backdropFilter: "blur(12px)"
borderTop: "1px solid var(--ls-border)"
padding: "0 4px env(safe-area-inset-bottom, 0px)"
```

5 items : Co-pilote · Messagerie · **Bilan** (highlight gold `#BA7517`) · Clients · Plus.

Item actif : couleur `var(--ls-gold)` (ou `#BA7517` pour Bilan), label
font-weight 600, petite barre 16×2 px gold en bas.

Bilan = pas de FAB qui dépasse — juste un highlight color (chantier
2026-04-24). Badge messagerie : 12×12 rouge `#E24B4A` en absolute top-3 right-7.

Drawer "Plus" (`BottomNav.tsx:245-333`) — bottom sheet `border-radius
18px 18px 0 0`, handle bar 36×4 rgba blanc 0.2, items 14px DM Sans avec
emojis, séparateur, bouton Sortir rouge `#FCEBEB` / `#A32D2D`.

### 4.11 Inputs (`globals.css:802-823`)

```css
input, textarea, select {
  width: 100%;
  background: #1A1E27;       /* hardcodé, devrait être var(--ls-input-bg) */
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 12px;
  padding: 12px 16px;
  font-size: 14px;
  color: #F0EDE8;
}
input:focus { border-color: rgba(201,168,76,0.45); }
input::placeholder { color: #4A5068; }
```

Mobile (`globals.css:927-933`) : `font-size: 16px !important; min-height:
48px; padding: 14/16` — empêche le zoom iOS.

Range slider (`globals.css:825-833`) : thumb 18×18 rond gold border 2px
`#0B0D11`. Checkbox 18×18 radius 4 `accent-color: #C9A84C`.

### 4.12 ClientsKanban (`src/components/clients/ClientsKanban.tsx`)

Grid 5 colonnes `repeat(5, minmax(240px, 1fr))`, gap 12, scroll horizontal
mobile.

Colonne (`ClientsKanban.tsx:175-188`) :
- padding 10, gap 8
- background `color-mix(in srgb, ${accent} 6%, transparent)`
- border `1px solid ${accent}30` (= 30% opacité hex append)
- borderRadius 12, minHeight 200
- isOver state : background 12% + border `1.5px dashed`

5 statuts (`ClientsKanban.tsx:42-48`) :

| Statut | Label | Emoji | Tone |
|---|---|---|---|
| `not_started` | À démarrer | 📋 | gold |
| `active` | En suivi actif | 🔥 | teal |
| `paused` | En pause | ⏸ | purple |
| `stopped` | Arrêté | ⛔ | neutral (gray) |
| `lost` | Perdu | 💔 | coral |

DnD : `@dnd-kit/core`, sensor pointer 5px threshold, touch 200ms delay.

### 4.13 QuickFiltersBar (`src/components/clients/QuickFiltersBar.tsx`)

Header eyebrow "FILTRES RAPIDES" 9px / letter-spacing 2px. Chips :
- padding 7/12, borderRadius 20 (pill), fontSize 11
- inactif : bg `var(--ls-surface)` border `var(--ls-border)` color muted
- actif : bg `colors.bg` border `colors.border` color `colors.text` font-weight 600
- compteur inline pill `padding 1/6, borderRadius 10, minWidth 16`

### 4.14 Formation : `<ParcoursLevelCard>`

Card niveau parcours guidé (3 sur la home Formation). Voir §10 pour les
détails complets — résumé :

- minHeight 220, padding 18, borderRadius 16
- borderTop **3px solid accent** (sauf locked → dashed border standard)
- background `linear-gradient(135deg, color-mix(${accent} 8%, surface) 0%, surface 100%)`
- watermark numéro de niveau 72px Syne 900 color-mix accent 12% en absolute top:10 right:14
- Header : emoji 34px + eyebrow "NIVEAU N" 10px letter-spacing 0.14em accent + H3 19px Syne 800 + subtitle 12px accent 600
- Description 12.5px muted
- Barre progression : height 4 borderRadius 2 fond `var(--ls-surface2)` fill accent
- CTA 13px Syne 700 accent

États : `verrouillé` (opacity 0.55, dashed, "🔒 Termine N{x} d'abord")
· `pas commencé` ("À démarrer" → "Commencer →") · `en cours` ("Reprendre →")
· `terminé` (✓ Terminé / "Refaire →").

### 4.15 Formation : `<CategoryCard>`

`src/components/formation/CategoryCard.tsx` — card thématique
bibliothèque. Padding 16, borderRadius 14. Carré icône 40×40 borderRadius
10 fond `color-mix(${accent} 14%, transparent)` color accent. Eyebrow
type 10px letter-spacing 0.08em fontWeight 700. Footer : "X / Y
ressources" 11px muted + percent 12px accent 700, barre progression
4px. Badge "Nouveau" 9px coral position absolute top-10 right-10.

### 4.16 Formation : `<ResourceCard>`

`src/components/formation/ResourceCard.tsx` — bouton ligne ressource :
- padding 14, borderRadius 12
- icône 44×44 rounded 10 color-mix accent 14%
- 4 types avec accent : video → coral · pdf → gold · guide → teal · external → purple
- type-badge inline padding 1/7 radius 6 fontSize 10 letter-spacing 0.03em
- hover background `--ls-surface2`

### 4.17 `<ThemeToggle>` (`src/components/layout/ThemeToggle.tsx`)

Bouton pleine largeur, padding 10/14, borderRadius 10, border. Icône
soleil (☀️) gauche / lune (🌙) droite, opacity 1 ou 0.4 selon thème.
Switch piste 44×24 border-radius 999, fond `#BA7517` (dark mode actif)
ou `var(--ls-border)`, knob 20×20 blanc avec `box-shadow: 0 1px 3px
rgba(0,0,0,0.3)`, transition 0.2s.

---

## 5. Patterns UI spécifiques

### 5.1 Pattern "header de section" (formation, co-pilote)

Émoji + titre + sous-titre + line accent. Vu sur `FormationPage.tsx:46-51` :

```tsx
<SectionHeader icon="✦" title="Mon parcours guidé"
  subtitle="3 niveaux pour passer du débutant au leader."
  accent="var(--ls-gold)" />
```

### 5.2 Pattern "métrique grosse + label éticales"

```tsx
<p className="eyebrow-label mb-3">CLIENTS ACTIFS</p>
<p style={{ fontFamily: "Syne", fontSize: '1.9rem',
            fontWeight: 700, color: 'var(--ls-teal)' }}>55</p>
<p className="text-[11px] text-[var(--ls-text-hint)]">+3 cette semaine</p>
```

### 5.3 Pattern color-mix pour fonds tinted

Récurrent et reproductible :

```ts
background: `color-mix(in srgb, ${accent} 6%,  var(--ls-surface))`   // card faible
background: `color-mix(in srgb, ${accent} 14%, transparent)`         // icône container
background: `color-mix(in srgb, ${accent} 28%, var(--ls-border))`    // border subtil
```

### 5.4 Pattern dot pulse devant eyebrow

```tsx
<span style={{ width: 6, height: 6, borderRadius: 999,
  background: g.primary, boxShadow: `0 0 8px ${g.glow}` }} />
{eyebrow}
```

(`PremiumHero.tsx:120-130`)

### 5.5 Hover lift cards

Pattern systématique :
```ts
onMouseEnter: { transform: "translateY(-1px)" or "-2px",
                boxShadow: `0 8px 22px -8px color-mix(... ${accent} 40%, transparent)` }
onMouseLeave: { transform: "none", boxShadow: "none" }
```

### 5.6 Emojis dans titres

Usage mesuré et **codé en dur** :
- `🎯` dans titres "ton suivi du moment 🎯" (PvOverview)
- `🎉` dans EmptyState et HeroActionCard ("Tout est calme, bonne journée 🎉")
- `📋 🔥 ⏸ ⛔ 💔` dans header colonnes Kanban
- `📅 📊 👥 📚 ⚙️` dans BottomNav drawer

Pas de librairie d'icônes Lucide/Heroicons — tous les SVG sont écrits à
la main inline (pattern "draw your own"). Voir aussi `src/components/ui/Icons.tsx`
qui exporte des SVG inline réutilisables (taille 14-20px, strokeWidth 1.5).

### 5.7 Bandeau d'erreur fetch (garde-fou RLS)

`AppLayout.tsx:428-447` — pattern bandeau alerte rouge :
```tsx
background: "rgba(220,38,38,0.12)"
border: "1px solid rgba(220,38,38,0.4)"
color: "#FCA5A5"
borderRadius: 12, padding: "14px 16px", fontSize: 13
```

### 5.8 Animations CSS

`globals.css:899-915` :
- `shimmer` (skeleton loading), `spin` (loaders), `fadeIn`, `pulse` (dot
  badge), `slideUp` (page-mount), `scaleIn` (card-mount)
- Float emoji EmptyState (`EmptyState.tsx:41-44`) : `translateY(0) → -4px,
  rotate(0 → 2deg)` 4s infinite
- `prefers-reduced-motion: reduce` désactive `mesh` et `shine` du PremiumHero

---

## 6. Responsive

### 6.1 Breakpoints

Pas de breakpoints custom Tailwind — défaut Tailwind + media queries CSS
custom dans `globals.css`.

| Breakpoint | Taille | Cible |
|---|---|---|
| `(max-width: 640px)` | iPhone | Stack 1 colonne, kanban 1 colonne |
| `(max-width: 768px)` | mobile / petit iPad | Bilan stepper scrollable, fiche client tabs scrollables |
| `(min-width: 768px) and (max-width: 1024px)` | iPad portrait | Dashboard 2 colonnes, body 15px |
| `(max-width: 1024px)` | tablet | Inputs 16px (no zoom iOS), bottom nav fixed |
| `(min-width: 768px) and (max-width: 1279px)` | iPad landscape | Bottom nav obligatoire, Dashboard 2 colonnes |
| `xl` (≥ 1280px) | desktop | Sidebar visible, 2-col grid `[252px_minmax(0,1fr)]` |

### 6.2 Patterns responsive clés

- **Sidebar masquée < xl** : seul le header glass-panel mobile + BottomNav apparaissent
- **BottomNav cachée ≥ lg / xl** : `lg:hidden xl:hidden`
- **Tables → cards** : `globals.css:1043-1085` patches le tableau PV en
  cards stackées (header masqué, labels inline préfixés via
  `::before { content: 'PV cumulés : ' }`)
- **Padding bottom safe-area** : `padding-bottom: max(100px, calc(env(safe-area-inset-bottom) + 90px))` sur `main`

---

## 7. Dark mode / Light mode

### 7.1 Mécanisme

Toggle géré par `useTheme()` (`src/hooks/useTheme.ts` non lu mais
référencé). Sélecteur racine : `html.theme-light` (light est la classe
ajoutée, dark est le défaut). `<ThemeToggle>` bascule la classe.

### 7.2 Couverture

- ✅ Variables `--ls-*` toutes redéfinies en light
- ✅ Inputs natifs forcés clairs (`globals.css:101-107`)
- ✅ Couleurs hardcodées **détectées** par sélecteurs d'attribut
  `[style*="color: #F0EDE8"]` et remappées (`globals.css:117-249`)
- ✅ Tailwind `text-white`, `bg-zinc-*`, `text-gray-*` neutralisés
- ✅ Pastels Tailwind (`text-rose-100`, `text-amber-100`) remappés en
  variantes sombres pour rester lisibles sur fond clair
- ⚠ Astuce coach (CLAUDE.md) : basculer en dark juste avant la page
  remerciement post-bilan pour effet QR sombre + glow gold

### 7.3 Composants déjà theme-aware

- Sidebar (variables `--ls-*` partout sauf logo `#C9A84C` hardcodé)
- BottomNav (variables `--ls-*`)
- Button, Card, MetricTile, StatusBadge, EmptyState, PremiumHero
- Formation : ParcoursLevelCard, CategoryCard, ResourceCard (refactor
  2026-04-30)
- ThankYouStep (post-bilan), ActionsRdvBlock, ClientConseilsTab

### 7.4 Composants encore en couleurs hardcodées

(Détectés par grep — voir §8)

- HeroActionCard utilise `#1D9E75 → #0F6E56` hardcodé en gradient teal
  custom (`src/components/copilote/HeroActionCard.tsx:87`) — non
  theme-aware
- Tous les composants qui utilisent le gradient orange "Nouveau bilan"
  (`#EF9F27 → #BA7517`)
- Logo carré gold `#C9A84C` hardcodé dans `AppLayout.tsx:203` (acceptable
  car c'est l'identité de marque — mais devrait être `var(--ls-gold)`)

---

## 8. Inconsistances trouvées

### 8.1 Couleurs hardcodées qui devraient être en variables

| Couleur | Localisations | Devrait être |
|---|---|---|
| `#C9A84C` (gold) | sidebar logo `AppLayout.tsx:203, 208`, range thumb `globals.css:831`, checkbox accent `globals.css:838`, focus input `globals.css:818` | `var(--ls-gold)` |
| `#F0EDE8` (text) | inputs `globals.css:810, 823` | `var(--ls-text)` |
| `#1A1E27` (input bg) | inputs `globals.css:805, 823, 827, 838` | `var(--ls-input-bg)` |
| `#4A5068` (hint) | `.eyebrow-label` `globals.css:855`, placeholder `globals.css:821` | `var(--ls-text-hint)` |
| `#0B0D11` (bg) | scrollbar track `globals.css:798`, range thumb border `globals.css:832` | `var(--ls-bg)` |
| `#EF9F27 → #BA7517` (orange) | `EmptyState.tsx:138, 170`, `AppLayout.tsx:254`, `BottomNav.tsx:83`, `heroGradient.ts:56-62` | nouveau token `--ls-orange` + `--ls-orange-dark` |
| `#1D9E75 → #0F6E56` (deep teal) | `HeroActionCard.tsx:29, 87` | nouveau token ou utiliser `var(--ls-teal)` |
| `#E24B4A`, `#A32D2D`, `#FCEBEB` (logout) | `AppLayout.tsx:388-403`, `BottomNav.tsx:311` | nouveau token `--ls-danger` ou réutiliser coral |
| `#DC2626` (badge danger) | nav badge `AppLayout.tsx:321` | `var(--ls-coral)` (mais coral light est déjà DC2626) |

### 8.2 Doublons / redondances

- **3 systèmes de couleurs en parallèle** (variables CSS, Tailwind `lor.*`,
  Tailwind `glow.*`, hardcoded). Tailwind `glow` et `lor` ne sont pas
  consommés en pratique.
- `tailwind.config.js:23 lor.gold2: '#F0C96A'` — défini, jamais utilisé.
- `--ls-radius` et `--ls-radius-lg` (`globals.css:35-36`) — déclarés,
  jamais référencés.
- 2 utilitaires shadow distincts : Tailwind (`shadow-soft`, `shadow-luxe`)
  + CSS (`globals.css:883-884`) avec valeurs **différentes**.
- `StatusBadge.tone` "blue" et "green" mappent tous deux sur teal.
  Fonctionnel mais trompeur à l'API.
- `getRoleLabel(currentUser.role)` dans le mobile header utilise un
  `<StatusBadge tone="blue|amber|green">` alors que sur desktop le rôle
  s'affiche en plain text (`AppLayout.tsx:106-111` vs `:497`).

### 8.3 Couleurs très proches mais pas identiques

| Variant 1 | Variant 2 | Note |
|---|---|---|
| `#B8922A` (light gold) | `#BA7517` (orange CTA dark) | Légère asymétrie de teinte |
| `#DC2626` (light coral) | `#E24B4A` (logout) | Deux rouges danger différents |
| `rgba(201,168,76,0.08)` (sidebar active) | `rgba(201,168,76,0.16)` (mobile active) | Opacité doublée |
| `rgba(201,168,76,0.10)` (`--ls-gold-bg`) | `rgba(201,168,76,0.12)` (StatusBadge amber bg) | À aligner |

### 8.4 CSS modules vs inline-style

- `Button`, `Card`, `MetricTile`, `PageHeading` → **Tailwind classes**
- BottomNav, Sidebar (zone 2/3), HeroActionCard, ParcoursLevelCard,
  CategoryCard, EmptyState, PremiumHero → **inline-style massif**
- 5 fichiers `.css` co-localisés (ActionsRdvBlock, SportAlertsDialog,
  SelectableProductCard, ThankYouStep, ClientConseilsTab) → **CSS modules
  ad-hoc** (pas vrai CSS modules, juste `.css` plain importé)
- `globals.css` (2378 lignes) = mixte `@layer base/components/utilities`
  + nombreuses overrides sélecteurs d'attributs en mode light. 280+
  références à `--ls-*`.

### 8.5 Anti-patterns détectés

- `.eyebrow-label` hardcode `color: #4A5068` (`globals.css:855`) au lieu
  de `var(--ls-text-hint)` — l'override `html.theme-light .eyebrow-label`
  (`globals.css:534-536`) sauve la mise.
- `text-white` Tailwind utilisé dans plusieurs composants (PageHeading,
  AppLayout mobile) — fragile en light mode (sauvé par override global).
- Bandeau erreur fetch hardcode `#DC2626` / `#FCA5A5` au lieu de
  `--ls-coral`.
- Pas de focus-ring uniforme sur tous les boutons inline (seul `<Button>`
  ui le fait correctement).

---

## 9. Références visuelles

Pages les plus représentatives du design system :

1. **Co-pilote** (`src/pages/CoPilotePage.tsx`) — hero teal gradient
   action card, sections glass-panel, KPI grid via MetricTile, footer
   legal. Pattern le plus mature.
2. **Suivi PV** (`src/pages/PvOverviewPage.tsx`) — utilise PremiumHero
   identité gold, KPIs, table custom (PvKanban + PvClientFullPage),
   responsive complet (`globals.css:984-1085`).
3. **Clients** (`src/pages/ClientsPage.tsx`) — toggle Liste/Kanban
   (GlobalViewToggle), QuickFiltersBar chips, ClientsKanban DnD.
4. **Bilan** (`src/pages/NewAssessmentPage.tsx`) — 14 étapes dynamiques
   stepper, plein écran sans sidebar, panneau notes gauche, ticket droite.
   Composants `SelectableProductCard`, `QuantityStepper`,
   `SportAlertsDialog`.
5. **App client** (`src/pages/ClientAppPage.tsx`) — tabs Accueil /
   Évolution / Conseils / Produits, gold accent + ClientConseilsTab
   premium (assiette idéale, routine, conseils coach).
6. **Page remerciement post-bilan** (`src/components/assessment/ThankYouStep.tsx`)
   — exemplaire pour les bonnes pratiques `var(--ls-*)`, QR fond blanc
   forcé, glow gold dark mode.
7. **Formation** (`src/pages/FormationPage.tsx`) — page la plus récente,
   pattern hybride parcours + bibliothèque (cf. §10).

---

## 10. Recommandations pour `/formation`

La page d'accueil `/formation` (`src/pages/FormationPage.tsx`) suit déjà
le DS récent (2026-04-30). Voici comment continuer dans la même
direction pour les sous-pages (`FormationCategoryPage`, `FormationModulePage`).

### 10.1 Composants existants à réutiliser

| Besoin | Composant |
|---|---|
| Header de page | `<PageHeading eyebrow= title= description=>` |
| Carte niveau parcours (1, 2, 3) | `<ParcoursLevelCard>` (existe déjà) |
| Carte thème bibliothèque | `<CategoryCard>` (existe déjà — basé sur `TrainingCategoryStats`) ou pattern inline de `FormationPage.tsx:84-...` (pour `FormationCategory` du nouveau modèle data) |
| Item ressource (vidéo / PDF / guide / externe) | `<ResourceCard>` |
| Vidéo modale | `<VideoPlayerModal>` |
| Empty state | `<EmptyState emoji="📚" title="Contenu à venir" description="..." />` |
| Footer fin de module | `<GuideCompletionFooter>` |
| Badge type ressource | inline pattern de `ResourceCard.tsx:108-122` (type-badge accent) |
| Badge "Nouveau" | inline coral 9px uppercase, comme `CategoryCard.tsx:75-93` |

### 10.2 Couleur sémantique progression — proposition

S'aligner sur la convention déjà établie dans `ParcoursLevelCard` :

| État | Couleur | Token | Pattern visuel |
|---|---|---|---|
| **Verrouillé** | gris muted | `var(--ls-text-muted)` + `border: 0.5px dashed var(--ls-border)` + `opacity: 0.55` | Cadenas 🔒 + texte "Termine N{x} d'abord" |
| **À démarrer / pas commencé** | accent atténué | accent var, mais **pas** de gradient de fond, juste border-top 3px | CTA "Commencer →" |
| **En cours** | accent vif | accent var + gradient fond + barre progression remplie en partie | CTA "Reprendre →" + percent affiché en accent 700 |
| **Terminé** | accent + checkmark | accent var + barre 100% | "✓ Terminé" + CTA "Refaire" |

**Mapping niveaux** (déjà encodé dans `data/formation.ts`) :
- Niveau 1 (Démarrer) : `--ls-teal` (positif, débutant — comme
  `CategoryCard` "DÉBUTANT")
- Niveau 2 (Construire) : `--ls-gold` (intermédiaire, milieu de parcours)
- Niveau 3 (Dupliquer) : `--ls-purple` (avancé, leadership)

> Note : `CategoryCard` utilise déjà ce mapping `teal/amber/purple` →
> labels `DÉBUTANT/INTERMÉDIAIRE/AVANCÉ` (`CategoryCard.tsx:17-21`).
> `ParcoursLevelCard` accepte `gold | teal | purple` via
> `FormationLevelAccent` (`ParcoursLevelCard.tsx:27-31`). Cohérent.

**Bibliothèque par thème** (4 cartes) — `FormationPage.tsx:80-...` :
- Prospection → `gold`
- Bilan → `teal`
- Suivi → `purple`
- Business → `coral`

(Cohérent avec le mapping déjà en place dans `data/formation.ts`.)

### 10.3 Style barre de progression (référence)

`ParcoursLevelCard.tsx:179-213` — pattern exact à reprendre :

```tsx
<div style={{ display: 'flex', justifyContent: 'space-between',
              fontSize: 11, color: 'var(--ls-text-muted)', marginBottom: 6 }}>
  <span>{stateLabel}</span>
  <span style={{ fontWeight: 700, color: accentVar }}>{percent}%</span>
</div>
<div style={{ height: 4, borderRadius: 2,
              background: 'var(--ls-surface2)', overflow: 'hidden' }}>
  <div style={{ width: `${percent}%`, height: '100%',
                background: accentVar, transition: 'width 0.4s ease' }} />
</div>
```

Variation **CategoryCard** : même barre 4px mais `transition: width 0.3s`
(`CategoryCard.tsx:152-169`). À uniformiser à 0.4s pour cohérence.

### 10.4 Module verrouillé vs débloqué

Reprendre le pattern de `ParcoursLevelCard` :

**Verrouillé** :
```ts
opacity: 0.55
background: 'var(--ls-surface)'
border: '0.5px dashed var(--ls-border)'
borderTop: '0.5px dashed var(--ls-border)'  // pas de barre accent
cursor: 'not-allowed'
onClick: e.preventDefault()
stateLabel: '🔒 Termine N{prereq} d\'abord'
```

**Débloqué** :
```ts
opacity: 1
background: `linear-gradient(135deg,
              color-mix(in srgb, ${accent} 8%, var(--ls-surface)) 0%,
              var(--ls-surface) 100%)`
border: `0.5px solid color-mix(in srgb, ${accent} 28%, var(--ls-border))`
borderTop: `3px solid ${accent}`
cursor: 'pointer'
hover: translateY(-2px) + boxShadow color-mix accent 40%
```

### 10.5 Recommandations spécifiques pour les sous-pages

**`FormationCategoryPage`** (liste ressources d'un thème) :
- Header : `<PageHeading eyebrow="Bibliothèque · {accent}" title="{thème}" description="..." />`
- Liste verticale de `<ResourceCard>` avec gap 10px
- Si vide : `<EmptyState emoji="📚" title="Contenu à venir" description="Cette section sera enrichie bientôt." />`
- Optionnel : breadcrumb haut de page "Formation › {thème}" en
  `text-[11px] text-[var(--ls-text-hint)]`

**`FormationModulePage`** (détail module / vidéo / PDF) :
- Header avec accent du parcours parent (teal/gold/purple)
- Player vidéo via `<VideoPlayerModal>` ou inline
- Footer "Marquer comme terminé" via `<GuideCompletionFooter>` existant
- Navigation "Précédent / Suivant module" en bas, format pill 999, accent
  parent

### 10.6 Zone à clarifier avec Thomas

- **Cohabitation `data/formation.ts` (FormationCategory) et `types/training.ts`
  (TrainingCategory)** : deux modèles data en parallèle pour la même
  zone. Le commit récent `aa9fa89` a refait `FormationCategoryPage` et
  `FormationModulePage` placeholder — vérifier lequel est la nouvelle
  source de vérité avant d'ajouter du contenu.
- **`data/formationContent.ts` supprimé** (statut `D` au début de
  conversation) — confirmer que `data/formation.ts` est désormais
  l'unique source.
- **`<GuideCompletionFooter>`** existait pour l'ancien `/guide` (voir
  alias `/formation → /guide` dans la nav active matcher
  `AppLayout.tsx:233`). Vérifier qu'il est toujours pertinent ou s'il
  faut un nouveau footer "Module terminé".

---

## Annexe — Inventaire complet `src/components/ui/`

| Composant | Rôle | Theme-aware |
|---|---|---|
| `Button.tsx` | 3 variants (primary/secondary/ghost) | ✅ |
| `Card.tsx` | glass-panel + interactive | ✅ |
| `PageHeading.tsx` | H1 + eyebrow + description | ⚠ `text-white` hardcodé |
| `MetricTile.tsx` | KPI card border-top accent | ✅ |
| `StatusBadge.tsx` | Pill 6 tons | ✅ |
| `EmptyState.tsx` | Empty premium gold gradient | ⚠ gradient orange hardcodé |
| `PremiumHero.tsx` | Hero animé time-of-day | ✅ |
| `AccentFrame.tsx` | (non lu) | — |
| `CommandPalette.tsx` | (non lu) | — |
| `ConfirmDialog.tsx` | (non lu) | — |
| `GlobalViewToggle.tsx` | Toggle Liste/Kanban | (non lu) |
| `Icons.tsx` | SVG inline réutilisables | — |
| `LegalFooter.tsx` | Footer mentions | (non lu) |
| `QRCode.tsx` | wrapper qrcode.react | — |
| `Skeleton.tsx` | loading shimmer | — |
| `ToastHost.tsx` | toast portal | — |

---

*Fin du document. Pour toute mise à jour, suivre la règle "var(--ls-\*)
d'abord, hardcode jamais" et documenter ici les nouveaux tokens créés.*
