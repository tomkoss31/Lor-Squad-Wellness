// =============================================================================
// ClubVipPresentation — présentation "Club VIP & Recommandations" dans la PWA
// client (onglet Recommander). Chantier VIP 2026-06-09, refonte VIP-1 2026-06-10.
//
// Objectif (brief Thomas) : INFORMER de ce qui est possible — paliers de remise
// CLIENT (15→35 %, plafond Client Privilégié) + effet cumulé des recommandations
// sur PLUSIEURS MOIS. Message clé : « tu ne vends rien, tu en parles comme d'un
// bon resto — sauf que là tu empoches la remise ».
//
// Refonte VIP-1 (décisions Thomas 2026-06-10) :
//   1. Échelle plafonnée à 35 % (vrai plafond Client Privilégié). 42-50 % =
//      passer distributeur → marche d'évolution distincte "ouvre vers +".
//   2. Simulateur MULTI-MOIS : frise M1 (toi) → M2 (+ tes proches) → M3 (tout
//      le monde reconsomme) = PV cumulés → remise → gain €.
//   3. Loupe "c'est quoi 130 PV ?" → panier-type d'un mois (vrais PV catalogue).
//
// Bloc dark premium immersif (contraste avec l'app cliente claire).
// CTA final = formulaire de partage de contact au coach (dans ClientAppPage).
// =============================================================================

import { useMemo, useState } from "react";

// 1 proche qui démarre ≈ +130 PV / mois (panier-type, cf. loupe ci-dessous).
const FRIEND_PV = 130;
// Nutrition de référence pour le calcul du gain : ~200 € retail / mois.
// Le gain CLIENT = l'économie sur SA propre nutrition quand sa remise grimpe
// (pas une commission — ça, c'est le modèle distributeur, cf. marche 42-50 %).
const REF_RETAIL = 200;
// Horizon du simulateur multi-mois.
const MONTHS = 3;

interface Tier {
  pct: number;
  min: number;
  label: string;
  emoji: string;
}
// Paliers CLIENT (Préféré / Client Privilégié) — plafond 35 % (décision Thomas
// 2026-06-10). Au-delà (42-50 %) = passer distributeur, cf. DISTRI_STEP.
const CLIENT_TIERS: Tier[] = [
  { pct: 15, min: 0, label: "Préféré · tu démarres", emoji: "🙂" },
  { pct: 25, min: 100, label: "Préféré · tu es régulier·e", emoji: "😃" },
  { pct: 35, min: 250, label: "Préféré · le max client", emoji: "🤩" },
];
const CLIENT_MAX_PCT = 35;

// Panier-type d'un mois ≈ 130 PV (vrais PV du catalogue herbalifeCatalog.ts).
// L'alternative entre () montre qu'on peut adapter selon le profil (sans
// surcharger l'affichage).
const BASKET_130: { emoji: string; name: string; pv: number }[] = [
  { emoji: "🥤", name: "Formula 1 — ton repas équilibré", pv: 32.75 },
  { emoji: "💪", name: "Protéines PDM (ou créatine)", pv: 17.95 },
  { emoji: "🌿", name: "Aloé Vera (ou immune booster)", pv: 24.95 },
  { emoji: "🍵", name: "Thé concentré — énergie", pv: 34.95 },
  { emoji: "🌾", name: "Multi-Fibres (ou phyto complet)", pv: 22.95 },
];

