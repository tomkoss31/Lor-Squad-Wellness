// =============================================================================
// RentabilityDetailModal — popup détail rentabilité V2 (2026-05-05)
//
// Refonte après feedback Thomas :
//   - Top CLIENTS au lieu de produits (plus parlant)
//   - Section split Public vs VIP (avec calcul correct par tier)
//   - Badge VIP tier coloré sur les clients VIP du top
// =============================================================================

import {
  rentabilityZone,
  type RentabilityData,
  type RentabilityTopClient,
} from "../../hooks/useUserRentability";
import { RentabilityGauge } from "./RentabilityGauge";

interface RentabilityDetailModalProps {
  data: RentabilityData;
  onClose: () => void;
}

const ZONE_COLOR: Record<string, string> = {
  red: "var(--ls-coral)",
  orange: "var(--ls-gold)",
  green: "var(--ls-teal)",
};

const VIP_META: Record<string, { label: string; color: string; emoji: string; discount: number }> = {
  bronze: { label: "Bronze", color: "#A87132", emoji: "🥉", discount: 15 },
  silver: { label: "Silver", color: "#9CA3AF", emoji: "🥈", discount: 25 },
  gold: { label: "Gold", color: "var(--ls-gold)", emoji: "🥇", discount: 35 },
  ambassador: { label: "Ambassadeur", color: "var(--ls-purple)", emoji: "👑", discount: 42 },
};

function formatEur(n: number): string {
  return Math.round(n).toLocaleString("fr-FR") + " €";
}

function monthLabel(iso: string): string {
  try {
    const d = new Date(iso + "T12:00:00Z");
    return new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" }).format(d);
  } catch {
    return "";
  }
}

export function RentabilityDetailModal({ data, onClose }: RentabilityDetailModalProps) {
  const zone = rentabilityZone(data.margin_eur);
  const zoneColor = ZONE_COLOR[zone];

  const delta = data.margin_eur - data.prev_month_eur;
  const deltaPct =
    data.prev_month_eur > 0 ? Math.round((delta / data.prev_month_eur) * 100) : null;

  const hasVipClients = data.clients_vip_count > 0;

  return (
    <div style={overlayStyle} onClick={onClose} role="dialog" aria-modal="true">
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        <button type="button" onClick={onClose} style={closeBtnStyle} aria-label="Fermer">×</button>

        {/* Header */}
        <div style={headerStyle}>
          <div style={eyebrowStyle}>💎 Ma rentabilité · {monthLabel(data.month_start)}</div>
          <h2 style={titleStyle}>{data.scope_label}</h2>
          <div style={rankPillStyle}>
            👑 {data.rank_label} · marge perso <strong>{data.margin_pct}%</strong>
          </div>
        </div>

        {/* Big jauge */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 8 }}>
          <RentabilityGauge data={data} size="hero" delay={100} />
        </div>

        {/* Calcul détaillé */}
        <SectionTitle>📊 Le calcul</SectionTitle>
        <div style={calcGridStyle}>
          <CalcRow
            label="Chiffre d'affaires brut"
            value={formatEur(data.revenue_brut)}
            sub={`${data.products_count} programme${data.products_count > 1 ? "s" : ""} vendu${data.products_count > 1 ? "s" : ""} ce mois`}
            color="var(--ls-text)"
          />
          <CalcRow
            label="× marge perso (rang)"
            value={`${data.margin_pct} %`}
            sub={data.rank_label}
            color="var(--ls-text-muted)"
          />
          <CalcRow
            label="= Marge brute nette"
            value={formatEur(data.margin_eur)}
            sub={data.products_count > 0 ? "ton revenu net du mois (clients VIP inclus)" : "aucune vente trackée"}
            color={zoneColor}
            highlight
          />
        </div>

        {/* Split Public vs VIP */}
        {data.products_count > 0 && (
          <>
            <SectionTitle>🎯 Split par type de client</SectionTitle>
            <div style={twoColStyle}>
              <SplitCard
                label="Clients publics"
                emoji="👥"
                clientsCount={data.clients_public_count}
                revenue={data.revenue_public}
                margin={data.margin_public_eur}
                marginPct={data.margin_pct}
                color="var(--ls-teal)"
                note={`Marge complète : ${data.margin_pct}%`}
              />
              <SplitCard
                label="Clients VIP"
                emoji="💎"
                clientsCount={data.clients_vip_count}
                revenue={data.revenue_vip}
                margin={data.margin_vip_eur}
                marginPct={data.margin_pct}
                color="var(--ls-gold)"
                note={
                  hasVipClients
                    ? "Marge nette = marge perso − remise VIP"
                    : "Aucun VIP ce mois"
                }
              />
            </div>
            {hasVipClients && (
              <div style={vipNoteStyle}>
                ℹ️ Les clients VIP paient moins cher (remise selon tier : bronze 15 % → ambassadeur 42 %).
                Ta marge nette = ta marge perso ({data.margin_pct} %) − remise VIP du client.
              </div>
            )}
          </>
        )}

        {/* Projection vs mois précédent */}
        <SectionTitle>📈 Projection & comparaison</SectionTitle>
        <div style={twoColStyle}>
          <ProjectionCard
            title="Fin de mois"
            value={formatEur(data.projection_eur)}
            sub={
              data.days_elapsed < data.days_in_month
                ? `Au rythme actuel (jour ${data.days_elapsed}/${data.days_in_month})`
                : "Mois écoulé"
            }
            color={zoneColor}
          />
          <ProjectionCard
            title="Mois précédent"
            value={formatEur(data.prev_month_eur)}
            sub={
              deltaPct !== null
                ? delta >= 0
                  ? `📈 +${formatEur(delta)} (+${deltaPct}%)`
                  : `📉 ${formatEur(delta)} (${deltaPct}%)`
                : "—"
            }
            color={delta >= 0 ? "var(--ls-teal)" : "var(--ls-coral)"}
          />
        </div>

        {/* Top CLIENTS (au lieu de top produits) */}
        {data.top_clients && data.top_clients.length > 0 && (
          <>
            <SectionTitle>🏆 Top clients ce mois</SectionTitle>
            <ul style={clientsListStyle}>
              {data.top_clients.map((c, i) => (
                <TopClientRow key={c.client_id} client={c} rank={i} />
              ))}
            </ul>
          </>
        )}

        {/* Note méthodologie */}
        <div style={methodoStyle}>
          ℹ️ Calcul basé sur les programmes trackés dans l'app Lor'Squad (commandes via fiche client).
          Les commandes hors-fiche (perso, club, Bizworks direct) ne sont pas incluses dans cette V1.
        </div>

        <button type="button" onClick={onClose} style={ghostBtnStyle}>
          Fermer
        </button>
      </div>
    </div>
  );
}

