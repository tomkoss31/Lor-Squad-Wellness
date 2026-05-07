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
// V7 fix Thomas (2026-05-08) : revert au PinAWTCinematic original (pin
// AWT par rang du distri — signature visuelle de progression coach).
// Le PinAWTCinematic a ete enrichi pour inclure le watermark "360" en
// arriere-plan + animation heart-beat en plus de la rotation existante.
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
    // idle : aucun chip (le titre proactive parle déjà — pas besoin de
    // pollution avec "Aloe time" ou autre).
    return [];
  }, [action]);

  const heroTitle = action.kind === "idle" ? action.title : action.title;

  const overlineLabel =
    action.kind === "rdv"
      ? "Prochaine action"
      : action.kind === "followup"
        ? "Suivi à faire"
        : "Prochaine action";

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

  if (loading) {
    return (
      <section style={heroSkeletonStyle}>
        <div style={{ color: "rgba(241,245,249,0.55)" }}>Chargement…</div>
      </section>
    );
  }

  return (
    <section style={heroStyle} data-v5-hero>
      {/* V7 fix Thomas (2026-05-08) : pin AWT par rang du distri en
          filigrane (rotation 60s + heart-beat 3s) + watermark "360"
          italique XL en arriere-plan integre dans le composant. */}
      <PinAWTCinematic />

      {/* Glow effects G3 (emerald + violet) pour profondeur warm dark. */}
      <div style={glow1Style} />
      <div style={glow2Style} />

      {/* LEFT — action principale */}
      <div style={leftSectionStyle}>
        <div style={editionStyle}>
          ✦ Aujourd'hui ✦
        </div>

        <div style={overlineStyle}>
          <span style={pulseDotStyle} className="v5-pulse" />
          {overlineLabel}
        </div>

        <h2 style={titleStyle}>
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
        {/* Note 2026-05-05 : dateLineStyle supprimée (doublon avec topbar
            meta qui affiche déjà MARDI 5 MAI · ÉDITION DU JOUR · HH:MM). */}
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
              <strong style={{ color: "#F8FAFC", fontWeight: 700 }}>aujourd'hui</strong>
            </div>
          </div>
        ) : (
          // Validation Thomas 2026-05-05 : mode idle/followup → ne pas
          // afficher de bloc en haut. Le pin AWT reste visible en
          // filigrane et le DailyBoost prend toute la hauteur.
          <div aria-hidden="true" />
        )}

        <DailyBoost quote={quote} dimmed={pvAlertActive} isPreview={isPreview} />
      </div>
    </section>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────

// ─── V7 Phase 3 (2026-05-08) : warm dark + glow G3 ────────────────────
// Avant : tons automnaux (#1A1612 → #2A2419) + glows gold/coral.
// Apres : warm dark plus neutre (#1A1410 → #15131A) qui laisse les
// glow G3 (emerald top-left + violet bottom-right + accent gold subtil)
// donner la chaleur, sans saturer en gold/orange.
const heroStyle: React.CSSProperties = {
  background: "linear-gradient(135deg, #1A1410 0%, #1C1817 50%, #15131A 100%)",
  color: "#F1F5F9",
  borderRadius: 22,
  position: "relative",
  overflow: "hidden",
  boxShadow: "0 24px 60px -16px rgba(0, 0, 0, 0.45), 0 8px 24px -8px rgba(0, 0, 0, 0.25)",
  display: "grid",
  gridTemplateColumns: "1.4fr 1fr",
  minHeight: 280,
  isolation: "isolate",
};

const heroSkeletonStyle: React.CSSProperties = {
  ...heroStyle,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 280,
};

// Glow 1 : emerald top-left (vital, growth)
const glow1Style: React.CSSProperties = {
  position: "absolute",
  top: "-50%",
  left: "-12%",
  width: 600,
  height: 600,
  background:
    "radial-gradient(circle, color-mix(in srgb, #10B981 22%, transparent) 0%, transparent 65%)",
  pointerEvents: "none",
  filter: "blur(8px)",
  zIndex: 0,
};

// Glow 2 : violet bottom-right (premium, signature)
const glow2Style: React.CSSProperties = {
  position: "absolute",
  bottom: "-40%",
  right: "-15%",
  width: 540,
  height: 540,
  background:
    "radial-gradient(circle, color-mix(in srgb, #8B5CF6 18%, transparent) 0%, transparent 65%)",
  pointerEvents: "none",
  filter: "blur(8px)",
  zIndex: 0,
};

const leftSectionStyle: React.CSSProperties = {
  position: "relative",
  zIndex: 2,
  padding: "30px 32px 28px",
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
};

// ─── V7 Phase 3 (2026-05-08) : eyebrows + titre Fraunces + chips G3 ───
// Eyebrow "✦ Aujourd hui ✦" : passe en mono (au lieu de Cinzel) pour
// matcher l esthetique editorial "data-driven" du V7 design.
const editionStyle: React.CSSProperties = {
  fontFamily: "var(--lb360-mono, 'JetBrains Mono', monospace)",
  fontSize: 11,
  letterSpacing: "0.18em",
  color: "color-mix(in srgb, #10B981 60%, white)",
  textTransform: "uppercase",
  fontWeight: 500,
  marginBottom: 14,
  display: "flex",
  alignItems: "center",
  gap: 10,
  position: "relative",
  zIndex: 2,
};

