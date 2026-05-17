# Architecture Snapshot — La Base 360

> Note de nommage : le repo et le code source utilisent encore l'ancien
> nom "Lor'Squad Wellness" (package.json, CLAUDE.md, branches). Ce
> renommage n'est PAS encore propagé au code — tâche à part. Tout
> nouveau document / nouvelle UI doit utiliser **La Base 360**.

> **Date** : 2026-05-10
> **Stack** : React 18 + Vite + TypeScript / Supabase (Postgres + Edge Functions Deno) / PWA
> **Branches actives** : `claude/focused-pike` (prod) + `dev/thomas-test` (test)
> **But de ce doc** : carte mentale de l'app pour situer rapidement où une nouvelle idée se branche, détecter les doublons, anticiper les conflits avec l'existant.

---

## 1. Vue d'ensemble

L'app sert **3 publics** sur la même base :

| Public | Surface | Auth |
|---|---|---|
| **Distri / Référent / Admin** (coach) | App principale (sidebar 9 entrées) | Supabase auth + role |
| **Client** | App PWA `/client/:token` (5 onglets) | Token UUID via `client_app_accounts` |
| **Public** (prospect, lead) | Welcome / funnel / partage / onboarding | Aucune ou token éphémère |

3 contextes globaux (`AppContext`, `InstallPromptContext`, `ToastContext`), 26 hooks custom, 36 dossiers components.

---

## 2. Routes

### App coach (auth + ProtectedRoute)

| Section | Routes | Composant clé | Notes |
|---|---|---|---|
| **Co-pilote** | `/co-pilote` (V5) + `/co-pilote-legacy` | CoPiloteV5Page | Refonte V5 mai 2026, legacy en fallback |
| **FLEX** | `/flex`, `/flex/onboarding`, `/flex/equipe` | FlexDashboardPage | Moteur quotidien 5-3-1 |
| **Clients** | `/clients`, `/clients/:id`, `/clients/:id/start-assessment/edit`, `/clients/:id/assessments/:aid/edit`, `/clients/:id/follow-up/new`, `/clients/:id/schedule/edit`, `/clients/:id/bilan-termine` | ClientsPage, ClientDetailPage | V2 livrée (filtres, kanban DnD, bulk message) |
| **Bilan** | `/assessments/new` | NewAssessmentPage (4325 L) | 14 étapes, hotspot refacto |
| **Agenda** | `/agenda` | AgendaPage (2251 L) | Calendar + blocages, hotspot refacto |
| **Messagerie** | `/messages`, `/messagerie/conversation/:messageId` | MessagesPage, ConversationView | Bug actuel : `.limit(50)` global cf. §10 |
| **PV** | `/pv`, `/pv/team` (admin) | PvOverviewPage, PvTeamPage | |
| **Rentabilité** | `/rentabilite` | RentabilitePage | Jauge €/mois (chantier A en cours) |
| **Analytics** | `/analytics` (admin) | AnalyticsPage | KPI + funnel + top + tendance 12m |
| **Équipe** | `/team` (admin), `/distributors/:id` | TeamPage | Arbre parrainage interactif |
| **Recommandations** | `/recommendations` | RecommendationsPage | |
| **Outils prospection** | `/outils-prospection` (admin) | OutilsProspectionPage | |
| **Charte** | `/charte`, `/distributors/:id/charte`, `/admin/charter-thumbs` | CharterPage | Refonte premium 2026-05-03 |
| **Mon développement (hub)** | `/developpement`, `/developpement/flex-explique`, `/developpement/nouveautes` | DeveloppementHubPage | Pattern Option B (cartes) |
| **Cahier de bord / EBE** | `/cahier-de-bord`, `/simulateur-ebe` | CahierDeBordPage | 21j cobaye + liste 100 |
| **Academy** (admin only) | `/academy`, `/academy/:sectionId`, `/academy/sandbox`, `/academy/certificat`, `/academy/playbook` | AcademyOverviewPage | La Base 360 — Phase 1 OK |
| **Formation** (admin only) | `/formation`, `/formation/parcours/:level/:module`, `/formation/mon-equipe`, `/formation/admin`, `/formation/boite-a-outils[/:slug]`, `/formation/certificat`, `/formation/glossaire`, `/formation/reconnaissance`, `/formation/calculateur` | FormationPage | Pyramide multi-tier en cours |
| **Guides** | `/guide`, `/guide-suivi` | GuidePage | |
| **Users / Settings** | `/users` (admin), `/parametres` (admin), `/settings`, `/debug/notifications` (admin) | UsersPage, ParametresPage | |

