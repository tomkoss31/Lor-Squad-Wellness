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

import { PlanDuJour } from "./components/PlanDuJour";
// RentabJourney reste utilisé par la vue superviseur passif (CoPilotePassiveView).
import { RentabJourney } from "./components/RentabJourney";

import { DistriOnboardingChecklist } from "../../../components/formation/DistriOnboardingChecklist";
import { CelebrationCard } from "../../../components/copilote/CelebrationCard";
import { useDailyActionChecklist } from "../../../hooks/useDailyActionChecklist";
import { useNavigate } from "react-router-dom";
import { LegalFooter } from "../../../components/ui/LegalFooter";
import { AnnouncementBell } from "../../../components/announcements/AnnouncementBell";
import { WeatherPopup } from "./components/WeatherPopup";
import { useWeatherForecast } from "./hooks/useWeatherForecast";
// Moteur d'équipe PR3 (2026-06-27) : métrique-reine expositions + nudge démarrage.
import { ExposuresWeekCard } from "../../../components/team/ExposuresWeekCard";
// Salle des Opérations (onboarding distri) : switch de rendu §3.
import { SalleOpsQuotidien } from "../salle-ops/SalleOpsQuotidien";
import { useSalleOps } from "../salle-ops/useSalleOps";

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
  // Routine du jour (chantier #2, 2026-05-20) : score live pour la pill topbar.
  // Le popup auto a été retiré — la routine est sur /routine-du-jour, accès
  // via cette chip ou via /developpement > Ma routine du jour.
  const { score: routineScore, total: routineTotal } = useDailyActionChecklist(now);
  const navigate = useNavigate();
  // V7 Phase 8.1 (2026-05-08) : greeting heure-adaptatif chaleureux.
  // Bon matin / Bon midi / Belle apres-midi / Bonne soiree / Tu bosses tard
  const timeContext = useTimeContext();

  // Switch §3 — Salle des Opérations : vue cockpit pour la recrue non activée.
  const ops = useSalleOps();
  // Échappatoire « Plus tard » (par session) : ne verrouille jamais l'app.
  const [opsEscaped, setOpsEscaped] = useState(
    () => typeof window !== "undefined" && sessionStorage.getItem("ls-ops-escape") === "1",
  );

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

  // ═══ Vue Light pour Supervisor passif (chantier Light V2 2026-05-22) ═══
  // Hero éditorial + rentab perso uniquement. Pas de timeline, PV, dormants,
  // checklist onboarding — un passif ne fait pas le business.
  if (currentUser.isPassiveSupervisor) {
    return <CoPilotePassiveView firstName={firstName} />;
  }

  // ═══ Switch §3 — Salle des Opérations (incorporation onboarding) ═══
  // Tant qu'un membre n'est pas « activé » (5 portes franchies), son Co-pilote EST
  // le cockpit plein écran : 1 action du jour, pas l'app lourde. Tous les rôles
  // (« on est tous nouveaux sur l'app ») — sauf échappatoire « Plus tard ».
  if (!ops.loading && !ops.activated && !opsEscaped) {
    return (
      <SalleOpsQuotidien
        view={ops}
        fullscreen
        onEscape={() => {
          sessionStorage.setItem("ls-ops-escape", "1");
          setOpsEscaped(true);
        }}
      />
    );
  }

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

        <div style={topBarRightStyle} data-v5-topbar-right>
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

          {/* Chip routine du jour (chantier #2, 2026-05-20) — score live X/5
              avec accent gold. Click → /routine-du-jour. Pas de popup auto. */}
          <button
            type="button"
            onClick={() => navigate("/routine-du-jour")}
            style={pillRoutineStyle(routineScore, routineTotal)}
            aria-label={`Ma routine du jour : ${routineScore} sur ${routineTotal} actions faites`}
            title="Ouvrir ma routine du jour"
          >
            <span aria-hidden="true">☀️</span>
            <strong style={{ fontFamily: "var(--lb360-display, 'Sora', sans-serif)", fontSize: 14, fontWeight: 800 }}>
              {routineScore}
              <span style={{ fontSize: 11, fontWeight: 600, opacity: 0.7 }}>/{routineTotal}</span>
            </strong>
            <span style={pillDimStyle}>routine</span>
          </button>

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

          {/* Cloche + theme toggle = doublons du MobileHeader (Onde 1) →
              masqués sur mobile via [data-v5-topbar-dups]. */}
          {opsEscaped && !ops.activated ? (
            <button
              type="button"
              onClick={() => {
                sessionStorage.removeItem("ls-ops-escape");
                setOpsEscaped(false);
              }}
              style={pillIconStyle}
              aria-label="Revenir à La Base Académie"
              title="Revenir à La Base Académie"
            >
              <span aria-hidden="true">▦</span>
            </button>
          ) : null}
          <span data-v5-topbar-dups style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
            <AnnouncementBell />
            <button
              type="button"
              onClick={toggleTheme}
              style={pillIconStyle}
              aria-label={isDark ? "Passer en mode clair" : "Passer en mode sombre"}
              title={isDark ? "Mode clair" : "Mode sombre"}
            >
              <span aria-hidden="true">{isDark ? "☀️" : "🌙"}</span>
            </button>
          </span>
        </div>
      </div>

      {/* Onboarding checklist conditionnel */}
      {currentUser.role === "distributor" && <DistriOnboardingChecklist />}

      {/* L'ancien « Mon démarrage 30 jours » (StarterPlanCard) est retiré :
          remplacé par la Salle des Opérations (switch §3 ci-dessus). Le distri
          non activé voit le cockpit ; l'activé n'a plus de nudge ici. */}

      {/* Chantier anniversaires (2026-05-08) : card chaleureuse en haut
          du Co-pilote qui s affiche si au moins un client a un anniv
          aujourd hui (naissance ou +1m/+3m/+6m programme). Auto-hidden
          si aucun event. Bouton WhatsApp avec message pre-rempli. */}
      <CelebrationCard />

      {/* ═══ PLAN DU JOUR (refonte chantier 1, design Claude Design validé) ═══
          Le nouveau héros : file d'actions priorisée (RDV + relances propres +
          inbox) dans le shell premium (warm dark + G3 + Fraunces + médaillon
          tournant + 360). Remplace : hero éditorial, RentabJourney (gros bloc +
          leaderboard → Mon équipe ch.4), ReferrerStatsCard (« Tes leads » =
          doublon CRM), StatsRow3, DormantClientsWidget, PvActionPlanAlert,
          Liste100 (→ Outils ch.3), rangée TodayTimeline+SideStack (carte FLEX). */}
      <PlanDuJour data={data} />

      {/* Métrique-reine équipe : expositions de la semaine, reléguée tout en bas
          (sous le Plan du jour). Liste équipe repliée + filtre à l'intérieur. */}
      <ExposuresWeekCard />

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

