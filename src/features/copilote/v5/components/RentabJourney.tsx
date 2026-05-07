// =============================================================================
// RentabJourney — Phase D Co-pilote V5 (2026-05-05)
//
// Refonte visuelle du widget Rentabilité existant en "parcours horizontal" :
//   - Header : montant + "gagnés ce mois" italique + status pill
//   - Barre de progression horizontale (gold gradient + curseur rond gold)
//   - Markers : 0€ · current% · target€ projection fin de mois
//   - CTA "Voir le détail →" qui navigue vers /rentabilite
//
// Réutilise le hook useUserRentability (livré Phase A rentab) pour les
// données. Couplé Thomas+Mélanie auto-géré par le hook.
// =============================================================================

import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAppContext } from "../../../../context/AppContext";
import {
  useUserRentability,
  rentabilityZone,
} from "../../../../hooks/useUserRentability";
import { usePvBreakdowns } from "../../../../hooks/usePvBreakdowns";
import { useManualPvEntries } from "../../../../hooks/useManualPvEntries";
import { useStealthMode } from "../../../../hooks/useStealthMode";
import {
  computeManualEntriesOverride,
  computeOwnSelfMargin,
  computeViewerDownlineOverride,
  currentMonthIso,
  tierPctForRank,
} from "../../../../lib/herbalifeFormulas";

const ZONE_META: Record<string, { label: string; emoji: string }> = {
  red: { label: "À booster", emoji: "🔥" },
  orange: { label: "En route", emoji: "⚡" },
  green: { label: "Carton plein", emoji: "✨" },
};

function formatEur(n: number): string {
  return Math.round(n).toLocaleString("fr-FR") + " €";
}

function monthLabel(iso: string): string {
  try {
    const d = new Date(iso + "T12:00:00Z");
    const f = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" }).format(d);
    return f.charAt(0).toUpperCase() + f.slice(1);
  } catch {
    return "";
  }
}

