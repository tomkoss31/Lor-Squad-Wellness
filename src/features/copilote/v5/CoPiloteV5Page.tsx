// =============================================================================
// CoPiloteV5Page — assemblage final V5 Editoriale (2026-05-05)
//
// Page Co-pilote V5 : Hero éditorial + Rentab parcours + Stats × 3 +
// Timeline + Side stack. Sidebar gérée par AppLayout (pas touchée).
//
// Conserve (intégrés au layout V5) :
//   - DistriOnboardingChecklist (visible en haut si distri < 14j)
//   - PvActionPlanAlert (bandeau alerte conditionnel — passé en prop
//     pvAlertActive au HeroEditorial pour dim Daily Boost)
//   - WeeklyQuestsCard (en bas, ancrage gamification)
//
// Enterre :
//   - ClockHeader, HeroActionCard, TodayAgendaCard, PendingFollowupsCard,
//     PvGaugeBand, InboxWidget, CoachTipOfDayCard, BusinessOpportunitiesCard
//   - StreakBadge / BirthdayBlock : anciens widgets remplacés par les
//     nouveaux composants V5 (info repris dans SideStack opp)
//
// Responsive (CSS via media queries inline impossibles → on scope dans
// copilote-v5.css à voir si besoin, V5 MVP utilise grid-template-columns
// avec auto + min-content).
// =============================================================================

import { useState, useEffect, useMemo } from "react";
import { useAppContext } from "../../../context/AppContext";
import { useGlobalView } from "../../../hooks/useGlobalView";
import { useCopiloteData } from "../../../hooks/useCopiloteData";
// Chantier Co-pilote V7 — Phase 2 (2026-05-08) : pills connecteurs
// supplementaires sur la topbar.
import { useTheme } from "../../../hooks/useTheme";
import { useFormationStreak } from "../../../hooks/useFormationStreak";
// V7 Phase 8.1 (2026-05-08) : greeting heure-adaptatif via useTimeContext.
import { useTimeContext } from "./hooks/useTimeContext";

import { HeroEditorial } from "./components/HeroEditorial";
import { RentabJourney } from "./components/RentabJourney";
import { ReferrerStatsCard } from "../../../components/copilote/ReferrerStatsCard";
import { StatsRow3 } from "./components/StatsRow3";
import { TodayTimeline } from "./components/TodayTimeline";
import { SideStack } from "./components/SideStack";

import { DistriOnboardingChecklist } from "../../../components/formation/DistriOnboardingChecklist";
import { CelebrationCard } from "../../../components/copilote/CelebrationCard";
import { Liste100ShortcutCard } from "../../../components/copilote/Liste100ShortcutCard";
import { PvActionPlanAlert } from "../../../components/copilote/PvActionPlanAlert";
import { DormantClientsWidget } from "../../../components/dormant/DormantClientsWidget";
import { LegalFooter } from "../../../components/ui/LegalFooter";
import { AnnouncementBell } from "../../../components/announcements/AnnouncementBell";
import { WeatherPopup } from "./components/WeatherPopup";
import { useWeatherForecast } from "./hooks/useWeatherForecast";

import "./copilote-v5.css";

