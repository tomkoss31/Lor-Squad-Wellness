# Audit Mobile La Base 360 — 2026-05-20

Chantier refonte mobile PWA distri (iPhone + iPad + Android phone).

---

## 1. État des lieux navigation

### ✅ Ce qui marche déjà
- **Bottom nav 5 items** existe (`src/components/layout/BottomNav.tsx`, 373L) : Co-pilote · Messagerie · `+ Bilan` (FAB central) · Clients · Plus
- **Click "Plus"** → bottom sheet drawer avec Agenda, Suivi PV, Mon équipe (admin), Centre de formation, Paramètres, Sortir
- **Header mobile compact** (`AppLayout.tsx:559`) : logo La Base 360 + AnnouncementBell + theme toggle + bouton install PWA
- **Sidebar gauche cachée < 1280px** (Tailwind `xl:hidden`) — pas de pollution mobile
- **Manifest PWA + InstallPwaTutorialModal** existants
- **BottomNav touch targets ≥ 44px** (`minHeight: 44` ligne 93)

### ❌ Pain points identifiés

#### Navigation
1. **Pas de "vraie" sidebar drawer slide-left** (style Gmail / Notion mobile). Le seul accès aux sections autres que les 4 prioritaires passe par le drawer "Plus" en bas → expérience moins fluide qu'un hamburger qui ouvre toute la nav d'un swipe
2. **5 items bottom nav fixes** — pas adaptés selon le rôle (admin / distri / référent voient les mêmes alors qu'un admin veut peut-être avoir "Mon équipe" en priorité)
3. **Le drawer "Plus" est en bottom sheet** — sur iOS Safari standalone, les controls navigateur sont déjà en bas, conflit ergonomique potentiel
4. **Pas d'indicateur de la page courante dans le header mobile** — l'utilisateur perd parfois où il est
5. **Pas de bouton "retour" universel** — pour les pages profondes (ex : fiche client) on dépend du back navigateur

#### Contenu des pages
Audit des `@media` breakpoints par page :
- `CoPiloteV5Page` + CSS : 4 occurrences `@media` → responsive partiel
- `ClientsPage` : **0** @media → pas de design mobile dédié, repose uniquement sur `flex-wrap` et `clamp()`
- `AgendaPage` : 2 @media → quasi rien
- `RoutineDuJourPage` : 0 @media → OK car simple structure
- Pages secondaires (Suivi PV, FLEX, Cahier de bord, Rentabilité) : à mesurer mais probablement similaires

→ Conclusion : **la majorité des pages s'auto-adaptent grâce au flex-wrap mais sans optimisation mobile spécifique**. D'où l'empilement infini que Thomas reproche.

#### Pages les plus critiques à compacter (selon usage distri)

| Page | Problème mobile probable | Pistes |
|---|---|---|
| `/clients` | 3 stats cards (Clients visibles / Responsables / Relances) + filtres rapides + tri + filtres par responsable + recherche → tout empilé verticalement = scroll long avant la liste | Bottom sheet pour filtres, stats en chip horizontal scroll, liste en cards compactes |
| `/co-pilote` | TopBar (date + greeting + 5-6 pills) + alertes + cards × 6+ → scroll très long | TopBar collapsable, pills scroll horizontal, cards prioritaires en haut |
| `/agenda` | Grid calendar pleine semaine ne tient pas en mobile portrait | Vue jour-par-jour scrollable, vue semaine en landscape only |
| Fiche client | Beaucoup d'onglets, tableaux, sections | Tabs scrollable horizontal, sections collapsibles, FAB d'actions principales |
| `/messages` | Inbox + liste conversations + filtres | Pattern WhatsApp : 1 vue inbox / 1 vue conversation |

#### PWA iOS spécifique
- ❓ `safe-area-inset-bottom` pas appliqué partout (BottomNav doit gérer la home bar iPhone)
- ❓ Install prompt visible mais pas optimisé pour iOS (iOS demande "Ajouter à l'écran d'accueil" manuel via partage)
- ❓ Splash screen + theme-color meta pour ressentir "native"
- ❓ Haptic feedback (`navigator.vibrate()`) sur actions clés

---

## 2. Stratégie cible

### Principes
1. **Mobile-first par page**, pas big bang nav
2. **La structure existante reste** (Thomas a validé) — on ajuste, on ne refait pas
3. **3 patterns nouveaux** à introduire dans le design system :
   - Bottom sheet pour les filtres / actions secondaires (au lieu de modales centrales)
   - Cards compactes avec "voir plus" inline (au lieu de tout dérouler)
   - Hamburger drawer gauche pour navigation complète (en plus du bottom nav)

### Identité visuelle à respecter
- Tokens : `var(--ls-bg)`, `var(--ls-surface)`, `var(--ls-text)`, `var(--ls-gold)`, `var(--ls-teal)`, `var(--ls-coral)`, `var(--ls-border)`
- Fonts : **Syne** (titres, bold/extra-bold), **DM Sans** (corps), **Sora** (display optionnel)
- Palette : gold `#C9A84C` / teal `#2DD4BF` / coral pour relances
- Theme dark (défaut) + light (toggle)
- Radius : 12-22px
- Touch target minimum : 44×44px
- Animations subtiles `prefers-reduced-motion` respecté

---

## 3. Prompt Claude Design — Phase 1 (Navigation + 1 page exemple)

> **Copier-coller le bloc ci-dessous dans Claude Design** (Claude.ai > demande de design HTML/mockup) pour générer 3 mockups.

---

### 🎨 PROMPT MOCKUP

```
Tu es designer produit pour "La Base 360", une app coach Herbalife
(SaaS B2B). Génère 3 mockups HTML responsive mobile-first (375px de
large = iPhone 13/14/15) pour la PWA distri.

## Contexte
Les distri sont en mobilité (RDV club, gym, déplacements). Ils
utilisent l'app sur iPhone + iPad + Android phone. La structure
actuelle est validée : bottom nav 5 items (Co-pilote / Messagerie /
+ Bilan / Clients / Plus). On veut juste rendre l'app plus
compacte, plus fluide à naviguer.

## Identité visuelle
- Palette dark mode (défaut) :
  - bg #0E0E0F
  - surface #19191B
  - surface2 #232325
  - text #F5F5F7
  - text-muted #9BA0A8
  - border #2E2E32
  - gold #C9A84C (accent principal, CTAs)
  - teal #2DD4BF (success, progression)
  - coral #FF6B57 (urgence, relances)
- Palette light (variante) :
  - bg #FAF8F2 (cream)
  - surface #FFFFFF
  - gold #B8922A (gold un peu plus profond)
  - teal #0D9488
- Fonts :
  - Syne 700/800 pour titres et nombres importants
  - DM Sans 400/500/600 pour corps de texte
  - Sora 700/800 pour display hero
- Radius : 12-22px (cards 18, pills 999, modales 22)
- Shadows douces, glow gold subtil sur éléments actifs
- Touch target minimum : 44×44px

## Mockup 1 — Sidebar drawer mobile (gauche)

Sur tap d'un bouton hamburger en haut à gauche du header mobile, un
drawer slide depuis la gauche (transition 280ms ease-out) et couvre
~80% de la largeur. Contient :

**Header drawer**
- Avatar coach + nom (ex: "Thomas") + rôle ("Coach · Admin")
- Bouton fermeture (X) en haut à droite

**Sections** (avec divider gold subtil entre)
1. Navigation principale (6 items, icônes lucide style outline + label) :
   - 🏠 Co-pilote
   - ⚡ FLEX
   - 📅 Agenda
   - ✉️ Messagerie (badge unread si > 0)
   - 👥 Dossiers clients
   - 💰 Suivi PV (badge nombre transactions du mois)
2. Équipe (admin only) :
   - 👑 Mon équipe
3. Développement :
   - 🎓 Mon développement
4. Compte (en bas) :
   - ⚙️ Paramètres
   - 🚪 Sortir (rouge subtil)

**Footer drawer**
- Streak coaching "🔥 4j d'affilée · Niv. 5"
- Version app : "v1.42 · 2026-05-20"

L'item actif est marqué par un fond gold à 10% opacité + barre gold
gauche 3px + texte gold. Hover/tap states clairs.

## Mockup 2 — Header mobile compact

Le header mobile remplace l'actuel (logo + cloche + theme + install).
Doit faire ~64px de haut maximum, sticky en haut, backdrop-blur.

Contenu de gauche à droite :
- Bouton hamburger (3 barres, 44×44 touch target) — ouvre Mockup 1
- Logo La Base 360 mini (32×32) + texte "La Base 360" en Sora 700
  (sur mobile ≥ 380px) ou logo seul (sur < 380px)
- À droite, 3 pills compactes :
  - Météo "🌤 14°" (cliquable)
  - Notif "🔔" avec badge unread
  - Avatar coach (32×32, click → profil)

Le hamburger remplace l'AppLayout actuel header mobile. Le bouton
theme toggle et install PWA passent dans le drawer (Mockup 1) ou
les paramètres.

## Mockup 3 — Page Clients compactée mobile

Refonte mobile-first de /clients pour iPhone 13 (375px).
Empilement actuel trop long (3 stats cards + filtres rapides + tri +
filtre responsable + recherche + liste).

Cible :

**Section sticky en haut (sous header)**
- Tabs horizontaux Clients · Leads · Témoignages (pill scroll
  horizontal, indicateur gold sous le tab actif)
- Barre de recherche compacte avec icône loupe gauche, placeholder
  "Nom, ville, programme..." (44px de haut)
- Bouton filtres "⊞ Filtres (3)" qui ouvre un bottom sheet (chiffre
  = nb de filtres actifs)

**Mini-stats compactes** (1 ligne horizontale scroll si débordent)
- "25 dossiers" (gros chiffre Syne 800 + label DM Sans muted)
- "6 actifs" (chip teal)
- "16 relances" (chip coral)

**Liste clients en cards compactes** (1 colonne, vertical scroll)
Chaque card :
- Avatar ou initiales (40×40, rond)
- Nom complet + petit chip lifecycle (active/paused/lost)
- Sous-ligne : "12 PV ce mois · Dernier RDV J-3"
- Tap → ouvre fiche client en pleine page

**Bottom sheet filtres** (s'ouvre sur tap "⊞ Filtres")
- Drag handle en haut (4px de haut, 40 large, gris)
- Titre "Filtres" + bouton "Reset" droite
- Sections :
  - Statut (pills multi-select : Au cap / Inactifs >30j / Sans RDV / VIP / Nouveau)
  - Responsable (avatars + nom, scrollable horizontal)
- Bouton "Appliquer" sticky en bas

## Contraintes globales
- HTML standalone, CSS inline ou <style> dans <head>, pas de framework
- Mode dark par défaut, mais le light mode doit être visible aussi (toggle interne dans la mockup OK)
- Compatible touch (pas de hover obligatoire)
- Anim transitions max 280ms, prefers-reduced-motion respecté
- Pas d'images placeholder externes, juste des solid colors ou
  initiales texte pour les avatars
- Inclure les 3 mockups dans un seul fichier HTML avec un toggle
  pour basculer entre eux (sélecteur en haut "Mockup 1 / 2 / 3")

Génère le HTML complet, prêt à ouvrir dans Chrome desktop pour
prévisualiser en device toolbar iPhone 13.
```

---

## 4. Phase B — Roadmap onde par onde (après mockup validée)

### Onde 1 — Drawer + header mobile (1-1.5j)
- Implémenter `MobileDrawer.tsx` avec slide-in left
- Modifier `AppLayout.tsx` ligne 559+ pour intégrer le bouton hamburger
- Tester sur iPhone 13, iPad, Android phone
- ⚠️ Touche TOUS les écrans → recette mobile complète obligatoire

### Onde 2 — Refonte page Clients mobile (1-2j)
- Tabs sticky + recherche + bottom sheet filtres
- Liste cards compactes
- Probable extraction `<ClientsListMobile />` du `ClientsPage`

### Onde 3 — Compaction Co-pilote V5 mobile (1-2j)
- TopBar collapsible (le greeting passe en mini chip quand on scroll)
- Pills scroll horizontal
- Cards prioritaires en haut, secondaires en bas

### Onde 4 — Agenda mobile (1-2j)
- Vue jour par défaut (au lieu de semaine)
- Toggle vue semaine en landscape uniquement
- RDV en bottom sheet au tap

### Onde 5 — Pages secondaires (1j)
- Suivi PV, FLEX, Rentabilité, Cahier de bord → compaction ciblée
- Pattern bottom sheet pour les filtres

### Onde 6 — Polish PWA iOS (0.5j)
- `safe-area-inset-bottom` sur BottomNav
- Splash screen iOS
- Haptic feedback sur actions clés (tap card, swipe, etc.)
- Install prompt iOS amélioré (instructions visuelles "Partager > Ajouter à l'écran d'accueil")

**Total estimé : 7-10 jours étalés sur plusieurs sessions.**

---

## 5. Risques + mitigations

| Risque | Mitigation |
|---|---|
| Régression desktop en refondant mobile | Tester sur 3 viewports (375 / 768 / 1280) à chaque commit |
| Drawer mobile conflit avec gestures iOS (swipe back) | `touch-action: pan-y` strict, drawer ouvre via tap explicite uniquement |
| Touch target trop petits | Lint visuel : tous boutons ≥ 44×44 |
| Bundle size augmenté (animations, gestures) | Pas de lib externe (zéro framer-motion, zéro react-spring) — CSS transitions uniquement |
| Cycle de recette long | Onde par onde + preview Vercel dev avant merge prod |

---

## 6. Prochaines étapes

1. **Tu lances Claude Design** avec le prompt section 3 ci-dessus
2. **Tu reviens avec le HTML** (ou l'image générée) → on valide le design ensemble
3. **Si OK** → je code Onde 1 (drawer + header), tu testes sur ton iPhone, on merge prod
4. **Sinon** → on itère sur la mockup avant de coder

Pas de code écrit tant que la mockup n'est pas validée.
