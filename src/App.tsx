import { Suspense, lazy } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { ProtectedRoute, PublicRoute, RoleRoute } from "./components/auth/RouteGuards";
import { AppLayout } from "./components/layout/AppLayout";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { ToastHost } from "./components/ui/ToastHost";
import { CommandPalette } from "./components/ui/CommandPalette";

// CoPilotePage remplace définitivement l'ancien DashboardPage (retiré
// au chantier cleanup-post-audit 2026-04-23).
const GuidePage = lazy(() =>
  import("./pages/GuidePage").then((module) => ({
    default: module.GuidePage
  }))
);
const RecommendationsPage = lazy(() =>
  import("./pages/RecommendationsPage").then((module) => ({
    default: module.RecommendationsPage
  }))
);
const PvOverviewPage = lazy(() =>
  import("./pages/PvOverviewPage").then((module) => ({
    default: module.PvOverviewPage
  }))
);
const PvTeamPage = lazy(() =>
  import("./pages/PvTeamPage").then((module) => ({
    default: module.PvTeamPage
  }))
);
const ClientsPage = lazy(() =>
  import("./pages/ClientsPage").then((module) => ({
    default: module.ClientsPage
  }))
);
const UsersPage = lazy(() =>
  import("./pages/UsersPage").then((module) => ({
    default: module.UsersPage
  }))
);
const TeamPage = lazy(() =>
  import("./pages/TeamPage").then((module) => ({
    default: module.TeamPage
  }))
);
const DistributorPortfolioPage = lazy(() =>
  import("./pages/DistributorPortfolioPage").then((module) => ({
    default: module.DistributorPortfolioPage
  }))
);
const ClientDetailPage = lazy(() =>
  import("./pages/ClientDetailPage").then((module) => ({
    default: module.ClientDetailPage
  }))
);
const EditInitialAssessmentPage = lazy(() =>
  import("./pages/EditInitialAssessmentPage").then((module) => ({
    default: module.EditInitialAssessmentPage
  }))
);
const NewFollowUpPage = lazy(() =>
  import("./pages/NewFollowUpPage").then((module) => ({
    default: module.NewFollowUpPage
  }))
);
const EditClientSchedulePage = lazy(() =>
  import("./pages/EditClientSchedulePage").then((module) => ({
    default: module.EditClientSchedulePage
  }))
);
const BilanTermineePage = lazy(() =>
  import("./pages/BilanTermineePage").then((module) => ({
    default: module.BilanTermineePage,
  })),
);
const NewAssessmentPage = lazy(() =>
  import("./pages/NewAssessmentPage").then((module) => ({
    default: module.NewAssessmentPage
  }))
);
const LoginPage = lazy(() =>
  import("./pages/LoginPage").then((module) => ({
    default: module.LoginPage
  }))
);
const RecapPage = lazy(() =>
  import("./pages/RecapPage").then((module) => ({
    default: module.RecapPage
  }))
);
const EvolutionReportPage = lazy(() =>
  import("./pages/EvolutionReportPage").then((module) => ({
    default: module.EvolutionReportPage
  }))
);
const ClientAppPage = lazy(() =>
  import("./pages/ClientAppPage").then((module) => ({
    default: module.ClientAppPage
  }))
);
// Tier B Livraison B (2026-04-28) : sandbox client interactif 4 quetes.
const ClientSandboxPage = lazy(() =>
  import("./pages/ClientSandboxPage").then((module) => ({
    default: module.ClientSandboxPage
  }))
);
const MessagesPage = lazy(() =>
  import("./pages/MessagesPage").then((module) => ({
    default: module.MessagesPage
  }))
);
const AgendaPage = lazy(() =>
  import("./pages/AgendaPage").then((module) => ({
    default: module.AgendaPage
  }))
);
const FollowUpGuidePage = lazy(() =>
  import("./pages/FollowUpGuidePage").then((module) => ({
    default: module.FollowUpGuidePage
  }))
);
const DebugNotificationsPage = lazy(() =>
  import("./pages/DebugNotificationsPage").then((module) => ({
    default: module.DebugNotificationsPage
  }))
);
const WelcomePage = lazy(() =>
  import("./pages/WelcomePage").then((module) => ({
    default: module.WelcomePage,
  })),
);
const BilanOnlinePage = lazy(() =>
  import("./pages/BilanOnlinePage").then((module) => ({
    default: module.BilanOnlinePage,
  })),
);
const BilanOnlineWelcomePage = lazy(() =>
  import("./pages/BilanOnlineWelcomePage").then((module) => ({
    default: module.BilanOnlineWelcomePage,
  })),
);
const TestimonialFormPage = lazy(() =>
  import("./pages/TestimonialFormPage").then((module) => ({
    default: module.TestimonialFormPage,
  })),
);
const AdminTestimonialsPage = lazy(() =>
  import("./pages/AdminTestimonialsPage").then((module) => ({
    default: module.AdminTestimonialsPage,
  })),
);
const BilanOnlineMerciPage = lazy(() =>
  import("./pages/BilanOnlineMerciPage").then((module) => ({
    default: module.BilanOnlineMerciPage,
  })),
);
const BusinessPage = lazy(() =>
  import("./pages/BusinessPage").then((module) => ({
    default: module.BusinessPage,
  })),
);
const RedirectToBusiness = lazy(() =>
  import("./pages/RedirectToBusiness").then((module) => ({
    default: module.RedirectToBusiness,
  })),
);
const OutilsProspectionPage = lazy(() =>
  import("./pages/OutilsProspectionPage").then((module) => ({
    default: module.OutilsProspectionPage,
  })),
);
const ProspectionPage = lazy(() =>
  import("./pages/ProspectionPage").then((module) => ({
    default: module.ProspectionPage,
  })),
);
const AdminProspectionPage = lazy(() =>
  import("./pages/AdminProspectionPage").then((module) => ({
    default: module.AdminProspectionPage,
  })),
);
const AutoLoginPage = lazy(() =>
  import("./pages/AutoLoginPage").then((module) => ({
    default: module.AutoLoginPage,
  })),
);
const ForgotPasswordPage = lazy(() =>
  import("./pages/ForgotPasswordPage").then((module) => ({
    default: module.ForgotPasswordPage,
  })),
);
const ResetPasswordPage = lazy(() =>
  import("./pages/ResetPasswordPage").then((module) => ({
    default: module.ResetPasswordPage,
  })),
);
const FrozenPage = lazy(() =>
  import("./pages/FrozenPage").then((module) => ({
    default: module.FrozenPage,
  })),
);
const SharePage = lazy(() =>
  import("./pages/SharePage").then((module) => ({
    default: module.SharePage,
  })),
);
const LegalNoticePage = lazy(() => import("./pages/LegalNoticePage"));
const PrivacyPolicyPage = lazy(() => import("./pages/PrivacyPolicyPage"));
const BienvenuePage = lazy(() =>
  import("./pages/BienvenuePage").then((module) => ({
    default: module.BienvenuePage
  }))
);
// Chantier Onboarding distributeur complet (2026-04-24) : wizard
// /bienvenue-distri pour que les nouveaux distri créent leur accès.
const BienvenueDistriPage = lazy(() =>
  import("./pages/BienvenueDistriPage").then((module) => ({
    default: module.BienvenueDistriPage
  }))
);
// Chantier Refonte Navigation (2026-04-22) : nouveau dashboard + placeholders.
const CoPilotePage = lazy(() =>
  import("./pages/CoPilotePage").then((module) => ({
    default: module.CoPilotePage
  }))
);
// Co-pilote V5 Editoriale Premium (2026-05-05) — preview parallele,
// remplace /co-pilote quand validation Thomas.
const CoPiloteV5Page = lazy(() =>
  import("./features/copilote/v5/CoPiloteV5Page").then((module) => ({
    default: module.CoPiloteV5Page,
  }))
);
// Chantier La Base 360 Academy Phase 1 (2026-04-26) : parcours onboarding
// distri en 8 sections. Overview = liste + progression, /academy/:sectionId
// = page de section (placeholder Phase 1, tutoriel interactif Phase 2).
const AcademyOverviewPage = lazy(() =>
  import("./pages/AcademyOverviewPage").then((module) => ({
    default: module.AcademyOverviewPage
  }))
);
const AcademySectionPage = lazy(() =>
  import("./pages/AcademySectionPage").then((module) => ({
    default: module.AcademySectionPage
  }))
);
const AcademyCertificatePage = lazy(() =>
  import("./pages/AcademyCertificatePage").then((module) => ({
    default: module.AcademyCertificatePage
  }))
);
// Mode pratique Academy (2026-04-29 v2) : bac à sable interactif 4 étapes.
const AcademySandboxPage = lazy(() =>
  import("./pages/AcademySandboxPage").then((module) => ({
    default: module.AcademySandboxPage
  }))
);
// Tier B #7 (2026-04-28) : Playbook PDF personnalise post-completion.
const AcademyPlaybookPage = lazy(() =>
  import("./pages/AcademyPlaybookPage").then((module) => ({
    default: module.AcademyPlaybookPage
  }))
);
// Pages démo Academy (2026-04-28) : mockups visuels avec données fictives
// pour les tours, sans dépendre de l'état réel de la base.
const DemoFicheClient = lazy(() =>
  import("./pages/academy-demo/DemoFicheClient").then((module) => ({
    default: module.DemoFicheClient
  }))
);
const DemoAgenda = lazy(() =>
  import("./pages/academy-demo/DemoAgenda").then((module) => ({
    default: module.DemoAgenda
  }))
);
// Chantier Centre de Formation V1 (2026-04-23) : la home /formation est
// FormationPage (catalogue avec progression), /formation/:slug pointe
// vers FormationCategoryPage.
const FormationPage = lazy(() =>
  import("./pages/FormationPage").then((module) => ({
    default: module.FormationPage
  }))
);
// Formation gate (2026-11-04) : direct import (lightweight) pour l afficher
// sans Suspense supplementaire au cas ou un distri tente d acceder.
import { FormationAdminGate } from "./pages/FormationLockedPage";
const FormationCategoryPage = lazy(() =>
  import("./pages/FormationCategoryPage").then((module) => ({
    default: module.FormationCategoryPage
  }))
);
// Phase 2 chantier formation (2026-04-30) : page module parcours guide
// (placeholder en attendant le contenu Notion en Phase 3).
const FormationModulePage = lazy(() =>
  import("./pages/FormationModulePage").then((module) => ({
    default: module.FormationModulePage
  }))
);
// Phase C chantier formation pyramide (2026-11-01) : page Mon equipe
// Formation pour les sponsors (recrues directes + alerte validation).
const FormationMyTeamPage = lazy(() =>
  import("./pages/FormationMyTeamPage").then((module) => ({
    default: module.FormationMyTeamPage
  }))
);
// Phase F-UI chantier formation pyramide : page detail d un module
// (lecons + ancrage + action + quiz).
const FormationModuleDetailPage = lazy(() =>
  import("./pages/FormationModuleDetailPage").then((module) => ({
    default: module.FormationModuleDetailPage
  }))
);
// Phase D chantier formation pyramide : page admin pilotage Formation.
const FormationAdminPage = lazy(() =>
  import("./pages/FormationAdminPage").then((module) => ({
    default: module.FormationAdminPage
  }))
);
// Quick win #5 (2026-11-04) : certificat fin de niveau Formation.
const FormationCertificatePage = lazy(() =>
  import("./pages/FormationCertificatePage").then((module) => ({
    default: module.FormationCertificatePage
  }))
);
// Feature #7 (2026-11-04) : Strategy Plan Calculator (formule 5-3-1).
const FlexOnboardingPage = lazy(() =>
  import("./pages/FlexOnboardingPage").then((module) => ({
    default: module.FlexOnboardingPage,
  })),
);
const FlexDashboardPage = lazy(() =>
  import("./pages/FlexDashboardPage").then((module) => ({
    default: module.FlexDashboardPage,
  })),
);
const FlexTeamPage = lazy(() =>
  import("./pages/FlexTeamPage").then((module) => ({
    default: module.FlexTeamPage,
  })),
);
const CharterPage = lazy(() =>
  import("./pages/CharterPage").then((module) => ({
    default: module.CharterPage,
  })),
);
const AdminDistributorCharterPage = lazy(() =>
  import("./pages/AdminDistributorCharterPage").then((module) => ({
    default: module.AdminDistributorCharterPage,
  })),
);
const AdminCharterThumbsPage = lazy(() =>
  import("./pages/AdminCharterThumbsPage").then((module) => ({
    default: module.AdminCharterThumbsPage,
  })),
);
// Cahier de bord du distri (2026-05-04) — 21j cobaye + liste 100 + journal EBE.
const CahierDeBordPage = lazy(() =>
  import("./pages/CahierDeBordPage").then((module) => ({
    default: module.CahierDeBordPage,
  })),
);
// Simulateur EBE (2026-05-04) — entraînement face à un faux prospect scripté.
const SimulateurEbePage = lazy(() =>
  import("./pages/SimulateurEbePage").then((module) => ({
    default: module.SimulateurEbePage,
  })),
);
// Hub développement (2026-05-04) — point d'entrée centralisé apprentissage.
const DeveloppementHubPage = lazy(() =>
  import("./pages/DeveloppementHubPage").then((module) => ({
    default: module.DeveloppementHubPage,
  })),
);
// FLEX expliqué (2026-05-04) — tuto pédagogique 5-3-1.
const FlexExpliquePage = lazy(() =>
  import("./pages/FlexExpliquePage").then((module) => ({
    default: module.FlexExpliquePage,
  })),
);
// Nouveautés app (2026-05-04) — journal des annonces / changelog distri.
const NouveautesPage = lazy(() =>
  import("./pages/NouveautesPage").then((module) => ({
    default: module.NouveautesPage,
  })),
);
// Rentabilité Phase A (2026-05-05) — jauge €/mois + détail breakdown.
const RentabilitePage = lazy(() =>
  import("./pages/RentabilitePage").then((module) => ({
    default: module.RentabilitePage,
  })),
);
const FormationCalculatorPage = lazy(() =>
  import("./pages/FormationCalculatorPage").then((module) => ({
    default: module.FormationCalculatorPage
  }))
);
// Charte v1 (FormationCharterPage) déprécié 2026-05-03 — remplacée par
// CharterPage à /charte (refonte premium art déco). L'import reste retiré
// pour éviter le code mort dans le bundle.
// Glossaire termes Herbalife (2026-11-04).
const FormationGlossaryPage = lazy(() =>
  import("./pages/FormationGlossaryPage").then((module) => ({
    default: module.FormationGlossaryPage
  }))
);
// Boite a outils La Base 360 (2026-11-04) : 16 outils premium.
const FormationToolkitPage = lazy(() =>
  import("./pages/FormationToolkitPage").then((module) => ({
    default: module.FormationToolkitPage
  }))
);
const FormationToolkitDetailPage = lazy(() =>
  import("./pages/FormationToolkitDetailPage").then((module) => ({
    default: module.FormationToolkitDetailPage
  }))
);
// Feuille de Reconnaissance interactive (2026-11-04).
const FormationRecognitionPage = lazy(() =>
  import("./pages/FormationRecognitionPage").then((module) => ({
    default: module.FormationRecognitionPage
  }))
);
const SettingsPage = lazy(() =>
  import("./pages/SettingsPage").then((module) => ({
    default: module.SettingsPage
  }))
);
// Chantier Paramètres Admin (2026-04-23) : /parametres admin-only avec
// les 5 onglets (Profil, Équipe, Transferts, Stats, Debug).
const ParametresPage = lazy(() =>
  import("./pages/ParametresPage").then((module) => ({
    default: module.ParametresPage
  }))
);
// Chantier Messagerie finalisée (2026-04-23) : vue conversation fil
// WhatsApp-like pour un client donné.
const ConversationView = lazy(() =>
  import("./pages/ConversationView").then((module) => ({
    default: module.ConversationView
  }))
);
// Chantier D Analytics admin (2026-04-29) : pilotage business KPI + funnel
// + top produits + top distri + tendance 12 mois + alertes operationnelles.
const AnalyticsPage = lazy(() =>
  import("./pages/AnalyticsPage").then((module) => ({
    default: module.AnalyticsPage
  }))
);

