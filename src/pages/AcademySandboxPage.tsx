// =============================================================================
// AcademySandboxPage — mode pratique du parcours Academy (2026-04-29 v2)
// =============================================================================
//
// Bac à sable interactif en 4 étapes pour faire ressentir un bilan complet
// SANS toucher à la vraie DB. Le user remplit un client fictif, voit la
// reco produits se calculer en live, génère un programme bidon et tombe
// sur un écran de félicitations.
//
// Pas de mutation Supabase. Tous les "calculs" sont simulés client-side
// (déterministes) — l'objectif est l'effet « waouh » pédagogique.
//
// Theme : 100 % var(--ls-*) → suit le toggle clair/dark. Pas de couleur
// hardcodée. Police Syne pour les titres, DM Sans pour le corps.
// =============================================================================

import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

type Objective = "weight-loss" | "fitness" | "sport-mass" | "wellness";

interface SandboxState {
  firstName: string;
  age: number;
  weight: number;
  height: number;
  objective: Objective;
}

const OBJECTIVES: Array<{ id: Objective; emoji: string; label: string; tag: string }> = [
  { id: "weight-loss", emoji: "🔥", label: "Perte de poids", tag: "Le plus fréquent" },
  { id: "fitness", emoji: "💪", label: "Forme et tonicité", tag: "Equilibre" },
  { id: "sport-mass", emoji: "🏋️", label: "Sport / prise de masse", tag: "Sportif" },
  { id: "wellness", emoji: "🌿", label: "Bien-être global", tag: "Vitalité" },
];

