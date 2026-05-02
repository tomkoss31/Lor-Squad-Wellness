// =============================================================================
// BusinessOpportunitiesCard — Co-pilote (2026-11-03)
//
// Affiche les clients qui ont coche un montant > 0 a l etape business-ambition
// du bilan (champ business_interest_amount). Top 3 par montant DESC + CTA
// "Voir tous" qui pousse vers /clients?filter=business.
//
// Masquee si aucun client. Le filtre /clients?filter=business sera reconnu
// par ClientsPage (TODO Phase 2 si pas deja en place).
// =============================================================================

import { Link } from "react-router-dom";
import type { Client } from "../../types/domain";
import { getInitials } from "../../lib/utils/getInitials";

export interface BusinessOpportunitiesCardProps {
  clients: Client[];
}

export function BusinessOpportunitiesCard({ clients }: BusinessOpportunitiesCardProps) {
  // Filtre clients avec amount > 0 (0 = decline explicite, exclu)
  const candidates = clients
    .filter((c) => typeof c.businessInterestAmount === "number" && (c.businessInterestAmount ?? 0) > 0)
    .sort((a, b) => (b.businessInterestAmount ?? 0) - (a.businessInterestAmount ?? 0));

  if (candidates.length === 0) return null;

  const top3 = candidates.slice(0, 3);
  const more = candidates.length - top3.length;

  return (
    <div
      style={{
        padding: 16,
        borderRadius: 18,
        background:
          "linear-gradient(135deg, color-mix(in srgb, var(--ls-gold) 8%, var(--ls-surface)) 0%, color-mix(in srgb, var(--ls-teal) 6%, var(--ls-surface)) 100%)",
        border: "0.5px solid color-mix(in srgb, var(--ls-gold) 30%, var(--ls-border))",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 14,
        }}
      >
        <span aria-hidden="true" style={{ fontSize: 22 }}>
          🌟
        </span>
        <div style={{ flex: 1 }}>
          <h3
            style={{
              fontFamily: "Syne, serif",
              fontWeight: 800,
              fontSize: 14,
              margin: 0,
              letterSpacing: "-0.01em",
              color: "var(--ls-text)",
            }}
          >
            Clients ouverts au business
          </h3>
          <p
            style={{
              fontSize: 11,
              color: "var(--ls-text-muted)",
              margin: "1px 0 0",
              fontFamily: "DM Sans, sans-serif",
            }}
          >
            {candidates.length} client{candidates.length > 1 ? "s" : ""} ont exprimé un intérêt
            pour un complément de revenu
          </p>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {top3.map((c) => {
          const amount = c.businessInterestAmount ?? 0;
          const dateLabel = c.businessInterestDate
            ? new Date(c.businessInterestDate).toLocaleDateString("fr-FR", {
                day: "2-digit",
                month: "short",
              })
            : null;
          return (
            <Link
              key={c.id}
              to={`/clients/${c.id}`}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "10px 12px",
                borderRadius: 12,
                background: "var(--ls-surface)",
                border: "0.5px solid var(--ls-border)",
                textDecoration: "none",
                color: "var(--ls-text)",
                transition: "all 150ms ease",
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  background:
                    "color-mix(in srgb, var(--ls-gold) 20%, var(--ls-surface2))",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: "Syne, serif",
                  fontWeight: 700,
                  fontSize: 12,
                  color: "var(--ls-gold)",
                  flexShrink: 0,
                }}
              >
                {getInitials(`${c.firstName} ${c.lastName}`)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontFamily: "DM Sans, sans-serif",
                    fontSize: 13,
                    fontWeight: 600,
                    color: "var(--ls-text)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {c.firstName} {c.lastName}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: "var(--ls-text-muted)",
                    fontFamily: "DM Sans, sans-serif",
                  }}
                >
                  {c.businessCuriosity === "often" ? "Y pense souvent" : "Curiosité"}
                  {dateLabel ? ` · ${dateLabel}` : ""}
                </div>
              </div>
              <div
                style={{
                  fontFamily: "Syne, serif",
                  fontWeight: 800,
                  fontSize: 14,
                  color: "var(--ls-gold)",
                  flexShrink: 0,
                }}
              >
                +{amount}€
              </div>
            </Link>
          );
        })}
      </div>

      {more > 0 ? (
        <Link
          to="/clients?filter=business"
          style={{
            display: "block",
            marginTop: 12,
            padding: "8px 12px",
            textAlign: "center",
            fontSize: 12,
            fontFamily: "DM Sans, sans-serif",
            fontWeight: 600,
            color: "var(--ls-gold)",
            textDecoration: "none",
            borderRadius: 10,
            border: "0.5px dashed color-mix(in srgb, var(--ls-gold) 40%, transparent)",
          }}
        >
          Voir tous ({candidates.length}) →
        </Link>
      ) : null}
    </div>
  );
}