import { useTheme } from './hooks/useTheme'
import { useAutoNotifications } from './hooks/useAutoNotifications'
import { useAppContext } from './context/AppContext'
import { ActiveTourProvider } from './features/onboarding/ActiveTourContext'
import { ActiveQuizProvider } from './features/academy/ActiveQuizContext'
import { ServiceWorkerNavigator } from './features/notifications/ServiceWorkerNavigator'
import { SwUpdatePrompt } from './components/pwa/SwUpdatePrompt'

export default function App() {
  useTheme()
  useAutoNotifications()
  const { bootError, currentUser } = useAppContext()

  // Hard-fail boot : si mock en prod (faille sécurité), on bloque toute l'app.
  // Couvre routes protégées ET routes publiques (client app, recap, rapport).
  if (bootError) {
    return <BootErrorScreen message={bootError} />
  }

  return (
    <BrowserRouter>
      {/* Relais SW → React Router (2026-05-05) : route en interne quand
          on clique une push notif, sans full reload. */}
      <ServiceWorkerNavigator />
      {/* Toast 'Mise a jour disponible' : detecte les nouveaux SW + propose
          activation 1-click + force re-subscribe notifs apres update.
          Chantier rebrand polish 2026-05-06. */}
      <SwUpdatePrompt
        userId={currentUser?.id}
        userName={currentUser?.name}
      />
      <ActiveTourProvider>
      <ActiveQuizProvider>
      <Suspense fallback={<RouteLoadingScreen />}>
        <ErrorBoundary>
        <Routes>
          {/* Chantier Welcome Page (2026-04-24) : /welcome public (pas
              de garde PublicRoute : même un user connecté peut y passer
              s'il tape l'URL — la logique de redirect se fait côté page
              via useAppContext si besoin). /auto-login consomme un
              magic link 24h pour re-établir une session. */}
          <Route path="/welcome" element={<WelcomePage />} />
          {/* Chantier #1 Bilan Online (2026-05-17) — formulaire publique
              5 étapes pour générer des Leads.
              - /bilan-online[/<slug>] : page Welcome (hero + qui t'a invité)
              - /bilan-online[/<slug>]/formulaire : le formulaire 5 étapes
              Slug = users.first_name normalisé, résolu par submit-online-bilan. */}
          <Route path="/bilan-online" element={<BilanOnlineWelcomePage />} />
          <Route path="/bilan-online/formulaire" element={<BilanOnlinePage />} />
          <Route path="/bilan-online/merci" element={<BilanOnlineMerciPage />} />
          <Route path="/bilan-online/:coachSlug" element={<BilanOnlineWelcomePage />} />
          <Route path="/bilan-online/:coachSlug/formulaire" element={<BilanOnlinePage />} />
          <Route path="/bilan-online/:coachSlug/merci" element={<BilanOnlineMerciPage />} />
          {/* Chantier #7 V2 (2026-05-17) — page business scroll narratif
              unifie. Fusionne /opportunite + /simulateur. Mockup Claude Design
              business-v2.html valide. */}
          <Route path="/business" element={<BusinessPage />} />
          {/* Legacy redirects (preserve ?ref=) */}
          <Route path="/opportunite" element={<RedirectToBusiness />} />
          <Route path="/simulateur" element={<RedirectToBusiness hash="simulateur" />} />
          <Route path="/auto-login" element={<AutoLoginPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          {/* Chantier freeze 2026-05-06 : page accessible sans guard pour
              les users dont le compte est gele. Affiche patience.png +
              bouton 'Demander reactivation' qui INSERT unfreeze_requests. */}
          <Route path="/frozen" element={<FrozenPage />} />
          <Route path="/partage/:token" element={<SharePage />} />
          {/* Pages legales (RGPD Phase 1 — 2026-04-30) — accessibles sans auth */}
          <Route path="/legal/mentions" element={<LegalNoticePage />} />
          <Route path="/legal/confidentialite" element={<PrivacyPolicyPage />} />
          <Route element={<PublicRoute />}>
            <Route path="/login" element={<LoginPage />} />
          </Route>
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<AppLayout />}>
              <Route index element={<Navigate to="/co-pilote" replace />} />
              {/* Chantier Refonte Navigation (2026-04-22) : /co-pilote = dashboard.
                  /dashboard redirige pour ne pas casser les liens existants. */}
              {/* V5 Editoriale = route principale depuis 2026-05-05
                  (validation Thomas). L'ancien CoPilotePage reste
                  accessible sur /co-pilote-legacy pour rollback rapide
                  si bug bloquant — sera retiré quand V5 stable 2 semaines. */}
              <Route path="co-pilote" element={<CoPiloteV5Page />} />
              <Route path="co-pilote-v5" element={<Navigate to="/co-pilote" replace />} />
              <Route path="co-pilote-legacy" element={<CoPilotePage />} />
              <Route path="dashboard" element={<Navigate to="/co-pilote" replace />} />
              {/* FLEX La Base 360 Phase B (2026-11-05) — moteur de pilotage
                  quotidien du distri. /flex = dashboard, /flex/onboarding =
                  wizard 5 questions. */}
              <Route path="flex" element={<FlexDashboardPage />} />
              <Route path="flex/onboarding" element={<FlexOnboardingPage />} />
              <Route path="flex/equipe" element={<FlexTeamPage />} />
              {/* Charte du Distributeur (2026-05-03) — refonte premium
                  art déco. /charte = perso distri (signable). Ancienne
                  route /formation/charte redirige ici. */}
              <Route path="charte" element={<CharterPage />} />
              <Route path="distributors/:id/charte" element={<AdminDistributorCharterPage />} />
              <Route path="formation/charte" element={<Navigate to="/charte" replace />} />
              {/* Outil admin : génération des PNG thumbnails du sélecteur de
                  template charte. Admin only (vérif côté composant). */}
              <Route path="admin/charter-thumbs" element={<AdminCharterThumbsPage />} />
              {/* Cahier de bord du distri (2026-05-04) — 21j cobaye, liste 100,
                  journal EBE perso. Strictement perso (RLS own + admin). */}
              <Route path="cahier-de-bord" element={<CahierDeBordPage />} />
              {/* Simulateur EBE (2026-05-04) — entraînement scripté. */}
              <Route path="simulateur-ebe" element={<SimulateurEbePage />} />
              {/* Hub Développement (2026-05-04) — regroupe academy/formation/
                  cahier/simulateur/flex-explique/nouveautés. Sidebar Option B. */}
              <Route path="developpement" element={<DeveloppementHubPage />} />
              <Route path="developpement/flex-explique" element={<FlexExpliquePage />} />
              <Route path="developpement/nouveautes" element={<NouveautesPage />} />
              {/* Boite a outils prospection (chantier 2026-11-07) — admin only */}
              <Route path="outils-prospection" element={<OutilsProspectionPage />} />
              {/* Chantier #3 (2026-05-17) — Module Prospection cold mobile-first.
                  4 étapes : Marché → Profil → Hashtags → Messages multi-langues. */}
              <Route path="prospection" element={<ProspectionPage />} />
              {/* Chantier #3 étape 3.3 — CRUD admin scripts + briefs */}
              <Route path="admin/prospection" element={<AdminProspectionPage />} />
              {/* Rentabilité Phase A (2026-05-05) — jauge €/mois + breakdown. */}
              <Route path="rentabilite" element={<RentabilitePage />} />
              {/* La Base 360 Academy Phase 1 (2026-04-26) — gated admin only
                  en prod (RoleRoute). Defense en profondeur : RoleRoute
                  redirige vers /co-pilote si non-admin tape l URL manuelle. */}
              <Route element={<RoleRoute allowedRoles={["admin"]} />}>
                <Route path="academy" element={<AcademyOverviewPage />} />
                <Route path="academy/certificat" element={<AcademyCertificatePage />} />
                <Route path="academy/playbook" element={<AcademyPlaybookPage />} />
                <Route path="academy/sandbox" element={<AcademySandboxPage />} />
                <Route path="academy/:sectionId" element={<AcademySectionPage />} />
                <Route path="academy/demo/fiche-client" element={<DemoFicheClient />} />
                <Route path="academy/demo/agenda" element={<DemoAgenda />} />
              </Route>
              {/* Formation gate (2026-11-04) : admin-only tant que le contenu
                  n est pas finalise pour les distri. Distri qui tape /formation
                  en direct atterrit sur FormationLockedPage (hero "chantier en
                  cours" plus chaleureux qu un redirect sec). */}
              <Route path="formation" element={<FormationAdminGate><FormationPage /></FormationAdminGate>} />
              <Route path="formation/mon-equipe" element={<FormationAdminGate><FormationMyTeamPage /></FormationAdminGate>} />
              <Route path="formation/admin" element={<FormationAdminGate><FormationAdminPage /></FormationAdminGate>} />
              <Route path="formation/certificat" element={<FormationAdminGate><FormationCertificatePage /></FormationAdminGate>} />
              <Route path="formation/calculateur" element={<FormationAdminGate><FormationCalculatorPage /></FormationAdminGate>} />
              <Route path="formation/glossaire" element={<FormationAdminGate><FormationGlossaryPage /></FormationAdminGate>} />
              <Route path="formation/boite-a-outils" element={<FormationAdminGate><FormationToolkitPage /></FormationAdminGate>} />
              <Route path="formation/boite-a-outils/:slug" element={<FormationAdminGate><FormationToolkitDetailPage /></FormationAdminGate>} />
              <Route path="formation/reconnaissance" element={<FormationAdminGate><FormationRecognitionPage /></FormationAdminGate>} />
              <Route path="formation/parcours/:levelSlug" element={<FormationAdminGate><FormationModulePage /></FormationAdminGate>} />
              <Route path="formation/parcours/:levelSlug/:moduleSlug" element={<FormationAdminGate><FormationModuleDetailPage /></FormationAdminGate>} />
              <Route path="formation/:slug" element={<FormationAdminGate><FormationCategoryPage /></FormationAdminGate>} />
              {/* /settings (non-admin) reste accessible comme placeholder profil léger.
                  Les admins ont /parametres avec la version complète. */}
              <Route path="settings" element={<SettingsPage />} />
              <Route path="guide" element={<GuidePage />} />
              <Route path="guide-suivi" element={<FollowUpGuidePage />} />
              <Route path="recommendations" element={<RecommendationsPage />} />
              <Route path="pv" element={<PvOverviewPage />} />
              <Route path="messages" element={<MessagesPage />} />
              {/* Chantier Messagerie finalisée (2026-04-23). */}
              <Route path="messagerie/conversation/:messageId" element={<ConversationView />} />
              <Route path="agenda" element={<AgendaPage />} />
              <Route path="clients" element={<ClientsPage />} />
              <Route element={<RoleRoute allowedRoles={["admin"]} />}>
                <Route path="users" element={<UsersPage />} />
                {/* Chantier #11 (2026-05-18) : moderation temoignages clients. */}
                <Route path="admin/testimonials" element={<AdminTestimonialsPage />} />
                {/* Chantier Team Tree (2026-04-25) : nouvelle fiche équipe
                    avec arbre de parrainage interactif. /users reste
                    accessible pour l'admin legacy (créer compte, réparer). */}
                <Route path="team" element={<TeamPage />} />
                <Route path="pv/team" element={<PvTeamPage />} />
                {/* Chantier D Analytics admin (2026-04-29) */}
                <Route path="analytics" element={<AnalyticsPage />} />
                <Route path="debug/notifications" element={<DebugNotificationsPage />} />
                {/* Chantier Paramètres Admin (2026-04-23) : /parametres admin-only.
                    /settings redirige pour compat avec la placeholder du chantier 2. */}
                <Route path="parametres" element={<ParametresPage />} />
              </Route>
              <Route path="distributors/:distributorId" element={<DistributorPortfolioPage />} />
              <Route path="clients/:clientId" element={<ClientDetailPage />} />
              <Route path="clients/:clientId/start-assessment/edit" element={<EditInitialAssessmentPage />} />
              <Route
                path="clients/:clientId/assessments/:assessmentId/edit"
                element={<EditInitialAssessmentPage />}
              />
              <Route path="clients/:clientId/follow-up/new" element={<NewFollowUpPage />} />
              <Route path="clients/:clientId/schedule/edit" element={<EditClientSchedulePage />} />
              {/* Chantier Page remerciement post-bilan (2026-04-27) :
                  page plein écran avec QR + partage + parrainage, affichée
                  après "Enregistrer et terminer le bilan". Query params :
                  ?token=<recap_token>&firstName=<prénom>. */}
              <Route path="clients/:clientId/bilan-termine" element={<BilanTermineePage />} />
              <Route path="assessments/new" element={<NewAssessmentPage />} />
            </Route>
          </Route>
          {/* Routes publiques — récap + rapport évolution */}
          {/* Chantier #11 (2026-05-18) : page form temoignage client publique. */}
          <Route path="/temoignage/:token" element={<TestimonialFormPage />} />
          <Route path="/recap/:token" element={<RecapPage />} />
          <Route path="/rapport/:token" element={<EvolutionReportPage />} />
          <Route path="/client/:token" element={<ClientAppPage />} />
          <Route path="/client/:token/sandbox" element={<ClientSandboxPage />} />
          {/* Chantier invitation client app (2026-04-21) : page publique
              pour que le client crée son accès via le lien magique envoyé
              par le coach. Pas besoin d'être authentifié. */}
          <Route path="/bienvenue" element={<BienvenuePage />} />
          {/* Chantier Onboarding distributeur complet (2026-04-24). */}
          <Route path="/bienvenue-distri" element={<BienvenueDistriPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </ErrorBoundary>
      </Suspense>
      <ToastHost />
      <CommandPalette />
      </ActiveQuizProvider>
      </ActiveTourProvider>
    </BrowserRouter>
  );
}

function BootErrorScreen({ message }: { message: string }) {
  return (
    <div
      role="alert"
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "32px",
        background: "var(--ls-bg)",
        color: "var(--ls-text)",
        fontFamily: "'DM Sans', sans-serif",
        textAlign: "center",
      }}
    >
      <div style={{ maxWidth: "420px" }}>
        <div style={{ fontSize: "64px", marginBottom: "16px" }}>🛑</div>
        <h1
          style={{
            fontFamily: "'Syne', sans-serif",
            fontSize: "22px",
            fontWeight: 700,
            marginBottom: "12px",
            color: "var(--ls-coral)",
          }}
        >
          Configuration manquante
        </h1>
        <p
          style={{
            fontSize: "14px",
            color: "var(--ls-text-muted)",
            lineHeight: 1.5,
          }}
        >
          {message}
        </p>
      </div>
    </div>
  );
}