export function CoPiloteV5Page() {
  const { currentUser } = useAppContext();
  const [globalView] = useGlobalView();
  const [now, setNow] = useState(new Date());
  const data = useCopiloteData(now, globalView);

  // Météo : fetch léger pour la pill (current temp + emoji). Le popup
  // utilise le même hook (memoized par city) → 0 double-fetch.
  const userCity = currentUser?.city ?? null;
  const { forecast: weatherLite } = useWeatherForecast(userCity, true);
  const [weatherOpen, setWeatherOpen] = useState(false);

  // Co-pilote V7 — Phase 2 (2026-05-08) : pills connecteurs supplementaires.
  const { isDark, toggleTheme } = useTheme();
  const { count: streakDays, badge: streakBadge } = useFormationStreak();
  // V7 Phase 8.1 (2026-05-08) : greeting heure-adaptatif chaleureux.
  // Bon matin / Bon midi / Belle apres-midi / Bonne soiree / Tu bosses tard
  const timeContext = useTimeContext();

  // Refresh `now` toutes les minutes pour la date display
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  // Top-bar greeting "Bonjour Thomas 👋"
  const firstName = useMemo(() => {
    return (currentUser?.name ?? "").split(/\s+/)[0] || "";
  }, [currentUser?.name]);

  const dateDisplay = useMemo(() => {
    const date = new Intl.DateTimeFormat("fr-FR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(now);
    return date.charAt(0).toUpperCase() + date.slice(1);
  }, [now]);

  const clockDisplay = useMemo(() => {
    return new Intl.DateTimeFormat("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(now);
  }, [now]);

  if (!currentUser) {
    return (
      <div className="copilote-v5" style={{ padding: 30 }}>
        <p>Chargement…</p>
      </div>
    );
  }

  // Données pour StatsRow3 (à raffiner via vrais KPIs si dispo, sinon
  // valeurs dérivées de useCopiloteData)
  const todoCount = (data.pendingFollowups?.length ?? 0);
  const todoSubtitle =
    todoCount > 0
      ? `${todoCount} suivi${todoCount > 1 ? "s" : ""} à traiter`
      : "Inbox à jour 👌";

  // Bilans semaine : approximation via todayAgenda count × 5 jours (très
  // grossier, à raffiner avec un vrai compteur week)
  const bilansWeekDone = Math.min(6, data.todayAppointmentsCount * 2);

  return (
    <div className="copilote-v5" style={pageWrapStyle}>
      {/* ═══ TOP BAR V7 ═══════════════════════════════════════════════
          Chantier Co-pilote V7 / Phase 2 (2026-05-08) :
          - Sticky avec backdrop blur (effet "glass" premium)
          - Pastille "★ SINCE 2022 ★" eyebrow
          - Greeting accent : gradient G3 (au lieu de gold/orange V5)
          - Pills connecteurs uniformises G3 :
            * Meteo (existante, re-skin)
            * Horloge live
            * Streak (NOUVEAU — useFormationStreak)
            * Cloche annonces (existante)
            * Theme toggle (NOUVEAU — useTheme) */}
      <div style={topBarStyle}>
        <div style={topBarLeftStyle}>
          <div style={topBarMetaStyle}>
            <span style={liveDotStyle} className="v5-pulse" />
            {dateDisplay}
            <span aria-hidden="true" style={topBarSinceStyle}>★ SINCE 2022 ★</span>
          </div>
          {/* Greeting fixe "Bonjour [Prénom] 👋" — alignement pixel-perfect
              avec le HTML de réf. timeContext sert uniquement en interne
              (Daily Boost catégorie + suggestion proactive idle). */}
          <h1 style={greetingStyle}>
            {timeContext.greeting} <span style={greetingAccentStyle}>{firstName}</span>{" "}
            <span aria-hidden="true" role="img">👋</span>
          </h1>
        </div>

        <div style={topBarRightStyle}>
          {/* Weather pill réelle (Open-Meteo, click → popup 5 jours).
              Si city manquante : pill discrète "Météo" qui ouvre le CTA
              "Renseigner ma ville". Chantier D 2026-05-05. */}
          <button
            type="button"
            onClick={() => setWeatherOpen(true)}
            style={pillStyle}
            aria-label={
              weatherLite
                ? `Météo ${weatherLite.city} : ${weatherLite.current.temp}°, ${weatherLite.current.label}. Cliquer pour voir 5 jours.`
                : "Voir la météo"
            }
          >
            <span aria-hidden="true">{weatherLite?.current.emoji ?? "🌤"}</span>
            {weatherLite ? (
              <>
                <span style={pillMonoStyle}>{weatherLite.current.temp}°</span>
                <span style={pillDimStyle}>{weatherLite.current.label}</span>
              </>
            ) : (
              <span style={pillDimStyle}>Météo</span>
            )}
          </button>

          {/* Horloge live (remplace search box — validation Thomas 2026-05-05) */}
          <div style={pillStyle} aria-label="Heure courante">
            <span aria-hidden="true">🕒</span>
            <span style={pillMonoStyle}>{clockDisplay}</span>
          </div>

          {/* Streak coaching (V7 Phase 2 — nouveau).
              Affiche jours d affilee + badge palier (grain/flamme/legende).
              Click → /developpement/cahier-de-bord pour voir l historique. */}
          {streakDays > 0 ? (
            <div
              style={pillStreakStyle}
              aria-label={`Streak coaching : ${streakDays} jour${streakDays > 1 ? "s" : ""} d'affilée${streakBadge.level !== "none" ? ", " + streakBadge.label : ""}`}
              title={streakBadge.hint}
            >
              <span aria-hidden="true">{streakBadge.emoji || "🔥"}</span>
              <strong style={{ fontFamily: "var(--lb360-display, 'Sora', sans-serif)", fontSize: 14, fontWeight: 800 }}>
                {streakDays}
                <span style={{ fontSize: 11, fontWeight: 600, marginLeft: 1 }}>j</span>
              </strong>
              {streakBadge.level !== "none" ? (
                <span style={pillDimStyle}>· {streakBadge.label}</span>
              ) : null}
            </div>
          ) : null}

          {/* Cloche réelle (validation Thomas 2026-05-05) — composant
              AnnouncementBell existant : badge unread + dropdown annonces. */}
          <AnnouncementBell />

          {/* Theme toggle V7 — pills harmonisees G3. */}
          <button
            type="button"
            onClick={toggleTheme}
            style={pillIconStyle}
            aria-label={isDark ? "Passer en mode clair" : "Passer en mode sombre"}
            title={isDark ? "Mode clair" : "Mode sombre"}
          >
            <span aria-hidden="true">{isDark ? "☀️" : "🌙"}</span>
          </button>
        </div>
      </div>

      {/* Onboarding checklist conditionnel */}
      {currentUser.role === "distributor" && <DistriOnboardingChecklist />}

      {/* Chantier anniversaires (2026-05-08) : card chaleureuse en haut
          du Co-pilote qui s affiche si au moins un client a un anniv
          aujourd hui (naissance ou +1m/+3m/+6m programme). Auto-hidden
          si aucun event. Bouton WhatsApp avec message pre-rempli. */}
      <CelebrationCard />

      {/* Raccourci direct Liste 100 (Phase 0.8 Égypte 2026-05) — 1 clic
          au lieu de 3-4. Card avec compteur live X/100 + barre progress. */}
      <Liste100ShortcutCard />

      {/* Hero éditorial */}
      <HeroEditorial />

      {/* Rentab parcours */}
      <RentabJourney />

      {/* V2 funnel business : stats referrer leads (masque si 0 lead ce mois) */}
      <ReferrerStatsCard />

      {/* Stats 3 colonnes */}
      <StatsRow3
        todoCount={todoCount}
        todoSubtitle={todoSubtitle}
        bilansWeekDone={bilansWeekDone}
        bilansWeekTarget={6}
        bilansTrend={bilansWeekDone > 0 ? "↗ Cette semaine" : "—"}
      />

      {/* Widget dormants (chantier B livré, câblé 2026-05-20).
          Auto-hidden si aucun client dormant. Place juste avant
          PvActionPlanAlert pour grouper les alertes business
          actionables (relance + plan PV). */}
      <DormantClientsWidget />

      {/* Bandeau alerte PV — V7 Phase 7 (2026-05-08) deplacement.
          Avant : place en INTRO (juste apres TopBar) → angoissant pour
          un nouveau distri a 0 PV qui voit "tu es en retard" en haut.
          Apres : place ICI sous les stats row, vu seulement quand on
          scroll. Le composant reste auto-conditionnel : il retourne
          null si data.status !== "delayed" (deja le cas). */}
      {currentUser.id ? <PvActionPlanAlert userId={currentUser.id} /> : null}

      {/* Row bottom : Timeline + Side stack */}
      <section style={rowBottomStyle} data-v5-row-bottom>
        <TodayTimeline />
        <SideStack />
      </section>

      {/* Footer légal */}
      <LegalFooter />

      {/* Popup météo 5 jours */}
      <WeatherPopup
        open={weatherOpen}
        onClose={() => setWeatherOpen(false)}
        city={userCity}
      />
    </div>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────

const pageWrapStyle: React.CSSProperties = {
  padding: "22px clamp(16px, 4vw, 26px) 24px",
  display: "flex",
  flexDirection: "column",
  gap: 14,
  background: "var(--ls-bg)",
  color: "var(--ls-text)",
  minHeight: "100vh",
};

// ─── TopBar V7 styles (chantier 2026-05-08) ──────────────────────────────
// Tous les tokens passent en var(--lb360-*) pour suivre la palette G3 et
// la bascule light/dark via var(--ls-surface).
const topBarStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  flexWrap: "wrap",
  gap: 12,
  position: "sticky",
  top: 0,
  zIndex: 30,
  // backdrop "glass" : transparent legerement teinte du surface, blur fort
  background: "color-mix(in srgb, var(--ls-bg) 78%, transparent)",
  backdropFilter: "saturate(150%) blur(16px)",
  WebkitBackdropFilter: "saturate(150%) blur(16px)",
  borderBottom: "1px solid var(--ls-border)",
  margin: "-22px clamp(-16px, -4vw, -26px) 0",
  padding: "16px clamp(16px, 4vw, 26px) 14px",
};

const topBarLeftStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
};

const topBarMetaStyle: React.CSSProperties = {
  fontSize: 10.5,
  letterSpacing: 1.6,
  color: "var(--ls-text-muted)",
  textTransform: "uppercase",
  fontWeight: 600,
  marginBottom: 4,
  display: "flex",
  alignItems: "center",
  gap: 10,
  fontFamily: "var(--lb360-mono, 'JetBrains Mono', monospace)",
  flexWrap: "wrap",
};

// Pastille "★ SINCE 2022 ★" V7 — heritage brand visible en permanence.
const topBarSinceStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  padding: "3px 10px",
  borderRadius: 999,
  fontSize: 9.5,
  letterSpacing: 1.6,
  fontWeight: 700,
  color: "color-mix(in srgb, var(--lb360-cyan) 70%, var(--ls-text))",
  background: "color-mix(in srgb, var(--lb360-cyan) 10%, transparent)",
  border: "1px solid color-mix(in srgb, var(--lb360-cyan) 28%, transparent)",
  fontFamily: "var(--lb360-mono, 'JetBrains Mono', monospace)",
};

const liveDotStyle: React.CSSProperties = {
  width: 7,
  height: 7,
  borderRadius: "50%",
  background: "var(--lb360-emerald, #10B981)",
  display: "inline-block",
  boxShadow: "0 0 0 4px color-mix(in srgb, var(--lb360-emerald) 22%, transparent)",
};

const greetingStyle: React.CSSProperties = {
  fontFamily: "var(--lb360-display, 'Sora', sans-serif)",
  fontSize: "clamp(26px, 3.4vw, 32px)",
  fontWeight: 800,
  color: "var(--ls-text)",
  letterSpacing: "-0.025em",
  lineHeight: 1.05,
  margin: 0,
};

// Greeting accent V7 : gradient G3 (emerald → cyan → violet) au lieu du
// gold/orange V5 (#EF9F27 → #BA7517) qui jurait avec la nouvelle identite.
const greetingAccentStyle: React.CSSProperties = {
  background: "var(--lb360-gradient, linear-gradient(135deg, #10B981 0%, #06B6D4 50%, #8B5CF6 100%))",
  WebkitBackgroundClip: "text",
  backgroundClip: "text",
  WebkitTextFillColor: "transparent",
  color: "transparent",
  fontStyle: "italic",
  fontWeight: 800,
  // Fix italic clip : padding-right + display inline-block pour ne pas
  // couper le slant de l italique (probleme classique avec WebkitBackgroundClip).
  display: "inline-block",
  paddingRight: 4,
};

const topBarRightStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  flexWrap: "wrap",
};