// ─── Sous-composants ─────────────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 style={sectionTitleStyle}>{children}</h3>;
}

function CalcRow({ label, value, sub, color, highlight }: { label: string; value: string; sub?: string; color: string; highlight?: boolean }) {
  return (
    <div style={highlight ? calcRowHighlightStyle(color) : calcRowStyle}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 12, color: "var(--ls-text-muted)", fontFamily: "DM Sans, sans-serif", fontWeight: 500 }}>{label}</div>
        {sub && <div style={{ fontSize: 10, color: "var(--ls-text-muted)", marginTop: 2 }}>{sub}</div>}
      </div>
      <div style={{ fontFamily: "Syne, sans-serif", fontWeight: highlight ? 800 : 700, fontSize: highlight ? 22 : 16, color }}>
        {value}
      </div>
    </div>
  );
}

function SplitCard({
  label,
  emoji,
  clientsCount,
  revenue,
  margin,
  color,
  note,
}: {
  label: string;
  emoji: string;
  clientsCount: number;
  revenue: number;
  margin: number;
  marginPct: number;
  color: string;
  note: string;
}) {
  const isEmpty = clientsCount === 0;
  return (
    <div style={splitCardStyle(color, isEmpty)}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 6 }}>
        <span style={{ fontSize: 14 }}>{emoji}</span>
        <span style={{ fontFamily: "DM Sans, sans-serif", fontSize: 12, fontWeight: 700, color: "var(--ls-text)" }}>
          {label}
        </span>
        <span style={{ fontSize: 11, color: "var(--ls-text-muted)" }}>
          · {clientsCount} client{clientsCount > 1 ? "s" : ""}
        </span>
      </div>
      <div style={{ fontFamily: "Syne, sans-serif", fontSize: 22, fontWeight: 800, color, marginBottom: 4 }}>
        {formatEur(margin)}
      </div>
      <div style={{ fontSize: 11, color: "var(--ls-text-muted)", marginBottom: 4 }}>
        sur {formatEur(revenue)} de CA
      </div>
      <div style={{ fontSize: 10, color: "var(--ls-text-muted)", fontStyle: "italic" }}>{note}</div>
    </div>
  );
}

