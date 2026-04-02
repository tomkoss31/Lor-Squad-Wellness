import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { ProtectedRoute, PublicRoute, RoleRoute } from "./components/auth/RouteGuards";
import { AppLayout } from "./components/layout/AppLayout";
import { ClientDetailPage } from "./pages/ClientDetailPage";
import { ClientsPage } from "./pages/ClientsPage";
import { DashboardPage } from "./pages/DashboardPage";
import { DistributorPortfolioPage } from "./pages/DistributorPortfolioPage";
import { GuidePage } from "./pages/GuidePage";
import { LoginPage } from "./pages/LoginPage";
import { NewAssessmentPage } from "./pages/NewAssessmentPage";
import { NewFollowUpPage } from "./pages/NewFollowUpPage";
import { RecommendationsPage } from "./pages/RecommendationsPage";
import { UsersPage } from "./pages/UsersPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<PublicRoute />}>
          <Route path="/login" element={<LoginPage />} />
        </Route>
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<AppLayout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="guide" element={<GuidePage />} />
            <Route path="recommendations" element={<RecommendationsPage />} />
            <Route path="clients" element={<ClientsPage />} />
            <Route element={<RoleRoute allowedRoles={["admin"]} />}>
              <Route path="users" element={<UsersPage />} />
            </Route>
            <Route path="distributors/:distributorId" element={<DistributorPortfolioPage />} />
            <Route path="clients/:clientId" element={<ClientDetailPage />} />
            <Route path="clients/:clientId/follow-up/new" element={<NewFollowUpPage />} />
            <Route path="assessments/new" element={<NewAssessmentPage />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
