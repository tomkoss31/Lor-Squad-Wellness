// =============================================================================
// ClientVipBadge — petit badge VIP réutilisable (Tier B Premium VIP)
// =============================================================================
//
// Affiche le niveau VIP d un client en mini-pill premium (gold / silver /
// bronze / diamond). Reutilisable :
//   - Sur la card client dans /clients (liste)
//   - Sur la fiche client (header)
//   - Dans l arbre referrals (chaque nœud)
//
// Modes :
//   - "compact" : juste le badge + label court (ex pour rows)
//   - "full"    : badge + label + remise (ex pour header fiche)
// =============================================================================

import { getVipMeta, type VipLevel } from "./useClientVip";

interface Props {
  level: VipLevel;
  size?: "compact" | "full";
  showDiscount?: boolean;
}

export function ClientVipBadge({ level, size = "compact", showDiscount = false }: Props) {
  const meta = getVipMeta(level);
  if (level === "none") {
    return null; // Pas de badge si non inscrit
  }

  const compact = size === "compact";

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: compact ? 4 : 6,
        padding: compact ? "2px 7px" : "5px 11px",
        background: tierBg(meta.tone),
        border: `0.5px solid ${tierBorder(meta.tone)}`,
        borderRadius: 999,
        fontSize: compact ? 10 : 12,
        fontWeight: 700,
        fontFamily: compact ? "DM Sans, sans-serif" : "Syne, serif",
        color: meta.color,
        letterSpacing: 0.3,
        whiteSpace: "nowrap",
      }}
    >
      <span style={{ fontSize: compact ? 11 : 14, lineHeight: 1 }}>{meta.badge}</span>
      <span>{meta.label}</span>
      {showDiscount && meta.discount > 0 ? (
        <span style={{ opacity: 0.85 }}>· -{meta.discount}%</span>
      ) : null}
    </span>
  );
}

function tierBg(tone: string): string {
  switch (tone) {
    case "bronze":
      return "linear-gradient(135deg, rgba(184,115,51,0.08), rgba(184,115,51,0.16))";
    case "silver":
      return "linear-gradient(135deg, rgba(156,163,175,0.10), rgba(156,163,175,0.18))";
    case "gold":
      return "linear-gradient(135deg, rgba(184,146,42,0.12), rgba(255,232,115,0.22))";
    case "diamond":
      return "linear-gradient(135deg, rgba(124,58,237,0.10), rgba(167,139,250,0.20))";
    default:
      return "rgba(0,0,0,0.04)";
  }
}

function tierBorder(tone: string): string {
  switch (tone) {
    case "bronze":
      return "rgba(184,115,51,0.45)";
    case "silver":
      return "rgba(156,163,175,0.45)";
    case "gold":
      return "rgba(184,146,42,0.55)";
    case "diamond":
      return "rgba(124,58,237,0.50)";
    default:
      return "rgba(0,0,0,0.10)";
  }
}
