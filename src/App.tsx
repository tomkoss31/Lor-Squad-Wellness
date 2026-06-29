import { Suspense, lazy } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { ProtectedRoute, PublicRoute, RoleRoute } from "./components/auth/RouteGuards";
import { AppLayout } from "./components/layout/AppLayout";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { ToastHost } from "./components/ui/ToastHost";
import { StaleHostBanner } from "./components/layout/StaleHostBanner";
import { CommandPalette } from "./components/ui/CommandPalette";

// CoPilotePage remplace définitivement l'ancien DashboardPage (retiré
// au chantier cleanup-post-audit 2026-04-23).
const GuidePage = lazy(() =>
  import("./pages/GuidePage").then((module) => ({
    default: module.GuidePage
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
// CRM commun toutes sources de leads (VIP-4 2026-06-10).
const CrmPage = lazy(() =>
  import("./pages/CrmPage").then((module) => ({
    default: module.CrmPage
  }))
);
const MesLiensPage = lazy(() =>
  import("./pages/MesLiensPage").then((module) => ({
    default: module.MesLiensPage
  }))
);
const PanierPage = lazy(() =>
  import("./pages/PanierPage").then((module) => ({
    default: module.PanierPage
  }))
);
const OutilsPage = lazy(() =>
  import("./pages/OutilsPage").then((module) => ({
    default: module.OutilsPage
  }))
);
const EncaissementPage = lazy(() =>
  import("./pages/EncaissementPage").then((module) => ({
    default: module.EncaissementPage
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
const PlanMarketingPage = lazy(() =>
  import("./pages/PlanMarketingPage").then((module) => ({
    default: module.PlanMarketingPage
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
const AdminNewslettersPage = lazy(() =>
  import("./pages/AdminNewslettersPage").then((module) => ({
    default: module.AdminNewslettersPage,
  })),
);
const AdminNewsletterEditPage = lazy(() =>
  import("./pages/AdminNewsletterEditPage").then((module) => ({
    default: module.AdminNewsletterEditPage,
  })),
);
const AdminNewsletterStatsPage = lazy(() =>
  import("./pages/AdminNewsletterStatsPage").then((module) => ({
    default: module.AdminNewsletterStatsPage,
  })),
);
const PublicNewsletterPage = lazy(() =>
  import("./pages/PublicNewsletterPage").then((module) => ({
    default: module.PublicNewsletterPage,
  })),
);
// Funnel Opportunité gated (chantier 2026-06) — brief docs/BRIEF_OPPORTUNITE_GATED_2026-06.md
const RejoindreOpportunitePage = lazy(() =>
  import("./pages/RejoindreOpportunitePage").then((module) => ({
    default: module.RejoindreOpportunitePage,
  })),
);
const CoachPublicProfilePage = lazy(() =>
  import("./pages/CoachPublicProfilePage").then((module) => ({
    default: module.CoachPublicProfilePage,
  })),
);
// Page publique Club VIP partageable (VIP-3 2026-06-10).
const VipClubPage = lazy(() =>
  import("./pages/VipClubPage").then((module) => ({
    default: module.VipClubPage,
  })),
);
const RejoindreQuestionnairePage = lazy(() =>
  import("./pages/RejoindreQuestionnairePage").then((module) => ({
    default: module.RejoindreQuestionnairePage,
  })),
);
const BilanOnlineMerciPage = lazy(() =>
  import("./pages/BilanOnlineMerciPage").then((module) => ({
    default: module.BilanOnlineMerciPage,
  })),
);
const RdvBookingPage = lazy(() =>
  import("./pages/RdvBookingPage").then((module) => ({
    default: module.RdvBookingPage,
  })),
);
const BilanOnlineResultatsPage = lazy(() =>
  import("./pages/BilanOnlineResultatsPage").then((module) => ({
    default: module.BilanOnlineResultatsPage,
  })),
);
const BilanResultatPremiumPage = lazy(() =>
  import("./pages/BilanResultatPremiumPage").then((module) => ({
    default: module.BilanResultatPremiumPage,
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
// Page mère Outil de prospection + sous-pages (chantier 3 remaniement 2026-06-10).
const OutilsProspectionMerePage = lazy(() =>
  import("./pages/OutilsProspectionMerePage").then((module) => ({
    default: module.OutilsProspectionMerePage,
  })),
);
const OutilsProspectionBilanPage = lazy(() =>
  import("./pages/OutilsProspectionBilanPage").then((module) => ({
    default: module.OutilsProspectionBilanPage,
  })),
);
const OutilsProspectionInternationalPage = lazy(() =>
  import("./pages/OutilsProspectionInternationalPage").then((module) => ({
    default: module.OutilsProspectionInternationalPage,
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
// Co-pilote V5 Editoriale Premium (2026-05-05) — preview parallele,
// remplace /co-pilote quand validation Thomas.
const CoPiloteV5Page = lazy(() =>
  import("./features/copilote/v5/CoPiloteV5Page").then((module) => ({
    default: module.CoPiloteV5Page,
  }))
);
// Chantier « Salle des Opérations » (onboarding distri, 2026-06-29) — slice 1 :
// route preview provisoire pour recetter le look pixel-fidèle de la maquette.
// Le switch de rendu sur /co-pilote (§3) viendra une fois le look validé.
const SalleDesOperationsPage = lazy(() =>
  import("./features/copilote/salle-ops/SalleDesOperations").then((module) => ({
    default: module.SalleDesOperations,
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
// FormationPage (catalogue avec progression).
const FormationPage = lazy(() =>
  import("./pages/FormationPage").then((module) => ({
    default: module.FormationPage
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
// Prospection expliquée (2026-05-19) — tuto kit V4.
const ProspectionExpliquePage = lazy(() =>
  import("./pages/ProspectionExpliquePage").then((module) => ({
    default: module.ProspectionExpliquePage,
  })),
);
// Check-list expliquée (2026-05-20) — tuto routine 5 actions/jour.
const CheckListExpliquePage = lazy(() =>
  import("./pages/CheckListExpliquePage").then((module) => ({
    default: module.CheckListExpliquePage,
  })),
);
// Routine du jour (chantier #2 V2, 2026-05-20) — page dédiée check-list.
const RoutineDuJourPage = lazy(() =>
  import("./pages/RoutineDuJourPage").then((module) => ({
    default: module.RoutineDuJourPage,
  })),
);
// Démarrage 30 jours (chantier Moteur d'équipe PR1, 2026-06-27) — checklist
// duplicable par recrue + flag d'activation.
const DemarragePage = lazy(() =>
  import("./pages/DemarragePage").then((module) => ({
    default: module.DemarragePage,
  })),
);
// Suivis du jour (2026-06-03) — page dédiée destination du digest matinal.
const SuivisDuJourPage = lazy(() =>
  import("./pages/SuivisDuJourPage").then((module) => ({
    default: module.SuivisDuJourPage,
  })),
);
// Page "En travaux" (2026-06-10) — destination des contenus pas encore livrés.
const TravauxPage = lazy(() =>
  import("./pages/TravauxPage").then((module) => ({
    default: module.TravauxPage,
  })),
);
// Fiche coach "Comment marche le Club VIP" (VIP-5 2026-06-10).
const ClubVipExpliquePage = lazy(() =>
  import("./pages/ClubVipExpliquePage").then((module) => ({
    default: module.ClubVipExpliquePage,
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
// Chantier arborescence Herbalife (2026-05-21) : admin only
const ArborescenceHerbalifePage = lazy(() =>
  import("./pages/ArborescenceHerbalifePage").then((module) => ({
    default: module.ArborescenceHerbalifePage,
  })),
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
          <Route path="/bilan-online/resultats" element={<BilanOnlineResultatsPage />} />
          <Route path="/bilan-online/merci" element={<BilanOnlineMerciPage />} />
          <Route path="/bilan-online/:coachSlug" element={<BilanOnlineWelcomePage />} />
          <Route path="/bilan-online/:coachSlug/formulaire" element={<BilanOnlinePage />} />
          <Route path="/bilan-online/:coachSlug/resultats" element={<BilanOnlineResultatsPage />} />
          <Route path="/bilan-online/:coachSlug/merci" element={<BilanOnlineMerciPage />} />
          <Route path="/resultat-bilan/:token" element={<BilanResultatPremiumPage />} />
          {/* Prise de RDV (V1 manuelle 2026-06-14) — Calendly-like présentiel/visio */}
          <Route path="/rdv" element={<RdvBookingPage />} />
          <Route path="/rdv/:coachSlug" element={<RdvBookingPage />} />
          {/* Chantier #8 étape 8.7 (2026-05-23) : page publique newsletter
              "La Base 360 News". Visible si status='sent' AND is_public=true. */}
          <Route path="/news/:slug" element={<PublicNewsletterPage />} />
          {/* Chantier #7 V2 (2026-05-17) — page business scroll narratif
              unifie. Fusionne /opportunite + /simulateur. Mockup Claude Design
              business-v2.html valide. */}
          <Route path="/business" element={<BusinessPage />} />
          {/* Funnel Opportunité gated (chantier 2026-06) — la « porte » qualifiante
              partagée par les coachs. /rejoindre[/<slug>] préserve ?ref=. Le
              questionnaire (étape 2) + scoring + mini-CRM arrivent ensuite. */}
          <Route path="/coach/:slug" element={<CoachPublicProfilePage />} />
          {/* Club VIP public partageable (VIP-3) — capture lead source='vip'. */}
          <Route path="/vip/:coachSlug" element={<VipClubPage />} />
          <Route path="/rejoindre" element={<RejoindreOpportunitePage />} />
          <Route path="/rejoindre/:coachSlug" element={<RejoindreOpportunitePage />} />
          <Route path="/rejoindre/:coachSlug/questionnaire" element={<RejoindreQuestionnairePage />} />
          <Route path="/rejoindre/questionnaire" element={<RejoindreQuestionnairePage />} />
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
              {/* V5 Editoriale = route principale depuis 2026-05-05. B8
                  (2026-06-14) : co-pilote-legacy + co-pilote-v5 retirés (V5
                  stable en prod) → CoPilotePage/RentabilityWidget/Gauge supprimés.
                  Rollback éventuel = historique git. */}
              <Route path="co-pilote" element={<CoPiloteV5Page />} />
              {/* Preview provisoire Salle des Opérations (slice 1, recette look). */}
              <Route path="salle-ops" element={<SalleDesOperationsPage />} />
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
              <Route path="developpement/prospection-explique" element={<ProspectionExpliquePage />} />
              <Route path="developpement/check-list-explique" element={<CheckListExpliquePage />} />
              <Route path="developpement/club-vip-explique" element={<ClubVipExpliquePage />} />
              <Route path="routine-du-jour" element={<RoutineDuJourPage />} />
              <Route path="demarrage" element={<DemarragePage />} />
              <Route path="suivis-du-jour" element={<SuivisDuJourPage />} />
              <Route path="travaux" element={<TravauxPage />} />
              <Route path="developpement/nouveautes" element={<NouveautesPage />} />
              {/* Outil de prospection (chantier 3 remaniement 2026-06-10) —
                  page mère éducative + 3 sous-pages. Admin only, distributeur
                  redirigé vers /travaux dans chaque page. */}
              <Route path="outils-prospection" element={<OutilsProspectionMerePage />} />
              <Route path="outils-prospection/bilan-online" element={<OutilsProspectionBilanPage />} />
              <Route path="outils-prospection/liens" element={<OutilsProspectionPage />} />
              <Route path="outils-prospection/international" element={<OutilsProspectionInternationalPage />} />
              {/* Chantier #3 (2026-05-17) — Module Prospection cold mobile-first.
                  4 étapes : Marché → Profil → Hashtags → Messages multi-langues. */}
              <Route path="prospection" element={<ProspectionPage />} />
              {/* Chantier #3 étape 3.3 — CRUD admin scripts + briefs.
                  Gel sécurité 2026-05-27 : wrap RoleRoute admin (avant la
                  route était libre, trou de défense en profondeur). */}
              <Route element={<RoleRoute allowedRoles={["admin"]} />}>
                <Route path="admin/prospection" element={<AdminProspectionPage />} />
              </Route>
              {/* Rentabilité Phase A (2026-05-05) — jauge €/mois + breakdown. */}
              <Route path="rentabilite" element={<RentabilitePage />} />
              {/* La Base 360 Academy — ouverte à tous les distri depuis
                  2026-05-27 (chantier onboarding plan A). Academy est la
                  porte d'entrée pédagogique obligatoire ; débloque Boîte
                  à outils @ 50% + Simulateur EBE / Prospection @ 100%
                  (gates UI dans DeveloppementHubPage). */}
              <Route path="academy" element={<AcademyOverviewPage />} />
              <Route path="academy/certificat" element={<AcademyCertificatePage />} />
              <Route path="academy/playbook" element={<AcademyPlaybookPage />} />
              <Route path="academy/sandbox" element={<AcademySandboxPage />} />
              <Route path="academy/:sectionId" element={<AcademySectionPage />} />
              <Route path="academy/demo/fiche-client" element={<DemoFicheClient />} />
              <Route path="academy/demo/agenda" element={<DemoAgenda />} />
              {/* Formation distributeur Herbalife — ouverte à tous les distri
                  depuis 2026-05-27 (chantier onboarding plan A). Seul
                  /formation/admin reste gardé pour l'édition de contenu. */}
              <Route path="plan-marketing" element={<PlanMarketingPage />} />
              <Route path="formation" element={<FormationPage />} />
              <Route path="formation/mon-equipe" element={<FormationMyTeamPage />} />
              <Route element={<RoleRoute allowedRoles={["admin"]} />}>
                <Route path="formation/admin" element={<FormationAdminPage />} />
              </Route>
              <Route path="formation/certificat" element={<FormationCertificatePage />} />
              <Route path="formation/calculateur" element={<FormationCalculatorPage />} />
              <Route path="formation/glossaire" element={<FormationGlossaryPage />} />
              <Route path="formation/boite-a-outils" element={<FormationToolkitPage />} />
              <Route path="formation/boite-a-outils/:slug" element={<FormationToolkitDetailPage />} />
              <Route path="formation/reconnaissance" element={<FormationRecognitionPage />} />
              <Route path="formation/parcours/:levelSlug" element={<FormationModulePage />} />
              <Route path="formation/parcours/:levelSlug/:moduleSlug" element={<FormationModuleDetailPage />} />
              {/* /settings (non-admin) reste accessible comme placeholder profil léger.
                  Les admins ont /parametres avec la version complète. */}
              <Route path="settings" element={<SettingsPage />} />
              <Route path="guide" element={<GuidePage />} />
              <Route path="guide-suivi" element={<FollowUpGuidePage />} />
              <Route path="pv" element={<PvOverviewPage />} />
              <Route path="messages" element={<MessagesPage />} />
              {/* Chantier Messagerie finalisée (2026-04-23). */}
              <Route path="messagerie/conversation/:messageId" element={<ConversationView />} />
              <Route path="agenda" element={<AgendaPage />} />
              <Route path="clients" element={<ClientsPage />} />
              {/* CRM commun (VIP-4) — pipeline unifié de tous les leads. */}
              <Route path="crm" element={<CrmPage />} />
              <Route path="outils" element={<OutilsPage />} />
              <Route path="encaissement" element={<EncaissementPage />} />
              <Route path="mes-liens" element={<MesLiensPage />} />
              <Route path="panier" element={<PanierPage />} />
              <Route element={<RoleRoute allowedRoles={["admin"]} />}>
                <Route path="users" element={<UsersPage />} />
                {/* Chantier #11 (2026-05-18) : moderation temoignages clients. */}
                <Route path="admin/testimonials" element={<AdminTestimonialsPage />} />
                {/* Chantier #8 (2026-05-23) : gestion newsletters La Base 360 News. */}
                <Route path="admin/newsletters" element={<AdminNewslettersPage />} />
                <Route path="admin/newsletters/:id/edit" element={<AdminNewsletterEditPage />} />
                <Route path="admin/newsletters/:id/stats" element={<AdminNewsletterStatsPage />} />
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
                <Route path="parametres/arborescence-herbalife" element={<ArborescenceHerbalifePage />} />
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
          {/* Chantier #11 (2026-05-18) : page form temoignage. 2 modes :
              /temoignage/coach/:slug (generique, distri partage en bulk)
              /temoignage/:token       (legacy V1 per-client, garde compat). */}
          <Route path="/temoignage/coach/:slug" element={<TestimonialFormPage />} />
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
      <StaleHostBanner />
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
