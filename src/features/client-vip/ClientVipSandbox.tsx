// =============================================================================
// ClientVipSandbox — calculateur interactif de remise (Tier B Premium VIP)
// =============================================================================
//
// Modal full-screen qui guide le client en 3 etapes :
//   1. "Combien d'amis tu vas recommander ?" (slider 0-10)
//   2. "Combien de PV/mois en moyenne ?" (slider 50-300)
//   3. "Combien de mois ?" (slider 1-12)
//
// → Calcul live :
//   - PV cumulés (toi + tes filleuls)
//   - Niveau atteint + remise
//   - €€ économisés / an estimés
//   - Visualisation arbre dynamique
//
// Etape finale : form "Mes prospects à recommander" (3-5 prénoms).
// → Insert via record_client_referral_intention RPC.
// → +30 XP via vip_intentions_filled (proxy : intentions_filled).
// =============================================================================

import { useMemo, useState } from "react";
import { recordClientXp } from "../client-xp/useClientXp";
import {
  recordVipIntention,
  VIP_LEVELS,
  type VipLevel,
} from "./useClientVip";

interface Props {
  token: string;
  currentLevel: VipLevel;
  coachName?: string;
  coachHerbalifeId?: string | null;
  onClose: () => void;
}

type Step = "calculator" | "prospects" | "done";

interface Prospect {
  firstName: string;
  relationship: string;
  notes: string;
}

const RELATIONSHIPS = [
  { id: "family", label: "Famille", emoji: "👨‍👩‍👧" },
  { id: "work", label: "Travail", emoji: "💼" },
  { id: "sport", label: "Sport", emoji: "🏃" },
  { id: "friend", label: "Ami.e", emoji: "👫" },
  { id: "other", label: "Autre", emoji: "🤝" },
];

