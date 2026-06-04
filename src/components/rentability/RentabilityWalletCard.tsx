// =============================================================================
// RentabilityWalletCard — carte Apple Wallet premium, le moment cérémoniel
// du matin. Click = flip 3D pour révéler le breakdown.
//
// Chantier Rentabilité Premium V2 (2026-05-20).
// Source design : docs/mockups/rentabilite-design-v2/.../surprises.jsx
//
// Données :
//   - total       = ownSelfMargin + downlineOverride + manualOverride
//   - delta       = total - prev_month_eur
//   - projection  = projection_eur scaled
//   - caBrut, margePerso, margeDirecte, overrideTeam, overrideExt (dos carte)
//
// Couleur : la carte est TOUJOURS dark cinematic (indépendant du theme app).
// Animations : holographic conic rotation 14s + foil sweep diagonal 6s,
//              désactivées en prefers-reduced-motion.
// =============================================================================

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppContext } from "../../context/AppContext";
import { useStealthMode } from "../../hooks/useStealthMode";
import { useRentabilitySummary } from "../../hooks/useRentabilitySummary";
import { useCountUp } from "./shared/useCountUp";

function monthLabel(iso: string | undefined): string {
  if (!iso) return "";
  try {
    const d = new Date(iso + "T12:00:00Z");
    const f = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" }).format(d);
    return f.charAt(0).toUpperCase() + f.slice(1);
  } catch {
    return "";
  }
}

function prevMonthShortLabel(iso: string | undefined): string {
  if (!iso) return "M-1";
  try {
    const d = new Date(iso + "T12:00:00Z");
    d.setUTCMonth(d.getUTCMonth() - 1);
    return new Intl.DateTimeFormat("fr-FR", { month: "short" }).format(d).replace(".", "");
  } catch {
    return "M-1";
  }
}

interface RentabilityWalletCardProps {
  /** Si fourni, override la navigation par défaut sur le CTA "Voir détail". */
  onOpenDetail?: () => void;
  /** Permet d'imposer une taille (mobile vs desktop). Défaut : auto via CSS. */
  variant?: "default" | "compact";
  /**
   * Mode d'interaction sur click :
   * - "navigate" → click sur la carte = navigate vers /rentabilite (par défaut
   *   sur Co-pilote V5 où la carte est un widget aperçu).
   * - "flip" → click = flip 3D vers le breakdown au dos (sur /rentabilite
   *   hero où l'utilisateur est déjà sur la page complète).
   */
  interaction?: "navigate" | "flip";
}

