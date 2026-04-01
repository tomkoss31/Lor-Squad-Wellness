import { Navigate, Outlet } from "react-router-dom";
import { useAppContext } from "../../context/AppContext";
import { hasRequiredRole } from "../../lib/auth";
import type { UserRole } from "../../types/domain";

export function ProtectedRoute() {
  const { authReady, currentUser } = useAppContext();

  if (!authReady) {
    return <AuthBootSplash />;
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

export function PublicRoute() {
  const { authReady, currentUser } = useAppContext();

  if (!authReady) {
    return <AuthBootSplash />;
  }

  if (currentUser) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}

export function RoleRoute({ allowedRoles }: { allowedRoles: UserRole[] }) {
  const { authReady, currentUser } = useAppContext();

  if (!authReady) {
    return <AuthBootSplash />;
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  if (!hasRequiredRole(currentUser, allowedRoles)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}

function AuthBootSplash() {
  return (
    <div className="min-h-screen bg-hero-mesh px-4 py-8">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-[720px] items-center justify-center">
        <div className="glass-panel w-full rounded-[32px] px-8 py-10 text-center">
          <p className="text-[11px] uppercase tracking-[0.34em] text-slate-500">
            Lor&apos;Squad Wellness
          </p>
          <h1 className="mt-4 text-3xl md:text-4xl">Ouverture de la session</h1>
          <p className="mt-3 text-sm leading-7 text-slate-300">
            Verification locale de l&apos;acces en cours pour ouvrir l&apos;outil dans de bonnes
            conditions.
          </p>
        </div>
      </div>
    </div>
  );
}