// Routine pill (chantier #2 2026-05-20) — accent gold, couleur vire teal
// quand 5/5. Pattern aligné sur streak/pill V7.
const pillRoutineStyle = (score: number, total: number): React.CSSProperties => {
  const complete = total > 0 && score >= total;
  const color = complete ? "var(--ls-teal)" : "var(--ls-gold)";
  return {
    ...pillStyle,
    background: `color-mix(in srgb, ${color} 10%, var(--ls-surface))`,
    borderColor: `color-mix(in srgb, ${color} 32%, var(--ls-border))`,
    color: `color-mix(in srgb, ${color} 60%, var(--ls-text))`,
  };
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
// Note 2026-06-13 : rowBottomStyle supprimé (rangée TodayTimeline+SideStack
// retirée par le Plan du jour).

// =============================================================================
// CoPilotePassiveView — Vue Light pour Supervisor passif (2026-05-22)
//
// Hero éditorial simplifié + RentabJourney (sa rentab perso) uniquement.
// Pas de timeline, dormants, PV alert, checklist onboarding.
// =============================================================================
function CoPilotePassiveView({ firstName }: { firstName: string }) {
  const navigate = useNavigate();
  return (
    <div className="copilote-v5" style={pageWrapStyle}>
      <div style={topBarStyle}>
        <div style={topBarLeftStyle}>
          <div style={topBarMetaStyle}>
            <span style={liveDotStyle} className="v5-pulse" />
            La Base 360
            <span aria-hidden="true" style={topBarSinceStyle}>★ SUPERVISOR PASSIF ★</span>
          </div>
          <h1 style={greetingStyle}>
            Bienvenue <span style={greetingAccentStyle}>{firstName}</span>{" "}
            <span aria-hidden="true" role="img">✨</span>
          </h1>
        </div>
        <div style={topBarRightStyle}>
          <AnnouncementBell />
        </div>
      </div>

      {/* Carte d'accueil premium */}
      <section
        style={{
          margin: "16px 0",
          padding: "22px 24px",
          borderRadius: 20,
          background:
            "linear-gradient(135deg, color-mix(in srgb, var(--ls-gold) 8%, var(--ls-surface)) 0%, color-mix(in srgb, var(--ls-teal) 10%, var(--ls-surface)) 100%)",
          border: "0.5px solid color-mix(in srgb, var(--ls-gold) 25%, var(--ls-border))",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          aria-hidden
          style={{
            position: "absolute",
            top: -50,
            right: -50,
            width: 200,
            height: 200,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, color-mix(in srgb, var(--ls-gold) 30%, transparent) 0%, transparent 70%)",
            pointerEvents: "none",
          }}
        />
        <div style={{ position: "relative", zIndex: 1 }}>
          <div
            style={{
              fontSize: 10.5,
              letterSpacing: 1.4,
              textTransform: "uppercase",
              color: "var(--ls-gold)",
              fontWeight: 700,
              marginBottom: 6,
            }}
          >
            🔗 Accès Supervisor passif
          </div>
          <h2
            style={{
              fontFamily: "Syne, sans-serif",
              fontStyle: "italic",
              fontSize: 22,
              fontWeight: 700,
              margin: 0,
              color: "var(--ls-text)",
              lineHeight: 1.25,
            }}
          >
            Ta rentabilité Herbalife en un coup d'œil
          </h2>
          <p
            style={{
              fontSize: 13.5,
              color: "var(--ls-text-muted)",
              margin: "10px 0 0",
              lineHeight: 1.55,
              maxWidth: 560,
            }}
          >
            Suivi de tes royalties Supervisor 50% mois après mois. Tes paliers, ta
            projection, ton historique 12 mois. Pour passer en mode actif (gérer
            des clients), contacte ton admin.
          </p>
        </div>
      </section>

      {/* Rentab parcours — composant déjà premium (WalletCard + breakdown) */}
      <RentabJourney />

      {/* CTA discret vers Académie / Paramètres */}
      <section
        style={{
          marginTop: 18,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 10,
        }}
      >
        <button
          type="button"
          onClick={() => navigate("/developpement")}
          style={passiveCardCtaStyle("var(--ls-teal)")}
        >
          <span style={{ fontSize: 22 }}>🎓</span>
          <div style={{ textAlign: "left", flex: 1 }}>
            <div style={{ fontFamily: "Syne, sans-serif", fontSize: 14, fontWeight: 700, color: "var(--ls-text)" }}>
              Mon développement
            </div>
            <div style={{ fontSize: 11.5, color: "var(--ls-text-muted)", marginTop: 2 }}>
              Academy, formation, ressources
            </div>
          </div>
          <span style={{ color: "var(--ls-text-muted)" }}>→</span>
        </button>
        <button
          type="button"
          onClick={() => navigate("/messages")}
          style={passiveCardCtaStyle("var(--ls-purple)")}
        >
          <span style={{ fontSize: 22 }}>✉️</span>
          <div style={{ textAlign: "left", flex: 1 }}>
            <div style={{ fontFamily: "Syne, sans-serif", fontSize: 14, fontWeight: 700, color: "var(--ls-text)" }}>
              Messagerie
            </div>
            <div style={{ fontSize: 11.5, color: "var(--ls-text-muted)", marginTop: 2 }}>
              Échanger avec ton admin et l'équipe
            </div>
          </div>
          <span style={{ color: "var(--ls-text-muted)" }}>→</span>
        </button>
        <button
          type="button"
          onClick={() => navigate("/parametres")}
          style={passiveCardCtaStyle("var(--ls-gold)")}
        >
          <span style={{ fontSize: 22 }}>⚙️</span>
          <div style={{ textAlign: "left", flex: 1 }}>
            <div style={{ fontFamily: "Syne, sans-serif", fontSize: 14, fontWeight: 700, color: "var(--ls-text)" }}>
              Paramètres
            </div>
            <div style={{ fontSize: 11.5, color: "var(--ls-text-muted)", marginTop: 2 }}>
              Profil, mot de passe, notifications
            </div>
          </div>
          <span style={{ color: "var(--ls-text-muted)" }}>→</span>
        </button>
      </section>

      <LegalFooter />
    </div>
  );
}

function passiveCardCtaStyle(accent: string): React.CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "14px 16px",
    background: `color-mix(in srgb, ${accent} 6%, var(--ls-surface))`,
    border: `1px solid color-mix(in srgb, ${accent} 25%, var(--ls-border))`,
    borderRadius: 14,
    cursor: "pointer",
    transition: "transform .15s ease, border-color .15s ease, box-shadow .15s ease",
    fontFamily: "DM Sans, sans-serif",
  };
}
