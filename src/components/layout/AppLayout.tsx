import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { BrandSignature } from "../branding/BrandSignature";
import { useAppContext } from "../../context/AppContext";
import { blasonLogo, laBaseLogo } from "../../data/visualContent";
import { Button } from "../ui/Button";
import { StatusBadge } from "../ui/StatusBadge";
import { getAccessSummary, getRoleLabel } from "../../lib/auth";

export function AppLayout() {
  const { currentSession, currentUser, logout } = useAppContext();
  const location = useLocation();
  const navigate = useNavigate();

  if (!currentUser) {
    return null;
  }

  const navigation = [
    { label: "Dashboard", path: "/dashboard" },
    { label: "Clients", path: "/clients" },
    ...(currentUser.role === "admin" ? [{ label: "Utilisateurs", path: "/users" }] : []),
    { label: "Nouveau bilan", path: "/assessments/new" }
  ];

  const pageTitle =
    location.pathname === "/dashboard"
      ? "Pilotage de l'activite et rendez-vous du moment"
      : location.pathname === "/clients"
        ? "Dossiers clients et suivi en cours"
        : location.pathname === "/users"
          ? "Creation des acces et gestion simple des roles"
          : location.pathname.startsWith("/clients/")
            ? "Lecture detaillee du dossier client"
            : location.pathname === "/assessments/new"
              ? "Bilan guide pour conduire le rendez-vous"
              : "Lor'Squad Wellness";

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className="min-h-screen bg-hero-mesh">
      <div className="mx-auto flex min-h-screen max-w-[1460px] flex-col gap-4 px-3 py-3 md:px-4 xl:grid xl:grid-cols-[230px_minmax(0,1fr)] xl:gap-5 xl:px-5">
        <aside className="glass-panel relative hidden overflow-hidden rounded-[30px] p-4 xl:sticky xl:top-5 xl:block xl:h-[calc(100vh-2.5rem)]">
          <div className="absolute -left-10 top-0 h-28 w-28 rounded-full bg-amber-300/8 blur-3xl" />
          <div className="absolute -right-10 bottom-20 h-28 w-28 rounded-full bg-sky-300/8 blur-3xl" />
          <div className="flex h-full flex-col justify-between gap-6">
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <img
                  src={blasonLogo}
                  alt="Lor'Squad"
                  className="h-14 w-14 rounded-[22px] object-cover ring-1 ring-white/10 shadow-luxe"
                />
                <div>
                  <p className="font-display text-[1.45rem] leading-none">Lor'Squad</p>
                  <p className="text-xs uppercase tracking-[0.28em] text-slate-400">
                    Wellness
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-[22px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.055),rgba(255,255,255,0.03))] px-3 py-3 shadow-luxe">
                <img src={laBaseLogo} alt="La Base" className="h-9 w-9 rounded-xl object-cover" />
                <div>
                  <p className="text-sm font-semibold text-white">La Base</p>
                  <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                    Powered by La Base
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(9,14,24,0.62),rgba(9,14,24,0.44))] px-4 py-3 shadow-luxe">
                <div>
                  <p className="text-sm font-semibold text-white">{currentUser.name}</p>
                  <p className="text-xs text-slate-400">{currentUser.title}</p>
                  <p className="mt-2 text-[11px] text-slate-500">{getAccessSummary(currentUser)}</p>
                </div>
                <StatusBadge
                  label={getRoleLabel(currentUser.role)}
                  tone={currentUser.role === "admin" ? "blue" : "green"}
                />
              </div>

              <nav className="space-y-2">
                {navigation.map((item) => {
                  const isActive =
                    location.pathname === item.path ||
                    (item.path === "/clients" && location.pathname.startsWith("/clients/"));

                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      className={`flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-medium transition ${
                        isActive
                          ? "border border-white/10 bg-white/95 text-slate-950"
                          : "border border-transparent text-slate-300 hover:border-white/10 hover:bg-white/5 hover:text-white"
                      }`}
                    >
                      <span>{item.label}</span>
                      <span className="text-xs uppercase tracking-[0.25em]">
                        {isActive ? "Ouvert" : "Voir"}
                      </span>
                    </NavLink>
                  );
                })}
              </nav>

              <div className="rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.025))] p-4 shadow-luxe">
                <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Cadre</p>
                <p className="mt-3 text-sm leading-6 text-slate-300">
                  Un outil simple pour conduire un rendez-vous, expliquer le plan et fixer la
                  suite sans pression.
                </p>
              </div>
            </div>

            <div className="space-y-3 rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.025))] p-4 shadow-luxe">
              <BrandSignature variant="compact" />
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
                  Lecture tablette
                </p>
                <p className="mt-2 text-sm text-slate-300">
                  Peu de friction, blocs utiles et actions visibles pendant le rendez-vous.
                </p>
              </div>
              {currentSession ? (
                <div className="rounded-[18px] border border-white/10 bg-slate-950/35 px-3 py-3 text-xs text-slate-400">
                  Session locale active - scope {currentSession.accessScope}
                </div>
              ) : null}
              <Button variant="secondary" className="w-full" onClick={handleLogout}>
                Se deconnecter
              </Button>
            </div>
          </div>
        </aside>

        <main className="min-w-0 space-y-4 md:space-y-6">
          <section className="glass-panel overflow-hidden rounded-[24px] p-3 sm:p-4 xl:hidden">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <img
                  src={blasonLogo}
                  alt="Lor'Squad"
                  className="h-11 w-11 rounded-[16px] object-cover ring-1 ring-white/10 shadow-luxe"
                />
                <div className="min-w-0">
                  <p className="truncate text-base font-semibold text-white">Lor&apos;Squad Wellness</p>
                  <p className="truncate text-[11px] uppercase tracking-[0.18em] text-slate-500">
                    Powered by La Base
                  </p>
                </div>
              </div>
              <Button variant="secondary" className="px-4 py-2 text-[11px]" onClick={handleLogout}>
                Quitter
              </Button>
            </div>

            <div className="mt-3 flex items-center justify-between gap-3 rounded-[18px] border border-white/10 bg-white/[0.03] px-3 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">{currentUser.name}</p>
                <p className="truncate text-xs text-slate-400">{pageTitle}</p>
              </div>
              <StatusBadge
                label={getRoleLabel(currentUser.role)}
                tone={currentUser.role === "admin" ? "blue" : "green"}
              />
            </div>

            <nav className="mt-3 flex gap-2 overflow-x-auto pb-1">
              {navigation.map((item) => {
                const isActive =
                  location.pathname === item.path ||
                  (item.path === "/clients" && location.pathname.startsWith("/clients/"));

                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={`whitespace-nowrap rounded-full border px-4 py-2 text-xs font-medium transition ${
                      isActive
                        ? "border-white/10 bg-white text-slate-950"
                        : "border-white/10 bg-white/[0.04] text-slate-200"
                    }`}
                  >
                    {item.label}
                  </NavLink>
                );
              })}
            </nav>
          </section>

          <header className="glass-panel relative overflow-hidden rounded-[24px] p-4 sm:rounded-[28px] md:p-5 xl:rounded-[30px]">
            <div className="absolute right-10 top-0 h-24 w-24 rounded-full bg-amber-300/8 blur-3xl" />
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">
                  Lor&apos;Squad Wellness
                </p>
                <p className="mt-2 max-w-3xl text-lg font-semibold text-white sm:text-xl md:text-[1.7rem]">
                  {pageTitle}
                </p>
                <div className="mt-3 hidden md:block">
                  <BrandSignature variant="inline" />
                </div>
              </div>
              <div className="hidden flex-wrap gap-2 md:flex md:justify-end">
                <Button variant="secondary" onClick={handleLogout}>
                  Retour login
                </Button>
              </div>
              <div className="md:hidden">
                <BrandSignature variant="inline" />
              </div>
            </div>
          </header>

          <Outlet />
        </main>
      </div>
    </div>
  );
}