### App client PWA

- `/client/:token` → ClientAppPage (5 onglets : Accueil, Conseils, Produits, Chat, Évolution)
- `/client/:token/sandbox` → ClientSandboxPage (4 quêtes interactives)

### Public

`/welcome`, `/login`, `/auto-login`, `/forgot-password`, `/reset-password`, `/frozen`, `/opportunite`, `/simulateur`, `/partage/:token`, `/recap/:token`, `/rapport/:token`, `/bienvenue` (onboarding client), `/bienvenue-distri` (onboarding distri), `/legal/mentions`, `/legal/confidentialite`.

---

## 3. State global — `AppContext` (1116 L)

Source de vérité unique côté front. Expose :
- **Auth** : `authReady`, `bootError`, `currentUser`, `currentSession`, `lastFetchError`
- **Data** : `users`, `clients`, `visibleClients`, `followUps`, `visibleFollowUps`, `activityLogs`, `pvClientProducts`, `pvTransactions`, `programs`, `prospects`, `followUpProtocolLogs`, `clientMessages` (⚠️ limit 50)
- **Computed** : `unreadMessageCount`
- **Mutations** : `createClient`, `updateClient`, `archiveMessage`, `markMessageRead`, etc.

Garde-fous installés :
- `bootError` → hard-fail si Supabase indisponible (pas de mode mock depuis 2026-04)
- `lastFetchError` → bandeau rouge en haut si fetch principal plante (anti-RLS-foireuse silencieuse, leçon 25/04/2026)

---

## 4. Hooks custom (26)

**Data agrégée** : `useCopiloteData`, `useTeamData`, `useAdminAnalytics`, `useUserRentability`, `useDormantClients`, `useClientLiveData`, `useClientPriorityAction`, `usePvActionPlan`, `useTeamEngagement`

**Domaine PV** : `useManualPvEntries`, `usePvCheckedTracker`, `usePvColumnOverride`

**Formation / gamification** : `useFormationProgress`, `useFormationStreak`, `useCharter`

**Messagerie / notifs** : `useRealtimeMessages` (Supabase realtime sub), `useMessageActions`, `usePushNotifications`, `useAutoNotifications`, `useAnnouncements`

**UX / système** : `useAppContext`, `useTheme` (light/dark), `useGlobalView`, `useCahierDeBord`, `useClientConsent`

---

## 5. Components — organisation

```
src/components/
├─ assessment/      28 fichiers   Steps bilan 1-14 + body-scan, choice-group
├─ formation/       24 fichiers   Academy + parcours + wizard modules
├─ client-app/      20 fichiers   Onglets PWA, hero, charts, modales
├─ ui/              16 fichiers   Button, Card, Modal, Badge, Select, Field
├─ charter/         16 fichiers   Template selector, signature, viewer
├─ client/          15 fichiers   Form, selector, card renderer
├─ copilote/        15 fichiers   Cards : birthday, PV action, hero, weather
├─ settings/        11 fichiers   Profile, preferences, admin tabs
├─ body-scan/        9 fichiers   Metrics, chart, input form
├─ client-detail/    7 fichiers   Header, actions tab, notes panel
├─ team/             5 fichiers   Tree viewer, member card, stats
├─ pwa/              5 fichiers   Install prompt, SW navigator, update banner
├─ pv/               5 fichiers   Transaction input, grid, chart
├─ rentability/      4 fichiers   Gauge, breakdown, chart
├─ layout/           4 fichiers   AppLayout, header, sidebar, footer
└─ [autres ~15 dossiers]
```

---

## 6. Lib & services

