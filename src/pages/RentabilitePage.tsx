// =============================================================================
// RentabilitePage — page complète rentabilité (2026-05-05)
//
// Vue détaillée :
//   - Distri : sa propre jauge en grand + breakdown
//   - Référent : sa jauge + jauges de ses filleuls directs
//   - Admin : sa jauge + agrégat équipe + top 5 distri du mois
// =============================================================================

import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAppContext } from "../context/AppContext";
import { useUserRentability } from "../hooks/useUserRentability";
import { useTeamEngagement } from "../hooks/useTeamEngagement";
import { RentabilityGauge } from "../components/rentability/RentabilityGauge";
import { RentabilityDetailModal } from "../components/rentability/RentabilityDetailModal";
import { resolveCoupleUserIds } from "../config/teamConfig";
import { usePvBreakdowns } from "../hooks/usePvBreakdowns";
import {
  computeViewerDownlineOverride,
  currentMonthIso,
} from "../lib/herbalifeFormulas";

function initialsOf(name: string): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function RentabilitePage() {
  const navigate = useNavigate();
  const { currentUser, users } = useAppContext();
  const { data: ownData, loading: ownLoading, isCoupleAggregated } = useUserRentability(currentUser?.id ?? null);
  const { members } = useTeamEngagement(currentUser?.id ?? null);

  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const { data: selectedData } = useUserRentability(selectedMemberId);

  const [detailOpen, setDetailOpen] = useState(false);

  // V2.1 — override downline ajoute a margin_eur cote front (RPC ne lit pas
  // pv_monthly_breakdown, donc ne le saurait pas autrement).
  const monthIso = useMemo(() => currentMonthIso(), []);
  const { breakdowns } = usePvBreakdowns(monthIso);
  const ownDownlineOverride = useMemo(() => {
    if (!ownData || !currentUser) return 0;
    return computeViewerDownlineOverride(
      ownData.scope_user_ids,
      users.map((u) => ({
        id: u.id,
        sponsorId: u.sponsorId,
        currentRank: u.currentRank,
        frozenAt: u.frozenAt,
      })),
      breakdowns,
    );
  }, [ownData, currentUser, users, breakdowns]);
  const ownDataWithOverride = useMemo(() => {
    if (!ownData) return null;
    if (ownDownlineOverride === 0) return ownData;
    return {
      ...ownData,
      margin_eur: ownData.margin_eur + ownDownlineOverride,
      projection_eur: ownData.projection_eur + ownDownlineOverride,
    };
  }, [ownData, ownDownlineOverride]);

  const isAdminOrRef = currentUser?.role === "admin" || currentUser?.role === "referent";

  // Liste des autres membres (sans soi NI le partenaire couple si applicable)
  // Évite que Mélanie apparaisse "à côté" de Thomas dans la liste équipe
  // alors qu'elle est déjà agrégée dans la jauge perso.
  const otherMembers = useMemo(() => {
    if (!isAdminOrRef || !currentUser) return [];
    const coupleIds = isCoupleAggregated ? resolveCoupleUserIds(users) : [currentUser.id];
    const excludeSet = new Set(coupleIds);
    return members.filter((m) => !excludeSet.has(m.user_id));
  }, [members, isAdminOrRef, currentUser, isCoupleAggregated, users]);

  if (!currentUser) return null;

  return (
    <div style={pageWrap}>
      <button type="button" onClick={() => navigate("/co-pilote")} style={backBtn}>
        ← Co-pilote
      </button>

      {/* Hero personnel */}
      <div style={heroBoxStyle}>
        <div style={heroEyebrow}>💎 Ma rentabilité</div>
        <h1 style={heroTitle}>Le revenu net de ton mois</h1>
        <p style={heroSubtitle}>
          Calcul transparent : tes ventes app × ta marge personnelle selon ton rang Herbalife.
        </p>
      </div>

      {/* Jauge personnelle hero */}
      {ownLoading ? (
        <div style={loadingStyle}>Chargement…</div>
      ) : ownData ? (
        <div style={ownCardStyle}>
          <RentabilityGauge
            data={ownDataWithOverride ?? ownData}
            size="hero"
            onClick={() => setDetailOpen(true)}
          />
          {ownDownlineOverride > 0 ? (
            <div style={{
              marginTop: 4,
              fontSize: 12,
              color: "var(--ls-text-muted)",
              textAlign: "center",
            }}>
              dont <strong style={{ color: "var(--ls-purple)" }}>
                +{Math.round(ownDownlineOverride).toLocaleString("fr-FR")} €
              </strong> override downline
            </div>
          ) : null}
          <button type="button" onClick={() => setDetailOpen(true)} style={detailBtnStyle}>
            Voir le détail complet →
          </button>
        </div>
      ) : (
        <div style={emptyStyle}>
          Aucune vente trackée encore. Crée ton premier bilan client → la jauge s'allume.
        </div>
      )}

      {/* Section équipe (admin / référent) */}
      {isAdminOrRef && otherMembers.length > 0 && (
        <>
          <h2 style={sectionTitleStyle}>👥 Mon équipe</h2>
          <p style={sectionSubStyle}>
            Click sur un membre pour voir sa rentabilité détaillée.
          </p>

          <div style={teamGridStyle}>
            {otherMembers.map((m) => (
              <TeamMemberRentabilityCard
                key={m.user_id}
                userId={m.user_id}
                name={m.name}
                rankLabel={m.current_rank ?? "Distri"}
                onClick={() => setSelectedMemberId(m.user_id)}
              />
            ))}
          </div>
        </>
      )}

      {/* Modal détail propre */}
      {detailOpen && ownData && (
        <RentabilityDetailModal data={ownDataWithOverride ?? ownData} onClose={() => setDetailOpen(false)} />
      )}

      {/* Modal détail membre équipe */}
      {selectedMemberId && selectedData && (
        <RentabilityDetailModal
          data={selectedData}
          onClose={() => setSelectedMemberId(null)}
        />
      )}
    </div>
  );
}

