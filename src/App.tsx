import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import type { ReactNode } from "react";
import { ErrorBoundary } from "./components/ErrorBoundary";
import AppLayout from "./components/layout/AppLayout";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import ClientsPage from "./pages/ClientsPage";
import ClientDetailPage from "./pages/ClientDetailPage";
import NewBilanPage from "./pages/NewBilanPage";
import BodyScanPage from "./pages/BodyScanPage";
import SuiviPage from "./pages/SuiviPage";
import RecommandationsPage from "./pages/RecommandationsPage";
import SuiviPVPage from "./pages/SuiviPVPage";

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--lor-bg)]">
        <div
          className="h-8 w-8 rounded-full border-2 border-[rgba(201,168,76,0.3)] border-t-[var(--lor-gold)]"
          style={{ animation: "spin 0.7s linear infinite" }}
        />
      </div>
    );
  }

  return user ? <>{children}</> : <Navigate to="/login" replace />;
}

function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <LoginPage />} />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/clients" element={<ClientsPage />} />
        <Route path="/clients/:id" element={<ClientDetailPage />} />
        <Route path="/clients/:id/bilan/new" element={<NewBilanPage />} />
        <Route path="/clients/:id/scan/new" element={<BodyScanPage />} />
        <Route path="/clients/:id/suivi/new" element={<SuiviPage />} />
        <Route path="/recommandations" element={<RecommandationsPage />} />
        <Route path="/suivi-pv" element={<SuiviPVPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </ErrorBoundary>
    </BrowserRouter>
  );
}
