# Audit Phase 3.5 — Carte refacto codebase

**Date** : 2026-05-19 (mardi, retour PC)
**Cible** : tous fichiers `src/**/*.{ts,tsx}` ≥ 800 lignes (42 fichiers détectés)
**Source** : audit lecture-seule, zéro modif code.
**Compagnon** : `docs/ARCHITECTURE_SNAPSHOT_2026-05.md` (mai 2026).

---

## 1. Carte priorisée 🔴 / 🟡 / 🟢

### 🔴 Refacto **prioritaire** (taille critique + churn élevé + risque régression)

| Fichier | Lignes | Pourquoi 🔴 | Stratégie reco |
|---|---|---|---|
| `pages/NewAssessmentPage.tsx` | **4350** | Le pire offender. 14 steps mélangés, hotspot bugs récurrents. Sous-chantier "scinder en step-controller" déjà identifié brainstorm (chantier #9 retiré vague 1). | **Refacto extraction step components** quand on touchera au flow bilan pour autre raison. Ne PAS faire en chantier dédié maintenant (zéro impact mentionné en vague 1). |
| `services/supabaseService.ts` | **2443** (+103 vs avril) | Monolithe 50+ functions. Modifié à chaque chantier (+103 L depuis snapshot). Risque conflit fort sur PRs simultanées. | **Découper par domaine** : `services/clients.ts` / `services/pv.ts` / `services/formation.ts` / `services/messaging.ts` / `services/charter.ts`. Effort ~4-6 h. Faisable un dimanche calme. |
| `pages/AgendaPage.tsx` | **2251** | Grid calendar + handlers + filtres + DnD inline. Maintenable mais fragile. | Extraire `useAgendaGrid` hook + `<AgendaFilters />` + `<AgendaCalendarGrid />`. Effort ~3 h. |

### 🟡 À **surveiller** (taille élevée mais code structuré, refacto opportuniste)

| Fichier | Lignes | Cause | Stratégie |
|---|---|---|---|
| `data/formation/parcours-content.ts` | 3214 | **Data structuré** (modules formation). Pas du code logique. | OK tel quel. Optionnel : 1 fichier par niveau (`parcours/level-1.ts` etc.). Low priority. |
| `features/academy/sections.ts` | 1914 | Data Academy. Idem. | OK tel quel. |
| `data/formation/boite-a-outils-content.ts` | 1809 | Data outils. Idem. | OK tel quel. |
| `pages/ProspectionPage.tsx` | **1571** | Nouveau — chantier #3 V3, 6 étapes inline. | Quand on i18nise (chantier #5) : extraire chaque étape en `<ProspectionStepN />`. |
| `components/client-detail/ActionsTab.tsx` | 1551 | Onglet Actions fiche client — accumulation sections (templates msg + témoignages + autres). | Découper en sub-tabs ou extraire blocs. ~2 h. |
| `components/pv/PvClientFullPage.tsx` | 1523 | Nouveau — fiche PV client complète. | Surveille. Refacto à anticiper si grossit encore. |
| `pages/TeamPage.tsx` | 1479 | Tree viewer récursif. Memoization à vérifier. | Profile si lag perçu sur grands arbres. |
| `pages/ClientDetailPage.tsx` | 1436 | Hub fiche client. | Header/history/follow-up/actions déjà séparés en composants — OK. |
| `pages/ClientsPage.tsx` | 1425 | 3 onglets (Clients / Leads / Témoignages). | Extraire `<ClientsListView />` (body 404→1286) → passe sous 800 L. ~1 h. |
| `pages/BienvenueDistriPage.tsx` | 1368 | Wizard onboarding distri. | OK structuré en steps. |
| `pages/ClientSandboxPage.tsx` | 1310 | 4 quêtes interactives client app. | OK. |
| `pages/BusinessPage.tsx` | 1306 | Nouveau — chantier #7 V2. | Surveille. |
| `pages/ClientAppPage.tsx` | 1285 | PWA client root. | OK pour PWA, surveiller bundle. |
| `pages/UsersPage.tsx` | 1233 | Liste users admin + pagination + search. | Isoler `useUsersTable` hook. ~1 h. |
| `pages/NewFollowUpPage.tsx` | 1219 | Formulaire suivi. | Validation rules à extraire dans `lib/followUpValidation.ts`. |
| `pages/EditInitialAssessmentPage.tsx` | 1192 | Édition bilan initial. Mapper sur refacto NewAssessmentPage quand fait. | OK pour l'instant. |
| `features/client-vip/ClientVipCoachPanel.tsx` | 1164 | Nouveau VIP V2. | OK structuré. |
| `context/AppContext.tsx` | 1116 | State global app coach. | OK — déjà compact pour ce qu'il fait. Pas de refacto agressif (touche tout). |
| `components/pwa/InstallPwaTutorialModal.tsx` | 1094 | Tutorial install PWA iOS/Android. | OK contenu visuel statique. |
| `pages/LoginPage.tsx` | 1086 | OK structuré. | — |
| `data/pvCatalog.ts` | 1080 | Catalogue produits PV. **Cible chantier #5 i18n** (catalog par marché). | Sera scindé en `pv_product_market_pricing` côté DB lors du chantier i18n. |
| `pages/CahierDeBordPage.tsx` | 1068 | 3 sections (cobaye / liste 100 / EBE) + sub-components inline. | Extraire `<CobayeSection />` / `<ListeSection />` / `<EbeSection />` en fichiers séparés. ~1 h. |
| `pages/OpportunitePage.tsx` | 1020 | Page éducative business. | OK. |
| `components/settings/ProfilTab.tsx` | 1013 | Form profil distri. | OK. |
| `pages/SimulateurPage.tsx` | 1012 | Calculateur revenus prospects. | OK. |

### 🟢 OK (juste au-dessus du seuil, structurés, pas d'urgence)

| Fichier | Lignes | Note |
|---|---|---|
| `pages/AcademyCertificatePage.tsx` | 980 | Génération certificat. |
| `components/client-app/ClientHomeTab.tsx` | 980 | Accueil client PWA. |
| `features/onboarding/OnboardingTutorial.tsx` | 956 | Tour produit. |
| `pages/OutilsProspectionPage.tsx` | 863 | Cf. audit 3.2. |
| `pages/BilanOnlinePage.tsx` | 854 | Chantier #1 page formulaire. |
| `pages/FormationCharterPage.tsx` | 846 | DEPRECATED — cf. ci-dessous cleanup. |
| `components/rentability/RentabilityDetailModal.tsx` | 838 | Modale breakdown. |
| `components/formation/QuizRunner.tsx` | 838 | Quiz module. |
| `pages/academy-demo/DemoFicheClient.tsx` | 827 | Démo. |
| `components/assessment/ProductCatalogModal.tsx` | 823 | Modal produits dans bilan. |
| `pages/FormationCalculatorPage.tsx` | 817 | Calculateur formation. |
| `components/client-app/ClientProductsTab.tsx` | 807 | Onglet produits PWA. |
| `pages/AnalyticsPage.tsx` | 800 | Dashboard admin. |
| `App.tsx` | 800 | Routes + providers. |

---

## 2. Doublons / ambigüités à cleaner (vague 2)

| Fichier | Statut | Action |
|---|---|---|
| `pages/FormationCharterPage.tsx` (846 L) | **DEPRECATED** depuis refonte charter 2026-05-03 (cf. CLAUDE.md) | Supprimer + retirer route de `App.tsx`. ~15 min. |
| `pages/CoPilotePage.tsx` (legacy 7 L redirect) | Fallback `/co-pilote-legacy` | Supprimer ~2 semaines après stabilité V5 confirmée. |
| Tables DB `training_progress` vs `formation_user_progress` | Doublons potentiels | À auditer avant cleanup DB. |

---

## 3. ROI immédiat — top 3 refacto rentables (ordre suggéré)

| # | Cible | Effort | Gain |
|---|---|---|---|
| **1** | `services/supabaseService.ts` (2443 L) → 5 modules | 4-6 h | **Énorme** : réduit conflits merge sur chantiers parallèles, lisibilité ×3, tests possibles par domaine. |
| **2** | `pages/AgendaPage.tsx` (2251 L) → hooks + sous-composants | 3 h | Fragilité ↓, isolation logique calendar / filtres / handlers. |
| **3** | `pages/ClientsPage.tsx` (1425 L) → extraire `<ClientsListView />` | 1 h | Met sous 800 L, alignement avec `ClientDetailPage` (déjà bien découpé). |

**Total top 3 : ~8-10 h.** Faisable un dimanche calme post-vague 1 sans dépendance.

`NewAssessmentPage` 4350 L = à attaquer **uniquement** si on touche au flow bilan pour autre chose (sinon ROI faible vs risque régression).

---

## 4. Recommandation globale

🟢 **Codebase saine globalement**. 42 fichiers > 800 L mais :
- ~10 sont des **data files** (formation, academy, pvCatalog) → légitimes
- ~25 sont des **pages applicatives** structurées avec sous-composants déjà extraits
- ~7 ont une vraie odeur de refacto utile (les 🔴/🟡 actionnables ci-dessus)

**Pas de chantier "refacto massif" dédié à lancer maintenant.** Attaquer les top 3 quand fenêtre dispo, en sous-PRs séparées avec tests régression manuels. Tout le reste reste **opportuniste** (refacto quand on touche le fichier pour autre raison).
