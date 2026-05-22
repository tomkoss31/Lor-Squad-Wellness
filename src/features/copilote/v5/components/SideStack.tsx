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

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCopiloteData } from "../../../../hooks/useCopiloteData";
import { useGlobalView } from "../../../../hooks/useGlobalView";
import { useAppContext } from "../../../../context/AppContext";
import { BirthdayMessageDialog } from "../../../../components/copilote/BirthdayMessageDialog";
import { getSupabaseClient } from "../../../../services/supabaseClient";
import type { Client } from "../../../../types/domain";

interface OpportunityData {
  emoji: string;
  overline: string;
  title: string;
  link: string;
  /** Si "birthday" → ouvre dialog inline. Sinon → navigate(route). */
  action: "birthday" | "navigate";
  birthdayClient?: Client;
  route?: string;
}

export function SideStack() {
  const navigate = useNavigate();
  const [globalView] = useGlobalView();
  const data = useCopiloteData(new Date(), globalView);
  const { clients, currentUser } = useAppContext();
  // Fix Thomas 2026-05-22 : la card anniversaire ouvre désormais le
  // BirthdayMessageDialog directement (message prérempli + WA + SMS +
  // mark sent) au lieu de naviguer vers la fiche.
  const [openBirthdayClient, setOpenBirthdayClient] = useState<Client | null>(null);
  const coachFirstName = (currentUser?.name ?? "Coach").trim().split(/\s+/)[0] ?? "Coach";

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
        action: "birthday",
        birthdayClient,
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
        action: "navigate",
        route: `/clients/${fu.clientId}`,
      };
    }

    return null;
  })();

  async function handleMarkBirthdaySent(clientId: string) {
    const sb = await getSupabaseClient();
    if (!sb) return;
    await sb
      .from("clients")
      .update({ birthday_sent_at: new Date().toISOString() })
      .eq("id", clientId);
  }

  return (
    <div style={stackStyle}>
      {opp && (
        <button
          type="button"
          onClick={() => {
            if (opp.action === "birthday" && opp.birthdayClient) {
              setOpenBirthdayClient(opp.birthdayClient);
            } else if (opp.action === "navigate" && opp.route) {
              navigate(opp.route);
            }
          }}
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

      {openBirthdayClient && (
        <BirthdayMessageDialog
          client={openBirthdayClient}
          coachFirstName={coachFirstName}
          onClose={() => setOpenBirthdayClient(null)}
          onMarkSent={async (clientId) => {
            await handleMarkBirthdaySent(clientId);
            setOpenBirthdayClient(null);
          }}
        />
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

// ─── V7 Phase 6 (2026-05-08) : SideStack re-skin G3 ───────────────────
// Avant : opp card gold tinte (#FFF8E5 → #FFEBC2) + flex card warm dark
// (#1A1612 → #2A2419) + accents gold (#D4A937, #EF9F27, #F5DEB3).
// Apres : opp card cyan tinte (--lb360-card-cyan) + flex card warm
// dark plus neutre + accents G3 (emerald, cyan, violet).
const oppCardStyle: React.CSSProperties = {
  background: "var(--lb360-card-cyan, var(--ls-surface))",
  borderRadius: 18,
  padding: "16px 18px",
  border: "1px solid color-mix(in srgb, #06B6D4 18%, var(--ls-border))",
  display: "flex",
  alignItems: "center",
  gap: 12,
  cursor: "pointer",
  textAlign: "left",
  width: "100%",
  position: "relative",
  overflow: "hidden",
  isolation: "isolate",
  transition: "transform 0.18s ease, box-shadow 0.18s ease",
};

const oppIconStyle: React.CSSProperties = {
  width: 46,
  height: 46,
  borderRadius: 12,
  background:
    "var(--lb360-gradient, linear-gradient(135deg, #10B981 0%, #06B6D4 50%, #8B5CF6 100%))",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 22,
  flexShrink: 0,
  boxShadow: "0 4px 14px color-mix(in srgb, #06B6D4 30%, transparent)",
  color: "white",
};

const oppTextStyle: React.CSSProperties = {
  flex: 1,
  minWidth: 0,
};

const oppOverlineStyle: React.CSSProperties = {
  fontFamily: "var(--lb360-mono, 'JetBrains Mono', monospace)",
  fontSize: 10,
  letterSpacing: "0.14em",
  color: "color-mix(in srgb, #06B6D4 70%, var(--ls-text))",
  textTransform: "uppercase",
  fontWeight: 500,
  marginBottom: 2,
};

const oppTitleStyle: React.CSSProperties = {
  fontFamily: "var(--lb360-display, 'Sora', sans-serif)",
  fontSize: 13,
  fontWeight: 700,
  color: "var(--ls-text)",
  lineHeight: 1.3,
  letterSpacing: "-0.005em",
};

const oppLinkStyle: React.CSSProperties = {
  fontSize: 11,
  color: "color-mix(in srgb, #06B6D4 75%, var(--ls-text))",
  fontWeight: 700,
  marginTop: 4,
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  fontFamily: "var(--lb360-display, 'Sora', sans-serif)",
};

// FLEX card : warm dark "club premium" mais aligne sur la palette G3
// du hero. On garde le ton chaud mais avec emerald glow (au lieu de
// gold) pour signaler que c est un produit vital de l ecosysteme.
const flexCardStyle: React.CSSProperties = {
  background: "linear-gradient(135deg, #1A1410 0%, #15131A 100%)",
  color: "#F1F5F9",
  borderRadius: 18,
  padding: "18px 20px",
  display: "flex",
  alignItems: "center",
  gap: 14,
  position: "relative",
  overflow: "hidden",
  isolation: "isolate",
  cursor: "pointer",
  textAlign: "left",
  width: "100%",
  border: "1px solid color-mix(in srgb, #10B981 18%, transparent)",
  transition: "transform 0.18s ease, border-color 0.18s ease",
};

const flexGlowStyle: React.CSSProperties = {
  position: "absolute",
  top: "-50%",
  right: "-30%",
  width: 260,
  height: 260,
  background:
    "radial-gradient(circle, color-mix(in srgb, #10B981 22%, transparent), transparent 65%)",
  pointerEvents: "none",
  zIndex: 0,
  filter: "blur(8px)",
};

const flexIconStyle: React.CSSProperties = {
  width: 48,
  height: 48,
  borderRadius: 12,
  background:
    "var(--lb360-gradient, linear-gradient(135deg, #10B981 0%, #06B6D4 50%, #8B5CF6 100%))",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 22,
  flexShrink: 0,
  boxShadow:
    "0 4px 14px color-mix(in srgb, #10B981 30%, transparent), inset 0 1px 0 rgba(255,255,255,0.2)",
  position: "relative",
  zIndex: 1,
  color: "white",
};

const flexTextStyle: React.CSSProperties = {
  flex: 1,
  position: "relative",
  zIndex: 1,
};

const flexOverlineStyle: React.CSSProperties = {
  fontFamily: "var(--lb360-mono, 'JetBrains Mono', monospace)",
  fontSize: 10,
  letterSpacing: "0.18em",
  color: "color-mix(in srgb, #10B981 60%, white)",
  textTransform: "uppercase",
  fontWeight: 500,
  marginBottom: 3,
};

const flexTitleStyle: React.CSSProperties = {
  fontFamily: "var(--lb360-display, 'Sora', sans-serif)",
  fontSize: 14,
  fontWeight: 700,
  color: "white",
  lineHeight: 1.25,
  marginBottom: 2,
  letterSpacing: "-0.005em",
};

const flexLinkStyle: React.CSSProperties = {
  fontSize: 11,
  color: "color-mix(in srgb, #10B981 70%, white)",
  fontWeight: 700,
  marginTop: 5,
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  fontFamily: "var(--lb360-display, 'Sora', sans-serif)",
};