const overlineStyle: React.CSSProperties = {
  fontSize: 11,
  letterSpacing: "0.14em",
  color: "rgba(241,245,249,0.55)",
  textTransform: "uppercase",
  fontWeight: 500,
  marginBottom: 14,
  display: "flex",
  alignItems: "center",
  gap: 8,
  fontFamily: "var(--lb360-mono, 'JetBrains Mono', monospace)",
  position: "relative",
  zIndex: 2,
};

const pulseDotStyle: React.CSSProperties = {
  width: 7,
  height: 7,
  background: "#10B981",
  borderRadius: "50%",
  display: "inline-block",
  boxShadow: "0 0 0 4px color-mix(in srgb, #10B981 25%, transparent)",
};

// Titre principal : Fraunces italic 600-700 — signature editoriale
// premium de La Base 360. Gradient G3 sur le 1er mot via classe
// inline pour les variants RDV vs idle (cf. heroTitle splitting).
const titleStyle: React.CSSProperties = {
  fontFamily: "var(--lb360-display-serif, 'Fraunces', 'Cormorant Garamond', serif)",
  fontStyle: "italic",
  fontSize: "clamp(28px, 3.6vw, 42px)",
  fontWeight: 600,
  fontOpticalSizing: "auto" as React.CSSProperties["fontOpticalSizing"],
  letterSpacing: "-0.015em",
  lineHeight: 1.1,
  marginBottom: 16,
  marginTop: 0,
  color: "#F8FAFC",
  position: "relative",
  zIndex: 2,
  maxWidth: "24ch",
};

const chipsRowStyle: React.CSSProperties = {
  fontSize: 13.5,
  marginBottom: 22,
  display: "flex",
  alignItems: "center",
  gap: 10,
  flexWrap: "wrap",
  position: "relative",
  zIndex: 2,
};

const chipStyle: React.CSSProperties = {
  // V7 : chips emerald-tinte au lieu de gold-light
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "5px 11px",
  background: "rgba(255, 255, 255, 0.06)",
  border: "1px solid color-mix(in srgb, #10B981 28%, transparent)",
  borderRadius: 999,
  fontSize: 11.5,
  fontWeight: 600,
  color: "color-mix(in srgb, #10B981 70%, white)",
  fontFamily: "var(--lb360-body, 'Inter', sans-serif)",
};

const ctaRowStyle: React.CSSProperties = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
  position: "relative",
  zIndex: 2,
};

// V7 : bouton primary gradient G3 (au lieu de gold/orange #EF9F27 → #BA7517)
const btnPrimaryStyle: React.CSSProperties = {
  background: "var(--lb360-gradient, linear-gradient(135deg, #10B981 0%, #06B6D4 50%, #8B5CF6 100%))",
  color: "white",
  border: "none",
  padding: "12px 22px",
  borderRadius: 12,
  fontWeight: 700,
  fontSize: 13.5,
  cursor: "pointer",
  boxShadow: "0 6px 22px color-mix(in srgb, #10B981 28%, transparent), inset 0 1px 0 rgba(255,255,255,0.18)",
  fontFamily: "var(--lb360-display, 'Sora', sans-serif)",
  letterSpacing: "0.01em",
  transition: "transform 0.18s ease, box-shadow 0.18s ease, filter 0.18s ease",
};

// V7 : bouton secondary plus sobre, fond sombre subtle, texte blanc
// pour que les 2 boutons aient une vraie hierarchie (primary = action,
// secondary = passer / report).
const btnSecondaryStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.06)",
  color: "rgba(255,255,255,0.85)",
  border: "1px solid rgba(255,255,255,0.12)",
  padding: "12px 18px",
  borderRadius: 12,
  fontWeight: 600,
  fontSize: 13.5,
  cursor: "pointer",
  fontFamily: "var(--lb360-display, 'Sora', sans-serif)",
  letterSpacing: "0.01em",
  transition: "background 0.18s ease, border-color 0.18s ease",
};

const rightSectionStyle: React.CSSProperties = {
  position: "relative",
  zIndex: 2,
  padding: "30px 32px 28px",
  display: "flex",
  flexDirection: "column",
  justifyContent: "space-between",
  // Validation Thomas 2026-05-05 : virer le séparateur vertical, on
  // laisse le pin AWT respirer dans le hero sans barre intrusive.
};

const countdownBlockStyle: React.CSSProperties = {
  textAlign: "right",
};

// V7 : countdown re-skin G3 (passe de gold beige #F5DEB3 a un blanc
// chaud + accent emerald sur les deux-points).
const countdownLabelStyle: React.CSSProperties = {
  fontSize: 10.5,
  color: "rgba(241, 245, 249, 0.55)",
  letterSpacing: "0.16em",
  textTransform: "uppercase",
  fontWeight: 600,
  marginBottom: 4,
  fontFamily: "var(--lb360-mono, 'JetBrains Mono', monospace)",
};

const countdownValueStyle: React.CSSProperties = {
  // 60px JetBrains Mono — validation Thomas conservee
  fontFamily: "var(--lb360-mono, 'JetBrains Mono', monospace)",
  fontSize: 60,
  fontWeight: 700,
  color: "#F8FAFC",
  letterSpacing: "-0.04em",
  lineHeight: 1,
};

// Deux-points pulsant en emerald (au lieu de gold #D4A937)
const colonStyle: React.CSSProperties = {
  color: "#10B981",
  display: "inline-block",
  textShadow: "0 0 14px color-mix(in srgb, #10B981 60%, transparent)",
};

const countdownSubStyle: React.CSSProperties = {
  fontSize: 12,
  color: "rgba(241, 245, 249, 0.6)",
  marginTop: 8,
  fontWeight: 500,
  fontFamily: "var(--lb360-body, 'Inter', sans-serif)",
};
