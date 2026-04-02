import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { BrandSignature } from "../branding/BrandSignature";
import { useAppContext } from "../../context/AppContext";
import { useInstallPrompt } from "../../context/InstallPromptContext";
import { blasonLogo, laBaseLogo } from "../../data/visualContent";
import { Button } from "../ui/Button";
import { StatusBadge } from "../ui/StatusBadge";
import { getAccessSummary, getRoleLabel } from "../../lib/auth";

export function AppLayout() {
  const { currentSession, currentUser, logout } = useAppContext();
  const { canPromptInstall, isIos, isMobile, isStandalone, promptInstall } = useInstallPrompt();
  const location = useLocation();
  const navigate = useNavigate();

  if (!currentUser) {
    return null;
  }

  const navigation = [
    { label: "Accueil", path: "/dashboard" },
    { label: "Guide rendez-vous", path: "/guide" },
    { label: "Recommandations", path: "/recommendations" },
    { label: "Dossiers clients", path: "/clients" },
    ...(currentUser.role === "admin" ? [{ label: "Equipe", path: "/users" }] : []),
    { label: "Nouveau bilan", path: "/assessments/new" }
  ];

  const pageTitle =
    location.pathname === "/dashboard"
      ? "Une lecture claire de l'activite et des rendez-vous du moment"
      : location.pathname === "/guide"
        ? "Des reperes simples pour mieux conduire le rendez-vous"
        : location.pathname === "/recommendations"
          ? "Le bon support pour poser les recommandations au bon moment"
        : location.pathname === "/clients"
          ? "Les dossiers clients et le suivi en cours"
        : location.pathname.startsWith("/distributors/")
          ? "Le portefeuille responsable et les relances a suivre"
        : location.pathname === "/users"
          ? "Les acces de l'equipe et les roles essentiels"
          : location.pathname.startsWith("/clients/")
            ? "Le detail du dossier client"
            : location.pathname === "/assessments/new"
              ? "Le bilan guide pour conduire le rendez-vous"
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
        <aside className="glass-panel relative hidden overflow-hidden rounded-[34px] px-5 py-6 xl:sticky xl:top-5 xl:block xl:h-[calc(100vh-2.5rem)]">
          <div className="absolute -left-10 top-0 h-28 w-28 rounded-full bg-[rgba(239,197,141,0.10)] blur-3xl" />
          <div className="absolute -right-10 bottom-20 h-28 w-28 rounded-full bg-[rgba(89,183,255,0.10)] blur-3xl" />
          <div className="flex h-full flex-col justify-between gap-6">
            <div className="space-y-7">
              <div className="flex items-center gap-4 pb-1">
                <img
                  src={blasonLogo}
                  alt="Lor'Squad"
                  className="h-14 w-14 rounded-[22px] object-cover shadow-soft"
                />
                <div>
                  <p className="font-display text-[1.45rem] leading-none text-white">Lor'Squad</p>
                  <p className="text-[12px] text-slate-500">Wellness</p>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-[22px] bg-white/[0.035] px-4 py-3">
                <img src={laBaseLogo} alt="La Base" className="h-9 w-9 rounded-xl object-cover" />
                <div>
                  <p className="text-sm font-semibold text-white">La Base</p>
                  <p className="text-[12px] text-slate-500">Powered by La Base</p>
                </div>
              </div>

              <div className="rounded-[24px] bg-white/[0.03] px-4 py-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[15px] font-semibold text-white">{currentUser.name}</p>
                    <p className="mt-1 text-[13px] text-slate-400">{currentUser.title}</p>
                  </div>
                  <StatusBadge
                    label={getRoleLabel(currentUser.role)}
                    tone={currentUser.role === "admin" ? "blue" : "green"}
                  />
                </div>
                <p className="mt-3 text-[13px] leading-6 text-slate-500">
                  {getAccessSummary(currentUser)}
                </p>
                <Button variant="ghost" className="mt-4 w-full" onClick={() => void handleLogout()}>
                  Se deconnecter
                </Button>
              </div>

              <nav className="space-y-1.5">
                {navigation.map((item) => {
                  const isActive =
                    location.pathname === item.path ||
                    (item.path === "/clients" && location.pathname.startsWith("/clients/"));

                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      className={`flex items-center gap-3 rounded-[20px] px-4 py-3.5 text-[15px] font-medium transition ${
                        isActive
                          ? "bg-sky-400/[0.14] text-white shadow-[0_0_0_1px_rgba(107,194,255,0.16)]"
                          : "text-slate-400 hover:bg-white/[0.035] hover:text-white"
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          isActive ? "bg-sky-200" : "bg-white/15"
                        }`}
                      />
                      <span>{item.label}</span>
                      {item.path === "/assessments/new" ? (
                        <span className="ml-auto rounded-full bg-[rgba(239,197,141,0.18)] px-2.5 py-1 text-[11px] font-medium text-[rgba(255,235,214,0.92)]">
                          Nouveau
                        </span>
                      ) : null}
                    </NavLink>
                  );
                })}
              </nav>

              <div className="rounded-[24px] bg-white/[0.025] p-5">
                <p className="eyebrow-label">Cap du jour</p>
                <p className="mt-3 text-[14px] leading-7 text-slate-300">
                  Un espace plus calme, plus premium et plus fluide pour conduire le rendez-vous.
                </p>
              </div>
            </div>

            <div className="space-y-4 rounded-[26px] bg-white/[0.025] p-5">
              <BrandSignature variant="compact" />
              <div>
                <p className="eyebrow-label">Usage tablette</p>
                <p className="mt-3 text-[14px] leading-7 text-slate-300">
                  Tout reste net, respirant et facile a rouvrir pendant l&apos;echange.
                </p>
              </div>
              {currentSession ? (
                <div className="rounded-[18px] bg-slate-950/28 px-4 py-3 text-[12px] text-slate-400">
                  Session active - acces {currentSession.accessScope}
                </div>
              ) : null}
              <Button className="w-full" onClick={() => navigate("/assessments/new")}>
                Nouveau bilan
              </Button>
              <Button variant="ghost" className="w-full" onClick={() => void handleLogout()}>
                Se deconnecter
              </Button>
            </div>
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
                  <p className="truncate text-[12px] text-slate-500">Powered by La Base</p>
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
                <p className="truncate text-[13px] text-slate-400">{pageTitle}</p>
              </div>
              <StatusBadge
                label={getRoleLabel(currentUser.role)}
                tone={currentUser.role === "admin" ? "blue" : "green"}
              />
            </div>

            <Button
              variant="ghost"
              className="mt-3 w-full justify-center"
              onClick={() => void handleLogout()}
            >
              Se deconnecter
            </Button>

            <nav className="mt-4 flex gap-2 overflow-x-auto pb-1">
              {navigation.map((item) => {
                const isActive =
                  location.pathname === item.path ||
                  (item.path === "/clients" && location.pathname.startsWith("/clients/"));

                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={`whitespace-nowrap rounded-full px-4 py-2.5 text-[13px] font-medium transition ${
                      isActive
                        ? "bg-sky-400/[0.16] text-white"
                        : "bg-white/[0.03] text-slate-300"
                    }`}
                  >
                    {item.label}
                  </NavLink>
                );
              })}
            </nav>

            {!isStandalone && isIos ? (
              <div className="mt-4 rounded-[18px] bg-white/[0.03] px-4 py-3 text-[13px] leading-6 text-slate-300">
                Ouvre ce lien dans Safari, puis Partager et Sur l&apos;ecran d&apos;accueil.
              </div>
            ) : null}
            {!isStandalone && !isIos && isMobile && !canPromptInstall ? (
              <div className="mt-4 rounded-[18px] bg-white/[0.03] px-4 py-3 text-[13px] leading-6 text-slate-300">
                Ouvre ce lien dans Chrome puis Installe l&apos;app ou Ajoute a l&apos;ecran d&apos;accueil.
              </div>
            ) : null}
          </section>

          <header className="glass-panel relative overflow-hidden rounded-[30px] px-5 py-6 md:px-7 md:py-7">
            <div className="absolute right-10 top-0 h-24 w-24 rounded-full bg-[rgba(239,197,141,0.08)] blur-3xl" />
            <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
              <div className="max-w-3xl">
                <p className="eyebrow-label">Lor&apos;Squad Wellness</p>
                <p className="mt-4 max-w-[20ch] text-[1.9rem] font-semibold leading-[1.06] tracking-[-0.03em] text-white sm:text-[2.2rem] md:text-[2.55rem]">
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
                    <div className="rounded-full bg-white/[0.03] px-4 py-3 text-[12px] text-slate-300">
                      Partager puis ecran d&apos;accueil
                    </div>
                  ) : isMobile ? (
                    <div className="rounded-full bg-white/[0.03] px-4 py-3 text-[12px] text-slate-300">
                      Installer via Chrome
                    </div>
                  ) : null
                ) : null}
                <Button variant="ghost" onClick={() => void handleLogout()}>
                  Se deconnecter
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