export function ClientVipSandbox({
  token,
  coachName = "Coach",
  coachHerbalifeId,
  onClose,
}: Props) {
  const [step, setStep] = useState<Step>("calculator");
  const [friendsCount, setFriendsCount] = useState(3);
  const [pvPerFriend, setPvPerFriend] = useState(125);
  const [monthsCount, setMonthsCount] = useState(3);
  const [prospects, setProspects] = useState<Prospect[]>([
    { firstName: "", relationship: "family", notes: "" },
    { firstName: "", relationship: "friend", notes: "" },
    { firstName: "", relationship: "sport", notes: "" },
  ]);
  const [submitting, setSubmitting] = useState(false);

  // ─── Calcul live ─────────────────────────────────────────────────────────
  const calc = useMemo(() => {
    // PV perso (le client lui-meme) : on assume 125 PV/mois
    const myPvPerMonth = 125;
    const myPvTotal = myPvPerMonth * monthsCount;
    // PV des filleuls
    const friendsPvTotal = friendsCount * pvPerFriend * monthsCount;
    // Total cumul
    const totalPv = myPvTotal + friendsPvTotal;

    // Determine niveau (V2 fix Thomas — 2026-04-30)
    // Avant : 'totalPv >= 1000 && monthsCount <= 3' bloquait Ambassador sur
    // les simulations longues. Faux car le palier Ambassador Herbalife =
    // 1000 PV sur 3 mois consecutifs (rythme mensuel x 3 >= 1000).
    // Maintenant : on teste le rythme mensuel projete sur 3 mois.
    const monthlyPvAvg = monthsCount > 0 ? totalPv / monthsCount : 0;
    const projected3m = monthlyPvAvg * 3;

    let level: VipLevel = "bronze"; // au moins bronze car >0
    let discount = 15;
    if (projected3m >= 1000) {
      level = "ambassador";
      discount = 42;
    } else if (totalPv >= 500) {
      level = "gold";
      discount = 35;
    } else if (totalPv >= 100) {
      level = "silver";
      discount = 25;
    }

    // €€ économisés : on assume budget personnel ~100€/mois. Avec remise X% sur 12 mois.
    const monthlyBudget = 100;
    const annualSavings = monthlyBudget * 12 * (discount / 100);

    return { totalPv, level, discount, annualSavings, myPvTotal, friendsPvTotal };
  }, [friendsCount, pvPerFriend, monthsCount]);

  function setProspect(idx: number, patch: Partial<Prospect>) {
    setProspects((prev) => prev.map((p, i) => (i === idx ? { ...p, ...patch } : p)));
  }

  function addProspect() {
    setProspects((prev) => [...prev, { firstName: "", relationship: "friend", notes: "" }]);
  }

  function removeProspect(idx: number) {
    setProspects((prev) => prev.filter((_, i) => i !== idx));
  }

  async function submitProspects() {
    if (submitting) return;
    setSubmitting(true);
    try {
      const valid = prospects.filter((p) => p.firstName.trim().length > 0);
      for (const p of valid) {
        await recordVipIntention(token, p.firstName, p.relationship, p.notes);
      }
      // V2 (2026-04-28) : +30 XP si au moins 3 prospects renseignes
      // (action dediee vip_intentions_filled, cap lifetime).
      if (valid.length >= 3) {
        void recordClientXp(token, "vip_intentions_filled");
      }
      setStep("done");
    } catch (err) {
      console.warn("[VipSandbox] submit failed:", err);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      role="presentation"
      aria-hidden="true"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10010,
        background: "rgba(0,0,0,0.55)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 12,
      }}
    >
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events -- stopPropagation only, dialog role on element */}
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        style={{
          width: "100%",
          maxWidth: 540,
          maxHeight: "92vh",
          overflowY: "auto",
          background:
            "linear-gradient(180deg, #FFFFFF 0%, #FFFEF5 50%, #FAF6E8 100%)",
          borderRadius: 18,
          padding: 22,
          fontFamily: "DM Sans, sans-serif",
          boxShadow: "0 30px 60px rgba(0,0,0,0.45)",
          animation: "ls-sandbox-enter 320ms cubic-bezier(0.2, 0.8, 0.2, 1)",
        }}
      >
        <style>{`
          @keyframes ls-sandbox-enter {
            0% { opacity: 0; transform: translateY(20px) scale(0.96); }
            100% { opacity: 1; transform: translateY(0) scale(1); }
          }
          @keyframes ls-sandbox-bounce {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-4px); }
          }
        `}</style>

        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 10,
            marginBottom: 14,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 10,
                letterSpacing: 2,
                textTransform: "uppercase",
                color: "#B8922A",
                fontWeight: 700,
              }}
            >
              🎮 Mode pratique VIP
            </div>
            <h2
              style={{
                fontFamily: "Syne, serif",
                fontSize: 22,
                fontWeight: 700,
                color: "#5C4A0F",
                margin: "4px 0 0",
              }}
            >
              {step === "calculator"
                ? "Calcule ta remise"
                : step === "prospects"
                  ? "Tes futurs filleuls"
                  : "Mission accomplie 🎉"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            style={{
              background: "transparent",
              border: "none",
              fontSize: 24,
              color: "#888",
              cursor: "pointer",
              lineHeight: 1,
              padding: 4,
            }}
          >
            ×
          </button>
        </div>

        {/* Contenu selon step */}
        {step === "calculator" ? (
          <>
            {/* Slider 1 : amis */}
            <SliderRow
              label={`👥 Combien d'amis tu vas recommander ?`}
              value={friendsCount}
              min={0}
              max={10}
              step={1}
              suffix={friendsCount > 1 ? "amis" : "ami"}
              onChange={setFriendsCount}
            />

            {/* Slider 2 : PV/mois moyenne */}
            <SliderRow
              label="💧 PV moyen par ami / mois"
              value={pvPerFriend}
              min={50}
              max={300}
              step={25}
              suffix="PV"
              onChange={setPvPerFriend}
            />

            {/* Slider 3 : mois */}
            <SliderRow
              label="📅 Sur combien de mois"
              value={monthsCount}
              min={1}
              max={12}
              step={1}
              suffix={monthsCount > 1 ? "mois" : "mois"}
              onChange={setMonthsCount}
            />

            {/* Résultat */}
            <ResultPanel calc={calc} />

            {/* CTA */}
            <button
              type="button"
              onClick={() => setStep("prospects")}
              style={{
                width: "100%",
                marginTop: 16,
                padding: "14px 18px",
                background: "linear-gradient(135deg, #EF9F27 0%, #BA7517 100%)",
                color: "white",
                border: "none",
                borderRadius: 12,
                fontSize: 14,
                fontWeight: 700,
                fontFamily: "Syne, serif",
                cursor: "pointer",
                boxShadow: "0 6px 18px rgba(186,117,23,0.40)",
              }}
            >
              Lister mes futurs filleuls →
            </button>
          </>
        ) : null}

        {step === "prospects" ? (
          <>
            <p
              style={{
                fontSize: 13,
                color: "#5C4A0F",
                lineHeight: 1.55,
                margin: "0 0 14px",
              }}
            >
              Liste 3 personnes que tu pourrais recommander à <strong>{coachName}</strong>{" "}
              pour démarrer Herbalife. Pas d&apos;engagement — c&apos;est juste pour
              identifier qui pourrait être intéressé.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {prospects.map((p, idx) => (
                <ProspectInput
                  key={idx}
                  index={idx}
                  prospect={p}
                  onChange={(patch) => setProspect(idx, patch)}
                  onRemove={() => removeProspect(idx)}
                  removable={prospects.length > 1}
                />
              ))}
            </div>

            <button
              type="button"
              onClick={addProspect}
              style={{
                width: "100%",
                marginTop: 8,
                padding: "8px 14px",
                background: "transparent",
                color: "#5C4A0F",
                border: "0.5px dashed rgba(184,146,42,0.50)",
                borderRadius: 10,
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "DM Sans, sans-serif",
              }}
            >
              + Ajouter un prospect
            </button>

            <div
              style={{
                display: "flex",
                gap: 8,
                marginTop: 16,
                flexWrap: "wrap",
              }}
            >
              <button
                type="button"
                onClick={() => setStep("calculator")}
                style={{
                  padding: "12px 16px",
                  background: "transparent",
                  color: "#888",
                  border: "0.5px solid rgba(0,0,0,0.10)",
                  borderRadius: 10,
                  fontSize: 12,
                  cursor: "pointer",
                  fontFamily: "DM Sans, sans-serif",
                }}
              >
                ← Retour
              </button>
              <button
                type="button"
                onClick={() => void submitProspects()}
                disabled={submitting || prospects.every((p) => !p.firstName.trim())}
                style={{
                  flex: 1,
                  padding: "12px 16px",
                  background:
                    submitting || prospects.every((p) => !p.firstName.trim())
                      ? "rgba(184,146,42,0.30)"
                      : "linear-gradient(135deg, #EF9F27 0%, #BA7517 100%)",
                  color: "white",
                  border: "none",
                  borderRadius: 10,
                  fontSize: 13,
                  fontWeight: 700,
                  fontFamily: "Syne, serif",
                  cursor:
                    submitting || prospects.every((p) => !p.firstName.trim())
                      ? "not-allowed"
                      : "pointer",
                }}
              >
                {submitting ? "Envoi…" : `Envoyer à ${coachName}`}
              </button>
            </div>
          </>
        ) : null}

        {step === "done" ? (
          <div style={{ textAlign: "center", padding: "20px 4px 10px" }}>
            <div
              style={{
                fontSize: 64,
                marginBottom: 12,
                animation: "ls-sandbox-bounce 1.4s ease-in-out infinite",
              }}
            >
              🎉
            </div>
            <p
              style={{
                fontFamily: "Syne, serif",
                fontSize: 20,
                fontWeight: 700,
                color: "#5C4A0F",
                margin: "0 0 8px",
              }}
            >
              Bravo, c&apos;est envoyé !
            </p>
            <p
              style={{
                fontSize: 13,
                color: "#6B6B62",
                lineHeight: 1.6,
                margin: "0 0 16px",
              }}
            >
              <strong>{coachName}</strong> a reçu ta liste et reviendra vers
              toi pour les contacter. En attendant, tu peux déjà activer ton
              compte Client Privilégié.
            </p>
            {coachHerbalifeId ? (
              <div
                style={{
                  padding: "12px 14px",
                  background: "rgba(184,146,42,0.08)",
                  border: "0.5px solid rgba(184,146,42,0.30)",
                  borderRadius: 10,
                  fontSize: 12,
                  color: "#5C4A0F",
                  marginBottom: 14,
                }}
              >
                💡 ID sponsor pour t&apos;inscrire : <strong>{coachHerbalifeId}</strong>
                <br />
                Site : <strong>www.myherbalife.com</strong>
              </div>
            ) : null}
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: "12px 24px",
                background: "linear-gradient(135deg, #EF9F27 0%, #BA7517 100%)",
                color: "white",
                border: "none",
                borderRadius: 12,
                fontSize: 14,
                fontWeight: 700,
                fontFamily: "Syne, serif",
                cursor: "pointer",
                boxShadow: "0 4px 14px rgba(186,117,23,0.40)",
              }}
            >
              Fermer
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

// ─── Sous-composants ─────────────────────────────────────────────────────────

function SliderRow({
  label,
  value,
  min,
  max,
  step,
  suffix,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  suffix: string;
  onChange: (v: number) => void;
}) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 6,
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 600, color: "#5C4A0F" }}>{label}</span>
        <span
          style={{
            fontFamily: "Syne, serif",
            fontSize: 18,
            fontWeight: 700,
            color: "#B8922A",
          }}
        >
          {value} <span style={{ fontSize: 11, color: "#888" }}>{suffix}</span>
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{
          width: "100%",
          accentColor: "#B8922A",
          cursor: "pointer",
        }}
      />
    </div>
  );
}