export function RentabJourney() {
  const navigate = useNavigate();
  const { currentUser, users } = useAppContext();
  const { data, loading, isCoupleAggregated } = useUserRentability(
    currentUser?.id ?? null,
  );
  const { stealthOn, toggle: toggleStealth } = useStealthMode();

  // V2.1+ : injection override downline + manuel pour coherence avec
  // /rentabilite et la modale "Voir detail complet".
  const monthIso = useMemo(() => currentMonthIso(), []);
  const { breakdowns } = usePvBreakdowns(monthIso);
  const { entries: manualEntries } = useManualPvEntries(currentUser?.id ?? null, monthIso);

  const ownSelfMargin = useMemo(() => {
    if (!data || !currentUser) return data?.margin_eur ?? 0;
    let total = 0;
    let any = false;
    for (const ownerId of data.scope_user_ids) {
      const b = breakdowns.find((br) => br.userId === ownerId);
      if (b) {
        const owner = users.find((u) => u.id === ownerId);
        total += computeOwnSelfMargin(b, tierPctForRank(owner?.currentRank));
        any = true;
      }
    }
    return any ? total : data.margin_eur;
  }, [data, currentUser, users, breakdowns]);

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

  const manualOverride = useMemo(() => {
    if (!currentUser) return 0;
    return computeManualEntriesOverride(manualEntries, tierPctForRank(currentUser.currentRank));
  }, [manualEntries, currentUser]);

  if (loading) {
    return (
      <section style={cardStyle} data-v5-rentab-journey>
        <div style={{ color: "var(--v5-ink-light)", padding: 20, textAlign: "center" }}>Chargement…</div>
      </section>
    );
  }

  if (!data) return null;

  // Total margin = directe + downline + manuel (coherent avec /rentabilite)
  const totalMargin = ownSelfMargin + downlineOverride + manualOverride;
  const zone = rentabilityZone(totalMargin);
  const meta = ZONE_META[zone];

  // Projection scaled au ratio override
  const ratio = data.margin_eur > 0 ? totalMargin / data.margin_eur : 1;
  const projection = (data.projection_eur || data.margin_eur) * ratio;
  const pct = projection > 0 ? Math.min(100, (totalMargin / projection) * 100) : 0;
  const pctRounded = Math.round(pct);

  return (
    <section style={cardStyle} data-v5-rentab-journey>
      {/* V7 Phase 4 (2026-05-08) : decorations cosmetiques pour casser
          le cote "card blanche clinique". 3 halos + barre laterale. */}
      <div style={glowStyle} />
      <div style={haloVioletStyle} />
      <div style={haloCyanStyle} />
      <div style={sideBarStyle} />

      {/* TOP — montant + status + meta */}
      <div style={topRowStyle}>
        <div style={{ position: "relative", zIndex: 1, flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
            <div style={overlineStyle} className="v5-cinzel">
              ◆ Ma rentabilité · {monthLabel(data.month_start)}
            </div>
            <button
              type="button"
              onClick={toggleStealth}
              aria-pressed={stealthOn}
              title={stealthOn ? "Afficher les montants" : "Masquer les montants (mode RDV)"}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                padding: "5px 11px",
                borderRadius: 8,
                border: "0.5px solid color-mix(in srgb, var(--v5-ink, #0F172A) 12%, transparent)",
                background: stealthOn
                  ? "color-mix(in srgb, var(--ls-purple, #8B5CF6) 12%, transparent)"
                  : "transparent",
                color: stealthOn ? "var(--ls-purple, #8B5CF6)" : "var(--v5-ink-light, #64748B)",
                fontFamily: "DM Sans, sans-serif",
                fontSize: 11,
                fontWeight: 600,
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              {stealthOn ? "🙈 Montants masqués" : "👁️ Masquer"}
            </button>
          </div>
          <div style={titleLineStyle}>
            <span data-stealth style={amountBigStyle}>{formatEur(totalMargin)}</span>
            <span style={amountTextStyle} className="v5-cormorant-italic">
              gagnés ce mois
            </span>
            <span style={statusPillStyle}>
              {meta.emoji} {meta.label}
            </span>
          </div>
          <div style={metaLineStyle}>
            <strong>{data.products_count} programme{data.products_count > 1 ? "s" : ""} vendu{data.products_count > 1 ? "s" : ""}</strong>
            {" · marge "}
            {data.margin_pct}%
            {downlineOverride > 0 ? (
              <span data-stealth> · +{Math.round(downlineOverride).toLocaleString("fr-FR")} € override</span>
            ) : null}
            {manualOverride > 0 ? (
              <span data-stealth> · +{Math.round(manualOverride).toLocaleString("fr-FR")} € hors-app</span>
            ) : null}
            {isCoupleAggregated && " · agrégé Thomas + Mélanie"}
          </div>
        </div>

        <button
          type="button"
          onClick={() => navigate("/rentabilite")}
          style={detailBtnStyle}
        >
          Voir le détail →
        </button>
      </div>

      {/* PARCOURS horizontal */}
      <div style={journeyWrapStyle} data-stealth>
        <div style={barWrapStyle}>
          <div style={{ ...barFillStyle, width: `${pct}%` }} />
        </div>
        <div style={markersStyle}>
          <span style={markerStyle}>0 €</span>
          <span style={markerCurrentStyle}>
            ▲ {formatEur(totalMargin)} · {pctRounded}% atteint
          </span>
          <span style={markerTargetStyle}>
            {formatEur(projection)} · projection fin de mois
          </span>
        </div>
      </div>
    </section>
  );
}

// ─── V7 Phase 4 (2026-05-08) : Rentabilite re-skin G3 + halos ─────────
// Avant : card V5 blanche/clinique + glow gold + amount gradient
// gold/orange + bar progression gold + markers gold/brown.
// Apres : card avec gradient G3 subtil + 3 halos decoratifs (emerald
// top-right + violet bottom-left + cyan flottant anime) + amount
// Fraunces italic gradient G3 + bar progression gradient G3 + markers
// emerald.
const cardStyle: React.CSSProperties = {
  background: "var(--lb360-card-rentab, var(--ls-surface))",
  borderRadius: 20,
  padding: "26px 30px",
  position: "relative",
  overflow: "hidden",
  isolation: "isolate",
  border: "1px solid color-mix(in srgb, #10B981 18%, var(--ls-border))",
  boxShadow:
    "0 12px 28px -14px rgba(15,23,42,0.10), 0 1px 2px rgba(15,23,42,0.04), inset 0 1px 0 rgba(255,255,255,0.6)",
};

// Halo 1 : emerald top-right (kept name `glowStyle` for back-compat)
const glowStyle: React.CSSProperties = {
  position: "absolute",
  top: -120,
  right: -100,
  width: 320,
  height: 320,
  background:
    "radial-gradient(circle, color-mix(in srgb, #10B981 22%, transparent), transparent 65%)",
  pointerEvents: "none",
  zIndex: 0,
  filter: "blur(8px)",
};

// Halo 2 : violet bottom-left
const haloVioletStyle: React.CSSProperties = {
  position: "absolute",
  bottom: -100,
  left: -80,
  width: 280,
  height: 280,
  background:
    "radial-gradient(circle, color-mix(in srgb, #8B5CF6 18%, transparent), transparent 65%)",
  pointerEvents: "none",
  zIndex: 0,
  filter: "blur(6px)",
};

// Halo 3 : cyan flottant centre-droit (anime)
const haloCyanStyle: React.CSSProperties = {
  position: "absolute",
  top: "40%",
  right: "25%",
  width: 120,
  height: 120,
  background:
    "radial-gradient(circle, color-mix(in srgb, #06B6D4 16%, transparent), transparent 60%)",
  pointerEvents: "none",
  zIndex: 0,
  filter: "blur(8px)",
  animation: "lb360-rentab-cyan-float 9s ease-in-out infinite",
};

// Barre laterale gauche gradient G3 + glow emerald (signature visuelle)
const sideBarStyle: React.CSSProperties = {
  position: "absolute",
  left: 0,
  top: 0,
  bottom: 0,
  width: 3,
  background:
    "var(--lb360-gradient, linear-gradient(135deg, #10B981 0%, #06B6D4 50%, #8B5CF6 100%))",
  boxShadow: "0 0 14px color-mix(in srgb, #10B981 40%, transparent)",
  pointerEvents: "none",
  zIndex: 0,
};

const topRowStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  marginBottom: 20,
  position: "relative",
  zIndex: 2,
  gap: 12,
};

// Eyebrow "MA RENTABILITE" : passe de Cinzel gold (#8B6F1F) a mono
// emerald 70% — coherent avec les autres eyebrows V7.
const overlineStyle: React.CSSProperties = {
  fontFamily: "var(--lb360-mono, 'JetBrains Mono', monospace)",
  fontSize: 11,
  letterSpacing: "0.16em",
  color: "color-mix(in srgb, #10B981 65%, var(--ls-text))",
  textTransform: "uppercase",
  fontWeight: 500,
  marginBottom: 8,
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
};

const titleLineStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "baseline",
  gap: 14,
  flexWrap: "wrap",
};

