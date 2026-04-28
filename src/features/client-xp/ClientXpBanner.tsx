// =============================================================================
// ClientXpBanner — bandeau premium gold sur l'Accueil (Tier B, 2026-04-28)
// =============================================================================
//
// Bandeau qui affiche le niveau client + barre XP + XP restant pour le
// prochain palier. Click → ouvre un panel "Comment ça marche ?" pliable
// avec liste des actions XP par categorie.
//
// 100 % style premium (gradient gold + glow + animation).
// =============================================================================

import { useMemo, useState } from "react";
import {
  CLIENT_XP_ACTIONS,
  CLIENT_XP_LEVELS,
  type ClientXpActionDef,
} from "./actions";
import { useClientXp } from "./useClientXp";

interface Props {
  token: string | undefined;
}

const CATEGORY_LABELS: Record<ClientXpActionDef["category"], string> = {
  discover: "Découverte",
  daily: "Tous les jours",
  engage: "Engagement",
  milestone: "Étapes-clés",
};

export function ClientXpBanner({ token }: Props) {
  const xp = useClientXp(token);
  const [showHelp, setShowHelp] = useState(false);

  const range = xp.nextThreshold - xp.prevThreshold;
  const pct = range === 0 ? 100 : Math.min(100, Math.max(0, Math.round((xp.xpInLevel / range) * 100)));

  const currentLevelDef = useMemo(
    () => CLIENT_XP_LEVELS.find((l) => l.level === xp.level) ?? CLIENT_XP_LEVELS[0],
    [xp.level],
  );

  const grouped = useMemo(() => {
    const map: Record<string, ClientXpActionDef[]> = {
      discover: [],
      daily: [],
      engage: [],
      milestone: [],
    };
    CLIENT_XP_ACTIONS.forEach((a) => {
      map[a.category].push(a);
    });
    return map;
  }, []);

  if (!xp.loaded) {
    return null;
  }

  return (
    <div
      style={{
        background:
          "linear-gradient(135deg, rgba(255,255,255,1) 0%, rgba(250,246,232,0.95) 70%, rgba(252,229,193,0.95) 100%)",
        border: "0.5px solid rgba(184,146,42,0.40)",
        borderRadius: 18,
        padding: 16,
        marginBottom: 16,
        boxShadow: "0 6px 18px rgba(184,146,42,0.15)",
        position: "relative",
        overflow: "hidden",
        fontFamily: "DM Sans, sans-serif",
      }}
    >
      {/* Glow gold subtle en haut a droite */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          top: -40,
          right: -40,
          width: 120,
          height: 120,
          background:
            "radial-gradient(circle, rgba(239,159,39,0.25) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      {/* Header : badge + niveau + total XP */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 12,
          position: "relative",
        }}
      >
        {/* Badge tier */}
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 14,
            background:
              "linear-gradient(135deg, #FFE873 0%, #C9A84C 50%, #B8922A 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 26,
            boxShadow:
              "0 4px 14px rgba(184,146,42,0.40), inset 0 1px 0 rgba(255,255,255,0.5)",
            flexShrink: 0,
          }}
        >
          {currentLevelDef.badge}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 9,
              letterSpacing: 1.8,
              textTransform: "uppercase",
              color: "#B8922A",
              fontWeight: 700,
              marginBottom: 2,
            }}
          >
            Ta progression
          </div>
          <div
            style={{
              fontFamily: "Syne, serif",
              fontWeight: 700,
              fontSize: 18,
              color: "#5C4A0F",
              lineHeight: 1.1,
            }}
          >
            Niveau {xp.level} · {xp.levelTitle}
          </div>
        </div>
        {/* Total XP pill */}
        <div
          style={{
            background:
              "linear-gradient(135deg, #EF9F27 0%, #BA7517 100%)",
            color: "white",
            padding: "8px 14px",
            borderRadius: 12,
            fontSize: 15,
            fontWeight: 800,
            fontFamily: "Syne, serif",
            boxShadow: "0 4px 12px rgba(186,117,23,0.35)",
            flexShrink: 0,
          }}
        >
          {xp.totalXp.toLocaleString("fr-FR")} XP
        </div>
      </div>

      {/* Progression bar */}
      <div style={{ marginBottom: 8 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 11,
            color: "#5C4A0F",
            marginBottom: 5,
            fontFamily: "DM Sans, sans-serif",
          }}
        >
          <span style={{ fontWeight: 600 }}>
            {xp.xpInLevel} / {range} XP
          </span>
          <span>
            {xp.xpToNext > 0
              ? `${xp.xpToNext} XP pour le niveau ${xp.level + 1}`
              : "Niveau max atteint 🎉"}
          </span>
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
              width: `${pct}%`,
              height: "100%",
              background:
                "linear-gradient(90deg, #B8922A 0%, #EF9F27 60%, #FFE873 100%)",
              transition: "width 700ms cubic-bezier(0.4, 0, 0.2, 1)",
              boxShadow: "0 0 10px rgba(239,159,39,0.55)",
            }}
          />
        </div>
      </div>

      {/* Help toggle */}
      <button
        type="button"
        onClick={() => setShowHelp((v) => !v)}
        style={{
          background: "transparent",
          border: "none",
          color: "#6B6B62",
          fontSize: 11,
          cursor: "pointer",
          padding: 0,
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          fontFamily: "DM Sans, sans-serif",
          fontWeight: 600,
          marginTop: 4,
        }}
      >
        ℹ️ Comment gagner des XP ?
        <span style={{ fontSize: 9 }}>{showHelp ? "▲" : "▼"}</span>
      </button>

      {showHelp ? (
        <div
          style={{
            marginTop: 12,
            paddingTop: 12,
            borderTop: "0.5px dashed rgba(184,146,42,0.30)",
          }}
        >
          {/* Niveaux */}
          <div
            style={{
              fontSize: 10,
              letterSpacing: 1.4,
              textTransform: "uppercase",
              color: "#B8922A",
              fontWeight: 700,
              marginBottom: 8,
            }}
          >
            Les 5 niveaux
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 14 }}>
            {CLIENT_XP_LEVELS.map((lv) => {
              const isCurrent = lv.level === xp.level;
              const isReached = xp.totalXp >= lv.threshold;
              return (
                <div
                  key={lv.level}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "5px 9px",
                    background: isCurrent
                      ? "rgba(184,146,42,0.14)"
                      : "rgba(255,255,255,0.5)",
                    border: isCurrent
                      ? "0.5px solid rgba(184,146,42,0.60)"
                      : "0.5px solid rgba(184,146,42,0.15)",
                    borderRadius: 7,
                    opacity: isReached ? 1 : 0.5,
                  }}
                >
                  <span style={{ fontSize: 14 }}>{lv.badge}</span>
                  <span
                    style={{
                      fontFamily: "Syne, serif",
                      fontWeight: 700,
                      fontSize: 11,
                      color: isCurrent ? "#5C4A0F" : "#6B6B62",
                      width: 110,
                      flexShrink: 0,
                    }}
                  >
                    {lv.title}
                  </span>
                  <span style={{ fontSize: 10, color: "#6B6B62", flex: 1 }}>
                    {lv.hint}
                  </span>
                  <span
                    style={{
                      fontSize: 10,
                      color: "#888",
                      fontFamily: "DM Sans, sans-serif",
                      fontWeight: 600,
                    }}
                  >
                    {lv.threshold === 0 ? "—" : `${lv.threshold} XP`}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Actions */}
          {(["discover", "daily", "engage", "milestone"] as const).map(
            (cat) => {
              const items = grouped[cat];
              if (items.length === 0) return null;
              return (
                <div key={cat} style={{ marginBottom: 12 }}>
                  <div
                    style={{
                      fontSize: 10,
                      letterSpacing: 1.4,
                      textTransform: "uppercase",
                      color: "#B8922A",
                      fontWeight: 700,
                      marginBottom: 6,
                    }}
                  >
                    {CATEGORY_LABELS[cat]}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    {items.map((a) => (
                      <div
                        key={a.key}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          padding: "5px 9px",
                          background: "rgba(255,255,255,0.5)",
                          borderRadius: 7,
                        }}
                      >
                        <span style={{ fontSize: 14, flexShrink: 0 }}>
                          {a.emoji}
                        </span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              fontSize: 11,
                              fontWeight: 600,
                              color: "#374151",
                              fontFamily: "DM Sans, sans-serif",
                            }}
                          >
                            {a.label}
                          </div>
                          <div
                            style={{
                              fontSize: 9,
                              color: "#888",
                            }}
                          >
                            {capLabel(a.cap)}
                          </div>
                        </div>
                        <span
                          style={{
                            fontFamily: "Syne, serif",
                            fontSize: 12,
                            fontWeight: 700,
                            color: "#B8922A",
                            flexShrink: 0,
                          }}
                        >
                          +{a.xp} XP
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            },
          )}

          <p
            style={{
              fontSize: 10,
              color: "#888",
              fontStyle: "italic",
              margin: "8px 0 0",
              lineHeight: 1.5,
            }}
          >
            Les XP sont calculés en live à chaque action. Pas de drift, pas de
            triche.
          </p>
        </div>
      ) : null}
    </div>
  );
}

function capLabel(cap: ClientXpActionDef["cap"]): string {
  switch (cap) {
    case "lifetime":
      return "Une fois";
    case "daily":
      return "1× par jour";
    case "weekly":
      return "1× par semaine";
    case "none":
      return "Sans limite";
  }
}