**`src/lib/`** (41 fichiers) :
- Métier Herbalife : `herbalifeId.ts`, `herbalifeFormulas.ts`, `bodyCompositionRanges.ts`, `flexCalculations.ts`, `lifecycleMapping.ts`
- Bilan : `assessmentRecommendations.ts`, `assessmentNotesStorage.ts` (IndexedDB drafts), `calculations.ts`, `measurements.ts`, `evolutionReport.ts`
- Comm : `messageTemplates.ts`, `googleCalendar.ts`
- UX : `formatRelative.ts`, `getInitials.ts`, `detectDevice.ts`, `clientQuickFilters.ts`
- Auth : `auth.ts` (`canAccessClient`, `getVisibleClients`)

**`src/services/`** (3 fichiers) :
- `supabaseClient.ts` — init + `isSupabaseUnavailable()` check
- `supabaseService.ts` — **2340 L, monolithe candidate refacto** (50+ functions RPC + queries)
- `appDataService.ts` — wrapper localStorage (PV, products, activity)

---

## 7. Types domaine (`src/types/domain.ts`)

Entités principales :
- **User** (distri/referent/admin, role, sponsorId, currentRank, frozenAt, city, avatarUrl, bio)
- **Client** (firstName, sex, phone, age/birthDate, height, objective, lifecycleStatus, vipStatus, businessCuriosity, distributorId)
- **AssessmentRecord** (type initial/follow-up, bodyScan, questionnaire 40+ champs, sportProfile, currentIntake, coachNotes)
- **FollowUp** (clientId, dueDate timestamptz, type, status, programTitle)
- **FollowUpProtocolLog** (log respect protocole F1/F21)
- **ClientMessage** (sender coach/client, message_type, read, archived_at, resolved_at)
- **Prospect** (lead pipeline avant bilan)
- **ActivityLog** (audit trail)
- **PvClientTransaction** + **PvClientProductRecord**

Enums clés :
- `LifecycleStatus` : active / not_started / paused / stopped / lost
- `Objective` : weight-loss / sport / mass-gain / strength / cutting / endurance / fitness / competition
- `HerbalifeRank` : 12 paliers (distributor_25 → presidents_50) — pilote la marge FLEX

---

## 8. Backend Supabase

### 8.1 Tables (56, RLS activé partout)

**Auth/Users** (7) : `users`, `client_invitation_tokens`, `distributor_invitation_tokens`, `auto_login_tokens`, `user_sessions`, `client_public_share_tokens`, `unfreeze_requests`

**Clients** (8) : `clients`, `client_app_accounts` (token PWA), `client_measurements`, `client_mood_log`, `client_notes`, `client_xp_events` (gamification), `client_consents` (RGPD), `client_referral_intentions`

**Bilans** (5) : `assessments`, `follow_ups`, `follow_up_protocol_log`, `client_evolution_reports`, `client_recaps`

**PV / Produits** (7) : `pv_programs`, `pv_products`, `pv_program_products`, `pv_client_products`, `pv_transactions`, `pv_monthly_breakdown`, `manual_pv_entries`

**Messagerie** (3) : `client_messages`, `client_referrals`, `rdv_change_requests`

**Activity** (2) : `activity_logs`, `push_notifications_sent`

**Contenu app** (4) : `app_announcements`, `user_announcement_reads`, `user_tour_progress`, `user_tour_reminder_dismissals`

**Formation** (3) : `formation_user_progress`, `formation_review_threads`, `training_progress` *(doublon ?)*

**Push** (2) : `push_subscriptions`, `client_push_subscriptions`

**Cahier de bord / autres** (~6) : `cobaye_photos`, `cobaye_tracker_entries`, `liste_100_contacts`, `daily_quotes`, `daily_action_checkin`, `prospects`, `prospect_leads`, `herbalife_margins`, `client_public_share_views`

> ⚠️ **NE JAMAIS faire `::uuid`** dans une policy permissive (cf. CLAUDE.md). Utiliser `clients.id::text = caa.client_id`.

### 8.2 Edge Functions (24)

