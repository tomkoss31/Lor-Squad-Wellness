# Audit mobile Academy + Formation — 2026-05-28

## Synthèse
- **7 bugs critiques** (cassent la lecture)
- **12 bugs moyens** (UX dégradée)
- **6 polish** (optimisations)

**Verdict** : Pages quasi-non-responsive. Aucune media query sur 13/19 pages Formation. Root cause : padding/gap hardcodés, pas de max-width centralisé, pas de flex-wrap.

---

## Bugs détectés par page

### AcademyOverviewPage (src/pages/AcademyOverviewPage.tsx)
Media queries : 0

🔴 CRITIQUE (ligne 80) : Hero padding: "32px 24px" déborde iPhone 375
- Fix : padding: clamp(12px, 3vw, 24px)

🔴 CRITIQUE (ligne 107-134) : SVG 92px + minWidth: 220 déborde 393px
- Fix : flex-direction: column si <430px ou minWidth: 140px

🟡 MOYEN (ligne 167) : gap: 8 buttons collent mal iPhone
- Fix : gap: clamp(8px, 2vw, 12px)

🟡 MOYEN (ligne 351) : Modal top: 24 chevauchement iOS notch
- Fix : top: max(24px, env(safe-area-inset-top))

🟢 POLISH (ligne 340-345) : Pulse animation peut freezer mobile
- Fix : @media (prefers-reduced-motion: reduce)

### FormationPage (src/pages/FormationPage.tsx)
Media queries : 0

🔴 CRITIQUE (ligne 125) : grid-template-columns minmax(260px, 1fr) déborde 375px
- Fix : minmax(240px, 1fr) ou media query fallback 1fr

🟡 MOYEN (ligne 151) : padding: "20px 22px" compresse text
- Fix : padding: "16px 14px" + media query

🟡 MOYEN (ligne 255) : minmax(280px, 1fr) déborde 375px
- Fix : minmax(160px, 1fr) pour mobile

🟡 MOYEN (ligne 225) : letterSpacing crop 393px
- Fix : letterSpacing: clamp(-0.018em, -0.5vw, -0.012em)

### FormationModuleDetailPage (src/pages/FormationModuleDetailPage.tsx)
Media queries : 0

🔴 CRITIQUE : Conteneur full bleed sans max-width wrapper
- Fix : Ajouter wrapper maxWidth 880 + margin auto + padding 12px

🟡 MOYEN : QCM options inline sans flex-wrap
- Fix : flex-wrap: wrap sur QCM container

### LessonCard (src/components/formation/LessonCard.tsx)
🔴 CRITIQUE (ligne 127) : Video iframe aspectRatio 16/9 déborde 375px
- Fix : padding: 0 -12px ou 100vw centré

🟡 MOYEN (ligne 65) : gap: 10 icon wrap tardif
- Fix : gap: 6 ou flex-direction: column <430px

🟢 POLISH (ligne 69) : paddingBottom: 10 tight
- Fix : paddingBottom: clamp(8px, 2vw, 10px)

### QuizRunner (src/components/formation/QuizRunner.tsx)
🔴 CRITIQUE : Questions inputs débordent sans maxWidth
- Fix : maxWidth: 100%; box-sizing: border-box

🟡 MOYEN (ligne 192) : padding: 32 fixe
- Fix : padding: clamp(16px, 4vw, 32px)

🟢 POLISH : confetti count: 80 freeze mobile
- Fix : count adapté viewport (30 <430px, 80 >=768px)

### MarkdownRenderer (src/components/formation/MarkdownRenderer.tsx)
🔴 CRITIQUE : Tables débordent sans wrapper scrollable
- Fix : wrapper div style={{ overflowX: 'auto' }}

🟡 MOYEN : Code inline sans word-break
- Fix : word-break: break-word; overflow-wrap: break-word

### ModuleHeaderHero (src/components/formation/ModuleHeaderHero.tsx)
🟡 MOYEN (ligne 48) : Emoji watermark fontSize: 110 croppe 375px
- Fix : @media <430px { fontSize: 80; right: -20; }

🟡 MOYEN (ligne 83) : H1 fontSize: 26 sans clamp
- Fix : fontSize: clamp(20px, 5vw, 26px)

🟢 POLISH (ligne 139) : Callout padding: "12px 14px" tight
- Fix : padding: clamp(10px, 2vw, 14px)

### ParcoursLevelCard (src/components/formation/ParcoursLevelCard.tsx)
🟡 MOYEN (ligne 86) : minHeight: 220 trop haut 375px
- Fix : minHeight: clamp(200px, 50vw, 220px)

🟡 MOYEN (ligne 107) : Number watermark fontSize: 72 cropped
- Fix : @media <430px { fontSize: 54; right: -8; }

🟢 POLISH (ligne 139) : Title fontSize: 19 sans clamp
- Fix : fontSize: clamp(16px, 4vw, 19px)

### ToolkitItemPopup (src/components/formation/ToolkitItemPopup.tsx)
🟡 MOYEN (ligne 180) : Footer padding: "24px 32px" fixe
- Fix : Appliquer clamp media query

🟡 MOYEN (ligne 253) : paddingRight: 32 grand narrow
- Fix : paddingRight: clamp(12px, 3vw, 32px)

🟢 POLISH : Button "Copié" wrap narrow
- Fix : white-space: nowrap; overflow: hidden; text-overflow: ellipsis

### FormationRoadmapCard (src/components/formation/FormationRoadmapCard.tsx)
🟡 MOYEN (ligne 43) : padding: "24px 28px" compress 375px
- Fix : padding: clamp(16px, 4vw, 28px)

🟡 MOYEN (ligne 68) : Emoji fontSize: 56 déborde
- Fix : fontSize: clamp(40px, 12vw, 56px)

### Autres pages Formation
Media queries : 0-1

🔴 CRITIQUE : 13 pages sans max-width centralisé
- Fix : PageWrapper composant réutilisable

---

## Patterns transverses

1. Pas media query 13/19 pages → Template boilerplate @media (max-width: 430px)
2. padding/gap hardcodés → clamp() systématiquement
3. minWidth flex items empêche wrap → Réduire ou fallback 1fr
4. position fixed sans safe-area → env(safe-area-inset-*) iOS
5. Typo sans clamp → fontSize: clamp(Xpx, Yvw, Zpx)
6. Iframes/videos non-responsive → Wrapper ou aspect-ratio fix
7. Tables débordent → Wrapper overflow-x: auto

---

## Plan de fix

### Lot 1 (Jour 1 : 2h) — Critiques
AcademyOverviewPage, FormationPage, FormationModuleDetailPage, LessonCard, QuizRunner, MarkdownRenderer

### Lot 2 (Jour 2 : 4h) — Moyens
Toutes pages Formation + composants clés. Template media query batch.

### Lot 3 (Jour 3 : 3h) — Polish
Animations, perf, QA tests responsive.

**Total 9h**

Validation : iPhone 393px DevTools → pas de horizontal scroll/text clip = OK

