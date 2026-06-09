// =============================================================================
// ClubVipPresentation — présentation "Club VIP & Recommandations" dans la PWA
// client (onglet Recommander). Chantier VIP 2026-06-09.
//
// Objectif (brief Thomas) : INFORMER de ce qui est possible — paliers de remise
// (15→50 %) + effet cumulé des recommandations (toi + un ami + un collègue).
// Message clé : « tu ne vends rien, tu en parles comme d'un bon resto — sauf que
// là tu empoches la remise ». Outil : simulateur « où j'en suis / quelle remise
// je veux ». Source chiffres : PDF Client VIP / Quick Start 2026.
//
// Bloc dark premium immersif (contraste avec l'app cliente claire) — effet
// "reveal". CTA final = le formulaire de partage de contact au coach (déjà
// présent dans ClientAppPage, on y scrolle).
// =============================================================================

import { useMemo, useState } from "react";

// 1 ami parrainé ≈ +130 PV (Booster pack du PDF).
const FRIEND_PV = 130;
// Programme de référence pour l'exemple de gain (PDF : ~200 € → net 15 %).
const EXAMPLE_NET = 170;

interface Tier {
  pct: number;
  min: number;
  label: string;
  emoji: string;
}
const TIERS: Tier[] = [
  { pct: 15, min: 0, label: "Je démarre", emoji: "🙂" },
  { pct: 25, min: 100, label: "Je suis régulier·e", emoji: "😉" },
  { pct: 35, min: 500, label: "J'en parle autour de moi", emoji: "😃" },
  { pct: 42, min: 1000, label: "Je suis lancé·e", emoji: "🤩" },
  { pct: 50, min: 2500, label: "Le maximum", emoji: "🏆" },
];

function tierForPv(pv: number): Tier {
  let cur = TIERS[0];
  for (const t of TIERS) if (pv >= t.min) cur = t;
  return cur;
}
function nextTier(pv: number): Tier | null {
  return TIERS.find((t) => t.min > pv) ?? null;
}

const C = {
  ink: "#0B1220",
  ink2: "#111A2B",
  cream: "#F8FAFC",
  muted: "rgba(248,250,252,0.62)",
  hair: "rgba(248,250,252,0.12)",
  emerald: "#10B981",
  cyan: "#06B6D4",
  gold: "#E5C97D",
  coral: "#FB7185",
};