**Cron** :
- `morning-suivis-digest` (7h UTC) — digest matin
- `rdv-imminent-notifier` (toutes 5 min) — push RDV dans 1h
- `coach-tips-dispatcher` (6h UTC) — tip quotidien si opt-in
- `client-anniversary-check` (7h UTC) — XP milestones
- `flex-notifier` x6 (DST-aware été/hiver, evening/late/weekly)
- `formation-relay-to-admin` (hourly) — escalade modules > 48h en attente
- `business-plan-reminder` (9h UTC) — relance distri sans plan

**Triggers Postgres** :
- `new-message-notifier` (INSERT client_messages, sender=client) → push coach
- `new-coach-message-notifier` (INSERT client_messages, sender=coach) → push client
- `formation-validation-notifier` (UPDATE formation_user_progress) → push validation/rejet

**Fetch front** (auth ou anon) :
- `client-app-data` (agrégation app client, RLS bypass via service_role)
- `client-app-confirm-calendar`, `client-app-mark-onboarded`
- `generate-auto-login-token`, `consume-auto-login-token`
- `generate-distributor-invite-token`, `validate-...`, `consume-...`
- `generate-invitation-token`, `validate-...`, `consume-...`
- `create-public-share-token`, `resolve-public-share`
- `send-push` (envoi VAPID brut)
- `submit-prospect-lead` (form Welcome)

### 8.3 Triggers Postgres (~14)

Notify (3 triggers → edge functions push), sponsor sync (`users_sync_parent_sponsor_trigger`, `users_auto_fallback_sponsor_trigger`), `updated_at` auto (formation, tour, cobaye), recalc PV ascendants (`trg_pv_refresh_vip_ascendants`).

### 8.4 Storage

2 buckets : `avatars` (legacy), `user-avatars` (depuis 2026-04-30). Pas de bucket bilans/exports — tout reste en JSONB ou tokens expirants.

---

## 9. Conventions et règles

| Règle | Détail | Source |
|---|---|---|
| **Datetime** | `timestamptz` partout, jamais `timestamp` (drift DST) | Migration 20260429160000 |
| **RLS cast** | Jamais `::uuid` dans policy permissive — utiliser `::text` | Leçon 25/04/2026 |
| **Theme** | `var(--ls-*)` partout, jamais de `#HEXVALUE` hardcodé | `src/styles/globals.css` |
| **Branches** | Feature → `feat/X` depuis `dev/thomas-test`. Hotfix → `fix/X` depuis `claude/focused-pike` | `docs/DEV_WORKFLOW.md` |
| **Livrable complet** | Code prod + entrée `app_announcements` + fiche `/developpement` si UX non-évidente | CLAUDE.md "Règle livrable complet" |
| **Sidebar** | 7-9 items max, ne PAS ajouter d'entrée — passer par hub `/developpement` | Pattern Option B |
| **Edge function client app** | Toute donnée client passe par `client-app-data`, jamais SELECT direct | Architecture client app 2026-04-26 |

---

## 10. Hotspots & dette identifiés

### 🔴 Refacto urgente (pages > 800 L)

| Fichier | Lignes | Stratégie |
|---|---|---|
| `NewAssessmentPage.tsx` | 4325 | Scinder les 14 steps en sous-composants + step-controller |
| `AgendaPage.tsx` | 2251 | Extraire grid calendar + handlers + filtres en hooks |
| `services/supabaseService.ts` | 2340 | Découper en mini-modules par domaine |
| `TeamPage.tsx` | 1479 | Memoize tree rendering récursif |
| `ClientDetailPage.tsx` | 1403 | Découper header/history/follow-up/actions |
| `ClientsPage.tsx` | 1340 | Extraire kanban / filtres / bulk actions |
| `BienvenueDistriPage.tsx` | 1340 | Wizard OK, vérifier perf form |
| `ClientSandboxPage.tsx` | 1310 | Vérifier réutilisabilité quest engine |
| `ClientAppPage.tsx` | 1285 | OK pour PWA mais surveiller bundle |
| `UsersPage.tsx` | 1233 | Pagination/search à isoler |
| `NewFollowUpPage.tsx` | 1200 | Validation rules à extraire |
| `EditInitialAssessmentPage.tsx` | 1192 | Mapper sur refacto NewAssessmentPage |
| `LoginPage.tsx` | 1086 | OK |