function ProjectionCard({ title, value, sub, color }: { title: string; value: string; sub: string; color: string }) {
  return (
    <div style={projectionCardStyle(color)}>
      <div style={{ fontSize: 10, color: "var(--ls-text-muted)", textTransform: "uppercase", letterSpacing: 0.6, fontWeight: 600 }}>{title}</div>
      <div style={{ fontFamily: "Syne, sans-serif", fontSize: 22, fontWeight: 800, color, marginTop: 4 }}>{value}</div>
      <div style={{ fontSize: 11, color: "var(--ls-text-muted)", marginTop: 4 }}>{sub}</div>
    </div>
  );
}

function TopClientRow({ client, rank }: { client: RentabilityTopClient; rank: number }) {
  const vipMeta = client.vip_status && client.vip_status !== "none" ? VIP_META[client.vip_status] : null;
  const products = client.products?.slice(0, 2).join(" · ") ?? "";
  const moreProducts = (client.products?.length ?? 0) > 2 ? ` (+${client.products.length - 2})` : "";

  return (
    <li style={clientRowStyle(rank)}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
        <span style={rankBadgeStyle(rank)}>#{rank + 1}</span>
        <span style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: 14, color: "var(--ls-text)", flex: 1 }}>
          {client.client_name}
        </span>
        {vipMeta && (
          <span style={vipBadgeStyle(vipMeta.color)}>
            {vipMeta.emoji} {vipMeta.label} −{vipMeta.discount}%
          </span>
        )}
        <span style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: 14, color: "var(--ls-text)", whiteSpace: "nowrap" }}>
          {formatEur(client.revenue)}
        </span>
      </div>
      <div style={{ fontSize: 11, color: "var(--ls-text-muted)", paddingLeft: 32 }}>
        {client.items_count} produit{client.items_count > 1 ? "s" : ""}
        {products && ` · ${products}${moreProducts}`}
        {" · "}
        <strong style={{ color: "var(--ls-gold)" }}>marge {formatEur(client.margin)}</strong>
      </div>
    </li>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────

const overlayStyle: React.CSSProperties = {
  position: "fixed", inset: 0,
  background: "color-mix(in srgb, var(--ls-bg) 80%, transparent)",
  backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)",
  zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center",
  padding: "20px 16px", overflowY: "auto",
};

const modalStyle: React.CSSProperties = {
  position: "relative", width: "100%", maxWidth: 580,
  maxHeight: "calc(100vh - 40px)", overflowY: "auto",
  background: "var(--ls-surface)",
  border: "0.5px solid var(--ls-border)",
  borderRadius: 22, padding: "26px 24px",
  boxShadow: "0 24px 80px color-mix(in srgb, var(--ls-text) 24%, transparent)",
};

const closeBtnStyle: React.CSSProperties = {
  position: "absolute", top: 12, right: 14,
  width: 36, height: 36, borderRadius: 12,
  background: "transparent", border: "none",
  color: "var(--ls-text-muted)", fontSize: 26, cursor: "pointer", lineHeight: 1,
};

const headerStyle: React.CSSProperties = {
  textAlign: "center", marginBottom: 18, paddingRight: 30,
};

const eyebrowStyle: React.CSSProperties = {
  fontSize: 10, color: "var(--ls-gold)", textTransform: "uppercase",
  letterSpacing: 1.4, fontWeight: 700, marginBottom: 4,
};

const titleStyle: React.CSSProperties = {
  margin: 0, fontFamily: "Syne, sans-serif", fontSize: 22, fontWeight: 800, color: "var(--ls-text)",
};

const rankPillStyle: React.CSSProperties = {
  display: "inline-block", marginTop: 6,
  fontSize: 11, padding: "3px 10px", borderRadius: 9,
  background: "color-mix(in srgb, var(--ls-gold) 12%, transparent)",
  color: "var(--ls-gold)",
  border: "0.5px solid color-mix(in srgb, var(--ls-gold) 40%, transparent)",
  fontFamily: "DM Sans, sans-serif", fontWeight: 600,
};

