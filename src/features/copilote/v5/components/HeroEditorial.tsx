// =============================================================================
// HeroEditorial — Phase C Co-pilote V5 (2026-05-05)
//
// Hero éditorial split 1.4fr / 1fr :
//   - LEFT  : Action principale (titre Cormorant + chips gold-light + 2 CTAs)
//   - RIGHT : Countdown 60px JetBrains Mono + Daily Boost
//
// Backdrop : pin AWT cinématique animé en filigrane (rotation 60s)
// Glow : 2 radial gradients (gold + coral) pour profondeur
//
// 3 modes selon useNextAction.action.kind :
//   - 'rdv'      : titre = "Bilan avec Sophie Mercier" + chips contextuels + CTA "Voir la fiche"
//   - 'followup' : titre = "Suivi Marc Durand" + chips + CTA "Lancer le suivi"
//   - 'idle'     : titre proactive (ex. "Profite-en pour préparer 3 invitations") + CTA contextuel
//
// Validations Thomas :
//   - Countdown 60px (pas 56)
//   - Daily Boost border-top transparent
//   - Chips TOUS gold-light (couleur unique)
// =============================================================================

import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useNextAction } from "../hooks/useNextAction";
import { useCountdown } from "../hooks/useCountdown";
import { useTimeContext } from "../hooks/useTimeContext";
import { useDailyBoost } from "../hooks/useDailyBoost";
import { PinAWTCinematic } from "./PinAWTCinematic";
import { DailyBoost } from "./DailyBoost";

interface HeroEditorialProps {
  /** Si true, dim le Daily Boost (utile si PvActionPlanAlert visible). */
  pvAlertActive?: boolean;
}