// Montant principal : Fraunces italic 700 gradient G3 — signature
// editoriale premium V5 retrouvee + gradient brand.
const amountBigStyle: React.CSSProperties = {
  fontFamily:
    "var(--lb360-display-serif, 'Fraunces', 'Cormorant Garamond', serif)",
  fontStyle: "italic",
  fontSize: "clamp(38px, 5vw, 56px)",
  fontWeight: 700,
  letterSpacing: "-0.02em",
  lineHeight: 1,
  background:
    "var(--lb360-gradient, linear-gradient(135deg, #10B981 0%, #06B6D4 50%, #8B5CF6 100%))",
  WebkitBackgroundClip: "text",
  backgroundClip: "text",
  WebkitTextFillColor: "transparent",
  // Fix italic clip
  display: "inline-block",
  paddingRight: 4,
};

// "gagnés ce mois" en italique 400 plus light pour la legende
const amountTextStyle: React.CSSProperties = {
  fontFamily:
    "var(--lb360-display-serif, 'Fraunces', 'Cormorant Garamond', serif)",
  fontStyle: "italic",
  fontSize: 22,
  color: "var(--ls-text-muted)",
  fontWeight: 400,
  letterSpacing: "-0.005em",
};

// Status pill emerald — alignement V7 (avant : light green pastel)
const statusPillStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  background: "color-mix(in srgb, #10B981 12%, transparent)",
  color: "color-mix(in srgb, #10B981 70%, var(--ls-text))",
  padding: "6px 14px",
  borderRadius: 999,
  fontSize: 11.5,
  fontWeight: 600,
  border: "1px solid color-mix(in srgb, #10B981 30%, transparent)",
  fontFamily: "var(--lb360-body, 'Inter', sans-serif)",
  alignSelf: "center",
};

