// =============================================================================
// RentabilityWidget — Co-pilote (2026-05-05)
//
// Widget compact en haut du Co-pilote : jauge ronde "compact" + click =
// popup détail. Skippe silencieusement si pas de user (login).
// =============================================================================

import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppContext } from "../../context/AppContext";
import { useUserRentability } from "../../hooks/useUserRentability";
import { RentabilityGauge } from "./RentabilityGauge";
import { RentabilityDetailModal } from "./RentabilityDetailModal";
import { usePvBreakdowns } from "../../hooks/usePvBreakdowns";
import { useManualPvEntries } from "../../hooks/useManualPvEntries";
import { useStealthMode } from "../../hooks/useStealthMode";
import {
  computeManualEntriesOverride,
  computeOwnSelfMargin,
  computeViewerDownlineOverride,
  currentMonthIso,
  tierPctForRank,
} from "../../lib/herbalifeFormulas";

export function RentabilityWidget() {
  const navigate = useNavigate();
  const { currentUser, users } = useAppContext();
  const { data, loading, error, isCoupleAggregated } = useUserRentability(currentUser?.id ?? null);
  const [open, setOpen] = useState(false);
  // Stealth mode (chantier 2026-11-07) : floute les montants pour les RDV.
  const { stealthOn, toggle: toggleStealth } = useStealthMode();

  // Override downline (V2.1) — additionne au margin_eur pour la jauge.
  // La RPC SQL ne lit pas pv_monthly_breakdown ; on injecte cote front.
  const monthIso = useMemo(() => currentMonthIso(), []);
  const { breakdowns } = usePvBreakdowns(monthIso);
  const downlineOverride = useMemo(() => {
    if (!data || !currentUser) return 0;
    return computeViewerDownlineOverride(
      data.scope_user_ids,
      users.map((u) => ({
        id: u.id,
        sponsorId: u.sponsorId,
        currentRank: u.currentRank,
        frozenAt: u.frozenAt,
      })),
      breakdowns,
    );
  }, [data, currentUser, users, breakdowns]);
  // Marge propre du user sur SES ventes : si breakdown perso saisi, on
  // l utilise (capture les ventes Bizworks hors-app). Sinon RPC fallback.
  //
  // Bugfix 2026-05-20 (cas Mandy) : auparavant un breakdown perso saisi
  // ECRASAIT la RPC, même s'il était vide ou inférieur. Conséquence :
  // un distri qui avait saisi un breakdown vide perdait les ventes app
  // trackées (ex. Mandy : 111€ RPC sur EMMANUELLA → 0€ affiché car
  // breakdown vide saisi). Désormais on prend MAX(RPC, breakdown) :
  // - Breakdown vide/inférieur → on garde la vérité RPC (ventes app)
  // - Breakdown supérieur → on prend breakdown (capture Bizworks > app)
  const ownSelfMargin = useMemo(() => {
    if (!data || !currentUser) return data?.margin_eur ?? 0;
    // Pour le couple, on additionne les breakdowns des 2 si saisis.
    let total = 0;
    let hasAnyBreakdown = false;
    for (const ownerId of data.scope_user_ids) {
      const b = breakdowns.find((br) => br.userId === ownerId);
      if (b) {
        const owner = users.find((u) => u.id === ownerId);
        const tierPct = tierPctForRank(owner?.currentRank);
        total += computeOwnSelfMargin(b, tierPct);
        hasAnyBreakdown = true;
      }
    }
    return hasAnyBreakdown ? Math.max(total, data.margin_eur) : data.margin_eur;
  }, [data, currentUser, users, breakdowns]);
  // V3 : entrees manuelles distri hors-app.
  // Bugfix 2026-05-20 : agréger sur scope_user_ids (couple) pour cohérence
  // Thomas/Mélanie.
  const { entries: manualEntries } = useManualPvEntries(
    data?.scope_user_ids ?? null,
    monthIso,
  );
  const manualOverride = useMemo(() => {
    if (!currentUser) return 0;
    return computeManualEntriesOverride(manualEntries, tierPctForRank(currentUser.currentRank));
  }, [manualEntries, currentUser]);
  // Patch data pour la jauge : own_self + downline + manuel
  const dataWithOverride = useMemo(() => {
    if (!data) return null;
    const newMargin = ownSelfMargin + downlineOverride + manualOverride;
    if (newMargin === data.margin_eur) return data;
    const ratio = data.margin_eur > 0 ? newMargin / data.margin_eur : 1;
    return {
      ...data,
      margin_eur: newMargin,
      projection_eur: data.projection_eur * ratio,
    };
  }, [data, ownSelfMargin, downlineOverride, manualOverride]);

  if (!currentUser) return null;
  if (loading) {
    return (
      <div style={skeletonStyle}>
        <div style={skeletonGaugeStyle} />
      </div>
    );
  }
  // Si erreur ou pas de data, on affiche quand même un fallback minimal au
  // lieu de skip silencieusement. Évite que la rentabilité "disparaisse"
  // sans signal utilisateur (cas Thomas 2026-05-05).
  if (!data) {
    return (
      <div style={cardStyle}>
        <div style={leftStyle}>
          <div style={eyebrowStyle}>💎 Ma rentabilité</div>
          <h3 style={titleStyle}>Données indisponibles</h3>
          <p style={subStyle}>
            {error
              ? `Erreur : ${error}`
              : "Aucune donnée pour ce mois. Crée ton premier bilan client → la jauge s'allume."}
          </p>
          <div style={ctaRowStyle}>
            <button
              type="button"
              onClick={() => navigate("/rentabilite")}
              style={ctaBtnGhost}
            >
              Voir la page complète
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Sub-text : on tient TOUT en 1 ligne max + projection inline (pas de
  // doublon vertical avec le widget). Couple : on précise.
  const subParts: string[] = [];
  if (data.products_count > 0) {
    subParts.push(
      `${data.products_count} programme${data.products_count > 1 ? "s" : ""} · marge ${data.margin_pct}%`,
    );
  }
  if (downlineOverride > 0) {
    subParts.push(`+${Math.round(downlineOverride).toLocaleString("fr-FR")} € override downline`);
  }
  if (manualOverride > 0) {
    subParts.push(`+${Math.round(manualOverride).toLocaleString("fr-FR")} € distri hors-app`);
  }
  const effectiveMargin = ownSelfMargin + downlineOverride + manualOverride;
  const effectiveProjection = (dataWithOverride ?? data).projection_eur;
  if (effectiveProjection > effectiveMargin) {
    subParts.push(`projection ${Math.round(effectiveProjection).toLocaleString("fr-FR")} € fin de mois`);
  }
  if (isCoupleAggregated) {
    subParts.push("agrégé Thomas + Mélanie");
  }
  const subText =
    data.products_count === 0
      ? "Vends ton premier programme pour démarrer 🚀"
      : subParts.join(" · ");

  return (
    <>
      <div style={cardStyle}>
        <div style={leftStyle}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
            <div style={eyebrowStyle}>💎 Ma rentabilité · {monthLabel(data.month_start)}</div>
            <button
              type="button"
              onClick={toggleStealth}
              aria-pressed={stealthOn}
              title={stealthOn ? "Afficher les montants" : "Masquer les montants (RDV)"}
              style={{
                background: "transparent",
                border: "0.5px solid var(--ls-border)",
                borderRadius: 8,
                padding: "3px 8px",
                fontSize: 11,
                cursor: "pointer",
                color: stealthOn ? "var(--ls-purple)" : "var(--ls-text-muted)",
                fontFamily: "DM Sans, sans-serif",
              }}
            >
              {stealthOn ? "🙈" : "👁️"}
            </button>
          </div>
          <h3 style={titleStyle}>
            Tu gagnes <span data-stealth style={{ color: "var(--ls-gold)" }}>{Math.round(effectiveMargin).toLocaleString("fr-FR")} €</span> ce mois
          </h3>
          <p data-stealth style={subStyle}>{subText}</p>
          <div style={ctaRowStyle}>
            <button
              type="button"
              onClick={() => setOpen(true)}
              style={ctaBtnPrimary}
            >
              Voir le détail →
            </button>
            <button
              type="button"
              onClick={() => navigate("/rentabilite")}
              style={ctaBtnGhost}
            >
              Page complète
            </button>
          </div>
        </div>
        <div style={rightStyle} data-stealth>
          {/* Compact 140 px sans labels (les labels sont déjà dans le widget) */}
          <RentabilityGauge
            data={dataWithOverride ?? data}
            size="compact"
            onClick={() => setOpen(true)}
            showLabels={false}
          />
        </div>
      </div>

      {open && (
        <RentabilityDetailModal
          data={dataWithOverride ?? data}
          onClose={() => setOpen(false)}
          directMargin={ownSelfMargin}
          downlineOverride={downlineOverride}
          manualOverride={manualOverride}
        />
      )}
    </>
  );
}

function monthLabel(iso: string): string {
  try {
    const d = new Date(iso + "T12:00:00Z");
    return new Intl.DateTimeFormat("fr-FR", { month: "long" }).format(d);
  } catch {
    return "";
  }
}

// ─── Styles ────────────────────────────────────────────────────────────────

const cardStyle: React.CSSProperties = {
  background:
    "linear-gradient(135deg, color-mix(in srgb, var(--ls-gold) 6%, var(--ls-surface)) 0%, var(--ls-surface) 60%)",
  border: "0.5px solid color-mix(in srgb, var(--ls-gold) 28%, var(--ls-border))",
  borderRadius: 18,
  padding: "18px 20px",
  display: "flex",
  alignItems: "center",
  gap: 18,
  flexWrap: "wrap",
  boxShadow: "0 6px 22px color-mix(in srgb, var(--ls-gold) 8%, transparent)",
};

const leftStyle: React.CSSProperties = {
  flex: "1 1 280px",
  minWidth: 0,
};

const rightStyle: React.CSSProperties = {
  flex: "0 0 auto",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const eyebrowStyle: React.CSSProperties = {
  fontSize: 10,
  color: "var(--ls-gold)",
  textTransform: "uppercase",
  letterSpacing: 1.4,
  fontWeight: 700,
  marginBottom: 4,
  fontFamily: "DM Sans, sans-serif",
};

const titleStyle: React.CSSProperties = {
  margin: 0,
  fontFamily: "Syne, sans-serif",
  fontSize: 19,
  fontWeight: 800,
  color: "var(--ls-text)",
  lineHeight: 1.25,
};

const subStyle: React.CSSProperties = {
  margin: "6px 0 0",
  fontSize: 12,
  color: "var(--ls-text-muted)",
  lineHeight: 1.4,
};

const ctaRowStyle: React.CSSProperties = {
  marginTop: 12,
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
};

const ctaBtnPrimary: React.CSSProperties = {
  padding: "9px 16px",
  borderRadius: 10,
  border: "none",
  background: "linear-gradient(135deg, var(--ls-gold), color-mix(in srgb, var(--ls-gold) 75%, var(--ls-coral)))",
  color: "var(--ls-bg)",
  fontFamily: "Syne, sans-serif",
  fontSize: 12,
  fontWeight: 700,
  cursor: "pointer",
};

const ctaBtnGhost: React.CSSProperties = {
  padding: "9px 14px",
  borderRadius: 10,
  border: "0.5px solid var(--ls-border)",
  background: "transparent",
  color: "var(--ls-text)",
  fontFamily: "DM Sans, sans-serif",
  fontSize: 12,
  cursor: "pointer",
};

const skeletonStyle: React.CSSProperties = {
  background: "var(--ls-surface)",
  border: "0.5px solid var(--ls-border)",
  borderRadius: 18,
  padding: 20,
  display: "flex",
  justifyContent: "center",
  minHeight: 200,
};

const skeletonGaugeStyle: React.CSSProperties = {
  width: 180,
  height: 180,
  borderRadius: "50%",
  background:
    "linear-gradient(135deg, var(--ls-surface2) 0%, color-mix(in srgb, var(--ls-text-muted) 14%, var(--ls-surface)) 50%, var(--ls-surface2) 100%)",
  backgroundSize: "200% 200%",
  animation: "ls-rent-skeleton 1.5s ease-in-out infinite",
};