const sectionTitleStyle: React.CSSProperties = {
  margin: "20px 0 10px", fontFamily: "Syne, sans-serif",
  fontSize: 14, fontWeight: 700, color: "var(--ls-text)",
};

const calcGridStyle: React.CSSProperties = {
  display: "flex", flexDirection: "column", gap: 6,
};

const calcRowStyle: React.CSSProperties = {
  display: "flex", alignItems: "center", justifyContent: "space-between",
  padding: "10px 12px", background: "var(--ls-surface2)",
  borderRadius: 10, gap: 10,
};

const calcRowHighlightStyle = (color: string): React.CSSProperties => ({
  display: "flex", alignItems: "center", justifyContent: "space-between",
  padding: "14px 14px", borderRadius: 12, gap: 10,
  background: `color-mix(in srgb, ${color} 8%, var(--ls-surface))`,
  border: `0.5px solid ${color}`,
  boxShadow: `0 6px 20px color-mix(in srgb, ${color} 14%, transparent)`,
});

const twoColStyle: React.CSSProperties = {
  display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10,
};

const splitCardStyle = (color: string, isEmpty: boolean): React.CSSProperties => ({
  background: isEmpty
    ? "var(--ls-surface2)"
    : `color-mix(in srgb, ${color} 6%, var(--ls-surface))`,
  border: isEmpty ? "0.5px dashed var(--ls-border)" : `0.5px solid ${color}`,
  borderRadius: 12, padding: "12px 14px",
  opacity: isEmpty ? 0.6 : 1,
});

const projectionCardStyle = (color: string): React.CSSProperties => ({
  background: `color-mix(in srgb, ${color} 6%, var(--ls-surface))`,
  border: `0.5px solid ${color}`,
  borderRadius: 12, padding: "14px 16px",
});

const vipNoteStyle: React.CSSProperties = {
  marginTop: 8,
  padding: "8px 12px",
  background: "color-mix(in srgb, var(--ls-gold) 6%, var(--ls-surface2))",
  border: "0.5px solid color-mix(in srgb, var(--ls-gold) 28%, transparent)",
  borderRadius: 10,
  fontSize: 11, color: "var(--ls-text-muted)",
  lineHeight: 1.5,
};

const clientsListStyle: React.CSSProperties = {
  margin: 0, padding: 0, listStyle: "none",
  display: "flex", flexDirection: "column", gap: 6,
};

const clientRowStyle = (idx: number): React.CSSProperties => ({
  padding: "10px 12px",
  background: idx === 0
    ? "color-mix(in srgb, var(--ls-gold) 6%, var(--ls-surface))"
    : "var(--ls-surface2)",
  borderRadius: 10,
  border: idx === 0 ? "0.5px solid color-mix(in srgb, var(--ls-gold) 30%, transparent)" : "none",
});

const rankBadgeStyle = (idx: number): React.CSSProperties => {
  const colors = ["var(--ls-gold)", "#9CA3AF", "#A87132", "var(--ls-text-muted)", "var(--ls-text-muted)"];
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minWidth: 24,
    height: 22,
    fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: 11,
    color: colors[Math.min(idx, 4)],
  };
};

const vipBadgeStyle = (color: string): React.CSSProperties => ({
  fontSize: 9,
  fontFamily: "DM Sans, sans-serif", fontWeight: 700,
  padding: "2px 7px",
  borderRadius: 6,
  background: `color-mix(in srgb, ${color} 14%, transparent)`,
  color, border: `0.5px solid ${color}`,
  whiteSpace: "nowrap",
});

const methodoStyle: React.CSSProperties = {
  marginTop: 18, padding: "10px 12px",
  background: "var(--ls-surface2)", border: "0.5px solid var(--ls-border)",
  borderRadius: 10, fontSize: 11, color: "var(--ls-text-muted)",
  lineHeight: 1.5, fontStyle: "italic",
};

const ghostBtnStyle: React.CSSProperties = {
  width: "100%", marginTop: 16,
  padding: "12px 18px", borderRadius: 12,
  border: "0.5px solid var(--ls-border)",
  background: "transparent", color: "var(--ls-text)",
  fontFamily: "DM Sans, sans-serif", fontSize: 13, fontWeight: 600, cursor: "pointer",
};