export function AcademySandboxPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<0 | 1 | 2 | 3>(0);
  const [state, setState] = useState<SandboxState>({
    firstName: "",
    age: 35,
    weight: 70,
    height: 170,
    objective: "weight-loss",
  });

  const totalSteps = 4;
  const stepLabels = ["Profil client", "Bilan corporel", "Programme", "Bilan validé"];

  // ─── Calculs simulés (déterministes, jamais persistés) ────────────────────
  const computed = useMemo(() => {
    const bmi = state.weight / Math.pow(state.height / 100, 2);
    const bmiCategory =
      bmi < 18.5 ? "Maigreur" : bmi < 25 ? "Normal" : bmi < 30 ? "Surpoids" : "Obésité";

    // Cible eau : 35 mL/kg
    const waterTarget = Math.round(state.weight * 35);
    // Protéines : 1.2 g/kg en perte, 1.6 sport, 1.0 sinon
    const proteinPerKg =
      state.objective === "sport-mass" ? 1.6
      : state.objective === "weight-loss" ? 1.2
      : 1.0;
    const proteinTarget = Math.round(state.weight * proteinPerKg);

    // Reco produits selon objectif (mockée)
    const products: Array<{ emoji: string; name: string; reason: string }> = [];
    if (state.objective === "weight-loss" || state.objective === "fitness") {
      products.push({
        emoji: "🥤",
        name: "Formula 1 Vanille",
        reason: "Repas équilibré 220 kcal — la base du programme",
      });
      products.push({
        emoji: "💧",
        name: "Hydrate Pamplemousse",
        reason: `Atteindre ${waterTarget} mL/jour avec plaisir`,
      });
    }
    if (state.objective === "sport-mass") {
      products.push({
        emoji: "🥤",
        name: "Formula 1 Sport Chocolat",
        reason: "Base protéinée sport, 30g protéines / portion",
      });
      products.push({
        emoji: "⚡",
        name: "Liftoff Mojito",
        reason: "Booster pré-entraînement, focus + énergie",
      });
      products.push({
        emoji: "🧱",
        name: "Personalized Protein Powder",
        reason: `Compléter pour atteindre ${proteinTarget} g de protéines`,
      });
    }
    if (state.objective === "wellness") {
      products.push({
        emoji: "🌿",
        name: "Tea Mix Original",
        reason: "Énergie douce, brûle-graisse léger",
      });
      products.push({
        emoji: "🍵",
        name: "Aloe Mangue",
        reason: "Confort digestif + hydratation premium",
      });
    }
    if (products.length < 3) {
      products.push({
        emoji: "🍫",
        name: "Barre Protéinée",
        reason: "Snack 10g protéines, anti-fringale 16h",
      });
    }

    return { bmi, bmiCategory, waterTarget, proteinTarget, products };
  }, [state]);

  function nextStep() {
    setStep((s) => (s < 3 ? ((s + 1) as 0 | 1 | 2 | 3) : s));
  }
  function prevStep() {
    setStep((s) => (s > 0 ? ((s - 1) as 0 | 1 | 2 | 3) : s));
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        padding: "24px 16px 48px",
        background: "var(--ls-bg)",
        color: "var(--ls-text)",
        fontFamily: "DM Sans, sans-serif",
      }}
    >
      {/* Header */}
      <div style={{ maxWidth: 760, margin: "0 auto 24px" }}>
        <button
          type="button"
          onClick={() => navigate("/academy")}
          style={{
            background: "transparent",
            border: "none",
            color: "var(--ls-text-muted)",
            fontSize: 12,
            cursor: "pointer",
            padding: 0,
            marginBottom: 8,
          }}
        >
          ← Retour à l'Academy
        </button>
        <div
          style={{
            fontFamily: "Syne, sans-serif",
            fontSize: 28,
            fontWeight: 700,
            color: "var(--ls-text)",
            marginBottom: 4,
          }}
        >
          🎮 Mode pratique — Bilan d'essai
        </div>
        <div style={{ fontSize: 13, color: "var(--ls-text-muted)" }}>
          Simule un bilan complet en 2 minutes. Aucune donnée n'est enregistrée.
        </div>

        {/* Progress bar */}
        <div style={{ marginTop: 18 }}>
          <div
            style={{
              display: "flex",
              gap: 6,
              marginBottom: 6,
            }}
          >
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div
                key={i}
                style={{
                  flex: 1,
                  height: 4,
                  borderRadius: 999,
                  background:
                    i <= step
                      ? "var(--ls-gold)"
                      : "color-mix(in srgb, var(--ls-border) 60%, transparent)",
                  transition: "background 280ms ease",
                }}
              />
            ))}
          </div>
          <div
            style={{
              fontSize: 11,
              letterSpacing: 1.4,
              textTransform: "uppercase",
              color: "var(--ls-text-hint)",
              fontWeight: 600,
            }}
          >
            Étape {step + 1} / {totalSteps} · {stepLabels[step]}
          </div>
        </div>
      </div>

      {/* Card étape */}
      <div
        style={{
          maxWidth: 760,
          margin: "0 auto",
          background: "var(--ls-surface)",
          border: "0.5px solid var(--ls-border)",
          borderRadius: 18,
          padding: 24,
          boxShadow: "0 8px 32px rgba(0,0,0,0.08)",
        }}
      >
        {step === 0 && <Step0Profile state={state} setState={setState} />}
        {step === 1 && <Step1BodyScan state={state} setState={setState} computed={computed} />}
        {step === 2 && <Step2Program computed={computed} />}
        {step === 3 && <Step3Done state={state} computed={computed} navigate={navigate} />}

        {/* Navigation */}
        {step < 3 && (
          <div
            style={{
              marginTop: 28,
              display: "flex",
              gap: 10,
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <button
              type="button"
              onClick={prevStep}
              disabled={step === 0}
              style={{
                padding: "10px 18px",
                background: "transparent",
                border: "0.5px solid var(--ls-border)",
                borderRadius: 10,
                color: step === 0 ? "var(--ls-text-hint)" : "var(--ls-text-muted)",
                fontSize: 13,
                cursor: step === 0 ? "not-allowed" : "pointer",
                fontFamily: "inherit",
              }}
            >
              ← Retour
            </button>
            <button
              type="button"
              onClick={nextStep}
              disabled={step === 0 && state.firstName.trim().length < 2}
              style={{
                padding: "12px 22px",
                background:
                  step === 0 && state.firstName.trim().length < 2
                    ? "color-mix(in srgb, var(--ls-gold) 30%, var(--ls-surface2))"
                    : "var(--ls-gold)",
                border: "none",
                borderRadius: 10,
                color: "var(--ls-bg)",
                fontWeight: 700,
                fontSize: 13,
                cursor:
                  step === 0 && state.firstName.trim().length < 2 ? "not-allowed" : "pointer",
                fontFamily: "inherit",
              }}
            >
              Continuer →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Étape 0 : Profil ─────────────────────────────────────────────────────────

function Step0Profile({
  state,
  setState,
}: {
  state: SandboxState;
  setState: React.Dispatch<React.SetStateAction<SandboxState>>;
}) {
  return (
    <div>
      <SectionTitle emoji="👤" title="Qui est ton client ?" />
      <p style={{ fontSize: 13, color: "var(--ls-text-muted)", marginBottom: 18 }}>
        En vrai bilan, tu commences par mettre ton client à l'aise. Prénom, âge,
        objectif. Ici on simplifie — donne juste un prénom pour démarrer.
      </p>

      <Field label="Prénom du client (fictif, ex : Marie)">
        <input
          type="text"
          value={state.firstName}
          onChange={(e) => setState((s) => ({ ...s, firstName: e.target.value }))}
          placeholder="Marie"
          autoFocus
          style={inputStyle}
        />
      </Field>

      <Field label="Quel est son objectif principal ?">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: 10,
          }}
        >
          {OBJECTIVES.map((obj) => {
            const selected = state.objective === obj.id;
            return (
              <button
                key={obj.id}
                type="button"
                onClick={() => setState((s) => ({ ...s, objective: obj.id }))}
                style={{
                  padding: "14px 14px",
                  borderRadius: 12,
                  border: selected
                    ? "0.5px solid var(--ls-gold)"
                    : "0.5px solid var(--ls-border)",
                  background: selected
                    ? "color-mix(in srgb, var(--ls-gold) 12%, var(--ls-surface))"
                    : "var(--ls-surface2)",
                  textAlign: "left",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  transition: "all 160ms ease",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 22 }}>{obj.emoji}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--ls-text)" }}>
                    {obj.label}
                  </span>
                </div>
                <div style={{ fontSize: 10, color: "var(--ls-text-muted)", marginTop: 4 }}>
                  {obj.tag}
                </div>
              </button>
            );
          })}
        </div>
      </Field>
    </div>
  );
}

// ─── Étape 1 : Body scan ──────────────────────────────────────────────────────

function Step1BodyScan({
  state,
  setState,
  computed,
}: {
  state: SandboxState;
  setState: React.Dispatch<React.SetStateAction<SandboxState>>;
  computed: { bmi: number; bmiCategory: string; waterTarget: number; proteinTarget: number };
}) {
  return (
    <div>
      <SectionTitle emoji="📏" title={`Le body scan de ${state.firstName}`} />
      <p style={{ fontSize: 13, color: "var(--ls-text-muted)", marginBottom: 18 }}>
        Mesures simples (taille / poids) — Lor'Squad calcule l'IMC, l'eau cible
        et les protéines instantanément. Pas de calculatrice à sortir.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
        <Field label="Âge">
          <input
            type="number"
            min={18}
            max={90}
            value={state.age}
            onChange={(e) => setState((s) => ({ ...s, age: Number(e.target.value) || 0 }))}
            style={inputStyle}
          />
        </Field>
        <Field label="Poids (kg)">
          <input
            type="number"
            min={30}
            max={200}
            value={state.weight}
            onChange={(e) => setState((s) => ({ ...s, weight: Number(e.target.value) || 0 }))}
            style={inputStyle}
          />
        </Field>
        <Field label="Taille (cm)">
          <input
            type="number"
            min={130}
            max={220}
            value={state.height}
            onChange={(e) => setState((s) => ({ ...s, height: Number(e.target.value) || 0 }))}
            style={inputStyle}
          />
        </Field>
      </div>

      {/* Stats live */}
      <div
        style={{
          marginTop: 22,
          padding: 16,
          borderRadius: 14,
          background: "color-mix(in srgb, var(--ls-teal) 8%, var(--ls-surface2))",
          border: "0.5px solid color-mix(in srgb, var(--ls-teal) 30%, transparent)",
        }}
      >
        <div
          style={{
            fontSize: 10,
            letterSpacing: 1.4,
            textTransform: "uppercase",
            fontWeight: 600,
            color: "var(--ls-teal)",
            marginBottom: 10,
          }}
        >
          ⚡ Calculé en live par Lor'Squad
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 12,
          }}
        >
          <Stat label="IMC" value={computed.bmi.toFixed(1)} hint={computed.bmiCategory} />
          <Stat
            label="Eau / jour"
            value={`${computed.waterTarget.toLocaleString("fr-FR")} mL`}
            hint="Target hydratation"
          />
          <Stat
            label="Protéines / jour"
            value={`${computed.proteinTarget} g`}
            hint="Cible nutritionnelle"
          />
        </div>
      </div>
    </div>
  );
}