export function RentabilityWalletCard({
  onOpenDetail,
  variant = "default",
  interaction = "navigate",
}: RentabilityWalletCardProps) {
  const navigate = useNavigate();
  const { currentUser } = useAppContext();
  // Source de vérité unique partagée (override ventes app inclus) → la carte
  // affiche le même total que la page /rentabilite et les widgets Co-pilote.
  const {
    data,
    loading,
    isCoupleAggregated,
    directMargin: ownSelfMargin,
    downlineOverride,
    manualOverride,
    totalMargin,
    delta,
    projection,
  } = useRentabilitySummary(currentUser?.id ?? null);
  const { stealthOn, toggle: toggleStealth } = useStealthMode();

  const [flipped, setFlipped] = useState(false);

  // Décomposition pour le dos
  const caBrut = data?.revenue_brut ?? 0;
  const margePct = data?.margin_pct ?? 0;

  // Count-up
  const animTotal = useCountUp(Math.round(totalMargin), { duration: 900 });
  const month = monthLabel(data?.month_start);
  const prevMonth = prevMonthShortLabel(data?.month_start);

  // Empty state
  if (!loading && (!data || (data.products_count === 0 && totalMargin === 0))) {
    return (
      <EmptyCard onClick={() => navigate("/clients")} />
    );
  }
  if (loading || !data) {
    return <SkeletonCard variant={variant} />;
  }

  const isCompact = variant === "compact";
  const width = isCompact ? 380 : 560;
  const height = isCompact ? 220 : 320;
  const titleSize = isCompact ? 56 : 84;
  const euroSize = isCompact ? 32 : 48;

  return (
    <div
      className={`lr ${stealthOn ? "lr-stealth-on" : ""}`}
      style={{ width: "100%", display: "flex", justifyContent: "center" }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: width,
          aspectRatio: `${width} / ${height}`,
          perspective: 1400,
          cursor: "pointer",
        }}
        onClick={() => {
          if (interaction === "flip") {
            setFlipped((f) => !f);
          } else if (onOpenDetail) {
            onOpenDetail();
          } else {
            navigate("/rentabilite");
          }
        }}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            if (interaction === "flip") {
              setFlipped((f) => !f);
            } else if (onOpenDetail) {
              onOpenDetail();
            } else {
              navigate("/rentabilite");
            }
          }
        }}
        aria-label={interaction === "flip" ? "Retourner la carte pour voir le détail" : "Ouvrir la page rentabilité complète"}
      >
        <div
          style={{
            position: "relative",
            width: "100%",
            height: "100%",
            transformStyle: "preserve-3d",
            transition: "transform .8s cubic-bezier(.65,.05,.36,1)",
            transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
          }}
        >
          {/* ═══ FRONT ═══════════════════════════════════════════════════ */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: 26,
              background: "linear-gradient(135deg, #0a1a1f 0%, #1a1230 45%, #2a0e1e 100%)",
              color: "#fff",
              overflow: "hidden",
              backfaceVisibility: "hidden",
              WebkitBackfaceVisibility: "hidden",
              boxShadow:
                "0 30px 80px -20px rgba(0,0,0,.55), 0 2px 0 rgba(255,255,255,.06) inset, 0 0 0 1px rgba(255,255,255,.08)",
            }}
          >
            {/* Holographic conic shimmer */}
            <div
              style={{
                position: "absolute",
                inset: -40,
                background:
                  "conic-gradient(from 0deg, #0d9488, #5b21b6, #ef4444, #b8922a, #0d9488)",
                opacity: 0.32,
                filter: "blur(60px)",
                animation: "lr-wc-spin 14s linear infinite",
              }}
            />
            {/* Radial pads */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                background:
                  "radial-gradient(120% 80% at 0% 0%, rgba(13,148,136,.35), transparent 55%), radial-gradient(80% 60% at 100% 100%, rgba(184,146,42,.28), transparent 60%)",
              }}
            />
            {/* Foil sweep */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                background:
                  "linear-gradient(115deg, transparent 30%, rgba(255,255,255,.18) 48%, transparent 60%)",
                mixBlendMode: "overlay",
                animation: "lr-wc-sweep 6s ease-in-out infinite",
              }}
            />
            {/* Grain */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                opacity: 0.08,
                background:
                  "repeating-linear-gradient(45deg, transparent 0 2px, rgba(255,255,255,.4) 2px 3px)",
                mixBlendMode: "overlay",
                pointerEvents: "none",
              }}
            />

            {/* Content */}
            <div
              style={{
                position: "relative",
                padding: isCompact ? 22 : 32,
                height: "100%",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                gap: 8,
              }}
            >
              {/* Top row */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div
                    style={{
                      fontFamily: "DM Sans, sans-serif",
                      fontSize: 10.5,
                      letterSpacing: "0.18em",
                      textTransform: "uppercase",
                      color: "rgba(255,255,255,.7)",
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <span aria-hidden="true" style={{ color: "#C9A84C" }}>◆</span>
                    La Base 360 · Rentabilité
                  </div>
                  <div
                    style={{
                      fontFamily: "DM Sans, sans-serif",
                      fontSize: 13,
                      color: "rgba(255,255,255,.55)",
                      marginTop: 6,
                    }}
                  >
                    {month}
                    {isCoupleAggregated && (
                      <span
                        style={{
                          marginLeft: 8,
                          padding: "2px 8px",
                          borderRadius: 999,
                          background: "rgba(255,255,255,.08)",
                          fontSize: 10,
                          color: "rgba(255,255,255,.75)",
                          letterSpacing: 0.4,
                        }}
                      >
                        Agrégé · 2 comptes
                      </span>
                    )}
                  </div>
                </div>
                {/* Stealth toggle + chip embossé */}
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleStealth();
                    }}
                    aria-label={stealthOn ? "Afficher les montants" : "Masquer les montants"}
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 999,
                      background: "rgba(255,255,255,.08)",
                      border: "1px solid rgba(255,255,255,.15)",
                      color: "rgba(255,255,255,.85)",
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 14,
                    }}
                  >
                    {stealthOn ? "🙈" : "👁"}
                  </button>
                  <div
                    aria-hidden="true"
                    style={{
                      width: 44,
                      height: 32,
                      borderRadius: 6,
                      background: "linear-gradient(135deg, #d6b964, #8a6a1e 70%)",
                      boxShadow:
                        "0 1px 0 rgba(255,255,255,.4) inset, 0 -1px 0 rgba(0,0,0,.3) inset",
                      position: "relative",
                    }}
                  >
                    <div
                      style={{
                        position: "absolute",
                        inset: 4,
                        border: "1px solid rgba(0,0,0,.2)",
                        borderRadius: 3,
                        opacity: 0.5,
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Big amount */}
              <div>
                <div
                  style={{
                    fontFamily: "DM Sans, sans-serif",
                    fontSize: 11,
                    letterSpacing: "0.18em",
                    textTransform: "uppercase",
                    color: "rgba(255,255,255,.55)",
                  }}
                >
                  Tu gagnes ce mois
                </div>
                <div
                  data-stealth
                  style={{
                    fontFamily: "Syne, sans-serif",
                    fontStyle: "italic",
                    fontWeight: 700,
                    fontSize: titleSize,
                    lineHeight: 0.95,
                    letterSpacing: "-0.025em",
                    background:
                      "linear-gradient(120deg, #5eead4 0%, #c4b5fd 50%, #fda4af 100%)",
                    WebkitBackgroundClip: "text",
                    backgroundClip: "text",
                    color: "transparent",
                    marginTop: 6,
                  }}
                >
                  {Math.round(animTotal).toLocaleString("fr-FR")}
                  <span style={{ fontSize: euroSize, marginLeft: 4 }}>€</span>
                </div>
              </div>

              {/* Bottom chips */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-end",
                  gap: 8,
                  flexWrap: "wrap",
                }}
              >
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <span
                    data-stealth
                    style={{
                      height: 26,
                      padding: "0 10px",
                      borderRadius: 999,
                      background:
                        delta >= 0 ? "rgba(45,212,191,.15)" : "rgba(251,113,133,.15)",
                      color: delta >= 0 ? "#5eead4" : "#fda4af",
                      border:
                        delta >= 0
                          ? "1px solid rgba(45,212,191,.3)"
                          : "1px solid rgba(251,113,133,.3)",
                      fontFamily: "DM Sans, sans-serif",
                      fontSize: 12,
                      fontWeight: 600,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    {delta >= 0 ? "↑" : "↓"} {delta >= 0 ? "+" : ""}
                    {delta}€ vs {prevMonth}
                  </span>
                  <span
                    data-stealth
                    style={{
                      height: 26,
                      padding: "0 10px",
                      borderRadius: 999,
                      background: "rgba(201,168,76,.14)",
                      color: "#e2c878",
                      border: "1px solid rgba(201,168,76,.3)",
                      fontFamily: "DM Sans, sans-serif",
                      fontSize: 12,
                      fontWeight: 600,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    proj. {projection.toLocaleString("fr-FR")} €
                  </span>
                </div>
                <div
                  style={{
                    fontFamily: "DM Sans, sans-serif",
                    fontSize: 11,
                    color: "rgba(255,255,255,.55)",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    padding: "5px 10px",
                    borderRadius: 999,
                    background: "rgba(255,255,255,.06)",
                    border: "1px solid rgba(255,255,255,.12)",
                  }}
                >
                  {interaction === "flip" ? "retourner la carte ↻" : "ouvrir le détail →"}
                </div>
              </div>
            </div>
          </div>

          {/* ═══ BACK ════════════════════════════════════════════════════ */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: 26,
              background: "linear-gradient(160deg, #14101a 0%, #0e1418 100%)",
              color: "#fff",
              overflow: "hidden",
              backfaceVisibility: "hidden",
              WebkitBackfaceVisibility: "hidden",
              transform: "rotateY(180deg)",
              boxShadow:
                "0 30px 80px -20px rgba(0,0,0,.55), 0 0 0 1px rgba(255,255,255,.08)",
              padding: isCompact ? 20 : 28,
              display: "flex",
              flexDirection: "column",
              gap: isCompact ? 10 : 14,
            }}
          >
            <div
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                top: 22,
                height: 32,
                background: "linear-gradient(180deg, #1a1a1f, #0a0a0f)",
              }}
            />
            <div style={{ height: isCompact ? 26 : 36 }} />

            <div
              style={{
                fontFamily: "DM Sans, sans-serif",
                fontSize: 10.5,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: "rgba(255,255,255,.55)",
              }}
            >
              D'où viennent les {Math.round(totalMargin).toLocaleString("fr-FR")} €
            </div>

            <BackRow label="CA brut" value={`${Math.round(caBrut).toLocaleString("fr-FR")} €`} sub={`${data.products_count} programme${data.products_count > 1 ? "s" : ""}`} />
            <BackRow label="× Marge perso" value={`${Math.round(margePct)}%`} sub="taux moyen" />
            <BackRow label="= Marge directe" value={`${Math.round(ownSelfMargin).toLocaleString("fr-FR")} €`} accent="#5eead4" />
            {downlineOverride > 0 && (
              <BackRow label="+ Override équipe" value={`+${Math.round(downlineOverride)} €`} sub="app trackée" accent="#a78bfa" />
            )}
            {manualOverride > 0 && (
              <BackRow label="+ Override hors-app" value={`+${Math.round(manualOverride)} €`} sub="saisi manuellement" accent="#a78bfa" />
            )}

            <div style={{ flex: 1 }} />
            <div
              style={{
                borderTop: "1px solid rgba(255,255,255,.12)",
                paddingTop: 10,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
              }}
            >
              <span
                style={{
                  fontFamily: "DM Sans, sans-serif",
                  fontSize: 11,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  color: "rgba(255,255,255,.55)",
                }}
              >
                Total net
              </span>
              <span
                data-stealth
                style={{
                  fontFamily: "Syne, sans-serif",
                  fontStyle: "italic",
                  fontWeight: 700,
                  fontSize: 36,
                  letterSpacing: "-.02em",
                  background:
                    "linear-gradient(120deg, #5eead4, #c4b5fd, #fda4af)",
                  WebkitBackgroundClip: "text",
                  backgroundClip: "text",
                  color: "transparent",
                }}
              >
                {Math.round(totalMargin).toLocaleString("fr-FR")} €
              </span>
            </div>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (onOpenDetail) onOpenDetail();
                else navigate("/rentabilite");
              }}
              style={{
                marginTop: 6,
                height: 36,
                borderRadius: 999,
                border: "1px solid rgba(255,255,255,.16)",
                background: "rgba(255,255,255,.08)",
                color: "#fff",
                fontFamily: "DM Sans, sans-serif",
                fontWeight: 600,
                fontSize: 12.5,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
              }}
            >
              Voir la page complète →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function BackRow({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: string;
}) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
      <div>
        <div
          style={{
            fontFamily: "DM Sans, sans-serif",
            fontSize: 13,
            color: "rgba(255,255,255,.85)",
            fontWeight: 500,
          }}
        >
          {label}
        </div>
        {sub && (
          <div
            style={{
              fontFamily: "DM Sans, sans-serif",
              fontSize: 11,
              color: "rgba(255,255,255,.4)",
              marginTop: 1,
            }}
          >
            {sub}
          </div>
        )}
      </div>
      <div
        data-stealth
        style={{
          fontFamily: "Syne, sans-serif",
          fontStyle: "italic",
          fontWeight: 700,
          fontSize: 18,
          color: accent || "#fff",
        }}
      >
        {value}
      </div>
    </div>
  );
}

