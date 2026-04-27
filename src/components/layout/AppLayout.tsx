import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAppContext } from "../../context/AppContext";
import { useInstallPrompt } from "../../context/InstallPromptContext";
import { blasonLogo } from "../../data/visualContent";
import { Button } from "../ui/Button";
import { StatusBadge } from "../ui/StatusBadge";
import { BottomNav } from "./BottomNav";
import { ThemeToggle } from "./ThemeToggle";
import { useRealtimeMessages } from "../../hooks/useRealtimeMessages";
import { getInitials } from "../../lib/utils/getInitials";
import { useTheme } from "../../hooks/useTheme";
import { getRoleLabel } from "../../lib/auth";
import { useAcademyAutoTrigger } from "../../features/academy/hooks/useAcademyAutoTrigger";
import { AcademyReminderDialog } from "../../features/academy/components/AcademyReminderDialog";
import { CoachInstallPwaButton } from "../pwa/CoachInstallPwaButton";
import { useActiveTour } from "../../features/onboarding/ActiveTourContext";
import { TourRunner } from "../../features/onboarding/TourRunner";
import { useActiveQuiz } from "../../features/academy/ActiveQuizContext";
import { QuizModal } from "../../features/academy/components/QuizModal";

// Chantier Refonte Navigation (2026-04-22) : sidebar simplifiée +
// renommage Accueil → Co-pilote. Ajout /formation et /settings.
const NAV_ICONS: Record<string, JSX.Element> = {
  "/co-pilote": (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>
  ),
  "/academy": (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>
  ),
  "/agenda": (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
  ),
  "/messages": (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
  ),
  "/clients": (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
  ),
  "/pv": (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
  ),
  "/users": (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="23" y1="11" x2="17" y2="11"/><line x1="20" y1="8" x2="20" y2="14"/></svg>
  ),
  "/formation": (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
  ),
  "/settings": (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
  ),
};