// ─── Étape 2 : Programme ──────────────────────────────────────────────────────

function Step2Program({
  computed,
}: {
  computed: { products: Array<{ emoji: string; name: string; reason: string }> };
}) {
  return (
    <div>
      <SectionTitle emoji="🎯" title="Programme recommandé" />
      <p style={{ fontSize: 13, color: "var(--ls-text-muted)", marginBottom: 18 }}>
        Lor'Squad analyse les chiffres + l'objectif et propose 3-4 produits
        cohérents avec une raison chacun. Tu valides, retires ou ajoutes.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {computed.products.map((p) => (
          <div
            key={p.name}
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 14,
              padding: 14,
              borderRadius: 12,
              background: "var(--ls-surface2)",
              border: "0.5px solid var(--ls-border)",
            }}
          >
            <div
              style={{
                fontSize: 26,
                width: 44,
                height: 44,
                borderRadius: 10,
                background: "color-mix(in srgb, var(--ls-gold) 14%, transparent)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              {p.emoji}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontFamily: "Syne, sans-serif",
                  fontSize: 14,
                  fontWeight: 600,
                  color: "var(--ls-text)",
                  marginBottom: 3,
                }}
              >
                {p.name}
              </div>
              <div style={{ fontSize: 12, color: "var(--ls-text-muted)", lineHeight: 1.4 }}>
                {p.reason}
              </div>
            </div>
            <span
              style={{
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: 0.6,
                padding: "3px 7px",
                borderRadius: 5,
                background: "color-mix(in srgb, var(--ls-teal) 18%, transparent)",
                color: "var(--ls-teal)",
                flexShrink: 0,
              }}
            >
              RECO
            </span>
          </div>
        ))}
      </div>

      <div
        style={{
          marginTop: 18,
          padding: "10px 14px",
          fontSize: 11,
          color: "var(--ls-text-hint)",
          background: "color-mix(in srgb, var(--ls-purple) 8%, transparent)",
          borderRadius: 10,
          border: "0.5px dashed color-mix(in srgb, var(--ls-purple) 30%, transparent)",
        }}
      >
        💡 En vrai bilan, tu coches/décoches selon ton ressenti, et le ticket
        s'actualise (prix, PV) en temps réel à droite de l'écran.
      </div>
    </div>
  );
}

