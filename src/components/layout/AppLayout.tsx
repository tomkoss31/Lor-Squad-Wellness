import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAppContext } from "../../context/AppContext";
import { useInstallPrompt } from "../../context/InstallPromptContext";
import { Button } from "../ui/Button";
import { StatusBadge } from "../ui/StatusBadge";
import { BottomNav } from "./BottomNav";
// V7 sidebar (2026-05-08) : ThemeToggle retire de la sidebar (vit dans
// la TopBar Co-pilote, supprime du footer sidebar pour eviter doublon).
// import { ThemeToggle } from "./ThemeToggle";
import { useRealtimeMessages } from "../../hooks/useRealtimeMessages";
import { useSessionTracker } from "../../features/gamification/hooks/useSessionTracker";
import { getInitials } from "../../lib/utils/getInitials";
import { useTheme } from "../../hooks/useTheme";
import { getRoleLabel } from "../../lib/auth";
import { useAcademyAutoTrigger } from "../../features/academy/hooks/useAcademyAutoTrigger";
import { AcademyReminderDialog } from "../../features/academy/components/AcademyReminderDialog";
import { CoachInstallPwaButton } from "../pwa/CoachInstallPwaButton";
import { SidebarStreakBadge } from "./SidebarStreakBadge";
import { useActiveTour } from "../../features/onboarding/ActiveTourContext";
import { TourRunner } from "../../features/onboarding/TourRunner";
import { useActiveQuiz } from "../../features/academy/ActiveQuizContext";
import { QuizModal } from "../../features/academy/components/QuizModal";
import { RankSelectorModal } from "../rank/RankSelectorModal";
import { AnnouncementBell } from "../announcements/AnnouncementBell";
import { AnnouncementSpotlight } from "../announcements/AnnouncementSpotlight";
import { useState } from "react";
import type { HerbalifeRank } from "../../types/domain";

// V7 sidebar refresh (2026-05-08) : NAV_ICONS supprime — remplace par
// des emojis (decoratifs aria-hidden) directement dans le tableau
// navigation pour apporter la chaleur "club bien-etre". L ancienne map
// SVG reste accessible via Git history si on veut un mode icons-only.