// =============================================================================
// RouteLoadingScreen — micro-loader entre routes (rebrand 2026-05-06)
//
// Rendu pendant le React.lazy() suspense (changement de page).
// Volontairement TRES sobre : juste le logo orbe qui pulse en heartbeat
// + un mini halo G3. Visible 100-300ms maximum sur connexion correcte.
//
// Pas de bandeau plein ecran, pas de texte, pas de retour visuel violent.
// Just le logo qui respire = signal subtil "ca charge" sans casser le flow.
// =============================================================================
function RouteLoadingScreen() {
  return (
    <>
      <style>{`
        @keyframes lb360-route-heartbeat {
          0%, 100% { transform: scale(1); opacity: 0.75; }
          14% { transform: scale(1.18); opacity: 1; }
          28% { transform: scale(1); opacity: 0.85; }
          42% { transform: scale(1.18); opacity: 1; }
          70% { transform: scale(1); opacity: 0.75; }
        }
        @keyframes lb360-route-halo {
          0%, 100% { opacity: 0.30; transform: translate(-50%, -50%) scale(1); }
          14%, 42% { opacity: 0.65; transform: translate(-50%, -50%) scale(1.45); }
        }
        @keyframes lb360-route-fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          .lb360-route-anim { animation: none !important; }
          .lb360-route-halo { display: none !important; }
        }
      `}</style>
      <div
        className="lb360-route-anim"
        style={{
          minHeight: "60vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 32,
          animation: "lb360-route-fade-in 120ms ease-out both",
        }}
      >
        <div style={{ position: "relative", width: 80, height: 80 }}>
          {/* Halo G3 derriere le logo */}
          <div
            aria-hidden="true"
            className="lb360-route-anim lb360-route-halo"
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              width: 80,
              height: 80,
              borderRadius: "50%",
              background:
                "radial-gradient(circle, rgba(16,185,129,0.35) 0%, rgba(6,182,212,0.20) 40%, transparent 70%)",
              transform: "translate(-50%, -50%)",
              filter: "blur(8px)",
              animation: "lb360-route-halo 1.4s ease-in-out infinite",
            }}
          />
          {/* Logo orbe pulsant */}
          <img
            src="/brand/labase360/app-icon-512.svg"
            alt="Chargement…"
            className="lb360-route-anim"
            style={{
              position: "relative",
              width: 56,
              height: 56,
              borderRadius: 14,
              top: 12,
              left: 12,
              animation: "lb360-route-heartbeat 1.4s ease-in-out infinite",
              willChange: "transform, opacity",
              filter: "drop-shadow(0 4px 12px rgba(16,185,129,0.30))",
            }}
          />
        </div>
      </div>
    </>
  );
}
