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
import { useTimeContext } from "./hooks/useTimeContext";

import { HeroEditorial } from "./components/HeroEditorial";
import { RentabJourney } from "./components/RentabJourney";
import { StatsRow3 } from "./components/StatsRow3";
import { TodayTimeline } from "./components/TodayTimeline";
import { SideStack } from "./components/SideStack";

import { DistriOnboardingChecklist } from "../../../components/formation/DistriOnboardingChecklist";
import { PvActionPlanAlert } from "../../../components/copilote/PvActionPlanAlert";
import { WeeklyQuestsCard } from "../../gamification/components/WeeklyQuestsCard";
import { LegalFooter } from "../../../components/ui/LegalFooter";

import "./copilote-v5.css";

export function CoPiloteV5Page() {
  const { currentUser } = useAppContext();
  const [globalView] = useGlobalView();
  const [now, setNow] = useState(new Date());
  const data = useCopiloteData(now, globalView);
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
    const time = new Intl.DateTimeFormat("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(now);
    const cap = date.charAt(0).toUpperCase() + date.slice(1);
    return `${cap} · Édition du jour · ${time}`;
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
      {/* Top bar */}
      <div style={topBarStyle}>
        <div style={topBarLeftStyle}>
          <div style={topBarMetaStyle}>
            <span style={liveDotStyle} className="v5-pulse" />
            {dateDisplay}
          </div>
          <h1 style={greetingStyle}>
            {timeContext.greeting}{" "}
            <span style={greetingAccentStyle}>{firstName}</span>{" "}
            <span aria-hidden="true">{timeContext.emoji}</span>
          </h1>
        </div>

        <div style={topBarRightStyle}>
          <div style={weatherPillStyle}>
            <span aria-hidden="true">{timeContext.emoji}</span>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}>
              {timeContext.label}
            </span>
          </div>

          {/* Search ⌘K stub (validation Thomas Q4 — non fonctionnel V5) */}
          <div style={searchBoxStyle} role="search" aria-label="Recherche (à venir)">
            <span aria-hidden="true">🔍</span>
            <span style={{ flex: 1, color: "#7A6F5C" }}>Rechercher…</span>
            <span style={shortcutStyle}>⌘K</span>
          </div>

          <button type="button" style={notifBtnStyle} aria-label="Notifications">
            🔔
          </button>
        </div>
      </div>

      {/* Onboarding checklist conditionnel */}
      {currentUser.role === "distributor" && <DistriOnboardingChecklist />}

      {/* Bandeau alerte PV (passe pvAlertActive au Hero pour dim Daily Boost) */}
      {currentUser.id ? <PvActionPlanAlert userId={currentUser.id} /> : null}

      {/* Hero éditorial */}
      <HeroEditorial />

      {/* Rentab parcours */}
      <RentabJourney />

      {/* Stats 3 colonnes */}
      <StatsRow3
        todoCount={todoCount}
        todoSubtitle={todoSubtitle}
        bilansWeekDone={bilansWeekDone}
        bilansWeekTarget={6}
        bilansTrend={bilansWeekDone > 0 ? "↗ Cette semaine" : "—"}
      />

      {/* Row bottom : Timeline + Side stack */}
      <section style={rowBottomStyle} data-v5-row-bottom>
        <TodayTimeline />
        <SideStack />
      </section>

      {/* Quêtes hebdo (gamification conservé) */}
      <WeeklyQuestsCard />

      {/* Footer légal */}
      <LegalFooter />
    </div>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────

const pageWrapStyle: React.CSSProperties = {
  padding: "22px clamp(16px, 4vw, 26px) 24px",
  display: "flex",
  flexDirection: "column",
  gap: 14,
  background: "#F8F5EC",
  minHeight: "100vh",
};

const topBarStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  flexWrap: "wrap",
  gap: 12,
};

const topBarLeftStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
};

const topBarMetaStyle: React.CSSProperties = {
  fontSize: 10,
  letterSpacing: 1.8,
  color: "#7A6F5C",
  textTransform: "uppercase",
  fontWeight: 600,
  marginBottom: 4,
  display: "flex",
  alignItems: "center",
  gap: 8,
  fontFamily: "DM Sans, sans-serif",
};

const liveDotStyle: React.CSSProperties = {
  width: 6,
  height: 6,
  borderRadius: "50%",
  background: "#1D9E75",
  display: "inline-block",
};

const greetingStyle: React.CSSProperties = {
  fontFamily: "DM Sans, sans-serif",
  fontSize: 30,
  fontWeight: 800,
  color: "#1A1612",
  letterSpacing: -1.5,
  lineHeight: 1,
  margin: 0,
};

const greetingAccentStyle: React.CSSProperties = {
  background: "linear-gradient(180deg, #EF9F27, #BA7517)",
  WebkitBackgroundClip: "text",
  backgroundClip: "text",
  WebkitTextFillColor: "transparent",
  fontStyle: "italic",
};

const topBarRightStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  flexWrap: "wrap",
};

const weatherPillStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  background: "white",
  border: "1px solid #EFE8D6",
  borderRadius: 12,
  padding: "9px 14px",
  fontSize: 13,
  fontWeight: 600,
  color: "#4A3F2A",
  fontFamily: "DM Sans, sans-serif",
};

const searchBoxStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  background: "white",
  border: "1px solid #EFE8D6",
  borderRadius: 12,
  padding: "9px 14px",
  fontSize: 12.5,
  color: "#7A6F5C",
  width: 220,
  cursor: "default",
  opacity: 0.8,
};

const shortcutStyle: React.CSSProperties = {
  marginLeft: "auto",
  background: "#F8F5EC",
  padding: "2px 6px",
  borderRadius: 5,
  fontSize: 10,
  fontFamily: "'JetBrains Mono', monospace",
  fontWeight: 700,
  color: "#7A6F5C",
};

const notifBtnStyle: React.CSSProperties = {
  width: 38,
  height: 38,
  background: "white",
  border: "1px solid #EFE8D6",
  borderRadius: 11,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 16,
  position: "relative",
  cursor: "pointer",
};

const rowBottomStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1.7fr) minmax(0, 1fr)",
  gap: 14,
};