function tierForPv(pv: number): Tier {
  let cur = CLIENT_TIERS[0];
  for (const t of CLIENT_TIERS) if (pv >= t.min) cur = t;
  return cur;
}
function nextTier(pv: number): Tier | null {
  return CLIENT_TIERS.find((t) => t.min > pv) ?? null;
}
// PV cumulés au mois `m` : toi chaque mois + tes proches qui rejoignent à M2
// et reconsomment chaque mois suivant.
function cumulativePv(currentPv: number, friends: number, month: number): number {
  const youPv = currentPv * month;
  const friendsActiveMonths = Math.max(0, month - 1);
  return Math.round(youPv + friends * FRIEND_PV * friendsActiveMonths);
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
  // Simulateur : nb de proches qui rejoignent à M2.
  const [friends, setFriends] = useState(3);
  // Loupe "c'est quoi 130 PV ?".
  const [showBasket, setShowBasket] = useState(false);

  // Frise M1 → M2 → M3.
  const timeline = useMemo(
    () =>
      Array.from({ length: MONTHS }, (_, i) => {
        const month = i + 1;
        const pv = cumulativePv(currentPv, friends, month);
        return { month, pv, tier: tierForPv(pv) };
      }),
    [currentPv, friends],
  );

  const finalPv = timeline[timeline.length - 1].pv;
  const finalTier = timeline[timeline.length - 1].tier;
  const atClientMax = finalTier.pct >= CLIENT_MAX_PCT;
  const next = nextTier(finalPv);
  // Gain CLIENT = économie mensuelle sur sa propre nutrition au palier atteint,
  // + le surplus gagné par rapport à son palier de départ (mois 1, sans proches).
  const startTier = useMemo(() => tierForPv(currentPv), [currentPv]);
  const savingFinal = Math.round((finalTier.pct / 100) * REF_RETAIL);
  const savingStart = Math.round((startTier.pct / 100) * REF_RETAIL);
  const savingDelta = Math.max(0, savingFinal - savingStart);
  const basketTotal = Math.round(BASKET_130.reduce((s, p) => s + p.pv, 0));

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

      {/* ── L'ESCALIER DES PALIERS CLIENT (plafond 35 %) ───────────────── */}
      <div style={{ padding: "4px 16px 6px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
          {CLIENT_TIERS.map((t) => {
            const active = t.pct === finalTier.pct;
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
                  <div style={{ fontSize: 11, color: C.muted }}>à partir de {t.min} PV</div>
                </div>
                {active ? (
                  <span style={{ fontSize: 11, fontWeight: 700, color: C.emerald }}>TOI ICI</span>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── MARCHE DISTRIBUTEUR : on ouvre vers + (42-50 %) ─────────────── */}
      <div style={{ padding: "0 16px 16px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "11px 14px",
            borderRadius: 12,
            background: `color-mix(in srgb, ${C.gold} 10%, ${C.ink2})`,
            border: `1px dashed color-mix(in srgb, ${C.gold} 40%, transparent)`,
          }}
        >
          <span style={{ fontSize: 20, width: 26, textAlign: "center" }} aria-hidden="true">
            🚀
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.gold }}>
              Tu veux aller plus loin&nbsp;? -42 % à -50 %
            </div>
            <div style={{ fontSize: 11, color: C.muted, lineHeight: 1.5 }}>
              C'est possible en passant distributeur — {coachName} t'explique tout quand tu veux.
            </div>
          </div>
        </div>
      </div>

      {/* ── SIMULATEUR MULTI-MOIS : M1 → M2 → M3 ───────────────────────── */}
      <div style={{ margin: "0 16px 16px", padding: 16, borderRadius: 14, background: C.ink2, border: `1px solid ${C.hair}` }}>
        <div style={{ fontFamily: "Sora, system-ui, sans-serif", fontSize: 14, fontWeight: 700, marginBottom: 4 }}>
          🧮 L'effet cumulé, mois après mois
        </div>
        <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.5, marginBottom: 6 }}>
          Toi ce mois-ci. Tes proches qui rejoignent le mois prochain. Puis tout
          le monde qui reconsomme. Chaque proche ≈{" "}
          <strong style={{ color: C.cream }}>+{FRIEND_PV} PV</strong>
          <button
            type="button"
            onClick={() => setShowBasket((s) => !s)}
            aria-label="C'est quoi 130 PV ?"
            aria-expanded={showBasket}
            style={loupeBtn}
          >
            🔍
          </button>
          .
        </div>

        {/* Loupe : c'est quoi 130 PV ? */}
        {showBasket ? (
          <div
            style={{
              margin: "0 0 14px",
              padding: "12px 14px",
              borderRadius: 12,
              background: `color-mix(in srgb, ${C.gold} 8%, ${C.ink})`,
              border: `1px solid color-mix(in srgb, ${C.gold} 28%, transparent)`,
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 700, color: C.gold, marginBottom: 8 }}>
              130 PV, c'est à peu près un mois de programme complet&nbsp;:
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {BASKET_130.map((p) => (
                <div key={p.name} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
                  <span aria-hidden="true">{p.emoji}</span>
                  <span style={{ flex: 1, color: "rgba(248,250,252,0.85)" }}>{p.name}</span>
                  <span style={{ color: C.muted, fontVariantNumeric: "tabular-nums" }}>
                    {p.pv.toFixed(2).replace(".", ",")} PV
                  </span>
                </div>
              ))}
            </div>
            <div
              style={{
                marginTop: 8,
                paddingTop: 8,
                borderTop: `1px solid ${C.hair}`,
                display: "flex",
                justifyContent: "space-between",
                fontSize: 12.5,
                fontWeight: 700,
              }}
            >
              <span>≈ un mois de nutrition</span>
              <span style={{ color: C.gold }}>≈ {basketTotal} PV</span>
            </div>
          </div>
        ) : null}

        {/* Compteur proches */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 14, marginBottom: 14 }}>
          <button
            type="button"
            onClick={() => setFriends((f) => Math.max(0, f - 1))}
            aria-label="Retirer un proche"
            style={stepBtn}
          >
            −
          </button>
          <div style={{ textAlign: "center", minWidth: 130 }}>
            <div style={{ fontSize: 26 }} aria-hidden="true">
              {"🙂".repeat(Math.min(friends, 6)) || "—"}
            </div>
            <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>
              {friends} proche{friends > 1 ? "s" : ""} qui en parle{friends > 1 ? "nt" : ""}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setFriends((f) => Math.min(20, f + 1))}
            aria-label="Ajouter un proche"
            style={{ ...stepBtn, background: C.emerald, color: "#04231a", borderColor: C.emerald }}
          >
            +
          </button>
        </div>

        {/* Frise M1 → M2 → M3 */}
        <div style={{ display: "flex", alignItems: "stretch", gap: 8, marginBottom: 14 }}>
          {timeline.map((m, i) => {
            const isLast = i === timeline.length - 1;
            return (
              <div
                key={m.month}
                style={{
                  flex: 1,
                  padding: "12px 8px",
                  borderRadius: 12,
                  textAlign: "center",
                  background: isLast
                    ? `linear-gradient(135deg, color-mix(in srgb, ${C.emerald} 20%, ${C.ink}), color-mix(in srgb, ${C.cyan} 16%, ${C.ink}))`
                    : C.ink,
                  border: `1px solid ${isLast ? "color-mix(in srgb, " + C.emerald + " 45%, transparent)" : C.hair}`,
                }}
              >
                <div style={{ fontSize: 11, color: C.muted, fontWeight: 700, letterSpacing: 0.5 }}>
                  MOIS {m.month}
                </div>
                <div style={{ fontSize: 10.5, color: C.muted, margin: "1px 0 6px" }}>
                  {m.month === 1 ? "toi" : m.month === 2 ? "+ tes proches" : "tout le monde"}
                </div>
                <div
                  style={{
                    fontFamily: "Sora, system-ui, sans-serif",
                    fontSize: 20,
                    fontWeight: 800,
                    color: C.cream,
                    lineHeight: 1,
                  }}
                >
                  -{m.tier.pct}%
                </div>
                <div style={{ fontSize: 10.5, color: C.gold, marginTop: 4, fontVariantNumeric: "tabular-nums" }}>
                  {m.pv} PV
                </div>
              </div>
            );
          })}
        </div>

        {/* Résultat final */}
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
            <div style={{ fontSize: 11, color: C.muted }}>Ta remise après {MONTHS} mois</div>
            <div style={{ fontFamily: "Sora, system-ui, sans-serif", fontSize: 30, fontWeight: 800, color: C.cream, lineHeight: 1 }}>
              -{finalTier.pct}%
            </div>
          </div>
          <div style={{ textAlign: "right", fontSize: 12, color: C.muted, maxWidth: 170 }}>
            {atClientMax ? (
              <>
                <strong style={{ color: C.gold }}>Le max client&nbsp;! 🏆</strong>
                <br />
                Pour aller plus loin&nbsp;: passe distributeur.
              </>
            ) : next ? (
              <>
                Plus que <strong style={{ color: C.gold }}>≈{next.min - finalPv} PV</strong> pour
                passer à <strong style={{ color: C.cream }}>-{next.pct}%</strong>
              </>
            ) : null}
          </div>
        </div>

        <div style={{ fontSize: 10.5, color: "rgba(248,250,252,0.4)", marginTop: 8, textAlign: "center", lineHeight: 1.5 }}>
          Base&nbsp;: ta consommation ≈ {Math.round(currentPv)} PV/mois · estimation indicative.
          Les paliers Herbalife se qualifient sur une fenêtre glissante — ton coach
          confirme ta remise exacte.
        </div>
      </div>

      {/* ── LE GAIN (sans rien vendre) ─────────────────────────────────── */}
      <div style={{ margin: "0 16px 16px", padding: 16, borderRadius: 14, background: `color-mix(in srgb, ${C.coral} 12%, ${C.ink2})`, border: `1px solid color-mix(in srgb, ${C.coral} 30%, transparent)` }}>
        <div style={{ fontFamily: "Sora, system-ui, sans-serif", fontSize: 14, fontWeight: 700, marginBottom: 6 }}>
          💸 Ce que ça te fait économiser
        </div>
        <div style={{ fontSize: 12.5, color: "rgba(248,250,252,0.85)", lineHeight: 1.6 }}>
          À <strong>-{finalTier.pct}%</strong>, sur une nutrition à ~{REF_RETAIL} €/mois, ta remise
          vaut <strong style={{ color: C.coral }}>≈ {savingFinal} € chaque mois</strong> dans ta poche.{" "}
          {savingDelta > 0 ? (
            <>
              Grâce à tes {friends} proche{friends > 1 ? "s" : ""}, c'est{" "}
              <strong style={{ color: C.coral }}>≈ {savingDelta} €/mois de plus qu'aujourd'hui</strong> —
              sans rien vendre, juste en partageant ce qui marche pour toi.
            </>
          ) : (
            <>Ajoute des proches ci-dessus&nbsp;: ta remise grimpe, ton panier baisse.</>
          )}
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

const loupeBtn: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 22,
  height: 22,
  marginLeft: 5,
  padding: 0,
  borderRadius: 7,
  background: "rgba(229,201,125,0.16)",
  border: "1px solid rgba(229,201,125,0.4)",
  fontSize: 11,
  cursor: "pointer",
  verticalAlign: "middle",
  lineHeight: 1,
};
