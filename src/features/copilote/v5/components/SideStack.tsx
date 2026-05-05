// =============================================================================
// SideStack — Phase D Co-pilote V5 (2026-05-05)
//
// Side stack droit du row-bottom : Opportunité du jour + FLEX card mini.
//   - Opp : carte gold soft (anniversaire client priorité, sinon reco
//     pending, sinon suivi à relancer)
//   - FLEX : carte dark gold avec CTA vers /flex
//
// Logique opportunité (priorité décroissante) :
//   1. Anniversaire client du jour (data.upcomingBirthdays[0] today)
//   2. Reco en attente (mockée pour V5 MVP, table referrals à câbler V6)
//   3. Suivi à relancer (1er pendingFollowups si vide via timeline)
//   4. Fallback : pas d'opp → carte FLEX seule
// =============================================================================

import { useNavigate } from "react-router-dom";
import { useCopiloteData } from "../../../../hooks/useCopiloteData";
import { useGlobalView } from "../../../../hooks/useGlobalView";
import { useAppContext } from "../../../../context/AppContext";

interface OpportunityData {
  emoji: string;
  overline: string;
  title: string;
  link: string;
  route: string;
}

export function SideStack() {
  const navigate = useNavigate();
  const [globalView] = useGlobalView();
  const data = useCopiloteData(new Date(), globalView);
  const { clients } = useAppContext();

  // Logique opportunité (V5 MVP) :
  //   1. Anniversaire client aujourd'hui (scan clients context)
  //   2. Suivi à relancer (1er pendingFollowups)
  const opp: OpportunityData | null = (() => {
    // 1. Anniversaire aujourd'hui ?
    const today = new Date();
    const todayMonth = today.getMonth();
    const todayDate = today.getDate();
    const birthdayClient = clients.find((c) => {
      if (!c.birthDate) return false;
      try {
        const bd = new Date(c.birthDate);
        return bd.getMonth() === todayMonth && bd.getDate() === todayDate;
      } catch {
        return false;
      }
    });
    if (birthdayClient) {
      return {
        emoji: "🎂",
        overline: "Opportunité du jour",
        title: `${birthdayClient.firstName} ${birthdayClient.lastName} fête son anniversaire`,
        link: "Envoyer un message →",
        route: `/clients/${birthdayClient.id}?action=birthday`,
      };
    }

    // 2. Suivi à relancer (1er pending)
    if (data.pendingFollowups && data.pendingFollowups.length > 0) {
      const fu = data.pendingFollowups[0];
      return {
        emoji: "🔔",
        overline: "Opportunité du jour",
        title: `Relance ${fu.clientName} (${fu.label})`,
        link: "Lancer le suivi →",
        route: `/clients/${fu.clientId}`,
      };
    }

    return null;
  })();

  return (
    <div style={stackStyle}>
      {opp && (
        <button
          type="button"
          onClick={() => navigate(opp.route)}
          style={oppCardStyle}
          className="v5-hover-lift"
        >
          <div style={oppIconStyle}>{opp.emoji}</div>
          <div style={oppTextStyle}>
            <div style={oppOverlineStyle}>{opp.overline}</div>
            <div style={oppTitleStyle}>{opp.title}</div>
            <div style={oppLinkStyle}>{opp.link}</div>
          </div>
        </button>
      )}

      <button
        type="button"
        onClick={() => navigate("/flex")}
        style={flexCardStyle}
        className="v5-hover-lift"
      >
        <div style={flexGlowStyle} />
        <div style={flexIconStyle}>⚡</div>
        <div style={flexTextStyle}>
          <div style={flexOverlineStyle}>FLEX La Base 360</div>
          <div style={flexTitleStyle}>Configure ton plan d'action</div>
          <div style={flexLinkStyle}>Démarrer en 5 min →</div>
        </div>
      </button>
    </div>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────

const stackStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 12,
};

const oppCardStyle: React.CSSProperties = {
  background: "linear-gradient(135deg, #FFF8E5 0%, #FFEBC2 100%)",
  borderRadius: 18,
  padding: "16px 18px",
  border: "1px solid rgba(212, 169, 55, 0.3)",
  display: "flex",
  alignItems: "center",
  gap: 12,
  cursor: "pointer",
  textAlign: "left",
  width: "100%",
};

const oppIconStyle: React.CSSProperties = {
  width: 46,
  height: 46,
  borderRadius: 12,
  background: "linear-gradient(135deg, #FFF4D4, #D4A937, #8B6F1F)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 22,
  flexShrink: 0,
  boxShadow: "0 3px 10px rgba(184, 146, 42, 0.3)",
};

const oppTextStyle: React.CSSProperties = {
  flex: 1,
  minWidth: 0,
};

const oppOverlineStyle: React.CSSProperties = {
  fontSize: 9.5,
  letterSpacing: 1.5,
  color: "#8B6F1F",
  textTransform: "uppercase",
  fontWeight: 700,
  marginBottom: 2,
  fontFamily: "DM Sans, sans-serif",
};

const oppTitleStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 700,
  color: "var(--v5-ink)",
  lineHeight: 1.25,
  fontFamily: "DM Sans, sans-serif",
};

const oppLinkStyle: React.CSSProperties = {
  fontSize: 11,
  color: "#8B6F1F",
  fontWeight: 700,
  marginTop: 4,
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  fontFamily: "DM Sans, sans-serif",
};

const flexCardStyle: React.CSSProperties = {
  background: "linear-gradient(135deg, #1A1612 0%, #2A2419 100%)",
  color: "#FAF6E8",
  borderRadius: 18,
  padding: "18px 20px",
  display: "flex",
  alignItems: "center",
  gap: 14,
  position: "relative",
  overflow: "hidden",
  cursor: "pointer",
  textAlign: "left",
  width: "100%",
  border: "none",
};

const flexGlowStyle: React.CSSProperties = {
  position: "absolute",
  top: "-50%",
  right: "-30%",
  width: 240,
  height: 240,
  background: "radial-gradient(circle, rgba(212, 169, 55, 0.18), transparent 65%)",
  pointerEvents: "none",
};

const flexIconStyle: React.CSSProperties = {
  width: 48,
  height: 48,
  borderRadius: 12,
  background: "linear-gradient(135deg, #EF9F27, #BA7517)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 22,
  flexShrink: 0,
  boxShadow: "0 4px 14px rgba(186, 117, 23, 0.4)",
  position: "relative",
  zIndex: 1,
};

const flexTextStyle: React.CSSProperties = {
  flex: 1,
  position: "relative",
  zIndex: 1,
};

const flexOverlineStyle: React.CSSProperties = {
  fontSize: 9.5,
  letterSpacing: 1.8,
  color: "#F5DEB3",
  textTransform: "uppercase",
  fontWeight: 700,
  marginBottom: 3,
  fontFamily: "DM Sans, sans-serif",
};

const flexTitleStyle: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 700,
  color: "white",
  lineHeight: 1.2,
  marginBottom: 2,
  fontFamily: "DM Sans, sans-serif",
};

const flexLinkStyle: React.CSSProperties = {
  fontSize: 11,
  color: "#F5DEB3",
  fontWeight: 700,
  marginTop: 5,
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  fontFamily: "DM Sans, sans-serif",
};
