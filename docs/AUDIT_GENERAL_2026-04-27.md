# Audit Général Profond — Lor'Squad Wellness

- **Date** : 27/04/2026
- **Branche analysée** : `claude/focused-pike` (commit `1753b71`)
- **Mode** : Lecture seule, fixes proposés classés par risque
- **Auditeur** : Claude Code (full-auto)
- **Volume analysé** : 216 fichiers TS/TSX · 59 652 lignes · 43 migrations DB · 16 Edge Functions

---

## Sommaire

- [Légende des risques](#légende-des-risques)
- [Section 1 — Architecture globale](#section-1--architecture-globale)
- [Section 2 — Système de bilan](#section-2--système-de-bilan)
- [Section 3 — Logique de suivi J+1/J+3/J+7/J+10/J+14](#section-3--logique-de-suivi)
- [Section 4 — Détection priorités](#section-4--détection-priorités)
- [Section 5 — Système de recommandations](#section-5--système-de-recommandations)
- [Section 6 — Programmes](#section-6--programmes)
- [Section 7 — Calculs](#section-7--calculs)
- [Section 8 — App client](#section-8--app-client)
- [Section 9 — Cycle de vie client](#section-9--cycle-de-vie-client)
- [Section 10 — Système RDV](#section-10--système-rdv)
- [Section 11 — Notifications](#section-11--notifications)
- [Section 12 — Partage public & RGPD](#section-12--partage-public--rgpd)
- [Section 13 — Tracking PV](#section-13--tracking-pv)
- [Section 14 — Hiérarchie équipe](#section-14--hiérarchie-équipe)
- [Section 15 — Auth & Sécurité](#section-15--auth--sécurité)
- [Section 16 — Mémoire métier](#section-16--mémoire-métier)
- [Section 17 — Dette technique](#section-17--dette-technique)
- [Section 18 — Bugs latents identifiés](#section-18--bugs-latents-identifiés)
- [Tableau de bord global](#tableau-de-bord-global)
- [Top 5 fixes recommandés](#top-5-fixes-recommandés)
- [Forces de la codebase](#forces-de-la-codebase)
- [Points de vigilance long-terme](#points-de-vigilance-long-terme)
- [Questions ouvertes](#questions-ouvertes)

---

## Légende des risques

- 🟢 **Trivial** : 1-3 lignes, zéro side-effect, fichier isolé, pas de logique métier
- 🟡 **Moyen** : 5-20 lignes, refacto léger, peut toucher quelques consumers, à tester sur `dev/thomas-test`
- 🔴 **Lourd** : > 20 lignes ou touche logique métier critique, mérite cadrage séparé avant exécution

---

## Section 1 — Architecture globale

### Stack technique

| Domaine | Choix | Version |
|---|---|---|
| Framework UI | React | 18.3.1 |
| Langage | TypeScript | 5.6.3 (strict) |
| Bundler | Vite | 5.4.10 |
| Routing | React Router | 6.28 |
| Styles | Tailwind | 3.4.15 |
| Backend | Supabase JS | 2.101.1 |
| QR codes | qrcode.react | 4.2 |
| Tests | Vitest | 4.1 |
| Lint | ESLint flat config | 10.x (max-warnings=0) |

**Pas de Redux, pas de Zustand, pas de React Query.** L'état global est centralisé dans `src/context/AppContext.tsx` (1061 lignes), qui expose à la fois les données (`clients`, `users`, `followUps`, etc.) et les mutations (`createProspect`, `setClientLifecycleStatus`, etc.).

### Structure `src/`

```
src/
├── assets/           # Images statiques (programmes, pédagogique)
├── components/       # 25 sous-dossiers thématiques
│   ├── assessment/   # Composants des 15 étapes du bilan
│   ├── auth/         # Route guards
│   ├── client/       # Helpers fiche coach
│   ├── client-app/   # 5 onglets de l'app client
│   ├── client-detail/# ActionsTab, ActionsRdvBlock, etc.
│   ├── follow-up/    # Protocole J+X
│   ├── layout/       # AppLayout, BottomNav
│   ├── ui/           # Boutons/Cards/Toast atomiques
│   └── ...
├── config/           # teamConfig.ts (couple display)
├── context/          # AppContext, InstallPromptContext, ToastContext
├── data/             # Catalogues statiques (programs, pvCatalog, herbalifeCatalog)
├── features/         # Mensurations + onboarding (modules indépendants)
├── hooks/            # useClientPriorityAction, useTeamData, useClientLiveData...
├── lib/              # calculations, auth, googleCalendar, evolutionReport
├── pages/            # 35+ pages routées
├── services/         # supabaseClient.ts, supabaseService.ts
├── styles/           # CSS globaux
└── types/            # domain.ts (Client, Assessment, etc.) + pv.ts
```

### Routing

Configuration centralisée dans `src/App.tsx` :
- `<PublicRoute>` : login, welcome, reset-password, forgot-password, auto-login
- `<ProtectedRoute>` : tout l'espace coach (clients, agenda, équipe, etc.)
- `<RoleRoute allowedRoles>` : pages admin-only (`/users`, `/team`, `/parametres`)
- Routes publiques séparées : `/client/:token` (app client), `/partage/:token` (partage RGPD), `/rapport/:token` (rapport évolution)

Toutes les pages lourdes sont **lazy-loaded** via `React.lazy` (réduit le bundle initial).

### Conventions observées

- **Imports relatifs uniquement** (pas d'alias `@/`) — pattern stable dans le repo
- **Naming** : `PascalCase` pour composants, `camelCase` pour hooks/helpers, `SCREAMING_SNAKE_CASE` pour constantes
- **CSS** : 1413 occurrences `className=` (Tailwind dominant) ; 1801 références `var(--ls-*)` ; quelques modules CSS dédiés (`ActionsRdvBlock.css`, `SelectableProductCard.css`, etc.)
- **Polices** : `Syne` (titres, chiffres, weights 700-800) + `DM Sans` (corps, weights 400-600) — utilisées partout
- **Dates** : ISO 8601 stockés en DB, format français pour affichage via `lib/calculations.formatDate`/`formatDateTime`

### Build & deploy

- `npm run dev` (Vite local), `npm run build` (tsc -b + vite build), `npm run typecheck`, `npm run lint`, `npm run test`
- `vercel.json` minimal avec rewrites SPA + preview deployments par défaut
- 2 branches actives : `claude/focused-pike` (prod) + `dev/thomas-test` (créée le 27/04/2026)
- Supabase projet unique partagé prod/dev (cf `CLAUDE.md` workflow dev/prod)

### Cohérence globale

- ✅ Architecture simple, lisible, peu de magie
- ✅ Conventions de nommage homogènes
- ⚠️ Quelques fichiers > 1000 lignes (cf Section 17)
- ⚠️ Pas de séparation stricte data/UI dans AppContext (mutations + state coexistent)

---

## Section 2 — Système de bilan

### Vue d'ensemble

Le bilan est un wizard 15 étapes implémenté dans `src/pages/NewAssessmentPage.tsx` (2933 lignes). Construit autour d'un état `form` (~120 champs), un `currentStep` (0-14), et un système de visibilité conditionnelle `visible(form)` par step.

### Les 15 étapes (ordre canonique)

| # | id | Titre | Visibilité |
|---|---|---|---|
| 0 | `client-info` | Informations client | Toujours |
| 1 | `habits` | Habitudes de vie et repas | Toujours |
| 2 | `food-quality` | Qualité alimentaire et boissons | Toujours |
| 3 | `health-objective` | Santé, objectif, activité, freins | Toujours |
| 4 | `meal-composition` | Composition des repas | Toujours |
| 5 | `sport-profile` | Parle-moi de ton sport | **Si `objective === 'sport'`** |
| 6 | `current-intake` | Tes apports actuels | **Si `objective === 'sport'`** |
| 7 | `body-scan` | Body scan | Toujours |
| 8 | `tasting` | Dégustation | Toujours |
| 9 | `recommendations` | Recommandations | Toujours |
| 10 | `breakfast` | Petit-déjeuner | Toujours |
| 11 | `concept` | Notre concept de rééquilibrage | Toujours |
| 12 | `program` | Programme proposé | Toujours |
| 13 | `follow-up` | Suite du suivi | Toujours |
| 14 | `felicitations` | Félicitations | Toujours |

### Architecture du composant

- **État `form`** (lignes 56-175) : ~120 champs typés (`AssessmentForm`). Initialisé à `initialForm` (lignes 204-293) avec fallbacks.
- **Auto-save brouillon** : `clearAssessmentDraft()` au save validé, `localStorage` persisté sur chaque update
- **Hooks externes** : `useAppContext`, `useToast`, `useSearchParams` (param `?prospectId=` pour pré-remplissage)
- **Modale `SportAlertsDialog`** (Apple Health-style) : 6 alertes contextuelles, bloquante avant save si non acquittée

### Flow de save (`handleSaveAssessment` L845)

1. **Garde-fou sport** : si `objective='sport'` ET alertes non acquittées → ouvre `SportAlertsDialog` + bloque
2. **Validations bloquantes** : `firstName`, `lastName`, `phone`, `email`, `objectiveFocus`, `hasFollowUpPlanned`
3. **Calcul programme** : `programTitle = selectedProgram?.title ?? "Programme a confirmer"`, `startsImmediately` détecté
4. **Construction `assessment`** : type=`initial`, body scan, questionnaire, focus pédagogique
5. **Appel atomique** : `createClientWithInitialAssessment(...)` insère client + assessment + follow-ups
6. **Insert `client_recaps`** : récupère `token` (uuid) pour l'URL `/client/<token>`
7. **Navigate** : `/clients/:id/bilan-termine?token=...&firstName=...` (chantier 27/04)
8. **Fallback mode local** : `navigate(/clients/:id)` si pas de Supabase

### Tables DB touchées au save

- `clients` (identité + objective + programme)
- `assessments` (bilan initial + body scan + questionnaire JSONB)
- `follow_ups` (RDV suivi programmé)
- `client_recaps` (snapshot pour `/client/<token>`)
- `follow_up_protocol_logs` (initialement vide)

### Subtilités

1. **Validations PHONE et EMAIL** ajoutées récemment (2026-04-25) — toute fiche créée avant cette date a possiblement des champs vides (impact nul mais à savoir).
2. **Programme à confirmer** est un fallback string dur : si `selectedProgram` est null au save, la valeur s'écrit en DB littéralement comme `"Programme a confirmer"` (sans accent).
3. **`startsImmediately`** : flag implicite déterminé par la sélection finale de l'étape 13. Si false, `currentProgram` reste empty string en DB → impacte la détection "programme démarré" (cf bug fixé 27/04 dans `isClientProgramStarted`).
4. **Auto-création de prospect-leads** : si l'utilisateur arrive depuis Welcome avec `prospectId`, certains champs sont pré-remplis et marqués surlignés vert tant que non modifiés.

---

## Section 3 — Logique de suivi

### Catalogue `src/data/followUpProtocol.ts`

**5 étapes** définies par `FOLLOW_UP_PROTOCOL: FollowUpStep[]` :

| ID | Jour | Titre | Message client | Guide coach |
|---|---|---|---|---|
| `j1` | +1 | Premier petit-déjeuner | "Comment s'est passé ton premier shake ?" | Ancrage routine, hydratation |
| `j3` | +3 | Premiers ressentis | "Tu remarques des changements ?" | Valider effets, partage naturel |
| `j7` | +7 | Bonjour le VIP | "Mon tarif VIP" | Présenter offre sponsorisée |
| `j10` | +10 | Énergie & sommeil | "Comment va l'énergie ?" | Intro Night Mode si pertinent |
| `j14` | +14 | RDV de suivi | "On fait le point ?" | Programmer RDV présentiel |

Chaque étape contient `clientMessage` (template avec variables `[Prénom]`, `[SPONSOR_ID]`, `[SPONSOR_NAME_3]`), `smsMessage` (variante SMS), `coachGuide` (objectif, keyActions, productsFocus).

### Scheduler `src/lib/followUpProtocolScheduler.ts`

Fonctions publiques principales :

- **`evaluateProtocolEligibility(client)`** (L47-101) : retourne `{eligible, reasons}`. Filtres : bilan initial existant, < 10j, lifecycle actif, programme assigné, body scan avec poids > 0.
- **`getFollowUpsDue(clients, currentUserId, protocolLogs, options)`** (L176-251) : retourne `FollowUpDueItem[]` avec status `overdue_more`/`overdue_1d`/`due_today`/`upcoming`. Filtre `dayOffset ≤ PROTOCOL_MAX_DAYS_ELIGIBLE` (10) — J+14 exclu du dashboard.
- **`getInitialAssessmentDate(client)`** (L147-156) : ancre temporelle = date du bilan initial.

Statuts inactifs exclus : `['stopped', 'lost', 'paused']`.

### Composant `src/components/follow-up/FollowUpProtocolCard.tsx`

Rendu sur la fiche client (onglet Actions, après le bloc RDV — ancre `id="follow-up-protocol-anchor"`).

- Calcule `initialAssessmentDate` + `daysSinceInitial`
- Mappe les `followUpProtocolLogs` partagés via AppContext
- État par étape : `upcoming` / `active` / `past`
- Modale interne `FollowUpStepModal` avec message copier-coller + actions coach
- Bouton "Marquer envoyé" → `logSupabaseFollowUpProtocolStep()` insère dans `follow_up_protocol_logs`

### Table DB `follow_up_protocol_logs`

Migration `20260420160000` :

```sql
create table public.follow_up_protocol_log (
  id uuid primary key,
  client_id uuid references clients(id) on delete cascade,
  coach_id uuid references users(id) on delete cascade,
  step_id text check (step_id in ('j1','j3','j7','j10','j14')),
  sent_at timestamptz default now(),
  notes text,
  unique (client_id, step_id)  -- 1 log par étape par client
);
```

RLS strict : SELECT/UPDATE/DELETE via `can_access_owner(coach_id)`, INSERT via `coach_id = auth.uid()`.

### Fix récent — commit `fbfd25f` (2026-04-27)

Commit atomique 3 fixes :
1. Ré-import `<FollowUpProtocolCard>` dans `ActionsTab` (orphelin depuis 25/04 lors de l'extraction de l'onglet)
2. Hook `useClientPriorityAction` : ancre passe de `client.startDate` → `initialAssessment?.date` (alignement avec scheduler)
3. `handlePriorityCta` case `send_followup` : scroll smooth vers ancre au lieu de switch d'onglet

---

## Section 4 — Détection priorités

### Hook `src/hooks/useClientPriorityAction.ts`

```typescript
useClientPriorityAction(client: Client, followUps: FollowUp[]): PriorityAction
```

Retourne un objet typé : `{ type, icon, title, meta, ctaLabel, colorScheme }` avec `type` parmi 5 valeurs.

### Les 5 cas (ordre strict, premier match gagne)

| # | type | Condition | Couleur |
|---|---|---|---|
| 1 | `plan_rdv` | Aucun RDV scheduled/pending futur ET (dernier contact > 7j OR 1 seul bilan) | gold |
| 2 | `complete_initial` | `age=0` OR `height=0` OR poids initial absent | gold |
| 3 | `send_followup` | NOT `freeFollowUp` ET `initialAssessment?.date` existe ET ≥1 checkpoint en retard > 2j ET `daysSinceStart ≤ 20` | gold |
| 4 | `request_share_consent` | NOT `publicShareConsent` ET ≥2 bilans | gold |
| 5 | `ok` | Fallback (aucune des 4 ci-dessus) | teal |

### Composant `ActionsRdvBlock.tsx`

Matrice de rendu (5 cas × 2 états RDV) :

| `priority.type` | RDV existe ? | Rendu |
|---|---|---|
| `plan_rdv` | ❌ | Bloc beige "Planifier un RDV" |
| `complete_initial` / `send_followup` / `share_consent` | ❌ | PriorityBanner gold seul |
| `ok` | ❌ | PriorityBanner teal "Tout est à jour" |
| `complete_initial` / `send_followup` / `share_consent` | ✅ | PriorityBanner gold + `RdvCardCompact` (icônes Google/.ics/Edit/WA) |
| `ok` | ✅ | `RdvCardPremium` (état prestige : menu 4 options pleine carte) |

### Handler `handlePriorityCta` (`ActionsTab.tsx` L148-167)

```typescript
if (priority.type === "plan_rdv")     → onEditRdv()
if (priority.type === "complete_initial") → navigate(/clients/:id/start-assessment/edit)
if (priority.type === "send_followup")    → scrollIntoView("#follow-up-protocol-anchor")
if (priority.type === "request_share_consent") → onOpenSharePublic + toast info
else (ok) → onGoToVueComplete()
```

---

## Section 5 — Système de recommandations

### Fonction `buildAssessmentRecommendationPlan` (`src/lib/assessmentRecommendations.ts`)

Signature : `(source: AssessmentRecommendationSource) → AssessmentRecommendationPlan`

Output : `{ needs, optionalUpsells, recommendedProgramId, recommendedProgramReason }`.

### 9 besoins détectables (`AssessmentNeedId`)

```ts
"hydration" | "energy" | "sleep" | "breakfast_structure" |
"protein_muscle" | "digestive_support" | "visceral_fat" |
"bone_support" | "snacking_control"
```

Ordre de priorité (du plus important au moins) : visceral_fat > bone_support > hydration > protein_muscle > sleep > digestive_support > breakfast_structure > snacking_control > energy.

### Allocation produits

- **First pass** : 1 produit par besoin visible (max 4 besoins, max 6 produits global)
- **Second pass** : 2e produit optionnel par besoin si reste de la place
- **Upsells** : produits non utilisés, max 3

### Boosters sport — `recommendBoosters(profile, age)`

Retourne 6 recommandations avec `recommended: boolean` + `reason: string`. Règles :
- **Collation protéinée** → `sub === 'mass-gain' OR 'strength'`
- **LiftOff** → `freq ∈ ['regular','intensive']` ET `type ∈ ['musculation','crossfit','combat']`
- **CR7 Drive** → `type ∈ ['cardio','endurance-long','team-sport','crossfit']`
- **Hydrate** → `freq === 'intensive'` OR `type ∈ ['crossfit','combat','team-sport']`
- **Créatine** → `sub === 'mass-gain' OR 'strength'`
- **Collagène** → `age ≥ 35` OR sport à impact

---

## Section 6 — Programmes

### Catalogue `src/data/programs.ts`

**`PROGRAM_CHOICES`** : 7 programmes
- Découverte (159€), Premium (234€) ★ Best seller, Booster 1 (277€), Booster 2 (324€) — *catégorie weight-loss*
- Découverte Sport (190€), Premium Sport (285€) ★ Recommandé — *catégorie sport*
- Unité (0€) — *catégorie unit*

**`BOOSTERS`** : 6 options sport (id mappés vers Herbalife 24)
- Barres protéinées, LiftOff, CR7 Drive, Hydrate, Créatine+, Collagène

**`ROUTINE_PRODUCT_DESCRIPTIONS`** : Map descriptive produit (formula-1, pdm, aloe-vera, the-51g, etc.).

**`getProgramById(id)`** : fallback Premium si ID inexistant.

**`PROGRAMS_LEGACY`** (rétrocompat) : reconstruit depuis `PROGRAM_CHOICES + BOOSTERS` via `programFromChoice()` et `programFromBooster()`.

### Subtilité — duplication de mapping

`PROGRAM_INCLUDED_PRODUCT_IDS` est défini **localement dans NewAssessmentPage.tsx L430**, pas dans `programs.ts` :

```ts
const PROGRAM_INCLUDED_PRODUCT_IDS: Record<string, string[]> = {
  "p-discovery": ["formula-1", "the-51g", "aloe-vera"],
  "p-premium": ["formula-1", "pdm", "aloe-vera", "the-51g"],
  // ... mais sport-discovery / sport-premium MANQUENT
}
```

→ **Source de vérité fragmentée** (cf Bug #5).

### `AppContext.programs` est statique

Initialisé une fois au mount via `programs: PROGRAMS_LEGACY`. Pas de refresh runtime. Toute évolution du catalogue nécessite redeploy.

---

## Section 7 — Calculs (`src/lib/calculations.ts`)

30 exports répartis en 4 grandes familles.

### Cibles nutritionnelles (général)

- `calculateWaterNeed(weight)` → poids/30 L (formule simple)
- `calculateProteinRange(weight, objective, timeline?)` → string "X-Y g"
- `computeWaterTarget(weightKg)` → number, clampé 2-4 L (33 mL/kg)
- `computeProteinTarget(weightKg, objective?)` → g/jour, clampé ≤ 3 g/kg

### Variants sport

- `computeWaterTargetSport(weightKg, freq)` → mL/jour, 2000-5000, fréquence-aware
- `computeProteinTargetSport(weightKg, sub)` → `{min, max, target}` selon sous-objectif (mass-gain, strength, cutting, endurance, fitness, competition)
- `estimateCurrentProteinIntake(intake)` → estime apport actuel depuis `CurrentIntake`

### Composition corporelle

- `estimateBodyFatKg`, `estimateMuscleMassPercent`, `estimateMuscleMassKg`, `estimateHydrationKg`, `estimateRelativeMassPercent`

### Plans perte de poids

- `getWeightLossPlan(weight, targetWeight, timeline)` → `{weeklyRateKg, durationWeeks, ...}`
- `getWeightLossPaceInsight(plan)` → `'healthy' | 'fast' | 'aggressive'`

### Helpers historique

- `getLatestAssessment`, `getPreviousAssessment`, `getFirstAssessment`
- `getLatestBodyScan`, `getLatestQuestionnaire`
- `getAssessmentDelta`, `formatDelta`, `compareAssessmentsDesc`

### Helpers récents (fix 27/04)

- **`isClientProgramStarted(client)`** — détection multicanal (started OR startDate OR lifecycleStatus actif/paused OR initial assessment avec poids)
- **`getClientEffectiveStartDate(client)`** — startDate prioritaire, sinon date du bilan initial

### Sécurités

- `formatDate`/`formatDateTime` protégés contre null/undefined/"" (fix 19/04)
- Clampages physiologiques (eau 2-4L, protéines ≤ 3g/kg)
- `serializeDateTimeForStorage` avec fallback heure

---

## Section 8 — App client

### Architecture

- **`src/pages/ClientAppPage.tsx`** (1158 lignes) : page principale 5 onglets (Accueil, Évolution, Programme, Produits, Conseils)
- **Auth** : token URL `/client/<token>` → match contre `client_recaps.token`, fallback `client_evolution_reports.token`, fallback `client_app_accounts.token`
- **Snapshot initial** : la table qui matche fournit les données figées
- **Live data** : Edge Function `client-app-data` enrichit avec données fraîches
- **Merge** : `liveData > snapshot` (priorité live)

### Edge Function `client-app-data`

`supabase/functions/client-app-data/index.ts` :
- Validation token contre `client_app_accounts.token` (uuid)
- Service_role bypass RLS
- Fetch parallèle : clients (current_program, notes), follow_ups (due_date), pv_client_products (active=true)
- Enrichissements (depuis 24/04) : `assessment_history` (20 derniers), `recommendations_not_taken`, `sport_alerts` (6 règles recalculées Deno-side), `coach_advice`
- Réponse normalisée ISO 8601, `Cache-Control: private, max-age=30`

### Hook `useClientLiveData`

`src/hooks/useClientLiveData.ts` :
- Mount : 1 fetch initial
- Window focus + visibilitychange : refetch si `lastFetch > 5s` (debounce anti-spam Safari ↔ PWA iOS)
- Erreur : `console.warn` + fallback snapshot silencieux

### Tabs

- **`ClientHomeTab`** : hero + RDV gold + body composition + recommandés + Telegram + mensurations
- **`ClientProductsTab`** : "Recommandé pour toi" + "Mon programme actuel" (live) + catalogue complet
- **`ClientConseilsTab`** : 4 sections (alertes sport, assiette idéale, routine quotidienne, conseils perso) — chantier 24/04
- **`ClientChatTab`** : messagerie bidirectionnelle client ↔ coach
- Évolution : graphiques + EnrichedAssessmentHistory (point de départ + 5 derniers bilans)

### Subtilités

1. **Triple table de matching** : recap > evolution_report > app_accounts. Si un client a plusieurs tokens (ce qui n'arrive pas en théorie mais possible techniquement), le premier trouvé gagne.
2. **30s de cache navigateur** : modif coach invisible jusqu'à 30s.
3. **Pas de retry** sur fetch failed. Le hook expose `error` mais le composant n'affiche pas de bandeau (degrade silencieusement).

---

## Section 9 — Cycle de vie client

### Champs DB sur `clients`

- `started` (boolean) : flag binaire "programme démarré"
- `start_date` (text — pas date stricte) : date de démarrage
- `current_program` (string) : nom du programme actuel
- `lifecycle_status` (enum) : `'active' | 'paused' | 'completed' | 'not_started' | 'lost' | 'stopped'`
- `is_fragile` (boolean) : flag "fragile, attention particulière"
- `free_follow_up` (boolean) : exclu du suivi auto
- `free_pv_tracking` (boolean) : exclu des listes réassort

### Helpers UI (fix bug #3 du 27/04)

- `isClientProgramStarted` : true si l'un des signaux est positif (started OR startDate OR lifecycle actif OR weight measuré)
- `getClientEffectiveStartDate` : startDate, fallback date bilan initial

### Composant `LifecycleBadge`

Default fallback : `client.lifecycleStatus ?? (isClientProgramStarted(client) ? "active" : "not_started")` — branché aux 4 endroits clés (ClientDetailPage hero, ActionsTab pills, ClientsPage filtre + liste).

### Subtilité

`start_date` est typé `text` côté Postgres (pas `date`), aucune contrainte CHECK. Un coach peut y mettre du texte libre par erreur. **Risque silencieux** mais non détecté en pratique car renseigné automatiquement par le flow de save (cf Section 2).

---

## Section 10 — Système RDV

### Composants principaux

- **`EditScheduleModal`** (`src/components/client/EditScheduleModal.tsx`) : modale de création/modification RDV
- **`ActionsRdvBlock`** (`src/components/client-detail/ActionsRdvBlock.tsx`, 512 lignes) : bloc RDV premium avec menu 4 options
- **`getClientActiveFollowUp`** (`src/lib/portfolio.ts`) : retourne le prochain RDV scheduled/pending

### Helper `src/lib/googleCalendar.ts`

- **`createGoogleCalendarLink(params)`** : URL `calendar.google.com/calendar/render?action=TEMPLATE&...`
- **`createIcsDataUri(params)`** (L33-76) : data URI iCalendar standard
  - Durée par défaut 45 min
  - Échappement `escapeIcs()` correct pour `,`, `;`, `\n`
  - `UID` : fallback `ls-{timestamp}@lorsquad.com`
  - `VALARM` rappel 1h avant

### Menu 4 options du bloc RDV (état prestige)

1. **Google Agenda** — `<a href={googleUrl} target="_blank">`
2. **Apple / Outlook (.ics)** — `<a href={icsUri} download={...}>`
3. **Modifier le RDV** — `<button onClick={onEditRdv}>` (ouvre EditScheduleModal)
4. **WhatsApp client** — `<a href={waUrl} target="_blank">` avec message pré-rempli (désactivé si pas de phone)

### Subtilités

1. **Timezone Google Cal** : ISO UTC stocké, Google affiche en TZ user (peut différer du fuseau coach)
2. **Phone WhatsApp** : extrait `replace(/\D/g, "")` — pas de validation E.164. Format français devrait commencer par `33` (pas `+33`).
3. **Encoding accents** : `encodeURIComponent` standard, OK sur navigateurs modernes
4. **Robustesse date** : `Number.isNaN(rdvDate.getTime())` check protège l'affichage si dueDate corrompu

---

## Section 11 — Notifications

### Architecture

- **Web Push API** standard (VAPID keys)
- 2 tables : `push_subscriptions` (coachs), `client_push_subscriptions` (clients)
- 4 Edge Functions : `send-push` (générique), `morning-suivis-digest` (cron 7h), `rdv-imminent-notifier` (cron 5min), `new-message-notifier` + `new-coach-message-notifier` (déclenchés par triggers Postgres)

### Module partagé `supabase/functions/_shared/push.ts` (284 lignes)

Fonctions :
- `ensureVapid()` (lazy init avec flags `vapidInitialized` / `vapidInitError`)
- `sendPushToUser(userId, payload, dedupKey)` :
  1. Dédup via `push_notifications_sent` table (skip si déjà envoyé sur fenêtre)
  2. Loop multi-device sur subscriptions du user
  3. Cleanup endpoints 404/410 (Apple/browsers qui révoient les tokens)
  4. Log succès uniquement si ≥1 device a accepté
- `sendPushToClient(clientId, payload)` : variante pour clients (1 seul device par client via `maybeSingle()`)

### Service Worker

`public/sw.js` (truncated lecture) :
- `install` → `skipWaiting`
- `activate` → cleanup all caches + `clients.claim`
- `push` → affiche notification avec icon, badge, vibrate, actions Open/Dismiss
- Cliquer la notification ouvre l'URL spécifiée

### Subtilités / risques

1. **VAPID lazy init non thread-safe** : si 2 requests Edge arrivent simultanément, la race sur `setVapidDetails()` peut laisser l'une échouer. Acceptable en pratique (coldstart rare).
2. **Cleanup async** : `.delete()` sur subscriptions 404 sans `await` → si DB lente, accumulation possible.
3. **Pas d'exponential backoff** : un échec transient → re-tenté à la prochaine cron (5min) sans rate-limit.
4. **Dédup fenêtre dure** : 2 events identiques à 5min d'écart avec window 10min → 2e skipée silencieusement.

---

## Section 12 — Partage public & RGPD

### Tables DB

- **`clients.public_share_consent`** (boolean), `public_share_consent_at`, `public_share_revoked_at` — migration `20260424210000`
- **`client_public_share_tokens`** — migration `20260424211000` — `id, client_id, token (uuid unique), created_by_user_id, expires_at (default +30j), revoked_at, view_count`
- **`client_public_share_views`** — migration `20260424212000` — logs immutables `(token_id, viewed_at, ip_hash, user_agent)`

### RLS

- **Tokens** : coach/admin SELECT/INSERT/UPDATE/DELETE via `distributor_id` ; client SELECT/DELETE propres tokens via `client_app_accounts.auth_user_id` ; **anon = aucun accès direct**
- **Views** : coach/admin SELECT logs ; service_role INSERT uniquement ; UPDATE/DELETE = personne (immutable)

### Edge Functions

- **`create-public-share-token`** (auth coach requise) : insère un token expirable +30j
- **`resolve-public-share`** (anon, `--no-verify-jwt`) :
  1. Lookup token → check non révoqué + non expiré + consentement client actif
  2. Log vue avec `ip_hash = SHA256(ip)` + user_agent (truncated 500 chars)
  3. Increment `view_count` (read-then-write, best-effort)
  4. Retour anonymisé : prénom client + body scan + metrics_history + program_title + coach_first_name (pas WhatsApp/phone)

### Page publique `src/pages/SharePage.tsx`

- Meta `<noindex, nofollow, noarchive, nosnippet>` injectée dynamiquement
- CTA générique `https://labase-nutrition.com` (pas WhatsApp coach direct, RGPD)
- Footer "Partagé avec l'accord de [Prénom]"

### Composant client `ClientPublicShareConsent.tsx`

- État actif → "Tu as autorisé le partage le [date]" + bouton "Retirer mon accord"
- État non-consenti → modale avec checkbox obligatoire avant validation
- Révocation → update `public_share_revoked_at` + cascade UPDATE `revoked_at` sur tous les tokens du client

### Risques RGPD identifiés

1. **IP hash sans salt** : SHA256(ip) reste pseudonymisable via rainbow tables si l'attaquant a la liste des IPs candidates
2. **User_agent stocké brut** : peut révéler device/version OS — dépasse le strict nécessaire pour un compteur
3. **Pas de DSAR coach-side** : le client peut révoquer mais pas voir QUI a accédé à son lien
4. **Cascade revocation synchrone** : update de N tokens en boucle, pas de batch — peut timeout si 1000+ tokens (improbable mais existant)
5. **Pas d'audit trail** : qui a créé le token, oui (`created_by_user_id`) ; mais pas de log d'accès au token-creator log

---

## Section 13 — Tracking PV

### Catalogue `src/data/pvCatalog.ts` (628 lignes)

- **`pvProductCatalog`** : 18 produits avec `id, name, pricePublic, pv, durationReferenceDays, category`
- **`pvProgramOptions`** : 5 programmes (Starter/Premium/Booster1/Booster2/Custom)

### Types `src/types/pv.ts`

```ts
type PvStatus = "ok" | "watch" | "restock" | "inconsistent" | "follow-up"
type PvTransactionType = "commande" | "reprise-sur-place"
type PvProductStatus = "ok" | "watch" | "restock" | "inconsistent"
```

### Logique de calcul

- **`buildSeedPvClientProductsForClient(client)`** : génère les enregistrements initiaux pour un client démarré (chaque produit du programme avec `start_date`)
- **`buildPvTrackingRecords(clients, transactions, products)`** : fusionne données → liste `PvClientTrackingRecord[]` avec `pvCumulative`, `monthlyPv`, `activeProducts`, etc.
- **`getProductStatus(product, daysSince, durationReference)`** : OK / Watch (≤30j à risque) / Restock (jour limite) / Inconsistent (dépassé)
- **`getClientStatus(productStatuses, lastFollowUp)`** : agrège les statuts produits + flag follow-up overdue

### Pages

- **`PvOverviewPage.tsx`** : dashboard coach personnel (filtre `!free_pv_tracking`)
- **`PvTeamPage.tsx`** : vue admin → PV par distributeur + clients à relancer
- **`PvClientFullPage.tsx`** : détail (produits actifs + historique transactions)

### Subtilité — exclusion `free_pv_tracking`

Filtre **ad-hoc côté front** (`PvTeamPage.tsx` L16, useMemo). La logique est dispersée : si on ajoute une nouvelle vue PV, il faut penser à filtrer `!c.freePvTracking` à chaque endroit.

---

## Section 14 — Hiérarchie équipe

### Page `src/pages/TeamPage.tsx` (1080 lignes)

- Tree builder récursif depuis rows plates
- **Couple mode** (2026-04-26) : Thomas + Mélanie fusionnés en 1 card virtuelle
- 3 RPCs Supabase consommées via `useTeamData.ts`

### Hook `src/hooks/useTeamData.ts` (330 lignes)

- `useTeamTree(rootUserId)` → `{rows, loading, error, reload}`
- `useDistributorStats(userId, period)` → `{stats, loading, error}`
- `useTeamRanking(rootUserId, period, limit)` → `{ranking[], loading, error}`
- `useCoupleTeamTree(memberIds[])` → fusion + dedup par user_id
- `useCoupleDistributorStats(memberIds, period)` → agrégation (somme + recalc % sur dénominateurs)

### RPCs SQL (migration `20260425230000`)

- **`get_team_tree(root_user_id)`** → liste plate avec depth, clients_count, prospects_count, subteam_count
- **`get_distributor_stats(p_user_id, p_period_start)`** → 11 métriques (clients/prospects/rétention)
- **`get_team_ranking(p_root, p_period_start, p_limit)`** → top N par score composite
- **`is_in_user_subtree(target, viewer)`** → helper récursif pour RLS

Toutes les RPCs sont `SECURITY INVOKER` → policies RLS standard appliquées.

### Migration `20260425230000_team_tree_lineage.sql`

1. Colonne `parent_user_id` (alias sémantique de `sponsor_id`) + index
2. Trigger `users_sync_parent_sponsor` bi-directionnel (sync `sponsor_id` ↔ `parent_user_id` à chaque write)
3. Fonction `is_in_user_subtree` avec WITH RECURSIVE CTE
4. Policy `users_select_subtree` permissive (admin voit tout, distri voit son sous-arbre)
5. 3 RPCs

### Config couple `src/config/teamConfig.ts`

- `COUPLE_VIRTUAL_ID = "couple:thomas-melanie"`
- `COUPLE_USER_IDS_HARDCODED` : peut rester vide (résolution auto par nom)
- Fonctions `resolveCoupleUserIds(users)`, `isCoupleVirtualId(id)`

### Subtilité — résolution couple fragile

Si `COUPLE_USER_IDS_HARDCODED` reste vide ET que les noms exacts "Thomas" / "Mélanie" changent (typo, ajout nom de famille, accent enlevé) → la détection auto échoue silencieusement. **Recommandation V2** : ajouter table `distributor_couples` en DB avec FK explicite (cf Bug #7).

---

## Section 15 — Auth & Sécurité

### Route guards `src/components/auth/RouteGuards.tsx`

- `<ProtectedRoute>` : `currentUser` requis sinon redirect `/welcome`
- `<PublicRoute>` : redirect `/dashboard` si déjà loggé
- `<RoleRoute allowedRoles>` : check `hasRequiredRole()` sinon redirect `/dashboard`

### Service `src/services/supabaseClient.ts`

- `getSupabaseClient()` async + cache singleton
- `isSupabaseUnavailable` flag pour fallback gracieux mode local

### Helpers `src/lib/auth.ts` (170 lignes)

- `isAdmin(user)`, `isRéférent(user)` (note : caractère é dans le nom de fonction — fonctionne mais pourrait gêner refacto)
- `getRoleScope(user)` → `'all-clients' | 'team-clients' | 'owned-clients'`
- `getAccessibleOwnerIds(user, users)` : Set d'IDs visibles
- `canAccessClient`, `getVisibleClients`, `getVisibleFollowUps`, `canAccessPortfolioUser`

### Variables d'environnement

- `VITE_SUPABASE_URL` (Project URL)
- `VITE_SUPABASE_ANON_KEY` (clé legacy HS256, **pas** publishable sb_*)
- Edge functions ont `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` côté Deno

### Migrations RLS clés

- `20260419150014/15/16` : shadow RLS level 2 + commit + rollback
- `20260419151210` : `can_access_owner` helper
- `20260425230000` : `is_in_user_subtree` + policy users_select_subtree
- `20260425200000` (hotfix critique) : drop des policies cast `::uuid` qui plantaient toute la table clients

---

## Section 16 — Mémoire métier

(Patterns observés et règles implicites — issus du code et de `CLAUDE.md`.)

### Règles UX implicites

1. **Jamais de prix dans l'app client** : philosophie "pas de pression commerciale", contact coach pour info pricing
2. **VIP avant tout** : étape J+7 du protocole de suivi présente offre "tarif VIP 36,74€" — argument commercial mature
3. **Personnalisation prénom** : tous les messages templates incluent `[Prénom]` (interpolation `interpolateStepMessage`)
4. **Touch targets ≥ 44px** : convention iOS visible partout (`min-height: 44px` sur boutons, `56px` sur menu items premium)
5. **Pas d'emoji random** : usage parcimonieux et cohérent (📅 RDV, ⚠️ alerte, ✓ validé, ⭐ recommandé)

### Philosophie produit

- **Coaching humain d'abord** : l'app augmente le coach, ne le remplace pas (texte à recopier-envoyer plutôt que message auto)
- **Effet wow contrôlé** : page remerciement post-bilan dark premium, mode sombre toggleable pour effet RDV
- **Discrétion partage public** : noindex/nofollow, anonymisation poussée, CTA générique pas de WhatsApp direct
- **Multi-tenant à venir** : architecture déjà compatible (helper `is_in_user_subtree`, scopes RLS, hiérarchie équipe)

### Conventions de design

- Palette : `var(--ls-gold)` `#B8922A`, `var(--ls-teal)` `#0D9488`, `var(--ls-text)`, `var(--ls-bg)`, `var(--ls-surface)`
- Typo : Syne (titres) + DM Sans (corps), pas d'autre famille
- Border-radius : 12-14px sur cards, 16-20px sur cards premium, 999px sur pills
- Timing : transitions 150-250ms, easing `cubic-bezier(0.16, 1, 0.3, 1)` pour les fades

### Stratégie monétisation Noaly

- Module 1 : Coaching nutrition (Lor'Squad, en cours)
- Modules futurs : team, formation (mentionnés dans CLAUDE.md, route `/formation` existe déjà)
- Architecture multi-module : pages déjà découplées, AppContext mutualisable

### Vocabulaire métier

- "Distributeur" = coach (tournure Herbalife)
- "Filleul" = distributeur parrainé (sous-équipe)
- "Bilan initial" = premier rendez-vous, point de référence
- "Suivi" = follow-up, RDV de relance
- "PV" = Point Volume (unité Herbalife pour calcul commission)
- "Routine matin" = produits du programme à prendre quotidiennement
- "Protocole 14j" = protocole de suivi J+1 → J+14

---

## Section 17 — Dette technique

### Code mort

✅ **Aucun composant orphelin détecté.** Les 85+ composants dans `src/components/` ont au moins 1 import externe. La leçon `FollowUpProtocolCard` (orphelin du 25/04 fixé le 27/04) a sensibilisé sur ce point.

### Fichiers > 1000 lignes (11 au total)

| Fichier | Lignes | Recommandation |
|---|---|---|
| NewAssessmentPage.tsx | 2933 | Split par étape (15 sub-composants déjà séparés mais le wrapper reste gros) |
| supabaseService.ts | 1915 | Découper par domaine (`clientService`, `assessmentService`, `pvService`, etc.) |
| AgendaPage.tsx | 1416 | Extraire les modales internes |
| ActionsTab.tsx | 1273 | Extraire les blocs (Coordonnées, Cycle de vie, Dossier) |
| NewFollowUpPage.tsx | 1200 | Mêmes étapes que NewAssessment, factoriser |
| ClientAppPage.tsx | 1158 | Les 5 onglets sont déjà séparés, le wrapper reste gros |
| TeamPage.tsx | 1080 | Extraire le tree renderer, les hooks couple-mode |
| AppContext.tsx | 1061 | Découper en plusieurs contexts (auth + data) ou hooks dédiés |
| UsersPage.tsx | 1037 | Extraire la modale de création + la liste |
| EditInitialAssessmentPage.tsx | 1037 | Mutualiser avec NewAssessmentPage |
| ClientDetailPage.tsx | 1016 | Tabs déjà extraits, reste le hero + actions header |

### TODO/FIXME

- `AgendaPage.tsx:396` — `window.confirm` bloquant sur suppression prospect → modale custom
- `ThankYouStep.tsx:20` — `GOOGLE_REVIEW_URL = "https://g.page/r/REMPLACE_MOI/review"` placeholder
- Pas d'autres FIXME notables

### Console.log en prod

27 appels `console.error/warn` détectés — **tous justifiés** (erreurs Supabase, draft-save, fetch failsafe). Aucun `console.log` debug oublié.

### Tests

7 fichiers de tests Vitest dans `src/lib/__tests__/` :
- assessmentNotesStorage, assessmentValidation, bodyCompositionRanges
- distributorInviteV2, followUpProtocolScheduler, magicLinkToken, measurementCalculations

**Couverture front** : très limitée (zéro tests sur composants React, hooks). Couverture lib pure correcte.

### Conventions

- ✅ Tailwind dominant (1413 occurrences `className=`), ~10 hex hardcodés inline (mineur)
- ✅ `var(--ls-*)` utilisé partout (1801 références)
- ✅ Syne + DM Sans uniquement
- ✅ Pas d'imports cycliques détectés
- ✅ ESLint flat config max-warnings=0 (lint strict)
- ✅ TypeScript strict mode actif

### Patterns à surveiller

- 6 `eslint-disable-next-line react-hooks/exhaustive-deps` — tous documentés
- 1 `@ts-expect-error` (test injection volontaire)
- 0 `as any`, 0 `// @ts-ignore`
- 350+ `!` non-null assertions — toutes après validation préalable explicite

---

## Section 18 — Bugs latents identifiés

### Bug #1 — `GOOGLE_REVIEW_URL` placeholder

- **Symptôme** : bouton "Donner mon avis sur Google" ouvre `https://g.page/r/REMPLACE_MOI/review` (404)
- **Fichier** : `src/components/assessment/ThankYouStep.tsx:20-21`
- **Risque** : 🟢 Trivial
- **Impact** : cosmétique, le bouton existe mais ne mène nulle part de fonctionnel

```diff
# Fix proposé Bug #1
- // TODO Thomas : remplacer par lien officiel Google Reviews La Base Verdun
- const GOOGLE_REVIEW_URL = "https://g.page/r/REMPLACE_MOI/review";
+ const GOOGLE_REVIEW_URL = "<URL OFFICIELLE FOURNIE PAR THOMAS>";

# Justification : remplacer le placeholder par le vrai lien Google Maps
# de La Base Verdun. Thomas doit fournir le lien officiel (récupérable
# via Google Business → Avis → Demander des avis).
# Tests : clic bouton → ouverture Google Reviews avec popup d'écriture d'avis
```

### Bug #2 — `window.confirm` bloquant dans AgendaPage

- **Symptôme** : la suppression d'un prospect bloque le thread JS via `window.confirm`. En cas de mauvaise UX (touch accidentel mobile), pas d'undo
- **Fichier** : `src/pages/AgendaPage.tsx:396`
- **Risque** : 🟡 Moyen
- **Impact** : UX dégradée, pas critique

```diff
# Fix proposé Bug #2
# Remplacer window.confirm par toast avec annulation 5s ou modale custom
# (~30 lignes de modale + state, refacto léger)

# Avant
- if (window.confirm("Supprimer ce prospect ?")) {
-   await deleteProspect(id);
- }

# Après (option toast undo)
+ const undoTimer = setTimeout(() => deleteProspect(id), 5000);
+ pushToast({
+   tone: "info",
+   title: "Prospect supprimé",
+   message: "Annuler",
+   onAction: () => clearTimeout(undoTimer),
+ });

# Justification : window.confirm bloque le thread, mauvaise UX mobile
# Tests : suppression → toast 5s avec annuler → si annulé, prospect intact
```

### Bug #3 — Cascade revocation tokens publics non-batched

- **Symptôme** : `ClientPublicShareConsent.tsx:111` boucle sur les tokens du client pour les marquer révoqués. Si N tokens, N requêtes UPDATE en série
- **Fichier** : `src/components/client-app/ClientPublicShareConsent.tsx:99-120`
- **Risque** : 🟢 Trivial
- **Impact** : invisible aujourd'hui (jamais > 5 tokens par client), mais risque de timeout si 1000+ tokens (quasi impossible)

```diff
# Fix proposé Bug #3
# Remplacer la boucle UPDATE par 1 seule requête batch

# Avant
- const tokens = await sb.from("client_public_share_tokens")
-   .select("id").eq("client_id", clientId);
- for (const t of tokens.data ?? []) {
-   await sb.from("client_public_share_tokens")
-     .update({ revoked_at: new Date().toISOString() })
-     .eq("id", t.id);
- }

# Après
+ await sb.from("client_public_share_tokens")
+   .update({ revoked_at: new Date().toISOString() })
+   .eq("client_id", clientId)
+   .is("revoked_at", null);

# Justification : 1 update au lieu de N. Plus rapide, atomique côté DB.
# Tests : créer 3 tokens, révoquer consentement → vérifier les 3 ont
# revoked_at non-null
```

### Bug #4 — IP hash sans salt (RGPD pseudonymisation)

- **Symptôme** : `resolve-public-share/index.ts` hash IP en SHA256 brut. RGPD recommande pseudonymisation (impossible de revenir à l'IP même avec accès DB)
- **Fichier** : `supabase/functions/resolve-public-share/index.ts:33-39`
- **Risque** : 🟡 Moyen
- **Impact** : RGPD partiel, à corriger pour conformité stricte

```diff
# Fix proposé Bug #4
# Ajouter un salt côté Deno depuis env var

# Avant
- async function sha256(input: string): Promise<string> {
-   const buf = new TextEncoder().encode(input);
-   const hash = await crypto.subtle.digest("SHA-256", buf);
-   return Array.from(new Uint8Array(hash))
-     .map(b => b.toString(16).padStart(2, "0"))
-     .join("");
- }

# Après
+ const SALT = Deno.env.get("IP_HASH_SALT") ?? "";
+ async function sha256(input: string): Promise<string> {
+   const buf = new TextEncoder().encode(SALT + input);
+   const hash = await crypto.subtle.digest("SHA-256", buf);
+   return Array.from(new Uint8Array(hash))
+     .map(b => b.toString(16).padStart(2, "0"))
+     .join("");
+ }

# + ajouter IP_HASH_SALT (32 chars random) dans Supabase Functions secrets
# Justification : avec un salt secret, impossible de retrouver l'IP par
# rainbow table. RGPD pseudonymisation valide.
# Tests : redéployer la function avec le secret, vérifier que les ip_hash
# changent format (les anciens restent en place, ce qui est OK car logs immuables)
```

### Bug #5 — `PROGRAM_INCLUDED_PRODUCT_IDS` dupliqué et incomplet

- **Symptôme** : `NewAssessmentPage.tsx:430` définit un mapping local qui n'inclut pas les programmes sport (`sport-discovery`, `sport-premium`). Si un coach choisit un programme sport, le mapping retourne `undefined` et le code peut planter ou afficher zéro produit
- **Fichier** : `src/pages/NewAssessmentPage.tsx:430-435`
- **Risque** : 🟡 Moyen
- **Impact** : silencieux selon le code consommateur — à vérifier en flow réel

```diff
# Fix proposé Bug #5
# Déplacer le mapping dans programs.ts et compléter sport

# Dans src/data/programs.ts (ajout)
+ export const PROGRAM_INCLUDED_PRODUCT_IDS: Record<ProgramChoiceId, string[]> = {
+   "discovery": ["formula-1", "the-51g", "aloe-vera"],
+   "premium": ["formula-1", "pdm", "aloe-vera", "the-51g"],
+   "booster1": ["formula-1", "pdm", "aloe-vera", "the-51g", "multifibres"],
+   "booster2": ["formula-1", "pdm", "aloe-vera", "the-51g", "phyto-brule-graisse"],
+   "sport-discovery": ["formula-1", "barres-proteinees-achieve"],
+   "sport-premium": ["formula-1", "barres-proteinees-achieve", "rebuild-strength", "cr7-drive"],
+   "unit": [],
+ };

# Dans src/pages/NewAssessmentPage.tsx
- const PROGRAM_INCLUDED_PRODUCT_IDS: Record<string, string[]> = { ... };
+ import { PROGRAM_INCLUDED_PRODUCT_IDS } from "../data/programs";

# Justification : source de vérité unique, support sport complet
# Tests : bilan sport → étape Programme → choix Premium Sport → vérifier que
# les 4 produits apparaissent en routine matin (pas zéro)
```

### Bug #6 — Couple mode résolution par nom fragile

- **Symptôme** : `teamConfig.resolveCoupleUserIds()` matche par nom "Thomas" / "Mélanie". Si Thomas devient "Thomas Koss" en DB, ou Mélanie change pour "Mel" → le couple n'est plus détecté, l'UI revient à 2 cards distinctes
- **Fichier** : `src/config/teamConfig.ts:50-80`
- **Risque** : 🟡 Moyen
- **Impact** : silencieux (couple disparaît visuellement), pas de crash

```diff
# Fix proposé Bug #6 (option A — config explicite)
# Renseigner les UUIDs hardcodés une fois pour toutes

- export const COUPLE_USER_IDS_HARDCODED: string[] = [];
+ export const COUPLE_USER_IDS_HARDCODED: string[] = [
+   "<UUID-THOMAS-FOURNI-PAR-DB>",
+   "<UUID-MELANIE-FOURNI-PAR-DB>",
+ ];

# Justification : UUID stable, le nom peut changer sans casser
# Tests : changer le nom Thomas en DB → vérifier couple toujours affiché

# Fix proposé Bug #6 (option B — table DB dédiée)
# 🔴 Lourd : créer table distributor_couples + migration RLS + UI admin
# Recommandé seulement si plus de 1 couple à gérer (ex: futurs co-coachs)
```

### Bug #7 — `start_date` non typée date côté DB

- **Symptôme** : `clients.start_date` est `text` au lieu de `date`. Aucune contrainte CHECK. Un coach peut entrer une string invalide
- **Fichier** : migration historique (à retracer)
- **Risque** : 🟡 Moyen
- **Impact** : silencieux car le flow de save passe par un input HTML date qui formate ISO. Mais si jamais un coach modifie via SQL ou import CSV, possible

```diff
# Fix proposé Bug #7
# Migration : casting + contrainte
# 🔴 Lourd car migration impacte les 2 environnements (prod + dev)

-- Migration 20260427120000_clients_start_date_strict.sql
-- Vérifier d'abord qu'aucun start_date existant n'est invalide
SELECT id, start_date FROM clients
WHERE start_date IS NOT NULL
  AND start_date !~ '^\d{4}-\d{2}-\d{2}';

-- Si vide → migration safe :
ALTER TABLE clients
  ALTER COLUMN start_date TYPE date USING start_date::date;

# Justification : type stricte = sécurité données long-terme
# Tests : créer un client → start_date doit être ISO valide en DB
```

### Bug #8 — VAPID lazy init non thread-safe

- **Symptôme** : `_shared/push.ts:31-46` utilise des flags globaux `vapidInitialized` / `vapidInitError`. Si 2 invocations Edge se font en parallèle au cold start, race possible sur `setVapidDetails()`
- **Fichier** : `supabase/functions/_shared/push.ts:31-46`
- **Risque** : 🟢 Trivial (très improbable en pratique)
- **Impact** : 1 push raté max sur cold start massif (jamais observé)

```diff
# Fix proposé Bug #8
# Initialiser au top-level du module Deno (pas lazy)

- let vapidInitialized = false;
- let vapidInitError: Error | null = null;
- function ensureVapid() { ... }

+ // Top-level init : Deno modules sont thread-safe au top
+ const VAPID_PUBLIC = Deno.env.get("VAPID_PUBLIC_KEY")!;
+ const VAPID_PRIVATE = Deno.env.get("VAPID_PRIVATE_KEY")!;
+ webpush.setVapidDetails("mailto:contact@lorsquad.com", VAPID_PUBLIC, VAPID_PRIVATE);

# Justification : init synchrone une fois, plus simple
# Tests : envoi push après cold start → succès garanti
```

### Bug #9 — `AppContext.programs` statique non-rafraîchissable

- **Symptôme** : `programs: PROGRAMS_LEGACY` initialisé au mount, jamais rafraîchi. Toute évolution catalogue nécessite redeploy
- **Fichier** : `src/context/AppContext.tsx` (init)
- **Risque** : 🟢 Trivial (catalogue stable)
- **Impact** : nul tant que le catalogue reste hardcoded

```diff
# Fix proposé Bug #9 — non urgent
# Documentation : confirmer que le catalogue restera hardcoded
# OU : prévoir une table programs en DB pour les futurs modules Noaly
# qui auront leurs propres catalogues
```

### Bug #10 — Cleanup async push subscriptions sans await

- **Symptôme** : dans `_shared/push.ts:171-173`, le `.delete()` sur subscriptions 404/410 est fire-and-forget. Si plusieurs cleanup en parallèle, possibles erreurs DB silencieuses
- **Fichier** : `supabase/functions/_shared/push.ts:171-173`
- **Risque** : 🟢 Trivial

```diff
# Fix proposé Bug #10
- // Cleanup async, non-bloquant
- supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
+ // Cleanup awaité pour propre logging des erreurs
+ const { error: cleanupErr } = await supabase
+   .from("push_subscriptions")
+   .delete()
+   .eq("endpoint", endpoint);
+ if (cleanupErr) console.error("[push] cleanup failed", cleanupErr);

# Justification : meilleure observabilité, surcout négligeable
```

### Bug #11 — User_agent stocké brut (RGPD)

- **Symptôme** : `client_public_share_views.user_agent` stocké en clair (truncated 500 chars). Peut révéler device/OS/version au coach via SELECT logs
- **Fichier** : migration `20260424212000`
- **Risque** : 🟡 Moyen
- **Impact** : RGPD partiel — rétention du strict nécessaire

```diff
# Fix proposé Bug #11
# Stocker un user_agent simplifié (juste device class) au lieu du full UA

# Dans resolve-public-share/index.ts :
- const userAgent = req.headers.get("user-agent")?.slice(0, 500) ?? null;
+ function classifyUserAgent(ua: string | null): string {
+   if (!ua) return "unknown";
+   if (/Mobile|Android|iPhone|iPad/.test(ua)) return "mobile";
+   if (/Bot|Crawler|Spider/i.test(ua)) return "bot";
+   return "desktop";
+ }
+ const userAgent = classifyUserAgent(req.headers.get("user-agent"));

# Justification : suffit pour stats de vues, RGPD propre
# Tests : redéployer + vérifier nouveaux logs ont juste mobile/desktop/bot
```

### Bug #12 — `client.startDate` accessible mais peu utilisé après fix

- **Symptôme** : `useClientPriorityAction` utilisait `client.startDate` jusqu'au 27/04. Maintenant le fallback est `initialAssessment?.date`. Si jamais on régresse en remettant `client.startDate` direct, l'incohérence revient
- **Fichier** : `src/hooks/useClientPriorityAction.ts:97-99`
- **Risque** : 🟢 Trivial — risque de régression future
- **Impact** : observatoire

```diff
# Fix proposé Bug #12 — préventif
# Ajouter un test Vitest dédié

# Créer src/lib/__tests__/clientPriorityAction.test.ts (~30 lignes)
+ describe("useClientPriorityAction", () => {
+   it("send_followup uses initialAssessment.date as anchor", () => {
+     const client = mockClient({ startDate: null, assessments: [
+       { type: "initial", date: subDays(new Date(), 5) }
+     ]});
+     const result = computePriorityAction(client, []);
+     expect(result.type).toBe("send_followup");
+   });
+ });

# Justification : verrou anti-régression sur le fix critique du 27/04
```

### Bug #13 — Booster `pv: 0` forcé (non-bug, à documenter)

- **Symptôme** : les `BOOSTERS` n'ont pas de champ `pv` dans `programs.ts`. Le code force `pv: 0` côté ticket dans NewAssessmentPage L1830
- **Fichier** : `src/data/programs.ts` (catalogue) + `src/pages/NewAssessmentPage.tsx:1830`
- **Risque** : 🟢 Trivial — non-bug, choix produit assumé
- **Impact** : aucun (Mélanie/Thomas connaissent les PV des boosters par cœur, pas affichés en bilan)

```diff
# Fix proposé Bug #13 — si on veut enrichir
# Ajouter un champ pv optionnel dans BOOSTERS de programs.ts

# Avant (BOOSTERS structure)
{ id: "barres-proteinees-achieve", title: "...", price: 25, ... }

# Après
{ id: "barres-proteinees-achieve", title: "...", price: 25, pv: 6.95, ... }

# Et utiliser b.pv ?? 0 dans NewAssessmentPage:
- pv: 0,
+ pv: b.pv ?? 0,

# Justification : si Thomas veut suivre les PV booster pour reporting Herbalife,
# c'est une donnée légitime. Sinon laisser tel quel.
```

### Bug #14 — `isRéférent` avec accent (potentiel souci refacto)

- **Symptôme** : la fonction est nommée `isRéférent` avec deux `é`. Fonctionne en JS mais peut poser souci si refacto via outils qui ne supportent pas l'unicode dans les identifiants
- **Fichier** : `src/lib/auth.ts`
- **Risque** : 🟢 Trivial
- **Impact** : hypothétique (futur outil de refacto)

```diff
# Fix proposé Bug #14
- export function isRéférent(user: User | null): boolean {
+ export function isReferent(user: User | null): boolean {

# Et update tous les imports (4-5 endroits)
# Justification : compat outil + convention ASCII pour identifiants
# Tests : lint + build passent
```

### Bug #15 — `data-theme` toggle dark mode parfois inconsistant

- **Symptôme** : le toggle clair/sombre fonctionne via `html[data-theme='dark']` mais certains composants legacy n'ont pas de variantes dark (cherché dans CSS — environ 10 hex hardcodés inline)
- **Fichier** : multiple (cf grep `#[0-9A-F]{6}` dans `src/`)
- **Risque** : 🟡 Moyen — visuel
- **Impact** : quelques zones illisibles en dark mode

```diff
# Fix proposé Bug #15
# Audit visuel ciblé : passer en dark mode et noter les zones illisibles
# Pour chaque hex inline, remplacer par var(--ls-*) appropriée
# Refacto léger, ~30 min par composant

# Pas de fix unique — chantier ciblé "dark mode polish" recommandé
```

---

## Tableau de bord global

| # | Domaine | Santé | Bugs 🟢 | Bugs 🟡 | Bugs 🔴 | Priorité fix |
|---|---|---|---|---|---|---|
| 1 | Architecture | ✅ | 0 | 0 | 0 | — |
| 2 | Bilan | ✅ | 0 | 1 (#5) | 0 | Moyen-court |
| 3 | Suivi J+X | ✅ | 0 | 0 | 0 | — (vient d'être fixé) |
| 4 | Priorités | ✅ | 1 (#12) | 0 | 0 | Préventif |
| 5 | Recommandations | ✅ | 0 | 0 | 0 | — |
| 6 | Programmes | ⚠️ | 0 | 1 (#5) | 0 | Moyen-court |
| 7 | Calculs | ✅ | 0 | 0 | 0 | — |
| 8 | App client | ✅ | 0 | 0 | 0 | — |
| 9 | Cycle de vie | ⚠️ | 0 | 1 (#7) | 0 | Long-terme |
| 10 | RDV | ✅ | 0 | 0 | 0 | — |
| 11 | Notifications | ⚠️ | 2 (#8, #10) | 0 | 0 | Long-terme |
| 12 | Partage RGPD | ⚠️ | 1 (#3) | 2 (#4, #11) | 0 | Court-terme RGPD |
| 13 | Tracking PV | ✅ | 0 | 0 | 0 | — |
| 14 | Hiérarchie | ⚠️ | 0 | 1 (#6) | 0 | Court-terme |
| 15 | Auth & sécurité | ✅ | 1 (#14) | 0 | 0 | Refacto |
| 16 | Mémoire métier | ✅ | 0 | 0 | 0 | — |
| 17 | Dette technique | ⚠️ | 1 (#2) | 1 (#15) | 0 | Steady |
| 18 | Bugs latents | — | 6 totaux | 5 totaux | 0 | Voir Top 5 |

**Total : 6 bugs 🟢 trivials, 5 bugs 🟡 moyens, 0 bugs 🔴 lourds**

---

## Top 5 fixes recommandés

### 1. Bug #5 — Compléter `PROGRAM_INCLUDED_PRODUCT_IDS` pour sport (🟡)

**Pourquoi prioritaire** : silencieusement cassé en flow sport. Si un coach choisit "Premium Sport" à l'étape Programme, le mapping ne renvoie rien → routine matin vide ou erreur. Impact direct sur la qualité du bilan livré au client.

**Effort** : 15-20 min. Déplacer le mapping dans `programs.ts`, compléter pour tous les `ProgramChoiceId`, mettre à jour 1 import dans `NewAssessmentPage`.

### 2. Bug #4 — Salt sur IP hash RGPD (🟡)

**Pourquoi prioritaire** : RGPD strict requiert pseudonymisation, pas juste hash. Conformité juridique en cas d'audit. La modification est isolée à 1 edge function + 1 secret env var.

**Effort** : 30 min. Modifier `resolve-public-share/index.ts`, ajouter secret Supabase `IP_HASH_SALT`, redéployer.

### 3. Bug #11 — User_agent simplifié RGPD (🟡)

**Pourquoi prioritaire** : même logique que #4. Stocker juste `mobile|desktop|bot` au lieu du full UA limite l'exposition de données techniques.

**Effort** : 15 min. Helper `classifyUserAgent()` + remplacer 1 ligne.

### 4. Bug #6 — Couple mode UUIDs hardcodés (🟡)

**Pourquoi prioritaire** : si tu modifies ton nom ou celui de Mélanie en DB un jour (ajout nom de famille, accent enlevé), la fusion couple casse silencieusement. UUID fixe = stable à vie.

**Effort** : 5 min. Récupérer les 2 UUID via Supabase Studio + remplacer `[]` par `["uuid-1", "uuid-2"]`.

### 5. Bug #2 — `window.confirm` AgendaPage (🟡)

**Pourquoi prioritaire** : seul UX réellement dégradé pour l'usage quotidien. Sur mobile, un touch accidentel sur "Supprimer prospect" est sans rappel. Mélanie/Thomas opèrent en mobilité.

**Effort** : 30-45 min. Modale custom OU toast undo (recommandé : toast 5s).

---

## Forces de la codebase

1. **Architecture sobre** : pas de Redux/Zustand inutiles, AppContext suffit pour la taille du projet
2. **Conventions homogènes** : `var(--ls-*)`, Syne/DM Sans, naming, structure dossiers — appliquées partout
3. **TypeScript strict** : zéro `as any`, lint max-warnings=0, build cassé si erreur de type
4. **Migrations DB idempotentes** : `IF NOT EXISTS`, `DROP IF EXISTS`, `CREATE OR REPLACE` partout
5. **Documentation `CLAUDE.md`** : règles RLS critiques, post-mortems, leçons apprises (frayeur RLS du 25/04 documentée)
6. **RLS sérieux** : helper `is_in_user_subtree`, `can_access_owner`, scopes admin/référent/distri
7. **Edge Functions bien isolées** : 16 functions, chacune un rôle clair, pattern partagé via `_shared/push.ts`
8. **Garde-fou `lastFetchError`** : bandeau visible si fetch principal échoue (post-frayeur RLS du 25/04)
9. **Page remerciement post-bilan** : excellent design émotionnel, dark premium toggleable, viral via QR + WhatsApp/SMS/Telegram
10. **Dev/prod workflow** : branche `dev/thomas-test` créée le 27/04, doc complète dans `docs/DEV_WORKFLOW.md` — Mélanie protégée des expérimentations

---

## Points de vigilance long-terme

### 1. Splitter les fichiers > 1500 lignes (`NewAssessmentPage`, `supabaseService`, `AppContext`)

Refactor incrémental. Pas urgent, mais à surveiller chaque fois qu'on rajoute du code dedans.

### 2. Couverture tests front insuffisante

7 fichiers Vitest sur lib pure, zéro test sur composants/hooks/pages. À long-terme, ajouter testing-library pour les flows critiques (bilan, save, priorités).

### 3. RGPD : DSAR (Data Subject Access Request)

Aujourd'hui le client peut révoquer son consentement mais pas demander "qui a accédé à mes données ?". Pour conformité RGPD article 15, prévoir endpoint `/me/access-log`.

### 4. Multi-tenant Noaly

Architecture actuelle est 100% mono-tenant Lor'Squad. Pour d'autres organisations (futur module formation, autres coachs Herbalife indépendants), il faudra :
- Table `organizations` + colonne `organization_id` sur `clients`, `users`, `assessments`
- Refacto RLS pour ajouter scope organisation
- Switcher d'organisation dans l'UI admin

### 5. Catalogue produits hardcodé

`programs.ts` + `pvCatalog.ts` + `herbalifeCatalog.ts` sont en code source. Toute évolution prix, ajout produit, retrait → redeploy. À envisager : table `products` en DB avec admin UI pour Mélanie/Thomas.

### 6. Migration DB partagée prod/dev

Le projet Supabase est unique. Une migration impacte les 2 environnements. À surveiller pour ne pas casser prod en testant dev.

### 7. Cron jobs sans backoff

`morning-suivis-digest` et `rdv-imminent-notifier` ne savent pas quoi faire sur erreur transient. À renforcer avec retry logic + dead letter queue si volume augmente.

### 8. Edge Functions versioning

Aujourd'hui chaque deploy écrase la précédente. Pas de rollback simple. Pour les Edge Functions critiques (`client-app-data`, `resolve-public-share`), envisager versioning par tag git + redéploiement explicite.

### 9. Service Worker basique

`public/sw.js` ne gère que push + skipWaiting. Pas de cache offline, pas de fallback. Pour PWA installée (app client iOS), envisager Workbox pour offline-first.

### 10. Pas de monitoring runtime

Aucun Sentry/LogRocket/équivalent. Les erreurs runtime côté front passent silencieusement (sauf garde-fou `lastFetchError`). À envisager pour scaler.

---

## Questions ouvertes

(Aucune question bloquante détectée pendant l'audit. Voici des points de clarification optionnels que Thomas pourra trancher.)

1. **Bug #14 — `isRéférent` accentué** : conserver le nom français (cohérence métier) ou ASCII-iser ? Décision Thomas.

2. **Catalogue programmes hardcodé vs DB** : à quel volume de modifications l'équipe estime que le catalogue mérite une table DB + UI admin ? (5 modifs/an → reste statique ; > 1 modif/mois → migrer.)

3. **Multi-tenant Noaly** : timeline souhaitée par Thomas ? Si dans 6+ mois, ne rien faire maintenant. Si dans 3 mois, commencer architecture.

4. **Sentry / monitoring** : prêt à investir ~30€/mois sur Sentry ou laisser tel quel pour l'instant ? La taille du projet ne justifie pas encore.

5. **Tests components** : volonté d'ajouter testing-library ? Si oui, par quel composant commencer ? Suggestion : `useClientPriorityAction` + `ActionsRdvBlock` (logique critique récemment cassée).

---

**Fin de l'audit.**

Aucun fichier de code modifié pendant cet audit. Aucune branche existante touchée hors `audit/general-deep-dive` (cette branche dédiée).

Le rapport est prêt à servir de base pour les prochains chantiers, prioriser les fixes, et briefer un nouveau dev qui rejoindrait le projet.
