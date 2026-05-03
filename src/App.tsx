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
// Chantier Lor'Squad Academy Phase 1 (2026-04-26) : parcours onboarding
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
const FormationCalculatorPage = lazy(() =>
  import("./pages/FormationCalculatorPage").then((module) => ({
    default: module.FormationCalculatorPage
  }))
);
// Feature #9 (2026-11-04) : Charte distributeur PDF.
const FormationCharterPage = lazy(() =>
  import("./pages/FormationCharterPage").then((module) => ({
    default: module.FormationCharterPage
  }))
);
// Glossaire termes Herbalife (2026-11-04).
const FormationGlossaryPage = lazy(() =>
  import("./pages/FormationGlossaryPage").then((module) => ({
    default: module.FormationGlossaryPage
  }))
);
// Boite a outils Lor'Squad (2026-11-04) : 16 outils premium.
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

export default function App() {
  useTheme()
  useAutoNotifications()
  const { bootError } = useAppContext()

  // Hard-fail boot : si mock en prod (faille sécurité), on bloque toute l'app.
  // Couvre routes protégées ET routes publiques (client app, recap, rapport).
  if (bootError) {
    return <BootErrorScreen message={bootError} />
  }

  return (
    <BrowserRouter>
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
          <Route path="/auto-login" element={<AutoLoginPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
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
              <Route path="co-pilote" element={<CoPilotePage />} />
              <Route path="dashboard" element={<Navigate to="/co-pilote" replace />} />
              {/* FLEX Lor'Squad Phase B (2026-11-05) — moteur de pilotage
                  quotidien du distri. /flex = dashboard, /flex/onboarding =
                  wizard 5 questions. */}
              <Route path="flex" element={<FlexDashboardPage />} />
              <Route path="flex/onboarding" element={<FlexOnboardingPage />} />
              {/* Lor'Squad Academy Phase 1 (2026-04-26) — gated admin only
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
              <Route path="formation/charte" element={<FormationAdminGate><FormationCharterPage /></FormationAdminGate>} />
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

function RouteLoadingScreen() {
  return (
    <div className="min-h-screen bg-hero-mesh px-4 py-8">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-[760px] items-center justify-center">
        <div className="glass-panel w-full rounded-[32px] px-8 py-10 text-center">
          <p className="eyebrow-label">Lor&apos;Squad Wellness</p>
          <h1 className="mt-4 text-3xl md:text-4xl">Chargement de la page</h1>
          <p className="mt-4 text-sm leading-7 text-slate-300">
            On charge seulement l&apos;ecran utile pour garder l&apos;application plus legere et
            plus fluide.
          </p>
        </div>
      </div>
    </div>
  );
}
