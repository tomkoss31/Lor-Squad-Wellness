# Prompt correctif — Refonte couleurs pages publiques V2

> **Date** : 2026-05-17
> **Branche source** : `dev/thomas-test`
> **Branche cible** : `feat/public-pages-v2-dark`
> **Effort estimé** : 3-4 h-agent
> **Référence visuelle validée Thomas (17/05)** :
> - `docs/mockups/temoignage-client-v2.html` (commit `e971ae8`)
> - `docs/mockups/bilan-online-v2.html` (commit `8520a2c`)

---

## 🎯 Mission

**Aligner TOUTES les pages publiques** sur le nouveau style V2 (dark premium + Sora + gradients teal/violet/coral) cohérent avec le Co-pilote V5 dark et le logo La Base 360.

**NE PAS** toucher à l'app coach interne (Co-pilote V5, FLEX, Clients, Agenda, Messagerie, etc.) — elle garde son toggle dark/light tel quel.

**Pages publiques concernées** :
1. `BilanOnlineWelcomePage` (actuellement cream + Syne + gold après commit `90a0f4c`)
2. `BilanOnlinePage` (form 5 étapes, idem cream)
3. `BilanOnlineThankYouPage` (idem cream)
4. `BusinessPage` (déjà partiellement dark depuis commit `126a69e`, vérifier alignement V2)
5. **NEW** : `TestimonialFormPage` (chantier #11, à créer en V2 directement)
6. **Future** : Newsletter publique (chantier #8, à préparer en V2 par défaut)

---

## 📋 Décisions visuelles actées Thomas (17/05)

| # | Décision |
|---|---|
| D1 | Style définitif = **dark premium** par défaut sur toutes pages publiques |
| D2 | Toggle dark/light **disponible côté utilisateur** via bouton rond top-right (les utilisateurs choisissent leur confort) |
| D3 | Tokens partagés extraits dans `src/styles/public-tokens.ts` réutilisés par tous les composants publics |
| D4 | Fonts : **Sora** (display/titres) + **Inter** (body) — déjà loadées dans BusinessPage, généraliser |
| D5 | Gradients identité brand : **teal → violet → coral** sur headlines italiques + CTA teal → violet |
| D6 | Logo : carré gradient teal→bleu La Base 360 en eyebrow uppercase avec dot teal glow + filets latéraux |

---

## 🪜 Étapes franches (5 étapes, ~3-4 h-agent)

### Étape 1 — Extraction des tokens partagés (45 min)

Créer `src/styles/public-tokens.ts` avec tokens TypeScript + équivalents CSS variables :

```ts
export const PUBLIC_TOKENS = {
  ink: '#0B0D11', ink2: '#131820',
  cream: '#FBF7F0', cream2: '#F2EBDF',
  textOnDark: '#FBF7F0',
  textOnDarkMuted: 'rgba(251,247,240,0.58)',
  textOnDarkHint: 'rgba(251,247,240,0.32)',
  hairOnDark: 'rgba(251,247,240,0.10)',
  hairStrongOnDark: 'rgba(251,247,240,0.18)',
  textOnLight: '#0B0D11',
  textOnLightMuted: 'rgba(11,13,17,0.62)',
  textOnLightHint: 'rgba(11,13,17,0.38)',
  hairOnLight: 'rgba(11,13,17,0.10)',
  hairStrongOnLight: 'rgba(11,13,17,0.18)',
  teal: '#2DD4BF', tealDark: '#0F766E',
  violet: '#A78BFA', violetDark: '#7C3AED',
  coral: '#FB7185', gold: '#C9A84C',
  goldSoft: '#E5C97D', emerald: '#34D399',
  gradHeadline: 'linear-gradient(135deg, #2DD4BF 0%, #A78BFA 50%, #FB7185 100%)',
  gradCta: 'linear-gradient(135deg, #2DD4BF 0%, #7C3AED 100%)',
  gradCtaHover: 'linear-gradient(135deg, #34D399 0%, #A78BFA 100%)',
  gradProgress: 'linear-gradient(90deg, #2DD4BF 0%, #A78BFA 100%)',
} as const;

export const PUBLIC_FONTS = {
  display: '"Sora", -apple-system, BlinkMacSystemFont, sans-serif',
  body: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
  mono: '"Sora", monospace',
} as const;

export const publicGradText = {
  background: PUBLIC_TOKENS.gradHeadline,
  WebkitBackgroundClip: 'text',
  backgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  fontStyle: 'italic' as const,
  fontWeight: 500,
};
```

Créer `src/styles/public-shell.css` avec les CSS variables + `:root[data-theme="light"]` overrides (cf. mockup V2 pour le détail).

---

### Étape 2 — Refactor `BilanOnlineShell` en `PublicShell` (45 min)

Le composant actuel `src/components/bilan-online/BilanOnlineShell.tsx` est cream/Syne. Le **généraliser** en `src/components/public/PublicShell.tsx` qui :

1. Charge les fonts Sora + Inter (Google Fonts dans `index.html`)
2. Applique les CSS variables + import `public-shell.css`
3. Affiche le **bouton toggle dark/light** fixed top-right (sauvegarde préférence `localStorage` clé `ls-public-theme`)
4. Wrap les enfants dans une page avec `bg-mesh` (radials teal/violet/coral G3)
5. Footer microcopy "La Base 360 · Since 2022"

Props :
```tsx
<PublicShell
  defaultTheme="dark"          // 'dark' | 'light' (default 'dark')
  showThemeToggle={true}        // (default true)
  bgVariant="mesh"              // 'mesh' | 'plain'
>
  {children}
</PublicShell>
```

Rétrocompat : `export { PublicShell as BilanOnlineShell } from '../public/PublicShell'` dans l'ancien fichier.

---

### Étape 3 — Migration des 3 pages bilan online (1.5 h)

Reprendre les 3 fichiers actuels et **remplacer les tokens cream/Syne/gold par les tokens V2**.

**Référence pixel-perfect** : `docs/mockups/bilan-online-v2.html` (commit `8520a2c`). Copier les styles + adapter pour React.

#### `BilanOnlineWelcomePage.tsx`
- Eyebrow uppercase "La Base 360 · Bilan" avec dot teal glow + filets latéraux
- Hero emoji 🥰 bounce + h1 Sora 600 clamp(32-44px) avec mot **"heureux"** en `<span style={publicGradText}>heureux</span>`
- Coach card glassmorphism pill (avatar gradient teal→violet "TK" + label/nom Sora)
- Pitch card glassmorphism avec 3 bullets ✓ gradient
- CTA `background: PUBLIC_TOKENS.gradCta`
- Lien "Continuer en bilan libre" si pas slug

#### `BilanOnlinePage.tsx` (form 5 étapes)
- Header sticky glassmorphism + progress bar gradient teal→violet (4px height)
- Step hero : emoji 42px drop-shadow teal, h1 Sora 28px avec mot grad italique
- Choice cards multi-select : glassmorphism dark + selected → bg teal 12% + border teal + shadow teal 20%
- Radio cards single-select : glassmorphism dark + selected → bg violet 12% + border violet
- Sliders : value 40px Sora avec `style={publicGradText}` + thumb cream/teal-border + drop-shadow
- Sub-fields conditionnels : border-left teal + bg teal 6% + fadeIn
- Bottom nav fixed glassmorphism + CTA gradient teal→violet

#### `BilanOnlineThankYouPage.tsx`
- Eyebrow + emoji + check circle 96px gradient teal→violet popIn animé
- h1 "Merci {firstName} 🙏" avec `<strong style={publicGradText}>{firstName}</strong>`
- 3 social buttons glassmorphism (Insta / WhatsApp / Ressources)
- Microfooter Sora mono "La Base 360 · Since 2022"

**Tests régression** :
- Parcours complet bilan online (welcome → form 5 étapes → thank you) fonctionne
- Auto-save localStorage marche (clé `ls-bilan-online-<slug>`)
- Validation form par étape marche
- Coach slug routing intact
- Edge function `submit-online-bilan` toujours appelée correctement
- Mobile-first touch ≥ 44px, font ≥ 16px

---

### Étape 4 — Vérification + ajustements `BusinessPage` (30 min)

`BusinessPage.tsx` (commit `126a69e`) utilise déjà des tokens `--biz-*` dark avec emerald/cyan/violet. Vérifier que :
- Les tokens correspondent à V2 (teal/violet/coral, pas emerald/cyan/violet exact)
- Si écart : migrer vers `PUBLIC_TOKENS`
- Sinon : garder tel quel et juste consolider

**Probable** : la palette `--biz-*` (créée 17/05 matin) est légèrement différente du V2 témoignage/bilan. **Choix officiel** : la V2 témoignage/bilan = référence brand (validation Thomas 17/05 soir). Migrer BusinessPage si écart.

**Tests régression** : page /business + popup lead capture + simulateur intacts.

---

### Étape 5 — Prep chantier #11 témoignage + commit (30 min)

Dans le code prévu pour le chantier #11, remplacer toutes les références aux tokens cream/Syne/gold par les nouveaux tokens V2 :
- `TestimonialFormPage` utilise `<PublicShell defaultTheme="dark" />`
- Imports : `import { PUBLIC_TOKENS, publicGradText } from '../../styles/public-tokens'`
- Style : reprendre la structure du mockup `temoignage-client-v2.html`

Commit final :
- Migration `app_announcements` pour annoncer aux distri : "Refonte design pages publiques — 17/05"
- Mise à jour `CLAUDE.md` section "Theme system" pour documenter `public-tokens` (séparé du theme app interne)

---

## 🚨 Pièges à éviter

1. **NE PAS toucher** au theme system interne `src/styles/globals.css` (`var(--ls-*)` gold/teal Premium pour Co-pilote/Clients/etc.). Les tokens publics V2 sont **complètement séparés**.
2. **NE PAS forcer** le dark si l'utilisateur a sélectionné light : respecter toggle + localStorage.
3. **Tester sur Vercel preview** AVANT merge — un design dark peut interagir bizarrement avec navigateurs forçant `prefers-color-scheme: dark` (cf. bug V1 cream).
4. **A11y contrast** : vérifier contrast ratio AAA :
   - Cream 92% sur ink → ~14.5:1 ✅
   - Charcoal 92% sur cream → ~16.2:1 ✅
5. **Reduced motion** : `@media (prefers-reduced-motion: reduce)` désactive bounce emoji + popIn + slideIn.

---

## ✅ Definition of Done

- [ ] `src/styles/public-tokens.ts` + `public-shell.css` créés
- [ ] `<PublicShell>` créé, `<BilanOnlineShell>` aliasé en rétrocompat
- [ ] BilanOnlineWelcomePage migrée V2 (test : preview Vercel ≈ identique au mockup)
- [ ] BilanOnlinePage migrée V2 (test : form complet 5 étapes OK)
- [ ] BilanOnlineThankYouPage migrée V2 (test : check animé)
- [ ] BusinessPage : tokens alignés `PUBLIC_TOKENS` (ou confirmation pas d'écart)
- [ ] Toggle dark/light fonctionne sur les 4 pages (preview Vercel)
- [ ] Préférence sauvegardée localStorage (`ls-public-theme=dark|light`)
- [ ] Build OK (`npm run build`)
- [ ] Tests régression manuels Thomas sur Vercel preview
- [ ] Annonce `app_announcements` créée
- [ ] CLAUDE.md mis à jour (theme system : interne vs public)
- [ ] PR créée + recette + merge `dev/thomas-test`

---

## 📦 Liste fichiers à créer / modifier

**Créer** :
- `src/styles/public-tokens.ts`
- `src/styles/public-shell.css`
- `src/components/public/PublicShell.tsx`
- `src/components/public/ThemeToggle.tsx`

**Modifier** :
- `src/components/bilan-online/BilanOnlineShell.tsx` → re-export depuis `public/PublicShell.tsx`
- `src/pages/public/online-bilan/BilanOnlineWelcomePage.tsx`
- `src/pages/public/online-bilan/BilanOnlinePage.tsx`
- `src/pages/public/online-bilan/BilanOnlineThankYouPage.tsx`
- `src/pages/public/BusinessPage.tsx` (vérif/ajustement)
- `index.html` (vérifier preload Sora + Inter)
- `CLAUDE.md` (doc theme system)

**Préparer** (pour chantier #11) :
- Mettre à jour `docs/PROMPT_CHANTIER_11_TEMOIGNAGES.md` : remplacer toutes les références cream/Syne/gold par les nouveaux tokens V2 + `<PublicShell>`

---

## 🤝 Workflow Thomas

1. Sur PC, dans la session Claude Code locale :
   ```
   Lis docs/PROMPT_REFONTE_PAGES_PUBLIQUES_V2.md et exécute la
   migration sur feat/public-pages-v2-dark depuis dev/thomas-test.
   ```
2. Claude Code crée la branche + suit les 5 étapes franches
3. Thomas recette sur Vercel preview (URL preview de la branche)
4. Merge → prod
5. **Ensuite** : lancer le chantier #11 (témoignages) qui utilise déjà les tokens V2

---

**Fin du prompt.** À coller dans la session Claude Code locale.