// ─── Étape 3 : Bilan validé ──────────────────────────────────────────────────

function Step3Done({
  state,
  computed,
  navigate,
}: {
  state: SandboxState;
  computed: { products: Array<{ name: string }> };
  navigate: ReturnType<typeof useNavigate>;
}) {
  return (
    <div style={{ textAlign: "center", padding: "12px 8px" }}>
      <div style={{ fontSize: 64, marginBottom: 14 }}>🎉</div>
      <div
        style={{
          fontFamily: "Syne, sans-serif",
          fontSize: 24,
          fontWeight: 700,
          color: "var(--ls-text)",
          marginBottom: 8,
        }}
      >
        Bilan {state.firstName} validé !
      </div>
      <div style={{ fontSize: 14, color: "var(--ls-text-muted)", marginBottom: 22 }}>
        En vrai, ça aurait pris 8-12 minutes en RDV — programme nominatif,
        plan jour calibré, recommandations cohérentes. Et ton client repart
        avec un QR code vers son app perso.
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          gap: 10,
          marginBottom: 22,
        }}
      >
        <RecapCell label="Objectif" value={state.objective.replace("-", " ")} />
        <RecapCell label="Produits proposés" value={String(computed.products.length)} />
        <RecapCell label="Durée simulée" value="~ 2 min" />
      </div>

      <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={() => navigate("/academy")}
          style={{
            padding: "12px 22px",
            background: "var(--ls-gold)",
            border: "none",
            borderRadius: 10,
            color: "var(--ls-bg)",
            fontWeight: 700,
            fontSize: 13,
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          Retour à l'Academy
        </button>
        <button
          type="button"
          onClick={() => window.location.reload()}
          style={{
            padding: "12px 22px",
            background: "transparent",
            border: "0.5px solid var(--ls-border)",
            borderRadius: 10,
            color: "var(--ls-text)",
            fontWeight: 600,
            fontSize: 13,
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          ↻ Rejouer
        </button>
      </div>
    </div>
  );
}

// ─── Sous-composants ─────────────────────────────────────────────────────────

function SectionTitle({ emoji, title }: { emoji: string; title: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        marginBottom: 10,
      }}
    >
      <span style={{ fontSize: 26 }}>{emoji}</span>
      <span
        style={{
          fontFamily: "Syne, sans-serif",
          fontSize: 20,
          fontWeight: 700,
          color: "var(--ls-text)",
        }}
      >
        {title}
      </span>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "block", marginBottom: 14 }}>
      <span
        style={{
          display: "block",
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: 0.4,
          textTransform: "uppercase",
          color: "var(--ls-text-muted)",
          marginBottom: 6,
        }}
      >
        {label}
      </span>
      {children}
    </label>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div>
      <div
        style={{
          fontSize: 9,
          letterSpacing: 1,
          textTransform: "uppercase",
          color: "var(--ls-text-hint)",
          fontWeight: 600,
          marginBottom: 2,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: "Syne, sans-serif",
          fontSize: 20,
          fontWeight: 700,
          color: "var(--ls-text)",
        }}
      >
        {value}
      </div>
      {hint && (
        <div style={{ fontSize: 10, color: "var(--ls-text-muted)", marginTop: 1 }}>{hint}</div>
      )}
    </div>
  );
}

function RecapCell({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        padding: 12,
        borderRadius: 10,
        background: "var(--ls-surface2)",
        border: "0.5px solid var(--ls-border)",
        textAlign: "center",
      }}
    >
      <div
        style={{
          fontSize: 9,
          letterSpacing: 1,
          textTransform: "uppercase",
          color: "var(--ls-text-hint)",
          fontWeight: 600,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: "Syne, sans-serif",
          fontSize: 16,
          fontWeight: 700,
          color: "var(--ls-text)",
          marginTop: 4,
          textTransform: "capitalize",
        }}
      >
        {value}
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "11px 13px",
  borderRadius: 10,
  border: "0.5px solid var(--ls-border)",
  background: "var(--ls-surface2)",
  color: "var(--ls-text)",
  fontSize: 14,
  fontFamily: "inherit",
  outline: "none",
  boxSizing: "border-box",
};
