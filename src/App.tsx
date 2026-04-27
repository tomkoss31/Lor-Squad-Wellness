import { Suspense, lazy } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { ProtectedRoute, PublicRoute, RoleRoute } from "./components/auth/RouteGuards";
import { AppLayout } from "./components/layout/AppLayout";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { ToastHost } from "./components/ui/ToastHost";

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
const FormationCategoryPage = lazy(() =>
  import("./pages/FormationCategoryPage").then((module) => ({
    default: module.FormationCategoryPage
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
              {/* Lor'Squad Academy Phase 1 (2026-04-26) */}
              <Route path="academy" element={<AcademyOverviewPage />} />
              <Route path="academy/:sectionId" element={<AcademySectionPage />} />
              {/* Pages démo Academy (2026-04-28) — mockups pour les tours */}
              <Route path="academy/demo/fiche-client" element={<DemoFicheClient />} />
              <Route path="academy/demo/agenda" element={<DemoAgenda />} />
              <Route path="formation" element={<FormationPage />} />
              <Route path="formation/:slug" element={<FormationCategoryPage />} />
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
              {/* Chantier Academy section 1 (2026-04-27) : /parametres
                  desormais accessible a TOUS les users authentifies (pas
                  seulement admin) car le profil est une page perso. La
                  page elle-meme cache les onglets admin-only via les
                  checks role internes. */}
              <Route path="parametres" element={<ParametresPage />} />
              <Route element={<RoleRoute allowedRoles={["admin"]} />}>
                <Route path="users" element={<UsersPage />} />
                {/* Chantier Team Tree (2026-04-25) : nouvelle fiche équipe
                    avec arbre de parrainage interactif. /users reste
                    accessible pour l'admin legacy (créer compte, réparer). */}
                <Route path="team" element={<TeamPage />} />
                <Route path="pv/team" element={<PvTeamPage />} />
                <Route path="debug/notifications" element={<DebugNotificationsPage />} />
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