function ResultPanel({
  calc,
}: {
  calc: {
    totalPv: number;
    level: VipLevel;
    discount: number;
    annualSavings: number;
    myPvTotal: number;
    friendsPvTotal: number;
  };
}) {
  const meta = VIP_LEVELS.find((l) => l.level === calc.level) ?? VIP_LEVELS[0];

  return (
    <div
      style={{
        marginTop: 12,
        padding: "16px 16px",
        background:
          "linear-gradient(135deg, rgba(184,146,42,0.10) 0%, rgba(255,232,115,0.18) 100%)",
        border: `0.5px solid ${meta.color}50`,
        borderRadius: 14,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 8,
        }}
      >
        <span style={{ fontSize: 24 }}>{meta.badge}</span>
        <span
          style={{
            fontFamily: "Syne, serif",
            fontSize: 18,
            fontWeight: 700,
            color: meta.color,
          }}
        >
          {meta.label}
        </span>
        <span
          style={{
            marginLeft: "auto",
            fontFamily: "Syne, serif",
            fontSize: 22,
            fontWeight: 800,
            color: meta.color,
          }}
        >
          -{calc.discount}%
        </span>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 8,
          marginTop: 10,
          paddingTop: 10,
          borderTop: "0.5px dashed rgba(184,146,42,0.30)",
        }}
      >
        <div>
          <div
            style={{
              fontSize: 9,
              letterSpacing: 1,
              textTransform: "uppercase",
              color: "#6B6B62",
              fontWeight: 600,
            }}
          >
            PV cumulés
          </div>
          <div
            style={{
              fontFamily: "Syne, serif",
              fontSize: 22,
              fontWeight: 700,
              color: "#5C4A0F",
              lineHeight: 1.1,
            }}
          >
            {calc.totalPv}
          </div>
          <div style={{ fontSize: 10, color: "#888", marginTop: 2 }}>
            (toi {calc.myPvTotal} + filleuls {calc.friendsPvTotal})
          </div>
        </div>
        <div>
          <div
            style={{
              fontSize: 9,
              letterSpacing: 1,
              textTransform: "uppercase",
              color: "#6B6B62",
              fontWeight: 600,
            }}
          >
            Économisé / an
          </div>
          <div
            style={{
              fontFamily: "Syne, serif",
              fontSize: 22,
              fontWeight: 700,
              color: "#0F6E56",
              lineHeight: 1.1,
            }}
          >
            ~{Math.round(calc.annualSavings)} €
          </div>
          <div style={{ fontSize: 10, color: "#888", marginTop: 2 }}>
            (sur 100 €/mois de commandes)
          </div>
        </div>
      </div>

      {/* Mention 50% distri actif (V2 — 2026-04-30) */}
      {calc.level === "ambassador" && (
        <div
          style={{
            marginTop: 12,
            padding: "10px 12px",
            background: "rgba(124, 58, 237, 0.08)",
            border: "0.5px dashed rgba(124, 58, 237, 0.40)",
            borderRadius: 10,
            fontSize: 11.5,
            color: "#5B21B6",
            lineHeight: 1.5,
          }}
        >
          <strong>💎 Tu peux aller plus loin :</strong> en devenant{" "}
          <strong>distributeur actif</strong>, ta remise passe à{" "}
          <strong>-50 %</strong> + tu gagnes des commissions sur tes filleuls.
          Parle-en à ton coach.
        </div>
      )}
    </div>
  );
}

