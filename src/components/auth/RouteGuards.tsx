import { useEffect, useState } from "react";
import { Navigate, Outlet, useNavigate } from "react-router-dom";
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
  const { forceResetSession } = useAppContext();
  const navigate = useNavigate();
  const [showRecovery, setShowRecovery] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setShowRecovery(true), 5000);
    return () => window.clearTimeout(timer);
  }, []);

  async function handleRecovery() {
    await forceResetSession();
    navigate("/login", { replace: true });
  }

  return (
    <div className="min-h-screen bg-hero-mesh px-4 py-8">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-[720px] items-center justify-center">
        <div className="glass-panel w-full rounded-[22px] px-8 py-10 text-center">
          <p className="eyebrow-label">Lor&apos;Squad Wellness</p>
          <h1 className="mt-4 text-3xl md:text-4xl">Ouverture de la session</h1>
          <p className="mt-4 text-sm leading-7 text-[var(--ls-text-muted)]">
            On vérifie simplement l&apos;accès pour rouvrir l&apos;espace dans de bonnes
            conditions.
          </p>
          {showRecovery ? (
            <div className="mt-6 space-y-3">
              <p className="text-sm text-[var(--ls-text-muted)]">
                Si l&apos;ecran reste bloque, tu peux reinitialiser la session et revenir a la
                connexion.
              </p>
              <button
                type="button"
                onClick={() => void handleRecovery()}
                className="rounded-[18px] bg-[var(--ls-surface2)] px-5 py-3 text-sm font-medium text-white transition hover:bg-[var(--ls-border2)]"
              >
                Revenir a la connexion
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
