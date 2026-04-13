import { Suspense, lazy } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { ProtectedRoute, PublicRoute, RoleRoute } from "./components/auth/RouteGuards";
import { AppLayout } from "./components/layout/AppLayout";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { LorAppLayout } from "./components/layout/LorAppLayout";
import { V2LoginPage } from "./pages/v2/V2LoginPage";
import { V2DashboardPage } from "./pages/v2/V2DashboardPage";
import { V2ClientsPage } from "./pages/v2/V2ClientsPage";
import { V2ClientDetailPage } from "./pages/v2/V2ClientDetailPage";
import { V2NewBilanPage } from "./pages/v2/V2NewBilanPage";
import { V2BodyScanPage } from "./pages/v2/V2BodyScanPage";
import { V2SuiviPage } from "./pages/v2/V2SuiviPage";
import { V2RecommandationsPage } from "./pages/v2/V2RecommandationsPage";
import { V2SuiviPVPage } from "./pages/v2/V2SuiviPVPage";

function V2ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div style={{ background: '#0B0D11', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 32, height: 32, border: '2px solid rgba(201,168,76,0.3)', borderTop: '2px solid #C9A84C', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
  return user ? <>{children}</> : <Navigate to="/v2/login" replace />;
}

const DashboardPage = lazy(() =>
  import("./pages/DashboardPage").then((module) => ({
    default: module.DashboardPage
  }))
);
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
const PvClientsPage = lazy(() =>
  import("./pages/PvClientsPage").then((module) => ({
    default: module.PvClientsPage
  }))
);
const PvOrdersPage = lazy(() =>
  import("./pages/PvOrdersPage").then((module) => ({
    default: module.PvOrdersPage
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

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Suspense fallback={<RouteLoadingScreen />}>
          <Routes>
            {/* ── Routes V1 existantes (inchangées) ── */}
            <Route element={<PublicRoute />}>
              <Route path="/login" element={<LoginPage />} />
            </Route>
            <Route element={<ProtectedRoute />}>
              <Route path="/" element={<AppLayout />}>
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="dashboard" element={<DashboardPage />} />
                <Route path="guide" element={<GuidePage />} />
                <Route path="recommendations" element={<RecommendationsPage />} />
                <Route path="pv" element={<PvOverviewPage />} />
                <Route path="pv/clients" element={<PvClientsPage />} />
                <Route path="pv/orders" element={<PvOrdersPage />} />
                <Route path="clients" element={<ClientsPage />} />
                <Route element={<RoleRoute allowedRoles={["admin"]} />}>
                  <Route path="users" element={<UsersPage />} />
                  <Route path="pv/team" element={<PvTeamPage />} />
                </Route>
                <Route path="distributors/:distributorId" element={<DistributorPortfolioPage />} />
                <Route path="clients/:clientId" element={<ClientDetailPage />} />
                <Route path="clients/:clientId/start-assessment/edit" element={<EditInitialAssessmentPage />} />
                <Route path="clients/:clientId/assessments/:assessmentId/edit" element={<EditInitialAssessmentPage />} />
                <Route path="clients/:clientId/follow-up/new" element={<NewFollowUpPage />} />
                <Route path="clients/:clientId/schedule/edit" element={<EditClientSchedulePage />} />
                <Route path="assessments/new" element={<NewAssessmentPage />} />
              </Route>
            </Route>

            {/* ── Routes V2 (nouvelle identité graphique) ── */}
            <Route path="/v2/login" element={
              <AuthProvider>
                <V2LoginPage />
              </AuthProvider>
            } />
            <Route path="/v2/*" element={
              <AuthProvider>
                <V2ProtectedRoute>
                  <LorAppLayout />
                </V2ProtectedRoute>
              </AuthProvider>
            }>
              <Route path="dashboard" element={<V2DashboardPage />} />
              <Route path="clients" element={<V2ClientsPage />} />
              <Route path="clients/:id" element={<V2ClientDetailPage />} />
              <Route path="clients/:id/bilan/new" element={<V2NewBilanPage />} />
              <Route path="clients/:id/scan/new" element={<V2BodyScanPage />} />
              <Route path="clients/:id/suivi/new" element={<V2SuiviPage />} />
              <Route path="recommandations" element={<V2RecommandationsPage />} />
              <Route path="suivi-pv" element={<V2SuiviPVPage />} />
              <Route index element={<Navigate to="dashboard" replace />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </ErrorBoundary>
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