### 🟡 Bug ouvert : messagerie mobile

`AppContext.tsx:278` charge **les 50 derniers messages globalement** (`limit(50)`). `ConversationView` filtre ce cache par `client_id` → conversations anciennes vides ou tronquées, écran « Message introuvable » sur lien profond hors-cache. Branche dédiée : `claude/fix-mobile-chat-history-d1jFW`. Fix proposé : direct fetch du thread complet par `client_id` dans ConversationView.

### 🟡 Doublons / ambigüités

- `FormationCharterPage` (DEPRECATED 2026-05-03) vs `CharterPage` (nouveau) — cleanup ancien fichier
- `CoPilotePage` (legacy 7L redirect) vs `CoPiloteV5Page` — fallback `/co-pilote-legacy` à supprimer ~2 sem si stable V5
- Tables `training_progress` vs `formation_user_progress` — fusion possible
- Tables `cobaye_*` + `liste_100_contacts` — vérifier qu'elles sont bien consommées par CahierDeBordPage avant tout cleanup

### 🟢 Couverture sécurité

100 % des tables ont RLS activé. Audit L2 du 2026-04-19 a resserré les policies. Tokens publics (UUID 128 bits) protégés par expiration courte (90j). Bandeau rouge front si fetch RLS plante.

---

## 11. Cibles d'ancrage par type de feature

Pour situer rapidement où une nouvelle idée se branche :

| Type d'idée | Cibles probables |
|---|---|
| **Action quotidienne distri** | Co-pilote V5 (widget) ou FLEX (5-3-1) |
| **Métrique business** | `/rentabilite` (jauge), `/analytics` (admin), `/pv` |
| **Outil pédagogique** | Hub `/developpement` (carte) — JAMAIS d'entrée sidebar |
| **Outil prospection** | `/outils-prospection` |
| **Action client à distance** | App client PWA (onglet correspondant) + `client-app-data` |
| **Notif push** | Edge function (cron ou trigger) + `push_subscriptions` |
| **Annonce/changelog distri** | Migration `app_announcements` + page `/developpement/nouveautes` |
| **Nouveau template message** | `src/lib/messageTemplates.ts` + modale popup multi-canal |
| **Nouvelle métrique bilan** | Step `NewAssessmentPage` + lib `calculations.ts` + `assessments.questionnaire` jsonb |

---

## 12. Roadmap connue (mémo CLAUDE.md mai 2026)

### Chantiers prioritaires validés Thomas

| # | Nom | Effort | Statut | Dépendance |
|---|---|---|---|---|
| **A** | Jauge rentabilité € net mois | ~5h | À démarrer | Migration `herbalife_margins` + RPC SQL |
| **B** | Relances clients dormants V2 | ~3h | À démarrer | Booste les revenus visibles dans #A |
| **C** | Intégration paiement Square | 2-3j+ | À démarrer | Compte Square + Twilio SMS |

### Chantiers post-V5 Co-pilote

| # | Nom | Effort | Notes |
|---|---|---|---|
| **D** | Popup météo 5 jours sur ville distri | 2-3h | API gratuite Open-Meteo |
| **E** | Refonte sidebar emojis (HTML V5 ref) | 3h | Touche TOUS les écrans |
| **F** | Refonte UI dark mode V5 | 3h | Design review nécessaire |

### Roadmap antérieure encore valide

- 🔴 **Onboarding client PWA** (1.5-2j) — sections welcome `/client/:token`, migration `onboarded_at`
- 🔴 **La Base 360 AI** (3-4j) — FAB chat ChatGPT-like, edge function Anthropic API, table `ai_usage_log`

### Mini-chantier en attente

- Champ admin "PV total Bizworks" override jauge mensuelle (1h, low-priority)
- Plan d'action PV (notif matin "tu es à X / Y, plan : 3 relances") — dépend de chiffres PV justes

---

**Fin de la snapshot.** Ce doc est généré le 2026-05-10 à partir d'un audit automatisé front + back. Le mettre à jour quand un chantier majeur est livré.