function ProspectInput({
  index,
  prospect,
  onChange,
  onRemove,
  removable,
}: {
  index: number;
  prospect: Prospect;
  onChange: (patch: Partial<Prospect>) => void;
  onRemove: () => void;
  removable: boolean;
}) {
  return (
    <div
      style={{
        padding: "10px 12px",
        background: "white",
        border: "0.5px solid rgba(184,146,42,0.30)",
        borderRadius: 12,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <span
          style={{
            width: 26,
            height: 26,
            borderRadius: "50%",
            background: "rgba(184,146,42,0.15)",
            color: "#B8922A",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 12,
            fontWeight: 700,
            fontFamily: "Syne, serif",
            flexShrink: 0,
          }}
        >
          {index + 1}
        </span>
        <input
          type="text"
          placeholder="Prénom"
          value={prospect.firstName}
          onChange={(e) => onChange({ firstName: e.target.value })}
          style={{
            flex: 1,
            padding: "8px 10px",
            border: "0.5px solid rgba(0,0,0,0.10)",
            borderRadius: 8,
            fontSize: 13,
            fontFamily: "DM Sans, sans-serif",
            outline: "none",
          }}
        />
        {removable ? (
          <button
            type="button"
            onClick={onRemove}
            aria-label="Retirer"
            style={{
              background: "transparent",
              border: "none",
              color: "#888",
              fontSize: 18,
              cursor: "pointer",
              padding: 4,
              lineHeight: 1,
            }}
          >
            ×
          </button>
        ) : null}
      </div>
      <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
        {RELATIONSHIPS.map((rel) => (
          <button
            key={rel.id}
            type="button"
            onClick={() => onChange({ relationship: rel.id })}
            style={{
              padding: "5px 10px",
              background:
                prospect.relationship === rel.id
                  ? "rgba(184,146,42,0.18)"
                  : "transparent",
              border: `0.5px solid ${
                prospect.relationship === rel.id
                  ? "rgba(184,146,42,0.50)"
                  : "rgba(0,0,0,0.08)"
              }`,
              borderRadius: 7,
              fontSize: 11,
              fontWeight: 600,
              color: prospect.relationship === rel.id ? "#5C4A0F" : "#888",
              cursor: "pointer",
              fontFamily: "DM Sans, sans-serif",
            }}
          >
            {rel.emoji} {rel.label}
          </button>
        ))}
      </div>
    </div>
  );
}