export function HeroEditorial({ pvAlertActive = false }: HeroEditorialProps) {
  const navigate = useNavigate();
  const { action, loading } = useNextAction();
  const timeContext = useTimeContext();
  const { quote, isPreview } = useDailyBoost(timeContext.dailyBoostCategory);

  const targetDate = useMemo<Date | null>(() => {
    if (action.kind === "rdv" && action.time) return action.time;
    return null; // followup / idle = pas de countdown live
  }, [action]);

  const countdown = useCountdown(targetDate);

  // Construction des chips contextuels selon le mode
  const chips = useMemo<string[]>(() => {
    if (action.kind === "rdv") {
      const list: string[] = [];
      if (action.location) list.push(`📍 ${action.location}`);
      list.push("⏱ 45 min");
      if (action.isProspect) list.push("✨ Bilan initial");
      else list.push("📊 Suivi");
      if (action.subtitle) list.push(action.subtitle);
      return list;
    }
    if (action.kind === "followup") {
      const list = ["📞 Suivi protocole"];
      if (action.protocolDay) list.push(`Jour J+${action.protocolDay}`);
      if (action.subtitle) list.push(action.subtitle);
      return list;
    }
    // idle : pas de chips (le titre proactive parle déjà)
    return [`${timeContext.emoji} ${timeContext.label}`];
  }, [action, timeContext]);

  const heroTitle = action.kind === "idle" ? action.title : action.title;

  const overlineLabel =
    action.kind === "rdv"
      ? "Prochaine action"
      : action.kind === "followup"
        ? "Suivi à faire"
        : "Suggestion du moment";

  // CTAs : varient selon le mode
  const handlePrimary = () => {
    if (action.kind === "rdv" || action.kind === "followup") {
      navigate(`/clients/${action.clientId}`);
    } else {
      navigate(action.ctaRoute);
    }
  };

  const handleSecondary = () => {
    if (action.kind === "rdv" || action.kind === "followup") {
      navigate("/agenda");
    } else {
      navigate("/co-pilote"); // self
    }
  };

  const primaryLabel =
    action.kind === "rdv"
      ? "Voir la fiche →"
      : action.kind === "followup"
        ? "Lancer le suivi →"
        : `${action.ctaLabel} →`;

  const secondaryLabel =
    action.kind === "rdv" || action.kind === "followup"
      ? "Préparer l'agenda"
      : "Plus tard";

  // Date display "Mardi 5 mai 2026 · 14:32"
  const dateDisplay = useMemo(() => {
    const now = new Date();
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
    return `${date.charAt(0).toUpperCase() + date.slice(1)} · ${time}`;
  }, []);

  if (loading) {
    return (
      <section style={heroSkeletonStyle}>
        <div style={{ color: "rgba(245,222,179,0.5)" }}>Chargement…</div>
      </section>
    );
  }

  return (
    <section style={heroStyle} data-v5-hero>
      {/* Pin AWT cinématique en filigrane */}
      <PinAWTCinematic />

      {/* Glow effects gold + coral pour profondeur */}
      <div style={glow1Style} />
      <div style={glow2Style} />

      {/* LEFT — action principale */}
      <div style={leftSectionStyle}>
        <div style={editionStyle} className="v5-cinzel">
          ✦ Aujourd'hui ✦
        </div>

        <div style={overlineStyle}>
          <span style={pulseDotStyle} className="v5-pulse" />
          {overlineLabel}
        </div>

        <h2 style={titleStyle} className="v5-cormorant-italic">
          {heroTitle}
        </h2>

        <div style={chipsRowStyle}>
          {chips.map((c, i) => (
            <span key={i} style={chipStyle}>
              {c}
            </span>
          ))}
        </div>

        <div style={ctaRowStyle}>
          <button type="button" onClick={handlePrimary} style={btnPrimaryStyle}>
            {primaryLabel}
          </button>
          <button type="button" onClick={handleSecondary} style={btnSecondaryStyle}>
            {secondaryLabel}
          </button>
        </div>

        {/* Date discrete en bas pour ancrage temporel */}
        <div style={dateLineStyle}>{dateDisplay}</div>
      </div>

      {/* RIGHT — countdown + Daily Boost */}
      <div style={rightSectionStyle} data-v5-hero-right>
        {targetDate && !countdown.isElapsed ? (
          <div style={countdownBlockStyle}>
            <div style={countdownLabelStyle}>Dans</div>
            <div style={countdownValueStyle} className="v5-mono" data-v5-countdown>
              {countdown.hours >= 1 ? (
                <>
                  {String(countdown.hours).padStart(2, "0")}
                  <span style={colonStyle} className="v5-pulse-gold">
                    :
                  </span>
                  {String(countdown.minutes).padStart(2, "0")}
                </>
              ) : (
                <>
                  {String(countdown.minutes).padStart(2, "0")}
                  <span style={colonStyle} className="v5-pulse-gold">
                    :
                  </span>
                  {String(countdown.seconds).padStart(2, "0")}
                </>
              )}
            </div>
            <div style={countdownSubStyle}>
              {targetDate &&
                `${new Intl.DateTimeFormat("fr-FR", {
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: false,
                }).format(targetDate)} · `}
              <strong style={{ color: "#F5DEB3", fontWeight: 700 }}>aujourd'hui</strong>
            </div>
          </div>
        ) : (
          // Pas de countdown (idle / followup) → bloc placeholder élégant
          <div style={countdownBlockStyle}>
            <div style={countdownLabelStyle}>{timeContext.label}</div>
            <div style={countdownEmojiStyle}>{timeContext.emoji}</div>
            <div style={countdownSubStyle}>
              {action.kind === "idle" ? "Mode tranquille" : "Pas de RDV imminent"}
            </div>
          </div>
        )}

        <DailyBoost quote={quote} dimmed={pvAlertActive} isPreview={isPreview} />
      </div>
    </section>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────

const heroStyle: React.CSSProperties = {
  background: "linear-gradient(135deg, #1A1612 0%, #2A2419 50%, #1A1612 100%)",
  color: "#FAF6E8",
  borderRadius: 22,
  position: "relative",
  overflow: "hidden",
  boxShadow: "0 12px 40px rgba(0, 0, 0, 0.25)",
  display: "grid",
  gridTemplateColumns: "1.4fr 1fr",
  minHeight: 280,
};

const heroSkeletonStyle: React.CSSProperties = {
  ...heroStyle,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 280,
};

const glow1Style: React.CSSProperties = {
  position: "absolute",
  top: "-60%",
  left: "-10%",
  width: 600,
  height: 600,
  background: "radial-gradient(circle, rgba(212, 169, 55, 0.15), transparent 60%)",
  pointerEvents: "none",
};

const glow2Style: React.CSSProperties = {
  position: "absolute",
  bottom: "-40%",
  right: "-10%",
  width: 500,
  height: 500,
  background: "radial-gradient(circle, rgba(216, 90, 48, 0.10), transparent 60%)",
  pointerEvents: "none",
};

const leftSectionStyle: React.CSSProperties = {
  position: "relative",
  zIndex: 2,
  padding: "30px 32px 28px",
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
};

const editionStyle: React.CSSProperties = {
  fontFamily: "Cinzel, serif",
  fontSize: 9.5,
  letterSpacing: 4,
  color: "#F5DEB3",
  textTransform: "uppercase",
  fontWeight: 600,
  marginBottom: 14,
  display: "flex",
  alignItems: "center",
  gap: 10,
};

const overlineStyle: React.CSSProperties = {
  fontSize: 10,
  letterSpacing: 2.5,
  color: "#F5DEB3",
  textTransform: "uppercase",
  fontWeight: 700,
  marginBottom: 8,
  display: "flex",
  alignItems: "center",
  gap: 8,
  fontFamily: "DM Sans, sans-serif",
};

const pulseDotStyle: React.CSSProperties = {
  width: 7,
  height: 7,
  background: "#6FD4AE",
  borderRadius: "50%",
  display: "inline-block",
};

const titleStyle: React.CSSProperties = {
  fontFamily: "'Cormorant Garamond', serif",
  fontSize: 38,
  fontWeight: 700,
  fontStyle: "italic",
  letterSpacing: -0.5,
  lineHeight: 1.05,
  marginBottom: 10,
  marginTop: 0,
  color: "white",
};

const chipsRowStyle: React.CSSProperties = {
  fontSize: 13.5,
  marginBottom: 18,
  display: "flex",
  alignItems: "center",
  gap: 10,
  flexWrap: "wrap",
};

const chipStyle: React.CSSProperties = {
  // Validation Thomas : TOUS chips gold-light, couleur unique
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "5px 11px",
  background: "rgba(255, 255, 255, 0.08)",
  border: "1px solid rgba(245, 222, 179, 0.18)",
  borderRadius: 18,
  fontSize: 11.5,
  fontWeight: 600,
  color: "#F5DEB3",
  fontFamily: "DM Sans, sans-serif",
};

const ctaRowStyle: React.CSSProperties = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
};

const btnPrimaryStyle: React.CSSProperties = {
  background: "linear-gradient(180deg, #EF9F27, #BA7517)",
  color: "white",
  border: "none",
  padding: "12px 22px",
  borderRadius: 12,
  fontWeight: 700,
  fontSize: 13.5,
  cursor: "pointer",
  boxShadow: "0 4px 14px rgba(186, 117, 23, 0.4)",
  fontFamily: "DM Sans, sans-serif",
};

const btnSecondaryStyle: React.CSSProperties = {
  background: "rgba(255, 255, 255, 0.08)",
  color: "#FAF6E8",
  border: "1px solid rgba(245, 222, 179, 0.25)",
  padding: "12px 18px",
  borderRadius: 12,
  fontWeight: 600,
  fontSize: 13.5,
  cursor: "pointer",
  fontFamily: "DM Sans, sans-serif",
};

const dateLineStyle: React.CSSProperties = {
  marginTop: 16,
  fontSize: 10.5,
  letterSpacing: 1.4,
  color: "rgba(245, 222, 179, 0.45)",
  textTransform: "uppercase",
  fontFamily: "DM Sans, sans-serif",
  fontWeight: 500,
};

const rightSectionStyle: React.CSSProperties = {
  position: "relative",
  zIndex: 2,
  padding: "30px 32px 28px",
  display: "flex",
  flexDirection: "column",
  justifyContent: "space-between",
  borderLeft: "1px solid rgba(245, 222, 179, 0.12)",
};

const countdownBlockStyle: React.CSSProperties = {
  textAlign: "right",
};

const countdownLabelStyle: React.CSSProperties = {
  fontSize: 10,
  color: "rgba(245, 222, 179, 0.55)",
  letterSpacing: 2,
  textTransform: "uppercase",
  fontWeight: 600,
  marginBottom: 4,
  fontFamily: "DM Sans, sans-serif",
};

const countdownValueStyle: React.CSSProperties = {
  // Validation Thomas : 60px JetBrains Mono
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: 60,
  fontWeight: 700,
  color: "#F5DEB3",
  letterSpacing: -2,
  lineHeight: 1,
};

const colonStyle: React.CSSProperties = {
  color: "#D4A937",
  display: "inline-block",
};

const countdownEmojiStyle: React.CSSProperties = {
  fontSize: 56,
  lineHeight: 1,
  marginBottom: 8,
};

const countdownSubStyle: React.CSSProperties = {
  fontSize: 12,
  color: "rgba(245, 222, 179, 0.6)",
  marginTop: 8,
  fontWeight: 500,
  fontFamily: "DM Sans, sans-serif",
};
