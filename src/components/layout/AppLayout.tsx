import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAppContext } from "../../context/AppContext";
import { useInstallPrompt } from "../../context/InstallPromptContext";
import { blasonLogo } from "../../data/visualContent";
import { Button } from "../ui/Button";
import { StatusBadge } from "../ui/StatusBadge";
import { BottomNav } from "./BottomNav";
import { useTheme } from "../../hooks/useTheme";
import { getRoleLabel } from "../../lib/auth";

const NAV_ICONS: Record<string, JSX.Element> = {
  "/dashboard": (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>
  ),
  "/guide": (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
  ),
  "/recommendations": (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
  ),
  "/pv": (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
  ),
  "/clients": (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
  ),
  "/users": (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="23" y1="11" x2="17" y2="11"/><line x1="20" y1="8" x2="20" y2="14"/></svg>
  ),
  "/messages": (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
  ),
  "/assessments/new": (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
  ),
};

export function AppLayout() {
  const { currentUser, logout, followUps, pvClientProducts, unreadMessageCount } = useAppContext();
  const { isDark, toggleTheme } = useTheme();
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
  const { canPromptInstall, isIos, isMobile, isStandalone, promptInstall } = useInstallPrompt();
  const location = useLocation();
  const navigate = useNavigate();

  if (!currentUser) {
    return null;
  }

  const roleTone =
    currentUser.role === "admin"
      ? "blue"
      : currentUser.role === "referent"
        ? "amber"
        : "green";
  const navigation = [
    { label: "Accueil", path: "/dashboard", badge: 0 },
    { label: "Messages", path: "/messages", badge: unreadMessageCount ?? 0 },
    { label: "Guide rendez-vous", path: "/guide", badge: 0 },
    { label: "Recommandations", path: "/recommendations", badge: urgentRelanceCount },
    { label: "Suivi PV", path: "/pv", badge: pvOverdueCount },
    { label: "Dossiers clients", path: "/clients", badge: 0 },
    ...(currentUser.role === "admin" ? [{ label: "Equipe", path: "/users", badge: 0 }] : []),
    { label: "Nouveau bilan", path: "/assessments/new", badge: 0 }
  ];

  const pageTitle =
    location.pathname === "/dashboard"
      ? "Pilotage clair de la journée"
      : location.pathname === "/guide"
        ? "Repères simples pour conduire le rendez-vous"
        : location.pathname === "/recommendations"
          ? "Le bon ton pour ouvrir les recommandations"
          : location.pathname.startsWith("/pv")
            ? "Pilotage simple des clients, commandes et points volume"
            : location.pathname === "/clients"
              ? "Dossiers clients et suivi en cours"
              : location.pathname.startsWith("/distributors/")
                ? "Portefeuille, relances et rythme du suivi"
                : location.pathname === "/users"
                  ? "Accès équipe et rôles clés"
                  : location.pathname.startsWith("/clients/")
                    ? "Lecture complète du dossier client"
                    : location.pathname === "/assessments/new"
                      ? "Le bilan guidé pour cadrer le rendez-vous"
                      : "Lor'Squad Wellness";

  async function handleLogout() {
    await logout();
    navigate("/login", { replace: true });
  }

  async function handleInstallClick() {
    await promptInstall();
  }

  return (
    <div className="min-h-screen bg-hero-mesh">
      <div className="mx-auto flex min-h-screen max-w-[1480px] flex-col gap-5 px-3 py-3 md:px-4 xl:grid xl:grid-cols-[252px_minmax(0,1fr)] xl:gap-6 xl:px-5">
        <aside className="app-sidebar glass-panel relative hidden overflow-hidden rounded-[24px] xl:sticky xl:top-5 xl:flex xl:flex-col xl:h-[calc(100vh-2.5rem)]" style={{ background: 'var(--ls-sidebar-bg)' }}>
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

          {/* ZONE 2 — Navigation */}
          <nav style={{ flex: 1, padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: 2, overflowY: 'auto' }}>
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
                (item.path === "/clients" && location.pathname.startsWith("/clients/")) ||
                (item.path === "/pv" && location.pathname.startsWith("/pv"));

              return (
                <NavLink
                  key={item.path}
                  to={item.path}
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
                  ) : item.path === "/assessments/new" ? (
                    <span style={{
                      fontSize: 10, padding: '2px 8px', borderRadius: 10,
                      background: 'rgba(201,168,76,0.15)',
                      color: 'var(--ls-gold)',
                      fontWeight: 600,
                      marginLeft: 'auto',
                      fontFamily: 'DM Sans, sans-serif',
                      flexShrink: 0,
                    }}>
                      Nouveau
                    </span>
                  ) : null}
                </NavLink>
              );
            })}
          </nav>

          {/* ZONE 3 — Profil + déconnexion */}
          <div style={{ padding: '12px 14px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%',
                background: 'linear-gradient(135deg, #C9A84C, #2DD4BF)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 700, color: '#0B0D11',
                fontFamily: 'Syne, sans-serif', flexShrink: 0,
              }}>
                {currentUser.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: '#F0EDE8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {currentUser.name}
                </div>
                <div style={{ fontSize: 10, color: '#4A5068' }}>
                  {currentUser.role === 'admin' ? 'Administrateur' : 'Coach'}
                </div>
              </div>
              {currentUser.role === 'admin' && (
                <span style={{ fontSize: 9, padding: '2px 7px', borderRadius: 10, background: 'rgba(201,168,76,0.15)', color: '#C9A84C', fontWeight: 600, flexShrink: 0 }}>
                  Admin
                </span>
              )}
            </div>

            {/* Toggle theme */}
            <button
              onClick={toggleTheme}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                padding: '9px 10px', borderRadius: 9, background: 'transparent',
                border: '1px solid var(--ls-border)', cursor: 'pointer',
                marginBottom: 8, transition: 'background 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--ls-surface2)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              {isDark ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--ls-text-muted)" strokeWidth="1.5"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--ls-text-muted)" strokeWidth="1.5"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
              )}
              <div style={{ width: 36, height: 20, borderRadius: 10, background: isDark ? 'rgba(255,255,255,0.1)' : '#C9A84C', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
                <div style={{ position: 'absolute', top: 3, left: isDark ? 3 : 17, width: 14, height: 14, borderRadius: '50%', background: '#FFFFFF', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }} />
              </div>
              <span style={{ fontSize: 12, color: 'var(--ls-text-muted)', fontFamily: 'DM Sans, sans-serif' }}>
                {isDark ? 'Mode sombre' : 'Mode clair'}
              </span>
            </button>

            <button
              onClick={() => void handleLogout()}
              style={{
                width: '100%', padding: '8px', borderRadius: 9,
                background: 'rgba(251,113,133,0.06)', border: '1px solid rgba(251,113,133,0.15)',
                color: '#FB7185', fontSize: 12, fontFamily: 'DM Sans, sans-serif',
                cursor: 'pointer', transition: 'all 0.15s',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
              Déconnexion
            </button>
          </div>
        </aside>

        <main className="min-w-0 space-y-5 md:space-y-6">
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
                  <p className="truncate text-[12px] text-[#4A5068]">Powered by La Base</p>
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

            <Button
              variant="ghost"
              className="mt-3 w-full justify-center"
              onClick={() => void handleLogout()}
            >
              Se déconnecter
            </Button>

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
                Ouvre ce lien dans Safari, puis Partager et Sur l'ecran d'accueil.
              </div>
            ) : null}
            {!isStandalone && !isIos && isMobile && !canPromptInstall ? (
              <div className="mt-4 rounded-[18px] bg-white/[0.03] px-4 py-3 text-[13px] leading-6 text-[#B0B4C4]">
                Ouvre ce lien dans Chrome puis installe l'app ou ajoute-la a l'ecran d'accueil.
              </div>
            ) : null}
          </section>

          <Outlet />
          {/* Padding for bottom nav on mobile — assez d'espace pour que le dernier bouton reste au-dessus */}
          <div className="h-32 xl:hidden" />
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
