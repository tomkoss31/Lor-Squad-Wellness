// =============================================================================
// ClientVipHomeSection — section VIP sur Accueil PWA client (Tier B)
// =============================================================================
//
// Bandeau premium gold + niveau actuel + barre progression + remise.
// CTA "Découvre comment tu peux gagner plus" → ouvre le sandbox interactif.
// CTA "Recommander un ami" → form prospects + lien myherbalife.
// =============================================================================

import { useState } from "react";
import { recordClientXp } from "../client-xp/useClientXp";
import { ClientVipSandbox } from "./ClientVipSandbox";
import {
  getVipMeta,
  useClientVipStatusByToken,
} from "./useClientVip";

interface Props {
  token: string;
  coachName?: string;
  /** ID Herbalife du coach (pour pre-remplir le lien sponsor). */
  coachHerbalifeId?: string | null;
}

export function ClientVipHomeSection({ token, coachName = "Coach", coachHerbalifeId }: Props) {
  const status = useClientVipStatusByToken(token);
  const [sandboxOpen, setSandboxOpen] = useState(false);

  if (status.loading) {
    return null;
  }

  // Debug visible (2026-04-29) : si la RPC plante silencieusement, on affiche
  // un encart pour que le coach voie qu'il y a un probleme au lieu de rien.
  if (!status.data) {
    return (
      <div
        style={{
          background: "rgba(252, 229, 193, 0.4)",
          border: "0.5px dashed rgba(184,146,42,0.6)",
          borderRadius: 12,
          padding: 12,
          marginBottom: 16,
          fontSize: 12,
          color: "#5C4A0F",
          fontFamily: "DM Sans, sans-serif",
        }}
      >
        ⭐ Programme Client Privilégié indisponible.
        {status.error ? (
          <div style={{ fontSize: 10, marginTop: 4, opacity: 0.7 }}>
            ({status.error})
          </div>
        ) : null}
      </div>
    );
  }

  const meta = getVipMeta(status.data.level);
  const isNone = status.data.level === "none";
  const isAmbassador = status.data.level === "ambassador";

  // Calcul ratio progression
  const ratio = isAmbassador
    ? 1
    : status.data.next_threshold === 0
      ? 0
      : Math.min(1, status.data.pv_lifetime / status.data.next_threshold);

  function openSandbox() {
    setSandboxOpen(true);
    // V2 (2026-04-28) : action XP dediee vip_sandbox_completed (+20 XP, lifetime).
    void recordClientXp(token, "vip_sandbox_completed");
  }

  function openSponsorLink() {
    const url = "https://www.myherbalife.com";
    window.open(url, "_blank", "noopener,noreferrer");
  }

  return (
    <>
      <div
        style={{
          background: isNone
            ? "linear-gradient(135deg, rgba(255,254,245,0.95) 0%, rgba(252,229,193,0.6) 100%)"
            : "linear-gradient(135deg, rgba(255,255,255,1) 0%, rgba(252,229,193,0.5) 50%, rgba(184,146,42,0.18) 100%)",
          border: `0.5px solid ${meta.color}40`,
          borderRadius: 18,
          padding: 18,
          marginBottom: 16,
          boxShadow: "0 8px 24px rgba(184,146,42,0.18)",
          fontFamily: "DM Sans, sans-serif",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Glow gold subtle */}
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            top: -50,
            right: -50,
            width: 140,
            height: 140,
            background: `radial-gradient(circle, ${meta.color}30 0%, transparent 70%)`,
            pointerEvents: "none",
          }}
        />

        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 14,
            marginBottom: 14,
            position: "relative",
          }}
        >
          {/* Badge tier */}
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              background: tierBgGradient(meta.tone),
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 32,
              boxShadow: `0 4px 14px ${meta.color}40, inset 0 1px 0 rgba(255,255,255,0.5)`,
              flexShrink: 0,
            }}
          >
            {meta.badge}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 9,
                letterSpacing: 2,
                textTransform: "uppercase",
                color: meta.color,
                fontWeight: 700,
                marginBottom: 2,
              }}
            >
              ⭐ Programme Client Privilégié
            </div>
            <div
              style={{
                fontFamily: "Syne, serif",
                fontWeight: 700,
                fontSize: 20,
                color: "#5C4A0F",
                lineHeight: 1.1,
              }}
            >
              {isNone ? "Pas encore activé" : `${meta.label} · -${meta.discount}%`}
            </div>
            <div
              style={{
                fontSize: 11,
                color: "#6B6B62",
                marginTop: 3,
              }}
            >
              {meta.hint}
            </div>
          </div>
          {!isNone ? (
            <div
              style={{
                background: "linear-gradient(135deg, #EF9F27 0%, #BA7517 100%)",
                color: "white",
                padding: "8px 14px",
                borderRadius: 12,
                fontSize: 14,
                fontWeight: 800,
                fontFamily: "Syne, serif",
                boxShadow: "0 4px 12px rgba(186,117,23,0.35)",
                flexShrink: 0,
              }}
            >
              {status.data.pv_lifetime} pts
            </div>
          ) : null}
        </div>

        {/* Progress bar (si pas none) */}
        {!isNone ? (
          <div style={{ marginBottom: 12 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 11,
                color: "#5C4A0F",
                marginBottom: 5,
              }}
            >
              <span style={{ fontWeight: 600 }}>
                {status.data.pv_lifetime} / {status.data.next_threshold} pts
              </span>
              {!isAmbassador ? (
                <span>
                  {Math.max(0, status.data.next_threshold - status.data.pv_lifetime)} pts pour {nextLevelLabel(status.data.level)}
                </span>
              ) : (
                <span>💎 Niveau max atteint</span>
              )}
            </div>
            <div
              style={{
                height: 10,
                background: "rgba(184,146,42,0.18)",
                borderRadius: 5,
                overflow: "hidden",
                boxShadow: "inset 0 1px 2px rgba(0,0,0,0.10)",
              }}
            >
              <div
                style={{
                  width: `${Math.round(ratio * 100)}%`,
                  height: "100%",
                  background: tierBgGradient(meta.tone),
                  transition: "width 700ms cubic-bezier(0.4, 0, 0.2, 1)",
                }}
              />
            </div>
          </div>
        ) : null}

        {/* Actions */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={openSandbox}
            style={{
              flex: 1,
              minWidth: 140,
              padding: "12px 16px",
              background: "linear-gradient(135deg, #EF9F27 0%, #BA7517 100%)",
              color: "white",
              border: "none",
              borderRadius: 12,
              fontSize: 13,
              fontWeight: 700,
              fontFamily: "Syne, serif",
              cursor: "pointer",
              boxShadow: "0 4px 14px rgba(186,117,23,0.40)",
            }}
          >
            🎮 Calcule ta remise
          </button>
          {isNone ? (
            <button
              type="button"
              onClick={openSponsorLink}
              style={{
                flex: 1,
                minWidth: 140,
                padding: "12px 16px",
                background: "white",
                color: "#5C4A0F",
                border: "0.5px solid rgba(184,146,42,0.45)",
                borderRadius: 12,
                fontSize: 13,
                fontWeight: 700,
                fontFamily: "Syne, serif",
                cursor: "pointer",
              }}
            >
              ✨ M&apos;inscrire (myherbalife.com)
            </button>
          ) : null}
        </div>

        {coachHerbalifeId && isNone ? (
          <p
            style={{
              fontSize: 10,
              color: "#888",
              marginTop: 10,
              textAlign: "center",
              fontStyle: "italic",
            }}
          >
            💡 ID sponsor à utiliser : <strong>{coachHerbalifeId}</strong> + 3 premières lettres du nom de {coachName}
          </p>
        ) : null}
      </div>

      {/* Sandbox modal */}
      {sandboxOpen ? (
        <ClientVipSandbox
          token={token}
          currentLevel={status.data.level}
          coachName={coachName}
          coachHerbalifeId={coachHerbalifeId}
          onClose={() => setSandboxOpen(false)}
        />
      ) : null}
    </>
  );
}

function nextLevelLabel(current: string): string {
  switch (current) {
    case "none":
      return "Bronze";
    case "bronze":
      return "Silver";
    case "silver":
      return "Gold";
    case "gold":
      return "Ambassadeur";
    default:
      return "Bronze";
  }
}

function tierBgGradient(tone: string): string {
  switch (tone) {
    case "bronze":
      return "linear-gradient(135deg, #DA9E5C 0%, #B87333 100%)";
    case "silver":
      return "linear-gradient(135deg, #D1D5DB 0%, #9CA3AF 100%)";
    case "gold":
      return "linear-gradient(135deg, #FFE873 0%, #C9A84C 50%, #B8922A 100%)";
    case "diamond":
      return "linear-gradient(135deg, #C084FC 0%, #9333EA 50%, #7C3AED 100%)";
    default:
      return "linear-gradient(135deg, #E5E7EB 0%, #9CA3AF 100%)";
  }
}
