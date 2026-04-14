import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { BrandSignature } from "../branding/BrandSignature";
import { useAppContext } from "../../context/AppContext";
import { useInstallPrompt } from "../../context/InstallPromptContext";
import { blasonLogo, lorSquadLogo } from "../../data/visualContent";
import { Button } from "../ui/Button";
import { StatusBadge } from "../ui/StatusBadge";
import { BottomNav } from "./BottomNav";
import { getRoleLabel } from "../../lib/auth";

export function AppLayout() {
  const { currentUser, logout, followUps } = useAppContext();
  const urgentRelanceCount = followUps.filter(f => f.status === "pending").length;
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
    { label: "Guide rendez-vous", path: "/guide", badge: 0 },
    { label: "Recommandations", path: "/recommendations", badge: 0 },
    { label: "Suivi PV", path: "/pv", badge: urgentRelanceCount },
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
        <aside className="glass-panel relative hidden overflow-hidden rounded-[24px] xl:sticky xl:top-5 xl:flex xl:flex-col xl:h-[calc(100vh-2.5rem)]">
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
            {navigation.map((item) => {
              const isActive =
                location.pathname === item.path ||
                (item.path === "/clients" && location.pathname.startsWith("/clients/")) ||
                (item.path === "/pv" && location.pathname.startsWith("/pv"));

              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3 rounded-[12px] px-3 py-2.5 text-[13px] font-medium transition ${
                    isActive
                      ? "bg-[rgba(201,168,76,0.1)] text-white"
                      : "text-[#7A8099] hover:bg-white/[0.035] hover:text-white"
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${
                      isActive ? "bg-[#C9A84C]" : "bg-white/15"
                    }`}
                  />
                  <span className="flex-1">{item.label}</span>
                  {item.badge > 0 ? (
                    <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#FB7185] px-1.5 text-[10px] font-bold text-white">
                      {item.badge}
                    </span>
                  ) : item.path === "/assessments/new" ? (
                    <span className="rounded-full bg-[rgba(201,168,76,0.15)] px-2 py-0.5 text-[10px] font-semibold text-[#C9A84C]">
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

          <header className="glass-panel relative overflow-hidden rounded-[30px] px-5 py-6 md:px-7 md:py-7">
            <div className="absolute right-10 top-0 h-24 w-24 rounded-full bg-[rgba(239,197,141,0.08)] blur-3xl" />
            <div className="absolute -right-6 top-4 hidden h-32 w-32 rounded-full bg-[rgba(45,212,191,0.08)] blur-3xl lg:block" />
            <div className="pointer-events-none absolute right-6 top-5 hidden lg:block">
              <img
                src={lorSquadLogo}
                alt=""
                className="w-[132px] object-contain opacity-[0.16]"
              />
            </div>
            <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
              <div className="max-w-3xl">
                <p className="eyebrow-label">Lor&apos;Squad Wellness</p>
                <p className="mt-4 max-w-[18ch] text-[1.88rem] font-semibold leading-[1.04] tracking-[-0.035em] text-white sm:text-[2.16rem] md:text-[2.5rem]">
                  {pageTitle}
                </p>
                <div className="mt-4 hidden md:block">
                  <BrandSignature variant="inline" />
                </div>
              </div>
              <div className="hidden flex-wrap gap-2 md:flex md:justify-end">
                {!isStandalone ? (
                  canPromptInstall ? (
                    <Button variant="secondary" onClick={() => void handleInstallClick()}>
                      Installer l&apos;app
                    </Button>
                  ) : isIos ? (
                    <div className="rounded-full bg-white/[0.03] px-4 py-3 text-[12px] text-[#B0B4C4]">
                      Partager puis ecran d&apos;accueil
                    </div>
                  ) : isMobile ? (
                    <div className="rounded-full bg-white/[0.03] px-4 py-3 text-[12px] text-[#B0B4C4]">
                      Installer via Chrome
                    </div>
                  ) : null
                ) : null}
                <Button variant="ghost" onClick={() => void handleLogout()}>
                  Se déconnecter
                </Button>
              </div>
              <div className="md:hidden">
                <BrandSignature variant="inline" />
              </div>
            </div>
          </header>

          <Outlet />
          {/* Padding for bottom nav on mobile */}
          <div className="h-20 xl:hidden" />
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