// Pill base V7 : harmonisee, hover subtil, transitions douces.
const pillStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  background: "var(--ls-surface)",
  border: "1px solid var(--ls-border)",
  borderRadius: 999,
  padding: "9px 14px",
  fontSize: 13,
  fontWeight: 600,
  color: "var(--ls-text)",
  fontFamily: "var(--lb360-body, 'Inter', sans-serif)",
  cursor: "pointer",
  outline: "none",
  transition: "border-color 0.18s ease, transform 0.18s ease, box-shadow 0.18s ease",
};

// Streak pill : accent gold/coral pour gamification. Click → cahier de bord.
const pillStreakStyle: React.CSSProperties = {
  ...pillStyle,
  cursor: "default",
  background: "color-mix(in srgb, var(--lb360-coral, #D4537E) 8%, var(--ls-surface))",
  borderColor: "color-mix(in srgb, var(--lb360-coral, #D4537E) 28%, var(--ls-border))",
  color: "color-mix(in srgb, var(--lb360-coral, #D4537E) 60%, var(--ls-text))",
};

// Pill icon (sans texte) — ex. theme toggle
const pillIconStyle: React.CSSProperties = {
  ...pillStyle,
  width: 38,
  height: 38,
  padding: 0,
  justifyContent: "center",
  fontSize: 16,
};

const pillMonoStyle: React.CSSProperties = {
  fontFamily: "var(--lb360-mono, 'JetBrains Mono', monospace)",
  fontWeight: 700,
  letterSpacing: "-0.01em",
};

const pillDimStyle: React.CSSProperties = {
  color: "var(--ls-text-muted)",
  fontSize: 11.5,
  fontWeight: 500,
};
// Note 2026-05-05 : notifBtnStyle supprimé (remplacé par AnnouncementBell).

const rowBottomStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1.7fr) minmax(0, 1fr)",
  gap: 14,
};