export function AppLayout() {
  const { currentUser, logout, followUps, pvClientProducts, unreadMessageCount, prospects, lastFetchError } = useAppContext();
  const { isDark, toggleTheme } = useTheme();
  // Chantier Notif in-app temps réel (2026-04-23) : s'abonne à
  // client_messages Realtime tant que le coach est authentifié et sur
  // l'app (les routes publiques /client/:token, /recap/:token, etc.
  // ne passent pas par AppLayout donc n'activent pas ce hook).
  useRealtimeMessages();
  // Tracking session pour stats activite admin (2026-04-29)
  useSessionTracker();
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
  // V7 sidebar (chantier 2026-05-08) : ajout d emojis decoratifs sur
  // chaque item nav — apporte la chaleur "club" que la palette G3 seule
  // peut paraitre froide. Aligne sur le design Claude Design valide
  // Thomas. Les emojis sont aria-hidden, ne changent pas l accessibilite.
  // - urgent (boolean) : badge en coral G3 pour signaler une urgence
  //   (Suivi PV en retard) au lieu d un badge red generique.
  const navigation: Array<{ label: string; path: string; emoji: string; badge: number; urgent?: boolean; adminChip?: boolean; tourId?: string }> = [
    { label: "Co-pilote", path: "/co-pilote", emoji: "▦", badge: 0, tourId: "nav-copilote" },
    { label: "FLEX", path: "/flex", emoji: "⚡", badge: 0, tourId: "nav-flex" },
    { label: "Agenda", path: "/agenda", emoji: "📅", badge: todayProspectsCount, tourId: "nav-agenda" },
    { label: "Messagerie", path: "/messages", emoji: "✉️", badge: unreadMessageCount ?? 0, tourId: "nav-messagerie" },
    { label: "Dossiers clients", path: "/clients", emoji: "👥", badge: 0, tourId: "nav-clients" },
    { label: "Suivi PV", path: "/pv", emoji: "💰", badge: pvOverdueCount, urgent: pvOverdueCount > 0, tourId: "nav-pv" },
    ...(currentUser.role === "admin"
      ? [{ label: "Mon équipe", path: "/team", emoji: "🛟", badge: 0, adminChip: true }]
      : []),
    { label: "Mon développement", path: "/developpement", emoji: "🎓", badge: 0, tourId: "nav-developpement" },
    {
      label: "Paramètres",
      path: "/parametres",
      emoji: "⚙️",
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
        ? "Formation"
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
                        : "La Base 360";

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

  // FLEX rank-aware (2026-11-05) : pop-up forcé "Confirme ton rang
  // Herbalife" tant que rank_set_at est NULL. Bloque l'app sur tous les
  // users (existants + nouveaux). Skip si on est déjà sur l'onboarding
  // distri (où le rang est demandé inline).
  const [rankConfirmed, setRankConfirmed] = useState(false);
  const needsRankConfirmation =
    !rankConfirmed &&
    !currentUser.rankSetAt &&
    !location.pathname.startsWith("/welcome") &&
    !location.pathname.startsWith("/bienvenue-distri") &&
    !location.pathname.startsWith("/auto-login");

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
          {/* ZONE 1 — Logo La Base 360 (rebrand 2026-05-05) */}
          <div style={{ padding: '20px 16px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <img
                src="/brand/labase360/app-icon-512.svg"
                alt="La Base 360"
                style={{ width: 34, height: 34, borderRadius: 9, flexShrink: 0 }}
              />
              <div style={{ minWidth: 0, overflow: 'visible' }}>
                <div style={{
                  fontFamily: 'Sora, sans-serif',
                  fontWeight: 700,
                  fontSize: 14,
                  color: '#F0EDE8',
                  lineHeight: 1.2,
                  letterSpacing: '-0.01em',
                  whiteSpace: 'nowrap',
                  overflow: 'visible',
                }}>
                  La Base{' '}
                  <span style={{
                    fontStyle: 'italic',
                    fontWeight: 400,
                    background: 'linear-gradient(135deg, #10B981 0%, #06B6D4 50%, #8B5CF6 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    // Fix italic clip 2026-05-05 : padding-right + display
                    // inline-block evitent que le slant italic soit coupe
                    // par le container (classique trick avec WebkitBackgroundClip).
                    display: 'inline-block',
                    paddingRight: '4px',
                  }}>360</span>
                </div>
                <div style={{
                  fontSize: 8.5,
                  color: '#4A5068',
                  letterSpacing: '1.2px',
                  textTransform: 'uppercase',
                  marginTop: 2,
                  whiteSpace: 'nowrap',
                }}>★ Since 2022 ★</div>
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
              // inséré juste avant "Formation".
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
                    className="ls-nav-item flex items-center gap-3 rounded-r-[12px] text-[13px] transition"
                    style={{
                      // V7 sidebar (2026-05-08) : refonte aligne G3.
                      // - Etat actif : pill gradient G3 soft + barre laterale 3px gradient G3
                      // - Etat hover : background subtle + emoji scale 1.12
                      // - Etat inactif : muted color + emoji opacity 0.7
                      position: 'relative',
                      padding: '10px 12px 10px 14px',
                      marginLeft: -2,
                      borderLeft: '2px solid transparent',
                      background: isActive
                        ? 'linear-gradient(135deg, color-mix(in srgb, #10B981 14%, transparent) 0%, color-mix(in srgb, #06B6D4 12%, transparent) 50%, color-mix(in srgb, #8B5CF6 14%, transparent) 100%)'
                        : 'transparent',
                      color: isActive ? 'var(--ls-text)' : 'var(--ls-text-muted)',
                      fontWeight: isActive ? 600 : 500,
                      fontFamily: "'Inter', system-ui, sans-serif",
                      textDecoration: 'none',
                      transition: 'background 0.18s ease, color 0.18s ease',
                      letterSpacing: '-0.005em',
                    }}
                    onMouseEnter={e => {
                      if (!isActive) e.currentTarget.style.background = 'var(--ls-surface2)'
                    }}
                    onMouseLeave={e => {
                      if (!isActive) e.currentTarget.style.background = 'transparent'
                    }}
                  >
                    {/* Barre laterale gauche gradient G3 (active state). */}
                    {isActive ? (
                      <span
                        aria-hidden="true"
                        style={{
                          position: 'absolute',
                          left: -2,
                          top: 6,
                          bottom: 6,
                          width: 3,
                          borderRadius: 999,
                          background: 'linear-gradient(180deg, #10B981 0%, #06B6D4 50%, #8B5CF6 100%)',
                          boxShadow: '0 0 12px color-mix(in srgb, #10B981 50%, transparent)',
                        }}
                      />
                    ) : null}
                    <span
                      aria-hidden="true"
                      style={{
                        flexShrink: 0,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 22,
                        height: 22,
                        fontSize: 16,
                        lineHeight: 1,
                        opacity: isActive ? 1 : 0.78,
                        transition: 'transform 0.18s ease',
                      }}
                    >
                      {item.emoji}
                    </span>
                    <span className="flex-1">{item.label}</span>
                    {/* Badge urgent (coral) pour Suivi PV en retard, sinon
                        badge neutre. ADMIN chip violet pour Mon equipe admin. */}
                    {item.adminChip ? (
                      <span style={{
                        fontSize: 9,
                        padding: '2px 7px',
                        borderRadius: 999,
                        background: 'color-mix(in srgb, #8B5CF6 16%, transparent)',
                        color: 'color-mix(in srgb, #8B5CF6 80%, var(--ls-text))',
                        border: '1px solid color-mix(in srgb, #8B5CF6 30%, transparent)',
                        fontWeight: 700,
                        marginLeft: 'auto',
                        letterSpacing: '0.08em',
                        fontFamily: "'JetBrains Mono', monospace",
                        flexShrink: 0,
                      }}>
                        ADMIN
                      </span>
                    ) : item.badge > 0 ? (
                      <span style={{
                        fontSize: 10,
                        padding: '2px 8px',
                        borderRadius: 999,
                        background: item.urgent
                          ? 'color-mix(in srgb, #D4537E 18%, transparent)'
                          : 'color-mix(in srgb, #06B6D4 16%, transparent)',
                        color: item.urgent
                          ? 'color-mix(in srgb, #D4537E 80%, var(--ls-text))'
                          : 'color-mix(in srgb, #06B6D4 80%, var(--ls-text))',
                        border: item.urgent
                          ? '1px solid color-mix(in srgb, #D4537E 35%, transparent)'
                          : '1px solid color-mix(in srgb, #06B6D4 30%, transparent)',
                        fontWeight: 700,
                        marginLeft: 'auto',
                        fontFamily: "'JetBrains Mono', monospace",
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
            {/* Polish 2026-04-29 : badge streak en haut du footer sidebar */}
            <SidebarStreakBadge />
            {/* Ligne profil + bouton Sortir inline. V7 sidebar refresh
                (2026-05-08) : avatar gradient G3 (au lieu teal V5),
                police Sora pour le nom, color tokens cleans. */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 36, height: 36, borderRadius: '50%',
                background: currentUser.avatarUrl
                  ? `url(${currentUser.avatarUrl}) center/cover`
                  : 'linear-gradient(135deg, #10B981 0%, #06B6D4 50%, #8B5CF6 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 800, color: '#FFFFFF',
                fontFamily: "'Sora', sans-serif", flexShrink: 0,
                boxShadow: 'inset 0 0 0 2px var(--ls-sidebar-bg)',
                letterSpacing: '0.02em',
              }}>
                {!currentUser.avatarUrl && getInitials(currentUser.name)}
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: 'var(--ls-text)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  fontFamily: "'Sora', sans-serif",
                  letterSpacing: '-0.005em',
                }}>
                  {currentUser.name}
                </div>
                <div style={{
                  fontSize: 11,
                  color: 'var(--ls-text-muted)',
                  fontFamily: "'Inter', sans-serif",
                  fontWeight: 500,
                }}>
                  {currentUser.role === 'admin' ? 'Coach · Admin' : 'Coach'}
                </div>
              </div>

              {/* Bouton Sortir compact a droite du nom */}
              <button
                onClick={() => void handleLogout()}
                aria-label="Se déconnecter"
                title="Se déconnecter"
                style={{
                  flexShrink: 0,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '7px 11px',
                  borderRadius: 999,
                  background: 'color-mix(in srgb, #D4537E 12%, transparent)',
                  border: '1px solid color-mix(in srgb, #D4537E 32%, transparent)',
                  color: 'color-mix(in srgb, #D4537E 75%, var(--ls-text))',
                  cursor: 'pointer',
                  fontSize: 11,
                  fontWeight: 600,
                  fontFamily: "'Sora', sans-serif",
                  letterSpacing: '0.01em',
                  transition: 'all 0.18s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#D4537E';
                  e.currentTarget.style.color = '#FFFFFF';
                  e.currentTarget.style.borderColor = '#D4537E';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'color-mix(in srgb, #D4537E 12%, transparent)';
                  e.currentTarget.style.color = 'color-mix(in srgb, #D4537E 75%, var(--ls-text))';
                  e.currentTarget.style.borderColor = 'color-mix(in srgb, #D4537E 32%, transparent)';
                }}
              >
                <span aria-hidden="true" style={{ fontSize: 13, lineHeight: 1 }}>↪</span>
                Sortir
              </button>
            </div>

            {/* V7 sidebar refresh (2026-05-08) : SUPPRESSION du theme
                toggle + cloche notifs ici (doublon avec la TopBar
                Co-pilote ou je les ai mis en Phase 2). Validation Thomas :
                "le curseur qui a ete ajoute en haut, je modifierais pas".
                Sur les pages SANS TopBar (Agenda / Messagerie / Clients
                etc.), l'acces theme passe par /parametres et les notifs
                ne sont reachable que via /co-pilote ou les push natives.
                A revoir si besoin futur d'acces global. */}
            {/* Footer legal RGPD retire du sidebar (V2 — 2026-04-30) :
                deplace dans Parametres > Confidentialite & RGPD pour
                un acces propre + footer in-page sur Co-pilote/Agenda/PV */}
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
                  src="/brand/labase360/app-icon-512.svg"
                  alt="La Base 360"
                  className="h-11 w-11 rounded-[16px] object-cover shadow-soft"
                />
                <div className="min-w-0">
                  <p className="truncate text-base font-semibold text-white" style={{ fontFamily: "Sora, sans-serif" }}>
                    La Base 360
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <AnnouncementBell />
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
      {/* Migration prod 2026-04-28 : rappel Academy admin only. */}
      {academyTrigger.isOpen && currentUser?.role === "admin" ? (
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
      {needsRankConfirmation ? (
        <RankSelectorModal
          userId={currentUser.id}
          initialRank={(currentUser.currentRank as HerbalifeRank | undefined) ?? "distributor_25"}
          onConfirmed={() => setRankConfirmed(true)}
        />
      ) : null}
      {/* Spotlight nouveautés (2026-05-04) : popup auto-affiché à la 1ère
          ouverture après publication d'une annonce non lue. Skippable. */}
      <AnnouncementSpotlight />
    </div>
  );
}