function SkeletonCard({ variant }: { variant: "default" | "compact" }) {
  const width = variant === "compact" ? 380 : 560;
  const height = variant === "compact" ? 220 : 320;
  return (
    <div style={{ width: "100%", display: "flex", justifyContent: "center" }}>
      <div
        style={{
          width: "100%",
          maxWidth: width,
          aspectRatio: `${width} / ${height}`,
          borderRadius: 26,
          background:
            "linear-gradient(135deg, #0a1a1f 0%, #1a1230 45%, #2a0e1e 100%)",
          opacity: 0.5,
          animation: "lr-pulse 1.5s ease-in-out infinite alternate",
        }}
      />
    </div>
  );
}

function EmptyCard({ onClick }: { onClick: () => void }) {
  return (
    <div className="lr" style={{ width: "100%", display: "flex", justifyContent: "center" }}>
      <button
        type="button"
        onClick={onClick}
        style={{
          width: "100%",
          maxWidth: 560,
          aspectRatio: "560 / 320",
          borderRadius: 26,
          background:
            "linear-gradient(135deg, #0a1a1f 0%, #1a1230 45%, #2a0e1e 100%)",
          color: "#fff",
          border: "none",
          padding: 32,
          cursor: "pointer",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          gap: 12,
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontFamily: "Syne, sans-serif",
            fontStyle: "italic",
            fontWeight: 700,
            fontSize: 28,
            background:
              "linear-gradient(120deg, #5eead4, #c4b5fd, #fda4af)",
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            color: "transparent",
          }}
        >
          Ta carte s'allume au premier programme vendu 🚀
        </div>
        <div
          style={{
            fontFamily: "DM Sans, sans-serif",
            fontSize: 13,
            color: "rgba(255,255,255,.55)",
            maxWidth: 380,
          }}
        >
          Crée un bilan client ou enregistre une vente pour démarrer.
        </div>
        <span
          style={{
            marginTop: 8,
            height: 36,
            padding: "0 18px",
            borderRadius: 999,
            border: "1px solid rgba(255,255,255,.2)",
            background: "rgba(255,255,255,.08)",
            color: "#fff",
            fontFamily: "DM Sans, sans-serif",
            fontWeight: 600,
            fontSize: 13,
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          Ouvrir mes clients →
        </span>
      </button>
    </div>
  );
}