export function AppLayout() {
  const { currentUser, logout, followUps, pvClientProducts, unreadMessageCount, prospects, lastFetchError } = useAppContext();
  const { isDark, toggleTheme } = useTheme();
  // Chantier Notif in-app temps réel (2026-04-23) : s'abonne à
  // client_messages Realtime tant que le coach est authentifié et sur
  // l'app (les routes publiques /client/:token, /recap/:token, etc.
  // ne passent pas par AppLayout donc n'activent pas ce hook).
  useRealtimeMessages();
  const urgentRelanceCount = followUps.filter(f => f.status === "pending").length;
  const pvOverdueCount = (() => {
    if (!pvClientProducts) return 0;
    const now = new Date();
    return pvClientProducts.filter(p => {
      if (!p.active) return false;
      const end = new Date(p.startDate);
      end.setDate(end.getDate() + p.durationReferenceDays);
      return end < now;
    }).length;
  })();
  // Chantier Agenda : badge = RDV prospects programmés aujourd'hui
  const todayProspectsCount = (() => {
    if (!prospects?.length) return 0;
    const today = new Date().toDateString();
    return prospects.filter(p => {
      if (p.status !== 'scheduled') return false;
      try {
        return new Date(p.rdvDate).toDateString() === today;
      } catch {
        return false;
      }
    }).length;
  })();
  const { canPromptInstall, isIos, isMobile, isStandalone, promptInstall } = useInstallPrompt();
  const location = useLocation();
  const navigate = useNavigate();
  // Chantier Academy Phase 1 (2026-04-26) : popup auto-trigger 1×/jour
  // pour distributeurs n ayant pas encore termine la formation.
  const academyTrigger = useAcademyAutoTrigger();
  // Chantier Academy section 1 fix runtime (2026-04-27) : TourRunner
  // monte au niveau AppLayout pour survivre aux changements de route
  // pendant un tour (ex : navigate /academy/welcome -> /parametres).
  const { activeTour, closeTour } = useActiveTour();
  // Direction 2 (2026-04-28) : QuizModal idem au niveau AppLayout.
  const { activeQuiz, closeQuiz } = useActiveQuiz();

  if (!currentUser) {
    return null;
  }

  const roleTone =
    currentUser.role === "admin"
      ? "blue"
      : currentUser.role === "referent"
        ? "amber"
        : "green";
  // Chantier Refonte Navigation (2026-04-22) : sidebar plate 8 items max,
  // Accueil → Co-pilote, suppression Recommandations/Nouveau bilan (FAB
  // top-right à la place), fusion Guide RDV + Guide suivi → Centre de
  // formation, ajout Paramètres en bas. Ordre exact validé avec Thomas.
  const navigation: Array<{ label: string; path: string; badge: number; tourId?: string }> = [
    { label: "Co-pilote", path: "/co-pilote", badge: 0, tourId: "nav-copilote" },
    // Chantier Lor'Squad Academy Phase 1 (2026-04-26) : insere entre
    // Co-pilote et Agenda. data-tour-id pour la Phase 2 (tour distri).
    { label: "Academy", path: "/academy", badge: 0, tourId: "nav-academy" },
    { label: "Agenda", path: "/agenda", badge: todayProspectsCount, tourId: "nav-agenda" },
    { label: "Messagerie", path: "/messages", badge: unreadMessageCount ?? 0, tourId: "nav-messagerie" },
    { label: "Dossiers clients", path: "/clients", badge: 0, tourId: "nav-clients" },
    { label: "Suivi PV", path: "/pv", badge: pvOverdueCount, tourId: "nav-pv" },
    ...(currentUser.role === "admin" ? [{ label: "Mon équipe", path: "/team", badge: 0 }] : []),
    { label: "Centre de formation", path: "/formation", badge: 0 },
    // Chantier Academy section 1 (2026-04-27) : /parametres pour tous
    // les users authentifies (la page gere elle-meme la visibilite des
    // onglets admin-only via checks internes).
    {
      label: "Paramètres",
      path: "/parametres",
      badge: 0,
    },
  ];
  // urgentRelanceCount n'est plus utilisé dans la sidebar (item Recommandations
  // retiré) — on le conserve en variable au cas où un futur dashboard l'affiche.
  void urgentRelanceCount;

  const pageTitle =
    location.pathname === "/dashboard" || location.pathname === "/co-pilote"
      ? ""
      : location.pathname === "/guide" || location.pathname === "/formation"
        ? "Centre de formation"
        : location.pathname.startsWith("/pv")
          ? "Pilotage simple des clients, commandes et points volume"
          : location.pathname === "/clients"
            ? "Dossiers clients et suivi en cours"
            : location.pathname.startsWith("/distributors/")
              ? "Portefeuille, relances et rythme du suivi"
              : location.pathname === "/team" || location.pathname === "/users"
                ? "Mon équipe"
                : location.pathname.startsWith("/clients/")
                  ? "Lecture complète du dossier client"
                  : location.pathname === "/assessments/new"
                    ? "Le bilan guidé pour cadrer le rendez-vous"
                    : location.pathname === "/agenda"
                      ? "Agenda prospection et RDV à venir"
                      : location.pathname === "/settings"
                        ? "Paramètres"
                        : "Lor'Squad Wellness";

  async function handleLogout() {
    await logout();
    navigate("/login", { replace: true });
  }

  async function handleInstallClick() {
    await promptInstall();
  }

  // Chantier Polish Vue complète + refonte bilan (2026-04-24) :
  // sur les pages de bilan (/assessments/new, /clients/.../follow-up/new),
  // la sidebar est masquée. NewAssessmentPage prend toute la largeur et
  // gère lui-même son propre panneau de notes sur la gauche.
  const isAssessmentPage =
    location.pathname === "/assessments/new" ||
    /^\/clients\/[^/]+\/follow-up\/new$/.test(location.pathname);

  return (
    <div className="min-h-screen bg-hero-mesh">
      <div
        className={`mx-auto flex min-h-screen max-w-[1480px] flex-col gap-5 px-3 py-3 md:px-4 xl:gap-6 xl:px-5 ${
          isAssessmentPage ? "" : "xl:grid xl:grid-cols-[252px_minmax(0,1fr)]"
        }`}
      >
        {isAssessmentPage ? null : (
        <aside
          className="app-sidebar-grid glass-panel relative hidden overflow-hidden rounded-[24px] xl:sticky xl:top-5 xl:h-[calc(100vh-2.5rem)] xl:grid"
          style={{
            background: 'var(--ls-sidebar-bg)',
            // Hotfix sticky footer (2026-04-24) : CSS grid 3-rows remplace
            // flex-col pour garantir que le footer (ZONE 3 avec Sortir)
            // reste collé en bas peu importe la taille du nav. Le
            // minmax(0, 1fr) sur le middle row force la nav à shrink
            // plutôt que de pousser le footer hors écran.
            gridTemplateRows: 'auto minmax(0, 1fr) auto',
          }}
        >
          {/* ZONE 1 — Logo */}
          <div style={{ padding: '20px 16px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 34, height: 34, background: '#C9A84C', borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="#0B0D11"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
              </div>
              <div>
                <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 14, color: '#F0EDE8', lineHeight: 1.2 }}>
                  Lor&apos;<span style={{ color: '#C9A84C' }}>Squad</span>
                </div>
                <div style={{ fontSize: 10, color: '#4A5068', letterSpacing: '0.5px' }}>Wellness</div>
              </div>
            </div>
          </div>

          {/* ZONE 2 — Navigation (grid row = minmax(0, 1fr) → peut shrink
              sous la taille naturelle, scroll interne si débordement) */}
          <nav style={{ minHeight: 0, padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: 2, overflowY: 'auto' }}>
            <div style={{
              fontSize: 9,
              color: 'var(--ls-text-hint)',
              letterSpacing: '1.5px',
              textTransform: 'uppercase',
              padding: '0 12px',
              marginBottom: 6,
              marginTop: 8,
            }}>Navigation</div>
            {navigation.map((item) => {
              const isActive =
                location.pathname === item.path ||
                (item.path === "/co-pilote" && location.pathname === "/dashboard") ||
                (item.path === "/clients" && location.pathname.startsWith("/clients/")) ||
                (item.path === "/pv" && location.pathname.startsWith("/pv")) ||
                (item.path === "/formation" && location.pathname.startsWith("/guide")) ||
                (item.path === "/academy" && location.pathname.startsWith("/academy/"));

              // Chantier Mini-fix V2 Co-pilote (2026-04-24) : bouton
              // "+ Nouveau bilan" déplacé du FAB top-right vers la sidebar,
              // inséré juste avant "Centre de formation".
              const insertNewBilanBefore = item.path === "/formation";

              return (
                <div key={item.path} style={{ display: 'contents' }}>
                  {insertNewBilanBefore ? (
                    <NavLink
                      key="new-bilan-cta"
                      to="/assessments/new"
                      data-tour-id="nav-new-bilan"
                      aria-label="Nouveau bilan"
                      className="flex items-center gap-2 text-[13px] transition"
                      style={{
                        margin: '8px 6px 10px',
                        padding: '11px 14px',
                        borderRadius: 12,
                        background: 'linear-gradient(135deg, #EF9F27 0%, #BA7517 100%)',
                        color: '#FFFFFF',
                        fontFamily: 'DM Sans, sans-serif',
                        fontWeight: 600,
                        letterSpacing: 0.2,
                        textDecoration: 'none',
                        boxShadow: '0 2px 6px rgba(186,117,23,0.25)',
                        justifyContent: 'center',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.boxShadow =
                          '0 4px 12px rgba(186,117,23,0.35)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.boxShadow =
                          '0 2px 6px rgba(186,117,23,0.25)';
                      }}
                    >
                      <span
                        aria-hidden="true"
                        style={{
                          fontSize: 16,
                          fontWeight: 700,
                          lineHeight: 1,
                        }}
                      >
                        +
                      </span>
                      <span>Nouveau bilan</span>
                    </NavLink>
                  ) : null}
                  <NavLink
                    to={item.path}
                    data-tour-id={item.tourId}
                    className="flex items-center gap-3 rounded-r-[12px] text-[13px] transition"
                    style={{
                      padding: '9px 12px 9px 14px',
                      marginLeft: -2,
                      borderLeft: isActive ? '3px solid var(--ls-gold)' : '2px solid transparent',
                      background: isActive ? 'rgba(201,168,76,0.08)' : 'transparent',
                      color: isActive ? 'var(--ls-text)' : 'var(--ls-text-muted)',
                      fontWeight: isActive ? 500 : 400,
                      fontFamily: 'DM Sans, sans-serif',
                      textDecoration: 'none',
                      transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => {
                      if (!isActive) e.currentTarget.style.background = 'var(--ls-surface2)'
                    }}
                    onMouseLeave={e => {
                      if (!isActive) e.currentTarget.style.background = 'transparent'
                    }}
                  >
                    <span style={{
                      flexShrink: 0,
                      display: 'flex',
                      alignItems: 'center',
                      color: isActive ? 'var(--ls-gold)' : 'var(--ls-text-muted)',
                      opacity: 1,
                    }}>
                      {NAV_ICONS[item.path]}
                    </span>
                    <span className="flex-1">{item.label}</span>
                    {item.badge > 0 ? (
                      <span style={{
                        fontSize: 9, padding: '2px 7px', borderRadius: 10,
                        background: 'rgba(220,38,38,0.1)',
                        color: '#DC2626',
                        fontWeight: 700,
                        marginLeft: 'auto',
                        fontFamily: 'DM Sans, sans-serif',
                        flexShrink: 0,
                      }}>
                        {item.badge}
                      </span>
                    ) : null}
                  </NavLink>
                </div>
              );
            })}
          </nav>

          {/* ZONE 3 — Footer sticky sidebar.
              Design final (2026-04-24 fix 5) : ligne profil avec petit
              bouton logout inline à droite du nom, puis toggle thème
              en dessous. Compact et moderne. */}
          <div
            style={{
              padding: '12px 12px calc(16px + env(safe-area-inset-bottom, 0px))',
              borderTop: '1px solid rgba(255,255,255,0.08)',
              background: 'var(--ls-sidebar-bg)',
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}
          >
            {/* Bouton install PWA — visible si le navigateur expose le prompt */}
            <CoachInstallPwaButton />
            {/* Ligne profil + bouton Sortir inline */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 30, height: 30, borderRadius: '50%',
                background: 'linear-gradient(135deg, #2DD4BF, #0D9488)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 700, color: '#FFFFFF',
                fontFamily: 'Syne, sans-serif', flexShrink: 0,
              }}>
                {getInitials(currentUser.name)}
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--ls-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {currentUser.name}
                </div>
                <div style={{ fontSize: 10, color: 'var(--ls-text-hint)' }}>
                  {currentUser.role === 'admin' ? 'Admin' : 'Coach'}
                </div>
              </div>

              {/* Bouton Sortir compact à droite du nom */}
              <button
                onClick={() => void handleLogout()}
                aria-label="Se déconnecter"
                title="Se déconnecter"
                style={{
                  flexShrink: 0,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '6px 10px',
                  borderRadius: 8,
                  background: 'rgba(226,75,74,0.12)',
                  border: '1px solid rgba(226,75,74,0.35)',
                  color: '#E24B4A',
                  cursor: 'pointer',
                  fontSize: 11,
                  fontWeight: 600,
                  fontFamily: 'DM Sans, sans-serif',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#E24B4A';
                  e.currentTarget.style.color = '#FFFFFF';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(226,75,74,0.12)';
                  e.currentTarget.style.color = '#E24B4A';
                }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
                Sortir
              </button>
            </div>

            {/* Toggle thème — compact en dessous */}
            <ThemeToggle />
          </div>
        </aside>
        )}

        <main className="min-w-0 space-y-5 md:space-y-6">
          {/* Garde-fou 2026-04-25 : bandeau rouge si le dernier fetch
              principal a planté (typiquement RLS foireuse). Rend les
              régressions visibles au lieu de "app vide" silencieux. */}
          {lastFetchError ? (
            <div
              role="alert"
              style={{
                padding: "14px 16px",
                borderRadius: 12,
                background: "rgba(220,38,38,0.12)",
                border: "1px solid rgba(220,38,38,0.4)",
                color: "#FCA5A5",
                fontSize: 13,
                lineHeight: 1.5,
              }}
            >
              <strong style={{ color: "#FEE2E2" }}>⚠ Données inaccessibles — </strong>
              {lastFetchError}
              <div style={{ fontSize: 11, opacity: 0.8, marginTop: 4 }}>
                Recharge la page. Si le problème persiste, le souci vient de Supabase (RLS, policies, ou réseau).
              </div>
            </div>
          ) : null}

          <section className="glass-panel overflow-hidden rounded-[28px] p-4 xl:hidden">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <img
                  src={blasonLogo}
                  alt="Lor'Squad"
                  className="h-11 w-11 rounded-[16px] object-cover shadow-soft"
                />
                <div className="min-w-0">
                  <p className="truncate text-base font-semibold text-white">Lor&apos;Squad Wellness</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={toggleTheme}
                  aria-label={isDark ? 'Passer au mode clair' : 'Passer au mode sombre'}
                  style={{
                    width: 42, height: 42, borderRadius: 12,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'var(--ls-surface2)',
                    border: '1px solid var(--ls-border)',
                    color: 'var(--ls-text-muted)',
                    cursor: 'pointer', flexShrink: 0,
                  }}
                >
                  {isDark ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
                  )}
                </button>
                {!isStandalone && canPromptInstall ? (
                  <Button
                    variant="secondary"
                    className="min-h-[42px] px-4 py-2 text-[12px]"
                    onClick={() => void handleInstallClick()}
                  >
                    Installer
                  </Button>
                ) : null}
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between gap-3 rounded-[20px] bg-white/[0.03] px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">{currentUser.name}</p>
                <p className="truncate text-[13px] text-[#7A8099]">{pageTitle}</p>
              </div>
              <StatusBadge label={getRoleLabel(currentUser.role)} tone={roleTone} />
            </div>

            <button
              onClick={() => void handleLogout()}
              style={{
                marginTop: 12, width: '100%', padding: '10px 14px', borderRadius: 10,
                background: 'transparent', border: '1px solid var(--ls-border)',
                color: 'var(--ls-text-muted)', fontFamily: 'DM Sans, sans-serif',
                fontSize: 13, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center',
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
              Se déconnecter
            </button>

            <nav className="mt-4 flex gap-2 overflow-x-auto pb-1">
              {navigation.map((item) => {
                const isActive =
                  location.pathname === item.path ||
                  (item.path === "/clients" && location.pathname.startsWith("/clients/")) ||
                  (item.path === "/pv" && location.pathname.startsWith("/pv"));

                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    data-tour-id={item.tourId}
                    className={`whitespace-nowrap rounded-full px-4 py-2.5 text-[13px] font-medium transition ${
                      isActive
                        ? "bg-[rgba(201,168,76,0.16)] text-white"
                        : "bg-white/[0.03] text-[#B0B4C4]"
                    }`}
                  >
                    {item.label}
                  </NavLink>
                );
              })}
            </nav>

            {!isStandalone && isIos ? (
              <div className="mt-4 rounded-[18px] bg-white/[0.03] px-4 py-3 text-[13px] leading-6 text-[#B0B4C4]">
                Ouvre ce lien dans Safari, puis Partager et Sur l'écran d'accueil.
              </div>
            ) : null}
            {!isStandalone && !isIos && isMobile && !canPromptInstall ? (
              <div className="mt-4 rounded-[18px] bg-white/[0.03] px-4 py-3 text-[13px] leading-6 text-[#B0B4C4]">
                Ouvre ce lien dans Chrome puis installe l'app ou ajoute-la a l'écran d'accueil.
              </div>
            ) : null}
          </section>

          <Outlet />
          {/* Padding for bottom nav on mobile — assez d'espace pour que le dernier bouton reste au-dessus */}
          <div className="h-32 xl:hidden" />
        </main>
      </div>
      <BottomNav />
      {academyTrigger.isOpen ? (
        <AcademyReminderDialog onClose={academyTrigger.close} />
      ) : null}
      {activeTour ? (
        <TourRunner
          key={activeTour.id}
          steps={activeTour.steps}
          initialStep={activeTour.initialStep}
          onClose={(reason) => closeTour(reason)}
          onStepChange={activeTour.onStepChange}
        />
      ) : null}
      {activeQuiz ? (
        <QuizModal
          quiz={activeQuiz.quiz}
          sectionTitle={activeQuiz.sectionTitle}
          onComplete={(passed, scorePercent) => closeQuiz(passed, scorePercent)}
        />
      ) : null}
    </div>
  );
}