export function ClubVipPresentation({
  currentPv,
  coachName,
  onShareContact,
}: {
  currentPv: number;
  coachName: string;
  onShareContact: () => void;
}) {
  // Simulateur : nb d'amis ajoutés mentalement.
  const [friends, setFriends] = useState(0);
  const simulatedPv = currentPv + friends * FRIEND_PV;
  const tier = useMemo(() => tierForPv(simulatedPv), [simulatedPv]);
  const next = useMemo(() => nextTier(simulatedPv), [simulatedPv]);
  const pvToNext = next ? next.min - simulatedPv : 0;
  const friendsToNext = next ? Math.ceil(pvToNext / FRIEND_PV) : 0;
  const gainPerFriend = Math.round(((tier.pct - 15) / 100) * EXAMPLE_NET);

  return (
    <div
      style={{
        borderRadius: 18,
        overflow: "hidden",
        background: `radial-gradient(circle at 15% 0%, rgba(16,185,129,0.18), transparent 45%), radial-gradient(circle at 90% 100%, rgba(6,182,212,0.16), transparent 45%), ${C.ink}`,
        color: C.cream,
        border: `1px solid ${C.hair}`,
        boxShadow: "0 12px 40px rgba(0,0,0,0.25)",
      }}
    >
      {/* ── HERO : le hook ─────────────────────────────────────────────── */}
      <div style={{ padding: "26px 20px 18px", textAlign: "center" }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 7,
            padding: "5px 13px",
            borderRadius: 999,
            background: `color-mix(in srgb, ${C.gold} 16%, transparent)`,
            border: `1px solid color-mix(in srgb, ${C.gold} 40%, transparent)`,
            color: C.gold,
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: 1.5,
            textTransform: "uppercase",
            fontFamily: "Sora, system-ui, sans-serif",
          }}
        >
          👑 Club VIP
        </div>
        <h2
          style={{
            fontFamily: "Sora, system-ui, sans-serif",
            fontSize: "clamp(24px, 7vw, 30px)",
            fontWeight: 800,
            lineHeight: 1.1,
            margin: "14px 0 8px",
          }}
        >
          Quelle remise{" "}
          <span
            style={{
              background: `linear-gradient(135deg, ${C.emerald}, ${C.cyan})`,
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            veux-tu
          </span>{" "}
          ?
        </h2>
        <p style={{ fontSize: 13.5, color: C.muted, lineHeight: 1.6, maxWidth: 340, margin: "0 auto" }}>
          Tu ne vends rien. Tu en parles, comme d'un bon resto ou d'un bon film.
          Sauf que là… <strong style={{ color: C.cream }}>tu empoches la remise sur ta nutrition.</strong>
        </p>
      </div>

      {/* ── L'ESCALIER DES PALIERS ─────────────────────────────────────── */}
      <div style={{ padding: "4px 16px 18px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
          {TIERS.map((t) => {
            const active = t.pct === tier.pct;
            return (
              <div
                key={t.pct}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "11px 14px",
                  borderRadius: 12,
                  background: active
                    ? `linear-gradient(135deg, color-mix(in srgb, ${C.emerald} 22%, ${C.ink2}), color-mix(in srgb, ${C.cyan} 18%, ${C.ink2}))`
                    : C.ink2,
                  border: `1px solid ${active ? "color-mix(in srgb, " + C.emerald + " 55%, transparent)" : C.hair}`,
                  transform: active ? "scale(1.015)" : "none",
                  transition: "all 0.2s",
                }}
              >
                <span style={{ fontSize: 22, width: 26, textAlign: "center" }} aria-hidden="true">
                  {t.emoji}
                </span>
                <div
                  style={{
                    fontFamily: "Sora, system-ui, sans-serif",
                    fontSize: 22,
                    fontWeight: 800,
                    color: active ? C.cream : C.gold,
                    minWidth: 62,
                  }}
                >
                  -{t.pct}%
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.cream }}>{t.label}</div>
                  <div style={{ fontSize: 11, color: C.muted }}>
                    à partir de {t.min} PV
                  </div>
                </div>
                {active ? (
                  <span style={{ fontSize: 11, fontWeight: 700, color: C.emerald }}>TOI ICI</span>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── SIMULATEUR : effet cumulé toi + amis ───────────────────────── */}
      <div style={{ margin: "0 16px 16px", padding: 16, borderRadius: 14, background: C.ink2, border: `1px solid ${C.hair}` }}>
        <div style={{ fontFamily: "Sora, system-ui, sans-serif", fontSize: 14, fontWeight: 700, marginBottom: 4 }}>
          🧮 L'effet cumulé
        </div>
        <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.5, marginBottom: 14 }}>
          Toi + un ami + une collègue… Chaque proche qui rejoint via toi ≈{" "}
          <strong style={{ color: C.cream }}>+{FRIEND_PV} PV</strong>. Regarde ta remise grimper :
        </div>

        {/* Compteur amis */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 14, marginBottom: 14 }}>
          <button
            type="button"
            onClick={() => setFriends((f) => Math.max(0, f - 1))}
            aria-label="Retirer un ami"
            style={stepBtn}
          >
            −
          </button>
          <div style={{ textAlign: "center", minWidth: 120 }}>
            <div style={{ fontSize: 26 }} aria-hidden="true">
              {"🙂".repeat(Math.min(friends, 6)) || "—"}
            </div>
            <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>
              {friends} ami{friends > 1 ? "s" : ""} qui en parlent
            </div>
          </div>
          <button
            type="button"
            onClick={() => setFriends((f) => Math.min(20, f + 1))}
            aria-label="Ajouter un ami"
            style={{ ...stepBtn, background: C.emerald, color: "#04231a", borderColor: C.emerald }}
          >
            +
          </button>
        </div>

        {/* Résultat */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "12px 16px",
            borderRadius: 12,
            background: `linear-gradient(135deg, color-mix(in srgb, ${C.emerald} 18%, transparent), color-mix(in srgb, ${C.cyan} 14%, transparent))`,
            border: `1px solid color-mix(in srgb, ${C.emerald} 40%, transparent)`,
          }}
        >
          <div>
            <div style={{ fontSize: 11, color: C.muted }}>Ta remise simulée</div>
            <div style={{ fontFamily: "Sora, system-ui, sans-serif", fontSize: 30, fontWeight: 800, color: C.cream, lineHeight: 1 }}>
              -{tier.pct}%
            </div>
          </div>
          <div style={{ textAlign: "right", fontSize: 12, color: C.muted, maxWidth: 160 }}>
            {next ? (
              <>
                Plus que <strong style={{ color: C.gold }}>{friendsToNext} ami{friendsToNext > 1 ? "s" : ""}</strong>{" "}
                (≈{pvToNext} PV) pour passer à <strong style={{ color: C.cream }}>-{next.pct}%</strong>
              </>
            ) : (
              <strong style={{ color: C.gold }}>Tu es au maximum 🏆</strong>
            )}
          </div>
        </div>

        <div style={{ fontSize: 10.5, color: "rgba(248,250,252,0.4)", marginTop: 8, textAlign: "center" }}>
          Base : ta consommation actuelle ≈ {currentPv} PV · estimation indicative
        </div>
      </div>

      {/* ── LE GAIN (sans rien vendre) ─────────────────────────────────── */}
      <div style={{ margin: "0 16px 16px", padding: 16, borderRadius: 14, background: `color-mix(in srgb, ${C.coral} 12%, ${C.ink2})`, border: `1px solid color-mix(in srgb, ${C.coral} 30%, transparent)` }}>
        <div style={{ fontFamily: "Sora, system-ui, sans-serif", fontSize: 14, fontWeight: 700, marginBottom: 6 }}>
          💸 Et tu peux même y gagner
        </div>
        <div style={{ fontSize: 12.5, color: "rgba(248,250,252,0.85)", lineHeight: 1.6 }}>
          À <strong>-{tier.pct}%</strong>, chaque proche que tu parraines te fait
          empocher l'écart de remise — soit{" "}
          <strong style={{ color: C.coral }}>≈ {gainPerFriend > 0 ? gainPerFriend : 17} € par personne</strong>, sur sa
          nutrition. Sans rien vendre, juste en partageant ce qui marche pour toi.
        </div>
      </div>

      {/* ── CTA → formulaire de partage au coach ───────────────────────── */}
      <div style={{ padding: "0 16px 22px" }}>
        <button
          type="button"
          onClick={onShareContact}
          style={{
            width: "100%",
            padding: "15px 20px",
            borderRadius: 14,
            border: "none",
            background: `linear-gradient(135deg, ${C.emerald}, ${C.cyan})`,
            color: "#04231a",
            fontFamily: "Sora, system-ui, sans-serif",
            fontSize: 15,
            fontWeight: 800,
            cursor: "pointer",
            boxShadow: `0 10px 26px color-mix(in srgb, ${C.emerald} 35%, transparent)`,
          }}
        >
          Partager un proche à {coachName} →
        </button>
        <div style={{ fontSize: 11, color: C.muted, textAlign: "center", marginTop: 8 }}>
          Donne juste un prénom + un contact. {coachName} s'occupe du reste.
        </div>
      </div>
    </div>
  );
}

const stepBtn: React.CSSProperties = {
  width: 44,
  height: 44,
  borderRadius: 12,
  background: "rgba(248,250,252,0.08)",
  border: "1px solid rgba(248,250,252,0.18)",
  color: "#F8FAFC",
  fontSize: 22,
  fontWeight: 700,
  cursor: "pointer",
  lineHeight: 1,
};