// ─── Sous-composant : card équipe (lazy fetch sa propre rentabilité) ───────
function TeamMemberRentabilityCard({
  userId,
  name,
  rankLabel,
  onClick,
}: {
  userId: string;
  name: string;
  rankLabel: string;
  onClick: () => void;
}) {
  const { data, loading } = useUserRentability(userId);

  return (
    <button type="button" onClick={onClick} style={memberCardStyle}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
        <div style={memberAvatarStyle}>{initialsOf(name)}</div>
        <div style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
          <div style={memberNameStyle}>{name}</div>
          <div style={memberRankStyle}>{rankLabel}</div>
        </div>
      </div>
      {loading || !data ? (
        <div style={miniLoadingStyle}>—</div>
      ) : (
        <div style={miniGaugeWrap}>
          <RentabilityGauge data={data} size="compact" />
        </div>
      )}
    </button>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────

const pageWrap: React.CSSProperties = {
  maxWidth: 960,
  margin: "0 auto",
  padding: "20px 18px 60px",
};

const backBtn: React.CSSProperties = {
  background: "transparent",
  border: "none",
  color: "var(--ls-text-muted)",
  fontFamily: "DM Sans, sans-serif",
  fontSize: 13,
  cursor: "pointer",
  marginBottom: 14,
  padding: 0,
};

const heroBoxStyle: React.CSSProperties = {
  background:
    "linear-gradient(135deg, color-mix(in srgb, var(--ls-gold) 14%, var(--ls-surface)) 0%, color-mix(in srgb, var(--ls-teal) 8%, var(--ls-surface)) 100%)",
  border: "0.5px solid color-mix(in srgb, var(--ls-gold) 30%, var(--ls-border))",
  borderRadius: 22,
  padding: "26px 24px",
  marginBottom: 22,
};

const heroEyebrow: React.CSSProperties = {
  fontFamily: "DM Sans, sans-serif",
  fontSize: 11,
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: 1.4,
  color: "var(--ls-gold)",
  marginBottom: 6,
};

const heroTitle: React.CSSProperties = {
  margin: 0,
  fontFamily: "Syne, sans-serif",
  fontSize: 28,
  fontWeight: 800,
  color: "var(--ls-text)",
  lineHeight: 1.15,
};

const heroSubtitle: React.CSSProperties = {
  margin: "10px 0 0",
  fontSize: 14,
  lineHeight: 1.55,
  color: "var(--ls-text-muted)",
  maxWidth: 600,
};

const ownCardStyle: React.CSSProperties = {
  background: "var(--ls-surface)",
  border: "0.5px solid var(--ls-border)",
  borderRadius: 22,
  padding: "32px 24px",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 12,
};

const detailBtnStyle: React.CSSProperties = {
  marginTop: 8,
  padding: "12px 22px",
  borderRadius: 12,
  border: "none",
  background: "linear-gradient(135deg, var(--ls-gold), color-mix(in srgb, var(--ls-gold) 80%, var(--ls-coral)))",
  color: "var(--ls-bg)",
  fontFamily: "Syne, sans-serif",
  fontSize: 13,
  fontWeight: 700,
  cursor: "pointer",
};

const sectionTitleStyle: React.CSSProperties = {
  margin: "32px 0 6px",
  fontFamily: "Syne, sans-serif",
  fontSize: 22,
  fontWeight: 800,
  color: "var(--ls-text)",
};

const sectionSubStyle: React.CSSProperties = {
  margin: "0 0 18px",
  fontSize: 13,
  color: "var(--ls-text-muted)",
};

const teamGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
  gap: 14,
};

const memberCardStyle: React.CSSProperties = {
  background: "var(--ls-surface)",
  border: "0.5px solid var(--ls-border)",
  borderRadius: 16,
  padding: "16px 16px 18px",
  cursor: "pointer",
  textAlign: "left",
  transition: "transform 0.18s, box-shadow 0.18s",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
};

const memberAvatarStyle: React.CSSProperties = {
  width: 40,
  height: 40,
  borderRadius: 12,
  background: "var(--ls-surface2)",
  border: "0.5px solid var(--ls-border)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontFamily: "Syne, sans-serif",
  fontSize: 12,
  fontWeight: 700,
  color: "var(--ls-text)",
};

const memberNameStyle: React.CSSProperties = {
  fontFamily: "Syne, sans-serif",
  fontSize: 15,
  fontWeight: 700,
  color: "var(--ls-text)",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

const memberRankStyle: React.CSSProperties = {
  fontSize: 11,
  color: "var(--ls-text-muted)",
  marginTop: 2,
};

const miniGaugeWrap: React.CSSProperties = {
  width: "100%",
  display: "flex",
  justifyContent: "center",
};

const miniLoadingStyle: React.CSSProperties = {
  padding: "30px 0",
  color: "var(--ls-text-muted)",
  fontSize: 12,
};

const loadingStyle: React.CSSProperties = {
  textAlign: "center",
  padding: 60,
  color: "var(--ls-text-muted)",
};

const emptyStyle: React.CSSProperties = {
  textAlign: "center",
  padding: "50px 20px",
  background: "var(--ls-surface)",
  border: "0.5px dashed var(--ls-border)",
  borderRadius: 18,
  color: "var(--ls-text-muted)",
  fontSize: 14,
};
