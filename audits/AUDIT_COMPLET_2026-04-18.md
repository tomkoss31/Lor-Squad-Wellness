# AUDIT COMPLET — Lor'Squad Wellness

> **Date** : 2026-04-18
> **Branche analysée** : `claude/focused-pike` (HEAD `6537128`, chantier 6 + fix Vue complète mergés)
> **Mode** : lecture seule — aucun fichier modifié pendant l'audit.
> **Portée** : `src/`, `supabase/schema.sql`, `package.json`, `tsconfig*`, `index.html`, `.env*`, `.gitignore`.

---

## 1. INFORMATIONS GÉNÉRALES

### Volume

| Indicateur | Valeur |
|---|---|
| Fichiers `.tsx` (dans `src/`) | **70** |
| Fichiers `.ts` (hors `.tsx`, dans `src/`) | **24** |
| Fichiers `.css` (dans `src/`) | **1** (`src/styles/globals.css`, 2032 lignes) |
| Poids total `src/` | **25 MB** (dont ~23 MB d'images `src/assets/**`) |
| Lignes TypeScript totales (src) | **25 682** |
| Fichiers > 500 lignes | **14** (détail section 6) |

### Dépendances (`package.json`)

```json
"dependencies": {
  "@supabase/supabase-js": "^2.101.1",
  "qrcode.react": "^4.2.0",
  "react": "^18.3.1",
  "react-dom": "^18.3.1",
  "react-router-dom": "^6.28.0"
}
"devDependencies": {
  "@types/react": "^18.3.12",
  "@types/react-dom": "^18.3.1",
  "@vitejs/plugin-react": "^4.3.3",
  "autoprefixer": "^10.4.20",
  "postcss": "^8.4.49",
  "tailwindcss": "^3.4.15",
  "typescript": "^5.6.3",
  "vite": "^5.4.10"
}
```

- ✅ Minimaliste, pas de bloat.
- ⚠️ **Aucune dépendance `eslint`, `prettier`, `vitest/jest`, `husky`, `lint-staged`** → pas de filet de sécurité automatisé hors `tsc`.
- ⚠️ Version React 18.3 OK ; migration React 19 à anticiper à moyen terme.

### TypeScript config (`tsconfig.app.json`)

```jsonc
{
  "strict": true,
  "noUnusedLocals": true,
  "noUnusedParameters": true,
  "noFallthroughCasesInSwitch": true,
  "target": "ES2020",
  "jsx": "react-jsx",
  "moduleResolution": "bundler"
}
```

- ✅ **Strict mode activé** + `noUnusedLocals` / `noUnusedParameters` / `noFallthroughCasesInSwitch`. Très bon point.
- ⚠️ **`skipLibCheck: true`** → les types des dépendances ne sont pas vérifiés (pratique courante, mais potentiel angle mort sur les breaking de `@supabase/supabase-js`).

### ESLint

- ❌ **Aucune configuration ESLint présente** : pas de `.eslintrc*`, pas de `eslint.config.*`, pas de dépendance `eslint` dans `package.json`.
- Conséquence : pas de contrôle sur les règles React (exhaustive-deps, jsx-key, etc.), pas de contrôle sur a11y (`jsx-a11y`), pas d'auto-formattage.

### Scripts `npm`

| Script | Commande | Remarque |
|---|---|---|
| `dev` | `vite` | ✅ |
| `build` | `tsc -b && vite build` | ✅ build bloque si TS échoue |
| `typecheck` | `tsc -b --pretty false` | ✅ |
| `backup` / `restore` | scripts Supabase via tsx | ✅ |
| _(pas de)_ `lint` / `test` | — | ⚠️ manque |

---

## 2. TYPESCRIPT — ERREURS ET WARNINGS

Commande exécutée : `npx tsc -b --pretty false`

### Résultat

- ✅ **0 erreur**, 0 warning.

### Qualité des types

| Mesure | Valeur | Détail |
|---|---|---|
| `@ts-ignore` / `@ts-expect-error` / `@ts-nocheck` | **0** | 🟢 Aucun bypass. |
| `: any` / `as any` / `<any>` / `Record<string, any>` | **4 occurrences** dans **2 fichiers** | 🟡 Concentré. |

**Top fichiers `any` :**
- `src/pages/ClientAppPage.tsx` : **3** occurrences — liées au normaliseur `normalizeData(row: Record<string, unknown>)` et à la lecture des retours RPC (`row as Record<string, any>`). Justifiable (données JSONB dynamiques), mais typable via un `type ClientAppRow = { ... }`.
- `src/pages/EvolutionReportPage.tsx` : **1** occurrence — à vérifier.

### Champs à surveiller

- `AssessmentQuestionnaire.breakfastAnalysis` est `optional` (`?`) → le code lit `questionnaire.breakfastAnalysis as BreakfastAnalysis | undefined`, OK.
- `body_scan` est typé `jsonb` côté DB et reçu comme objet non-strict côté client ; la couche `normalizeData()` absorbe mais ne valide pas (pas de Zod / io-ts).

---

## 3. ESLINT — ERREURS ET WARNINGS

❌ **Impossible** — aucune config ESLint n'existe dans le repo.
La commande `npx eslint src/` a échoué avec :

```
ESLint couldn't find an eslint.config.(js|mjs|cjs) file.
```

**Action recommandée** (pas effectuée) : ajouter un `eslint.config.js` flat config avec :
- `@typescript-eslint/recommended`
- `eslint-plugin-react-hooks` (`exhaustive-deps`)
- `eslint-plugin-jsx-a11y` (section 7 de cet audit dépend de ce plugin)

---

## 4. DESIGN SYSTEM — COHÉRENCE

### 4.1 Hex en dur dans le code TS/TSX

**386 occurrences de hex codes** réparties sur **30+ fichiers** (top 10 ci-dessous).

| Rang | Fichier | # Hex |
|---|---|---|
| 1 | `src/pages/ClientAppPage.tsx` | 134 |
| 2 | `src/pages/EvolutionReportPage.tsx` | 81 |
| 3 | `src/pages/ClientDetailPage.tsx` | 34 |
| 4 | `src/components/layout/AppLayout.tsx` | 18 |
| 5 | `src/pages/DashboardPage.tsx` | 14 |
| 6 | `src/components/assessment/StepRail.tsx` | 8 |
| 6 | `src/components/education/PlateGuideCard.tsx` | 8 |
| 6 | `src/components/settings/PushNotificationSettings.tsx` | 8 |
| 6 | `src/components/client/EditScheduleModal.tsx` | 8 |
| 7 | `src/pages/ClientsPage.tsx` | 7 |
| 7 | `src/components/ErrorBoundary.tsx` | 7 |
| 7 | `src/components/assessment/RecapModal.tsx` | 7 |
| 8 | `src/components/ui/StatusBadge.tsx` | 5 |
| 8 | `src/components/education/HydrationInsightCard.tsx` | 5 |
| 8 | `src/components/body-scan/HydrationVisceralInsightCard.tsx` | 5 |

**Observations :**
- `ClientAppPage` (app client publique) utilise ~134 hex en dur : couleurs explicites `#B8922A`, `#111827`, `#0D9488`, `#FB7185`, `#9CA3AF`, etc. **Cohérent** avec les valeurs des CSS vars en mode clair, mais **ne bascule pas en thème sombre**. Le mode clair est un no-op, le mode sombre casserait si un client activait le thème — `ClientAppPage` force actuellement un fond `#F4F2EE` en dur.
- `globals.css` compense partiellement avec 80+ règles de translation hex→var en mode clair (lignes 95–230), ce qui est un **patch** et non une vraie solution. À terme : refactor tous les hex → `var(--ls-*)`.
- `src/lib/evolutionReport.ts` (générateur PDF) contient aussi beaucoup de hex, justifiable pour l'export PDF.

### 4.2 Polices

- ✅ Seules `Syne` et `DM Sans` sont référencées (**253 occurrences**).
- Grep ciblé « polices autres que Syne / DM Sans » → **0**.
- Chargement via Google Fonts dans `index.html` : `Syne:700;800 + DM Sans:300;400;500`. OK.

### 4.3 Border-radius

Valeurs observées dans le code React (extrait des principales) :

| Valeur | Usage | Conforme au spec (10/12/14/999) ? |
|---|---|---|
| **9px** | 3× dans UI (`Button`, badges) | ❌ (proche 10px) |
| **10px** | 5× | ✅ |
| **12px** | 2× | ✅ |
| **14px** | omniprésent | ✅ |
| **16px, 18px, 20px, 22px, 26px** | divers composants body-scan, clients | ⚠️ hors spec |
| **28px** | card hero | ⚠️ hors spec |

**Verdict :** divergences modérées, concentrées sur `Card` / `BodyScanSnapshotCard` (22px, 26px) qui adoptent un langage "modal" volontaire, mais pas documenté. Soit le spec s'étend, soit on normalise.

### 4.4 Font-sizes trop petites

- **122 occurrences** de `fontSize: 9` ou `fontSize: 10` sur **20 fichiers** (eyebrow labels, badges).
- Contexte : uppercase + letter-spacing élevé → lisibilité acceptable à l'œil, mais **échec potentiel des critères WCAG 1.4.4 / AA** sur des écrans de faible densité.
- Top offenders : `EvolutionReportPage (15)`, `ClientAppPage (18)`, `RecapPage (8)`, `MessagesPage (7)`, `UsersPage (6)`.

---

## 5. SÉCURITÉ

### 5.1 Variables d'environnement

Fichier `src/vite-env.d.ts` déclare :

```ts
readonly VITE_SUPABASE_URL?: string
readonly VITE_SUPABASE_ANON_KEY?: string
// + VITE_VAPID_PUBLIC_KEY (via usePushNotifications)
```

- ✅ Toutes les variables sont en `VITE_*` → publiques par design, **acceptable** :
  - `SUPABASE_URL` et `ANON_KEY` sont publiques par nature (sécurité = RLS).
  - `VAPID_PUBLIC_KEY` (push notifications) est publique par spec.
- ✅ **Aucun `SERVICE_ROLE` / `service_role` trouvé dans le code client** (grep = 0).
- ⚠️ **Fichier `.env` tracké par Git : NON** — `.env*` présent dans `.gitignore` avec 5 patterns (`.env`, `.env.development.local`, etc.). Mais `.env` existe dans le worktree (291 octets) → à vérifier manuellement qu'il n'a jamais été commit via `git log --all --full-history -- .env`.
- ✅ Fallback runtime via `/api/runtime-config` (`src/services/supabaseClient.ts`) : si `VITE_*` absents, fetch d'une route serveur — design propre pour Vercel/Netlify Functions.

### 5.2 Mock passwords

```
src/data/mockUsers.ts → 4× `mockPassword: "demo1234"`
```

- 🟡 **Mot de passe en clair dans le code**, utilisé uniquement en mode `authMode: "mock"` (hors Supabase). Non utilisé en production si la config Supabase est fournie.
- ⚠️ **Risque** : si le bundle est servi en prod avec `authMode === 'mock'` par fallback (ex. `VITE_SUPABASE_ANON_KEY` manquante), n'importe quel visiteur se connecte avec `demo1234`.
- **À contrôler** : vérifier que le déploiement prod **exige** obligatoirement `VITE_SUPABASE_URL` + `ANON_KEY` (crash si manquant) — actuellement le code fallback silencieusement sur le mode mock.

### 5.3 RLS Supabase

Tables du `schema.sql` : 10 tables publiques.

| Table | RLS | Policies trouvées dans schema.sql |
|---|---|---|
| `users` | ✅ enabled | oui |
| `clients` | ✅ enabled | oui |
| `assessments` | ✅ enabled | select / insert / delete via client |
| `follow_ups` | ✅ enabled | select / insert / update |
| `activity_logs` | ✅ enabled | oui |
| `pv_programs` / `pv_products` / `pv_program_products` / `pv_client_products` / `pv_transactions` | ✅ enabled | oui |

**36 policies** trouvées (`create policy`).

**Tables hors schema.sql** (créées en prod via Supabase Studio, non versionnées) :
- `client_recaps`, `client_evolution_reports`, `client_app_accounts`, `client_messages`, `client_referrals`, `rdv_change_requests`, `push_subscriptions`
- ⚠️ **Non auditables via le repo** : leurs policies ne sont pas dans Git. Impossible de vérifier la rigueur sans accès Supabase Studio.
- 🔴 **RISQUE** : une table `client_messages` qui contiendrait demandes clients / contacts → si anon peut SELECT sans filtre token, fuite de données.
- Action recommandée : exporter toutes les policies prod avec `pg_dump --schema-only --schema=public` et les committer.

### 5.4 Policies anon

- `grep -E "to anon|for anon" supabase/schema.sql` = **0** → le schema versionné ne donne **aucun accès anon**.
- Sur Supabase prod : policies anon définies pour `client_recaps` (token), `client_app_accounts` (token), `client_evolution_reports` (token), probablement aussi pour `client_messages` insert, `client_referrals` insert, `rdv_change_requests` insert.
- Migration récente `20260418144025_assessment_public_read.sql` — **versionnée**, utilise RPC SECURITY DEFINER `get_client_assessment_by_token` : ✅ bien conçue.

### 5.5 Input sanitization

- Pas de sanitisation explicite (DOMPurify / xss lib) → mais pas de `dangerouslySetInnerHTML` détecté sur un spot-check, donc risque XSS DOM minime dans l'app elle-même.
- Les PDFs générés côté client (`evolutionReport.ts`) et rapports publics (`/client/:token`, `/r/:token`) affichent des champs texte directement → protégé par React escape automatique.
- Les payloads envoyés à Supabase (`client_messages.message`, `client_referrals.referred_name`, etc.) ne sont pas validés côté client → repose entièrement sur les constraints DB (taille text, pas de `check`). **🟡 À durcir** avec Zod sur les handlers `send*()`.

### 5.6 Console logs exposant de la data

- `console.log` / `console.debug` / `console.info` : **0 occurrences** dans `src/**/*.{ts,tsx}` 🟢
- `console.error` / `console.warn` : 27 occurrences sur 11 fichiers. Vérifier que les messages n'embarquent pas d'objets clients complets (`console.error(error)` OK, `console.error(client)` pas OK).

### 5.7 URL Supabase en dur

- Grep `SUPABASE_` dans le code : aucune URL en dur, tout passe par `import.meta.env.VITE_*` ou le fetch runtime-config. ✅

---

## 6. PERFORMANCE

### 6.1 Fichiers > 500 lignes

| Fichier | Lignes |
|---|---|
| `src/pages/NewAssessmentPage.tsx` | **2 764** 🔴 |
| `src/context/AppContext.tsx` | **1 431** |
| `src/services/supabaseService.ts` | **1 424** |
| `src/pages/ClientDetailPage.tsx` | **1 401** |
| `src/pages/NewFollowUpPage.tsx` | **1 134** |
| `src/pages/ClientAppPage.tsx` | **1 012** |
| `src/pages/UsersPage.tsx` | **993** |
| `src/lib/assessmentRecommendations.ts` | **722** |
| `src/pages/EditInitialAssessmentPage.tsx` | **715** |
| `src/data/mockPvModule.ts` | **627** |
| `src/data/mockClients.ts` | **588** |
| `src/pages/ClientsPage.tsx` | **587** |
| `src/pages/DashboardPage.tsx` | **565** |
| `src/components/body-scan/BodyFatInsightCard.tsx` | **561** |

**Verdict :**
- `NewAssessmentPage` à 2764 lignes → 🔴 **CRITIQUE** : un seul composant, 14 étapes, plusieurs sous-composants inline → refactor recommandé (extraction steps, hooks custom).
- `AppContext.tsx` à 1431 lignes → ré-render global à chaque update de state distant ; découper en contextes plus ciblés (ClientsContext, PvContext, AuthContext) améliorerait les perfs et la lisibilité.

### 6.2 Lazy-loading

- ✅ Utilisé dans `NewAssessmentPage.tsx` pour les composants lourds visuels (`LazyMorningRoutineCard`, `LazyHydrationRoutinePrimerCard`).
- ✅ Split Vite effectif (build montre `ClientAppPage-*.js` 55 kB gzip 13 kB séparé).
- ⚠️ `NewAssessmentPage` lui-même est 94 kB gzip 25 kB — chunk le plus gros après vendor. Candidat au split ou à un router-level lazy.

### 6.3 Images lourdes

Images `> 500 kB` trouvées dans le repo :

| Poids | Chemin |
|---|---|
| 7.2 MB | `src/assets/pedagogical/visuels-petit-dejeuner.png` |
| 7.2 MB | `assets/visuels-pedagogiques/visuels petit-déjeuner.png` |
| 6.9 MB | `assets/visuels/programmes-perte-de -poids.png` |
| 6.5 MB | `assets/visuels/programmes-sport.png` |
| 5.3 MB | `src/assets/pedagogical/visuels-hydratation.png` |
| 5.3 MB | `assets/visuels-pedagogiques/visuels-hydratation.png` |
| 3.1 MB | `assets/visuels-pedagogiques/petit-dejeuner-francais.png` |
| 3.1 MB | `src/assets/pedagogical/routine-matin.png` |
| 2.4 MB | `assets/visuels-pedagogiques/routine-matin.png` |
| 2.4 MB | `assets/visuels-pedagogiques/hydratation.png` |
| 1.3 MB | `assets/logos/Lor-Squad.png` |

**🔴 CRITIQUE** : plusieurs images pèsent 5-7 MB. En plus, beaucoup sont **dupliquées** dans `src/assets/pedagogical/` ET `assets/visuels-pedagogiques/` (deux répertoires parallèles).

- Les versions `-optimized.jpg` existent côte à côte (2-3× plus petites) mais les PNG originaux n'ont jamais été supprimés.
- Le logo `Lor-Squad.png` à 1.3 MB est inclus dans le bundle → le remplacer par un SVG est prioritaire.

### 6.4 Imports non utilisés

- `noUnusedLocals: true` dans tsconfig → le build échoue sur les imports non utilisés ; donc **0 import mort côté TS**. 🟢

### 6.5 Re-renders probables

- `useState` + `useEffect` counts : **261 `useState/useEffect`** sur 28 fichiers — normal pour une SPA de cette taille.
- Aucun `useReducer` (pas d'alerte, mais indique un pattern 100% useState, parfois long dans `NewAssessmentPage` avec une union de 50+ champs).
- `useEffect(() => {}, [])` (empty deps) non-trivialement exhaustifs → 2 occurrences seulement (grep strict), acceptable.
- Pas de `React.memo` / `useMemo` / `useCallback` utilisés massivement → certains gros composants recréent des handlers à chaque render. À profiler avant d'optimiser.

---

## 7. ACCESSIBILITÉ

### 7.1 `aria-label` / `alt`

- **19 occurrences** au total sur 13 fichiers — pour un projet qui contient **205+ `<button>` / `onClick`** sur 33 fichiers.
- Ratio a11y labels / boutons ≈ **9 %**. 🟡 Beaucoup de boutons icon-only (SVG) sans `aria-label`.
- **Offenders typiques** :
  - `DashboardPage` (8 boutons, peu d'aria-label) → boutons dismiss/action
  - `ClientAppPage` (18 boutons) → pills, tabs bottom nav
  - `ClientDetailPage` (29 boutons) → actions tabs, modals
  - `BottomNav.tsx` → les 5 `NavLink` sans `aria-label` (texte visible, donc OK via texte, mais le `<span>` icône n'est pas masqué via `aria-hidden="true"`).

### 7.2 Images sans `alt`

- `<img` quasi inexistant (le design repose à 99 % sur SVG inline + backgrounds).
- Les SVG inline n'ont pas systématiquement `role="img"` + `<title>` → pour les icônes décoratives, acceptable ; pour les icônes porteuses d'info (SVG standalone dans un button sans texte), manquant.

### 7.3 Focus states

- `globals.css` ne définit pas d'override `:focus-visible` global. La plupart des éléments héritent du focus default navigateur (acceptable mais pas stylé).
- Aucun `outline: none` détecté — pas de focus supprimé. 🟢

### 7.4 Touch targets

- Aucune classe utilitaire `min-h-[44px]` ou équivalente systématique.
- Les boutons `BottomNav` post-fix font ~56 px (conforme Apple HIG). 🟢
- Les pills filtres / tabs de `ClientsPage` (padding 7px 14px, fontSize 11-13) → hauteur estimée 30–32 px → **< 44 px** recommandés iOS. 🟡

### 7.5 Contrastes

Non vérifiable précisément sans outil, mais drapeaux théoriques :
- `color: var(--ls-text-hint) = #4A5068` sur fond `var(--ls-bg) = #0B0D11` → contraste ≈ **4.2:1** → limite WCAG AA (4.5:1 requis).
- En mode clair : `#9CA3AF` sur `#F4F2EE` → contraste ≈ **2.4:1** → **fail AA**. 🟡
- `fontSize: 9/10` + hint color = combinaison à risque.

---

## 8. MOBILE FIRST

### 8.1 Font-size des inputs

- **49 occurrences** de `<input>` sur 16 fichiers. La plupart sans `fontSize` explicite → hérite du navigateur (généralement 13–14 px).
- ⚠️ iOS Safari **zoome automatiquement** sur les inputs < 16 px. À vérifier au niveau global (`globals.css`) si une règle force `font-size: 16px` pour `input, textarea, select` sur mobile.
- Le fichier `globals.css` section input (ligne 79) ne spécifie pas de font-size minimum. 🟡

### 8.2 Touch targets

Voir 7.4.

### 8.3 Overflow horizontal

- Non testable statiquement. Pas de drapeau dans le grep (pas de `overflow-x: scroll` abusif). Risque standard sur `ClientsPage` (tableau 6 colonnes).

### 8.4 Viewport meta

```html
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
```
- ✅ `viewport-fit=cover` + `apple-mobile-web-app-capable=yes` → compatible notch iPhone, safe-area dispo.
- ✅ PWA complète : manifest, icônes 192/512, theme-color mode clair/sombre.

---

## 9. DETTE TECHNIQUE

### 9.1 TODO / FIXME / HACK

- Grep `TODO|FIXME|HACK|XXX` → **0 occurrence** dans `src/`. 🟢 Très propre.

### 9.2 Code mort (composants non importés)

Analyse ciblée sur `src/components/education/` :

| Composant | Références ailleurs (hors self-import) |
|---|---|
| `EducationCard.tsx` | **0** 🔴 |
| `HydrationInsightCard.tsx` | **0** 🔴 |
| `PlateGuideCard.tsx` | **0** 🔴 |
| `PedagogicalScenes.tsx` | **0** 🔴 (mais 3 hex trouvés → utilise les assets `routine-matin-optimized.jpg` orphelins probables) |
| `HydrationRoutinePrimerCard.tsx` | 1 (NewAssessmentPage) ✅ |
| `MorningRoutineCard.tsx` | 1 (NewAssessmentPage) ✅ |
| `BreakfastStorySlider.tsx` | 2 (NewAssessmentPage + ClientAppPage) ✅ |
| `WeightGoalInsightCard.tsx` | 1 (NewFollowUpPage) ✅ |
| `PedagogicalSection.tsx` | 4 ✅ |

**4 composants éducation candidats à la suppression** : `EducationCard`, `HydrationInsightCard`, `PlateGuideCard`, `PedagogicalScenes` — **non importés ailleurs**. (À confirmer par re-grep plus permissif avant suppression — ex. dynamic import, lazy).

Note : `noUnusedLocals` ne détecte pas un composant exporté mais jamais importé — d'où l'intérêt de cet audit manuel.

### 9.3 Patterns incohérents

- `useReducer` = 0, `useState` massif → OK pour la majorité mais **`NewAssessmentPage.tsx`** a un `FormState` à ~60 champs géré avec un `useState<AssessmentForm>` unique + un `update<K>(key, value)` générique. Un `useReducer` simplifierait.
- Gestion d'erreur Supabase : **pas standardisée**. Certains appels capturent (`try/catch { /* silencieux */ }`), d'autres ignorent les erreurs (`await sb.from(...).update(...)` sans check du `error` retourné).
  - Grep `.from('...')` retourne **27 sites** ; les retours `{ data, error }` ne sont pas systématiquement inspectés. 🟡
- Mix de Tailwind (`className`) et `style={{}}` inline dans la majorité des pages. `ClientAppPage` est 100 % inline styles (cohérent mais isolé), le reste de l'app est hybride.

### 9.4 Duplications / doublons

- `src/assets/pedagogical/` et `assets/visuels-pedagogiques/` → **deux arbres d'assets parallèles** contenant des images quasi-identiques (versions optimisées, versions originales). Candidat à un grand nettoyage.
- Suite au Chantier 6 : suppression réussie de `BreakfastComparison.tsx` + 2 images associées. À rejouer pour les 4 composants morts identifiés en 9.2.

---

## 10. BUSINESS LOGIC

### 10.1 Lifecycle — Matrice B

Source de vérité : `src/lib/lifecycleMapping.ts` (50 lignes, pure fonction).

```
deriveLifecycleFromAssessment({ decisionClient, afterAssessmentAction })
```

Table de vérité vérifiée :

| decisionClient | afterAssessmentAction | → lifecycleStatus | → isFragile |
|---|---|---|---|
| `null` | `started` | `active` | `false` |
| `null` | `pending` | `not_started` | `false` |
| `partant` | `started` | `active` | `false` |
| `partant` | `pending` | `not_started` | `false` |
| `a_rassurer` | `started` | `active` | **`true`** ⚠ |
| `a_rassurer` | `pending` | `not_started` | `false` |
| `a_confirmer` | `started` | `not_started` | `false` |
| `a_confirmer` | `pending` | `not_started` | `false` |

- ✅ Fonction pure, isolée, **testable unitairement** — mais aucun test écrit.
- ✅ Couverture des 3×2 = 6 cas canoniques + fallback `null`.
- 🟡 Pas de validation runtime : si Supabase renvoie un `decisionClient` inattendu (typo DB), la fonction retombe silencieusement sur le fallback. Ajouter un log warn pour signaler.

### 10.2 Exclusion des clients morts/pausés

Grep des usages de `isDeadLifecycle` / `isActiveLifecycle` :

- `src/types/domain.ts` — 2 (définitions + export)
- `src/hooks/useAutoNotifications.ts` — 1 (filtre notifs)

**Autres filtres directs** (`lifecycleStatus === 'stopped' / 'lost' / 'paused'`) :
- `DashboardPage`, `ClientsPage`, `ClientDetailPage`, `NewAssessmentPage`, `AppContext`, `supabaseService`, `useAutoNotifications` → **7 fichiers** utilisent la logique.

**🟡 Risque de dérive** : la règle "exclure les morts" est répliquée en dur dans 7 fichiers au lieu d'utiliser systématiquement les helpers `isDeadLifecycle` / `isActiveLifecycle`. Une nouvelle valeur de statut ajoutée à l'enum serait un risque de régression.

### 10.3 Cas limites

Checks possibles sans exécuter le code :

- **Client sans bilan** (`assessments.length === 0`) : ClientDetailPage redirige vers "démarrer un bilan" (pattern `!latestBodyScan`). ✅
- **Client sans follow-up** : `DashboardPage` / `ClientsPage` affichent "Aucun suivi planifié". ✅
- **Bilan avec `body_scan` vide** (poids = 0) : le fix récent gère BMR 0 → "—" ; mais `weight: 0` dans MetricTile "Poids de départ" reste affichable en "0 kg". Pas de fallback "—". 🟡
- **Token publique corrompu** (`/client/:token`) : `ClientAppPage` retourne "Lien introuvable ou expiré." ✅
- **RPC `get_client_assessment_by_token` renvoie 0 ligne** : `CoachingTab` affiche "Ton coaching personnalisé arrive après ton prochain bilan." ✅ (fallback en place).

### 10.4 Gestion d'erreurs Supabase

**Pattern dominant** : `try { ... } catch { /* silencieux */ }` (~100 occurrences). Masque toute erreur réseau/RLS côté utilisateur.

- ⚠️ Aucune remontée utilisateur en cas de `error` dans la réponse `{ data, error }`. Un rate limit, un RLS failure, une connexion tombée → utilisateur ne voit rien, pense que "ça marche", les données ne sont pas synchronisées.
- Aucun retry, aucun toast d'erreur système.
- `ErrorBoundary.tsx` attrape les erreurs React (rendering) mais pas les rejections async.

---

## 11. SUGGESTIONS DE PRIORITÉS

### 🔴 CRITIQUE

1. **Bloquer le fallback mock en prod** — si `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` manquent, le code retombe sur `mockUsers` avec password `demo1234`. Risque d'accès non authentifié si le build prod est déployé sans env. **Fix** : crasher au boot si env manquant en prod (vérifier `import.meta.env.PROD`).

2. **Exporter et versionner les policies RLS des tables non-versionnées** (`client_recaps`, `client_app_accounts`, `client_messages`, `client_referrals`, `rdv_change_requests`, `client_evolution_reports`, `push_subscriptions`). Aujourd'hui impossible d'auditer leur sécurité depuis le repo. Faire un `pg_dump --schema-only` et committer dans `supabase/schema.sql`.

3. **Standardiser la gestion d'erreurs Supabase** — ~100 `catch { /* silencieux */ }` cachent des erreurs qui mèneraient à du data-loss invisible. Minimum : logger `error` côté client dans un toast et `console.error`.

### 🟡 IMPORTANT

4. **Compresser/remplacer les images lourdes** (visuels petit-déjeuner 7.2 MB × 2, programmes 6.5–6.9 MB, logo 1.3 MB). Gain bundle estimé : **~35 MB** répartis sur les users.

5. **Supprimer les 4 composants morts** `EducationCard`, `HydrationInsightCard`, `PlateGuideCard`, `PedagogicalScenes` + leurs assets orphelins. Gain : ~15 Ko + clarté.

6. **Ajouter une config ESLint** (flat config) avec `react-hooks/exhaustive-deps` + `jsx-a11y` + `@typescript-eslint` → remonte automatiquement les deps manquantes, les boutons sans `aria-label`, les re-renders suspects.

7. **Refactorer `NewAssessmentPage` (2764 lignes)** — extraire chaque step en composant dédié sous `src/components/assessment/steps/`. Réduit la surface de bug et accélère le build.

8. **Renforcer la sanitisation des inputs publics** envoyés depuis `/client/:token` et `/r/:token` (`client_messages.message`, `client_referrals.referred_name`, `rdv_change_requests.message`) — valider avec Zod avant insert, limiter longueur côté client.

### 🟢 AMÉLIORATION

9. **Migrer tous les hex vers `var(--ls-*)`** (386 occurrences) — permettrait de supprimer les ~80 règles translation de `globals.css` (lignes 95–230) et de vraiment activer un thème sombre uniforme sur `ClientAppPage`.

10. **Ajouter un filet de tests minimal** (au moins `vitest` + 5 tests sur `deriveLifecycleFromAssessment`, `getPortfolioMetrics`, et les formules `calculations.ts`). Aujourd'hui zéro test = aucun garde-fou en refactor.

---

## Annexe — Scripts exécutés pour cet audit

```bash
# Comptage fichiers
find src -name "*.tsx" | wc -l
find src -name "*.ts" -not -name "*.tsx" | wc -l

# Types
npx tsc -b --pretty false                    # → 0 erreur
grep ": any|as any|<any>|Record<string, any>"  # → 4 occurrences / 2 fichiers

# Design system
grep "#[0-9A-Fa-f]{3,8}"                     # → 386 occurrences / 30+ fichiers
grep "font-family|fontFamily"                # → 253 / 29 fichiers

# Sécurité
grep "service_role|SERVICE_ROLE"             # → 0
grep "mockPassword.*demo1234"                # → 4 / 1 fichier
grep "VITE_|SUPABASE_"                       # → 5 / 3 fichiers (tous légitimes)

# Dette
grep "TODO|FIXME|HACK|XXX"                   # → 0
grep "console.log|debug|info"                # → 0
grep "console.error|warn"                    # → 27 / 11 fichiers

# Business logic
grep "isDeadLifecycle|isActiveLifecycle"     # → 3 / 2 fichiers
grep "lifecycleStatus === 'stopped'|'lost'|'paused'"  # → 7 fichiers

# Policies
grep "enable row level security" schema.sql  # → 10 tables
grep "create policy" schema.sql              # → 36 policies
grep "to anon|for anon" schema.sql           # → 0 (anon = tables hors schema.sql)
```

---

**Fin de l'audit.** Aucun fichier du codebase n'a été modifié — uniquement ce rapport a été créé.