const metaLineStyle: React.CSSProperties = {
  fontSize: 13,
  color: "var(--ls-text-muted)",
  marginTop: 10,
  fontFamily: "var(--lb360-body, 'Inter', sans-serif)",
};

// Bouton "Voir le detail" : ghost G3 (au lieu de gold/brown)
const detailBtnStyle: React.CSSProperties = {
  background: "color-mix(in srgb, #10B981 8%, var(--ls-surface))",
  color: "color-mix(in srgb, #10B981 75%, var(--ls-text))",
  border: "1px solid color-mix(in srgb, #10B981 25%, var(--ls-border))",
  padding: "10px 18px",
  borderRadius: 10,
  fontSize: 12,
  fontWeight: 700,
  cursor: "pointer",
  fontFamily: "var(--lb360-display, 'Sora', sans-serif)",
  whiteSpace: "nowrap",
  flexShrink: 0,
  position: "relative",
  zIndex: 2,
  letterSpacing: "0.01em",
  transition: "background 0.18s ease, border-color 0.18s ease",
};

const journeyWrapStyle: React.CSSProperties = {
  position: "relative",
  zIndex: 2,
  marginTop: 14,
};

const barWrapStyle: React.CSSProperties = {
  position: "relative",
  height: 12,
  background: "color-mix(in srgb, var(--ls-text) 5%, transparent)",
  borderRadius: 999,
  overflow: "visible",
  margin: "18px 0 10px",
};

// Barre progression gradient G3 + glow cyan/violet
const barFillStyle: React.CSSProperties = {
  height: "100%",
  background:
    "var(--lb360-gradient, linear-gradient(90deg, #10B981, #06B6D4, #8B5CF6))",
  borderRadius: 999,
  position: "relative",
  boxShadow:
    "0 1px 8px color-mix(in srgb, #06B6D4 50%, transparent)",
  transition: "width 0.6s ease",
};

const markersStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  fontSize: 11,
  color: "var(--ls-text-muted)",
  fontWeight: 600,
  fontFamily: "var(--lb360-mono, 'JetBrains Mono', monospace)",
  gap: 8,
  flexWrap: "wrap",
  textTransform: "uppercase",
  letterSpacing: "0.08em",
};

const markerStyle: React.CSSProperties = {
  color: "var(--ls-text-muted)",
};

const markerCurrentStyle: React.CSSProperties = {
  color: "color-mix(in srgb, #10B981 70%, var(--ls-text))",
  fontWeight: 800,
};

const markerTargetStyle: React.CSSProperties = {
  color: "var(--ls-text)",
  fontWeight: 700,
  textAlign: "right",
};
