# Changelog

Toutes les modifications notables du projet Lor'Squad Wellness sont
consignées ici.

Format inspiré de [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/),
versionning calendaire (YYYY-MM-DD).

## [Unreleased]

### Added (chantier nuit 2026-04-20)

- **Tests automatisés** : setup Vitest + 24 tests sur le scheduler de
  suivis (`src/lib/followUpProtocolScheduler.ts`) couvrant les 4
  filtres d'éligibilité, la borne J+10, et le calcul jours.
- **Édition bilan — 6 champs** : nouvelle SectionCard « Compléments
  bilan » dans `EditInitialAssessmentPage` pour corriger objectif
  libre, budget snacks/fast-food, saveur F1, lait, programme choisi,
  et analyse petit-déj (sucres/protéines/hydratation/fibres).
- Scripts npm `test` + `test:watch`.

### Fixed (chantier nuit 2026-04-20)

- **93 violations react-hooks/rules-of-hooks** résolues sur 7 pages
  (PvTeamPage, PvOverviewPage, EditClientSchedulePage, DashboardPage,
  ClientDetailPage, EditInitialAssessmentPage, NewFollowUpPage) en
  hissant tous les hooks au-dessus des early returns.
- **35+ warnings jsx-a11y** résolus : `role`/`tabIndex`/`onKeyDown`
  ajoutés sur modales (backdrops), rows de table, cartes cliquables
  (RecapModal, StepRail, ClientGeneralNote, EditScheduleModal,
  FollowUpStepModal, ProspectFormModal, Agenda modal, ClientAppPage,
  DashboardPage CockpitTile + PriorityItem, PvOverviewPage row,
  RecapPage, UsersPage).
- `no-empty` sur ClientDetailPage, `prefer-const` sur NewAssessmentPage.

## [2026-04-20]

### Added

- **Audit complet de l'app** — score 8.5/10, 2 bugs bloquants
  identifiés et corrigés (perte de données 6 champs questionnaire à
  l'édition + 2 composants orphelins supprimés).
- **Étape Félicitations** remplace « Résumé du rendez-vous » dans le
  bilan initial.
- **Refonte étape 11 Programme proposé** : 4 cartes de programme,
  curseur lait animal/végétal, ticket récap sticky.
- **Note générale client** + bloc « À savoir sur ce client » sur la
  fiche.
- **Commandes multi-produits** (jusqu'à 6 lignes par commande) dans
  le suivi PV.
- **Message VIP complet J+7** avec variables sponsor dans le
  protocole 5 étapes.
- Images bilan `saveurs-formula1` + `petit-dejeuner-concept`,
  compressées WebP + fallback PNG via `<picture>`.
- Extension types domain : `consumesMilk`, `programChoice`,
  `customGoal`, `snacksFastFoodPerWeek`, `preferredFlavor`,
  `breakfastAnalysis`.

### Changed

- Ordre des étapes bilan : 5 Body scan → 6 Dégustation → 7 Reco →
  8 Petit-déj.
- Navigation fluide entre Agenda et Dashboard.
- Agenda unifié : follow-ups clients + RDV prospects dans la même vue.
- Étape 12 « Programme proposé » intègre le tunnel de vente complet.

### Fixed

- **Protocole J+1→J+10** : 4 filtres d'éligibilité pour ne plus
  polluer dashboard/agenda avec clients historiques hors cadre (date,
  lifecycle, programme, body scan).
- Bandeau info sur la fiche client quand le protocole est inéligible.
- Empty state explicite sur agenda quand aucun suivi dû.
- Sync du poids-cible entre fiche, rapport d'évolution et app client.
- Sync du poids de départ entre édition bilan et fiche.
- ProductAdder et onglet Produits durcis contre null/undefined.
- Dashboard : filtres RDV du jour, prospects, messages par coach
  connecté.
- CI Vercel : `.npmrc` legacy-peer-deps.

### Removed

- Étapes bilan « Références » et « Recognition » (info peu utilisée).
- Composants éducation orphelins.

## [2026-04-19]

### Added

- **Protocole de suivi 5 étapes** (J+1 → J+14) : FollowUpGuidePage,
  FollowUpProtocolCard + modal, table `follow_up_protocol_log`,
  widget dashboard « Suivis à faire aujourd'hui », onglet Agenda
  « Suivis », fusion items protocole dans l'onglet « Tous ».
- **Suivi libre** (`freeFollowUp`) : client actif hors agenda auto.
- **Free PV tracking** : client sous autre superviseur, exclu des
  listes de réassort mais gardant fiche/bilan/suivis normaux.
- Source prospect « Facebook ».
- Notifications push étendues aux prospects et messages clients.
- ESLint flat config (chantier technique).

### Changed

- Polish UX global : tokens design (`--ls-gold`, `--ls-teal`,
  surfaces), classes utilitaires, migration pills + inputs.
- `mockPvModule` renommé en `pvCatalog`.

### Removed

- Composants éducation dépréciés non utilisés.

## Notes

- Toujours créer de NOUVEAUX commits ; jamais `--amend` sauf demande
  explicite.
- Ne pas modifier : `lib/calculations.ts`, `lib/portfolio.ts`,
  `lib/assessmentRecommendations.ts`, `lib/lifecycleMapping.ts`,
  `lib/evolutionReport.ts`, `lib/followUpProtocolScheduler.ts`
  (tests OK), `data/followUpProtocol.ts`.
