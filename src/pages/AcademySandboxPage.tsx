// =============================================================================
// Lor'Squad Academy — Section 9 : Mode pratique sandbox (2026-04-29)
// =============================================================================
//
// Wizard 4 etapes qui permet au distri de simuler la creation d un client +
// d un bilan complet SANS toucher a la base. Aucune donnee n est persistee :
// tout est en state React local.
//
// Etapes :
//   1. Profil client (prenom, nom, age, objectif)
//   2. Bilan corporel (poids, taille, % MG, % MM, eau)
//   3. Recommandations produits (cocher 2+ produits)
//   4. Recap final avec celebration + markSectionDone("sandbox")
//
// Architecture :
//   - Self-contained (pas le TourRunner / SpotlightOverlay)
//   - Etat local via useState, pas de DB
//   - Validation legere par etape (champs requis + ranges realistes)
//   - A la fin : appel a markSectionDone("sandbox") puis navigate /academy
//
// Differences avec /academy/demo/fiche-client :
//   - Demo = mockup statique pour spotlights pendant un tour
//   - Sandbox = wizard interactif que le user remplit lui-meme
// =============================================================================

import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAcademyProgress } from "../features/academy/hooks/useAcademyProgress";
import { DemoBanner } from "../features/academy/components/DemoBanner";

// ─── Types et constantes ─────────────────────────────────────────────────────

type SandboxObjective = "weight-loss" | "sport";

interface SandboxClient {
  firstName: string;
  lastName: string;
  age: number;
  city: string;
  objective: SandboxObjective;
}

interface SandboxBilan {
  weightKg: number;
  heightCm: number;
  bodyFatPct: number;
  muscleMassPct: number;
  hydrationPct: number;
}

interface SandboxProduct {
  id: string;
  name: string;
  emoji: string;
  pv: number;
  priceEur: number;
  durationDays: number;
  matchObjective: SandboxObjective[];
}

const SANDBOX_PRODUCTS: SandboxProduct[] = [
  { id: "f1-vanille", name: "Formula 1 Vanille", emoji: "🥤", pv: 23, priceEur: 56, durationDays: 30, matchObjective: ["weight-loss", "sport"] },
  { id: "the-concentre", name: "Thé Concentré 50g", emoji: "🍵", pv: 17, priceEur: 42, durationDays: 60, matchObjective: ["weight-loss", "sport"] },
  { id: "aloe", name: "Aloe Vera Original", emoji: "🌿", pv: 19, priceEur: 48, durationDays: 30, matchObjective: ["weight-loss"] },
  { id: "phyto", name: "Phyto Complete", emoji: "🌱", pv: 21, priceEur: 52, durationDays: 30, matchObjective: ["weight-loss", "sport"] },
  { id: "f3-proteine", name: "Formula 3 Proteine", emoji: "💪", pv: 25, priceEur: 62, durationDays: 30, matchObjective: ["sport"] },
  { id: "cr7-drive", name: "CR7 Drive (boost performance)", emoji: "⚡", pv: 28, priceEur: 68, durationDays: 30, matchObjective: ["sport"] },
];

const DEFAULT_CLIENT: SandboxClient = {
  firstName: "Sarah",
  lastName: "Démo",
  age: 34,
  city: "Verdun",
  objective: "weight-loss",
};

const DEFAULT_BILAN: SandboxBilan = {
  weightKg: 68,
  heightCm: 165,
  bodyFatPct: 28,
  muscleMassPct: 26,
  hydrationPct: 54,
};

const STEP_LABELS = [
  "Profil client",
  "Bilan corporel",
  "Programme",
  "Récap & badge",
];

// ─── Composant principal ─────────────────────────────────────────────────────

export function AcademySandboxPage() {
  const navigate = useNavigate();
  const { markSectionDone } = useAcademyProgress();

  const [step, setStep] = useState(0);
  const [client, setClient] = useState<SandboxClient>(DEFAULT_CLIENT);
  const [bilan, setBilan] = useState<SandboxBilan>(DEFAULT_BILAN);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // ─── Derives ────────────────────────────────────────────────────────────
  const bmi = useMemo(() => {
    const h = bilan.heightCm / 100;
    if (!h) return 0;
    return bilan.weightKg / (h * h);
  }, [bilan.heightCm, bilan.weightKg]);

  const filteredProducts = useMemo(
    () => SANDBOX_PRODUCTS.filter((p) => p.matchObjective.includes(client.objective)),
    [client.objective],
  );

  const totalPv = useMemo(
    () => selectedProducts.reduce((acc, id) => {
      const p = SANDBOX_PRODUCTS.find((x) => x.id === id);
      return acc + (p?.pv ?? 0);
    }, 0),
    [selectedProducts],
  );

  const totalPrice = useMemo(
    () => selectedProducts.reduce((acc, id) => {
      const p = SANDBOX_PRODUCTS.find((x) => x.id === id);
      return acc + (p?.priceEur ?? 0);
    }, 0),
    [selectedProducts],
  );

  // ─── Validations par etape ──────────────────────────────────────────────
  const canAdvance = useMemo(() => {
    if (step === 0) {
      return client.firstName.trim().length >= 2
          && client.lastName.trim().length >= 2
          && client.age >= 18 && client.age <= 100
          && client.city.trim().length >= 2;
    }
    if (step === 1) {
      return bilan.weightKg >= 35 && bilan.weightKg <= 200
          && bilan.heightCm >= 130 && bilan.heightCm <= 220
          && bilan.bodyFatPct >= 5 && bilan.bodyFatPct <= 60
          && bilan.muscleMassPct >= 10 && bilan.muscleMassPct <= 60;
    }
    if (step === 2) {
      return selectedProducts.length >= 2;
    }
    return true;
  }, [step, client, bilan, selectedProducts]);

  const handleNext = () => {
    if (!canAdvance) return;
    setStep((s) => Math.min(s + 1, STEP_LABELS.length - 1));
  };

  const handleBack = () => {
    setStep((s) => Math.max(s - 1, 0));
  };

  const handleFinish = async () => {
    setSubmitting(true);
    try {
      await markSectionDone("sandbox");
    } catch (err) {
      console.warn("[Sandbox] markSectionDone failed:", err);
    }
    navigate("/academy?completed=sandbox");
  };

  // ─── Render ─────────────────────────────────────────────────────────────
  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "24px 16px 80px" }}>
      <DemoBanner label="Mode pratique — aucune donnée n'est sauvegardée" />

      {/* Header avec progression */}
      <div style={{ marginTop: 20, marginBottom: 24 }}>
        <button
          type="button"
          onClick={() => navigate("/academy")}
          style={{
            background: "transparent",
            border: "none",
            color: "var(--ls-text-muted, #6B6B62)",
            fontSize: 13,
            cursor: "pointer",
            padding: 0,
            marginBottom: 12,
          }}
        >
          ← Quitter le mode pratique
        </button>

        <h1
          style={{
            fontFamily: "Syne, Georgia, serif",
            fontSize: 26,
            fontWeight: 500,
            margin: "0 0 6px 0",
            color: "var(--ls-text, #2C2C2A)",
          }}
        >
          🎮 À toi de jouer
        </h1>
        <p style={{ fontSize: 14, color: "var(--ls-text-muted, #5F5E5A)", margin: 0 }}>
          Étape {step + 1} sur {STEP_LABELS.length} — {STEP_LABELS[step]}
        </p>

        {/* Barre de progression */}
        <div
          style={{
            marginTop: 16,
            height: 6,
            borderRadius: 3,
            background: "var(--ls-surface2, #EDE6D0)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${((step + 1) / STEP_LABELS.length) * 100}%`,
              height: "100%",
              background: "linear-gradient(90deg, #B8922A, #BA7517)",
              transition: "width 250ms ease",
            }}
          />
        </div>
      </div>

      {/* Contenu de l etape */}
      {step === 0 && (
        <SandboxStep1Profil client={client} onChange={setClient} />
      )}
      {step === 1 && (
        <SandboxStep2Bilan bilan={bilan} onChange={setBilan} bmi={bmi} />
      )}
      {step === 2 && (
        <SandboxStep3Programme
          objective={client.objective}
          products={filteredProducts}
          selected={selectedProducts}
          onToggle={(id) => setSelectedProducts((prev) =>
            prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
          )}
          totalPv={totalPv}
          totalPrice={totalPrice}
        />
      )}
      {step === 3 && (
        <SandboxStep4Recap
          client={client}
          bilan={bilan}
          bmi={bmi}
          selectedProducts={selectedProducts.map((id) =>
            SANDBOX_PRODUCTS.find((p) => p.id === id),
          ).filter(Boolean) as SandboxProduct[]}
          totalPv={totalPv}
          totalPrice={totalPrice}
        />
      )}

      {/* Footer navigation */}
      <div
        style={{
          marginTop: 32,
          display: "flex",
          gap: 12,
          flexWrap: "wrap",
          justifyContent: "space-between",
        }}
      >
        <button
          type="button"
          onClick={handleBack}
          disabled={step === 0}
          style={{
            background: "transparent",
            border: "0.5px solid var(--ls-border, #C9C2AB)",
            color: "var(--ls-text-muted, #6B6B62)",
            padding: "10px 18px",
            borderRadius: 10,
            fontSize: 13,
            cursor: step === 0 ? "not-allowed" : "pointer",
            opacity: step === 0 ? 0.5 : 1,
          }}
        >
          ← Précédent
        </button>

        {step < STEP_LABELS.length - 1 ? (
          <button
            type="button"
            onClick={handleNext}
            disabled={!canAdvance}
            style={{
              background: canAdvance ? "linear-gradient(135deg, #B8922A, #BA7517)" : "var(--ls-surface2, #EDE6D0)",
              color: canAdvance ? "white" : "var(--ls-text-muted, #6B6B62)",
              border: "none",
              padding: "10px 22px",
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 500,
              cursor: canAdvance ? "pointer" : "not-allowed",
            }}
          >
            Suivant →
          </button>
        ) : (
          <button
            type="button"
            onClick={handleFinish}
            disabled={submitting}
            style={{
              background: "linear-gradient(135deg, #B8922A, #BA7517)",
              color: "white",
              border: "none",
              padding: "12px 24px",
              borderRadius: 10,
              fontSize: 14,
              fontWeight: 500,
              cursor: submitting ? "wait" : "pointer",
              opacity: submitting ? 0.8 : 1,
            }}
          >
            {submitting ? "..." : "🎉 Terminer & gagner le badge"}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Sous-composants par etape ───────────────────────────────────────────────

function SandboxStep1Profil({
  client,
  onChange,
}: {
  client: SandboxClient;
  onChange: (c: SandboxClient) => void;
}) {
  return (
    <Card title="👤 Profil de ton client">
      <p style={{ fontSize: 13, color: "var(--ls-text-muted, #5F5E5A)", marginBottom: 16 }}>
        On commence par les infos de base. Tu peux garder Sarah Démo ou inventer un autre profil — c'est juste pour t'entraîner.
      </p>

      <Field label="Prénom">
        <input
          type="text"
          value={client.firstName}
          onChange={(e) => onChange({ ...client, firstName: e.target.value })}
          style={inputStyle}
        />
      </Field>

      <Field label="Nom">
        <input
          type="text"
          value={client.lastName}
          onChange={(e) => onChange({ ...client, lastName: e.target.value })}
          style={inputStyle}
        />
      </Field>

      <Field label="Âge">
        <input
          type="number"
          min={18}
          max={100}
          value={client.age}
          onChange={(e) => onChange({ ...client, age: Number(e.target.value) })}
          style={inputStyle}
        />
      </Field>

      <Field label="Ville">
        <input
          type="text"
          value={client.city}
          onChange={(e) => onChange({ ...client, city: e.target.value })}
          style={inputStyle}
        />
      </Field>

      <Field label="Objectif">
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {([
            { id: "weight-loss", label: "🌱 Perte de poids", color: "#5A8C7B" },
            { id: "sport", label: "💪 Prise de masse / sport", color: "#B8922A" },
          ] as const).map((opt) => {
            const active = client.objective === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => onChange({ ...client, objective: opt.id })}
                style={{
                  flex: "1 1 200px",
                  padding: "12px 14px",
                  background: active ? opt.color : "transparent",
                  color: active ? "white" : "var(--ls-text, #2C2C2A)",
                  border: active ? `1px solid ${opt.color}` : "0.5px solid var(--ls-border, #C9C2AB)",
                  borderRadius: 10,
                  fontSize: 13,
                  fontWeight: active ? 500 : 400,
                  cursor: "pointer",
                  transition: "all 150ms ease",
                }}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </Field>
    </Card>
  );
}

function SandboxStep2Bilan({
  bilan,
  onChange,
  bmi,
}: {
  bilan: SandboxBilan;
  onChange: (b: SandboxBilan) => void;
  bmi: number;
}) {
  const bmiCategory = bmi < 18.5 ? "Insuffisant" : bmi < 25 ? "Normal" : bmi < 30 ? "Surpoids" : "Obésité";
  const bmiColor = bmi < 18.5 ? "#5A8C7B" : bmi < 25 ? "#5A8C7B" : bmi < 30 ? "#B8922A" : "#C97A5C";

  return (
    <Card title="⚖️ Bilan corporel">
      <p style={{ fontSize: 13, color: "var(--ls-text-muted, #5F5E5A)", marginBottom: 16 }}>
        Saisie des données mesurées au scan. Les ranges réalistes sont préchargés.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <Field label="Poids (kg)">
          <input
            type="number"
            min={35}
            max={200}
            step={0.1}
            value={bilan.weightKg}
            onChange={(e) => onChange({ ...bilan, weightKg: Number(e.target.value) })}
            style={inputStyle}
          />
        </Field>
        <Field label="Taille (cm)">
          <input
            type="number"
            min={130}
            max={220}
            value={bilan.heightCm}
            onChange={(e) => onChange({ ...bilan, heightCm: Number(e.target.value) })}
            style={inputStyle}
          />
        </Field>
        <Field label="% Masse grasse">
          <input
            type="number"
            min={5}
            max={60}
            step={0.1}
            value={bilan.bodyFatPct}
            onChange={(e) => onChange({ ...bilan, bodyFatPct: Number(e.target.value) })}
            style={inputStyle}
          />
        </Field>
        <Field label="% Masse musculaire">
          <input
            type="number"
            min={10}
            max={60}
            step={0.1}
            value={bilan.muscleMassPct}
            onChange={(e) => onChange({ ...bilan, muscleMassPct: Number(e.target.value) })}
            style={inputStyle}
          />
        </Field>
      </div>

      {/* IMC live */}
      <div
        style={{
          marginTop: 20,
          padding: "14px 16px",
          background: "var(--ls-surface2, #FAF6E8)",
          border: `1px solid ${bmiColor}30`,
          borderRadius: 12,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 10,
        }}
      >
        <div>
          <div style={{ fontSize: 11, color: "var(--ls-text-muted, #6B6B62)", letterSpacing: 0.4, textTransform: "uppercase" }}>
            IMC calculé
          </div>
          <div style={{ fontFamily: "Syne, Georgia, serif", fontSize: 24, fontWeight: 500, color: bmiColor }}>
            {bmi.toFixed(1)}
          </div>
        </div>
        <div
          style={{
            padding: "6px 12px",
            background: `${bmiColor}15`,
            color: bmiColor,
            borderRadius: 6,
            fontSize: 12,
            fontWeight: 500,
          }}
        >
          {bmiCategory}
        </div>
      </div>
    </Card>
  );
}

function SandboxStep3Programme({
  objective,
  products,
  selected,
  onToggle,
  totalPv,
  totalPrice,
}: {
  objective: SandboxObjective;
  products: SandboxProduct[];
  selected: string[];
  onToggle: (id: string) => void;
  totalPv: number;
  totalPrice: number;
}) {
  return (
    <Card title="🎯 Recommande un programme">
      <p style={{ fontSize: 13, color: "var(--ls-text-muted, #5F5E5A)", marginBottom: 16 }}>
        Coche au moins 2 produits adaptés à l'objectif <strong>{objective === "sport" ? "sport" : "perte de poids"}</strong>. Le total PV se met à jour en temps réel.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {products.map((p) => {
          const isSelected = selected.includes(p.id);
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => onToggle(p.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "12px 14px",
                background: isSelected ? "color-mix(in srgb, #B8922A 8%, var(--ls-surface, #FFFEF8))" : "var(--ls-surface, #FFFEF8)",
                border: isSelected ? "1px solid #B8922A" : "0.5px solid var(--ls-border, #E5DFCF)",
                borderRadius: 10,
                cursor: "pointer",
                textAlign: "left",
                transition: "all 150ms ease",
              }}
            >
              <span style={{ fontSize: 24 }}>{p.emoji}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 500, color: "var(--ls-text, #2C2C2A)" }}>{p.name}</div>
                <div style={{ fontSize: 12, color: "var(--ls-text-muted, #6B6B62)", marginTop: 2 }}>
                  {p.priceEur}€ · {p.pv} PV · {p.durationDays}j
                </div>
              </div>
              <div
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 6,
                  border: isSelected ? "1px solid #B8922A" : "1px solid var(--ls-border, #C9C2AB)",
                  background: isSelected ? "#B8922A" : "transparent",
                  color: "white",
                  fontSize: 14,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {isSelected ? "✓" : ""}
              </div>
            </button>
          );
        })}
      </div>

      {/* Total PV / prix */}
      <div
        style={{
          marginTop: 18,
          padding: "12px 16px",
          background: "var(--ls-surface2, #FAF6E8)",
          borderRadius: 10,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 10,
        }}
      >
        <div style={{ fontSize: 13, color: "var(--ls-text-muted, #6B6B62)" }}>
          {selected.length} produit{selected.length > 1 ? "s" : ""} sélectionné{selected.length > 1 ? "s" : ""}
        </div>
        <div style={{ fontFamily: "Syne, Georgia, serif", fontSize: 18, color: "#B8922A", fontWeight: 500 }}>
          {totalPrice}€ · {totalPv} PV
        </div>
      </div>

      {selected.length < 2 && (
        <p style={{ marginTop: 12, fontSize: 12, color: "#C97A5C" }}>
          ⚠️ Sélectionne au moins 2 produits pour passer à la suite.
        </p>
      )}
    </Card>
  );
}

function SandboxStep4Recap({
  client,
  bilan,
  bmi,
  selectedProducts,
  totalPv,
  totalPrice,
}: {
  client: SandboxClient;
  bilan: SandboxBilan;
  bmi: number;
  selectedProducts: SandboxProduct[];
  totalPv: number;
  totalPrice: number;
}) {
  return (
    <Card title="🎉 Bravo, bilan complet !">
      <p style={{ fontSize: 14, color: "var(--ls-text, #2C2C2A)", marginBottom: 18, lineHeight: 1.6 }}>
        Tu viens de réaliser un bilan complet de bout en bout. Voici le récap de ton client fictif :
      </p>

      <div style={{ display: "grid", gap: 14 }}>
        <RecapBlock
          title="👤 Client"
          rows={[
            ["Nom", `${client.firstName} ${client.lastName}`],
            ["Âge", `${client.age} ans`],
            ["Ville", client.city],
            ["Objectif", client.objective === "sport" ? "Prise de masse / sport" : "Perte de poids"],
          ]}
        />

        <RecapBlock
          title="⚖️ Bilan corporel"
          rows={[
            ["Poids", `${bilan.weightKg} kg`],
            ["Taille", `${bilan.heightCm} cm`],
            ["IMC", bmi.toFixed(1)],
            ["% Masse grasse", `${bilan.bodyFatPct}%`],
            ["% Masse musculaire", `${bilan.muscleMassPct}%`],
          ]}
        />

        <RecapBlock
          title={`🎯 Programme (${selectedProducts.length} produits)`}
          rows={[
            ...selectedProducts.map((p) => [
              `${p.emoji} ${p.name}`,
              `${p.priceEur}€ · ${p.pv} PV`,
            ] as [string, string]),
            ["TOTAL", `${totalPrice}€ · ${totalPv} PV`],
          ]}
          highlightLast
        />
      </div>

      <div
        style={{
          marginTop: 20,
          padding: "14px 16px",
          background: "linear-gradient(135deg, #FFF5E0, #FAF0CB)",
          border: "1px solid #EFD9A1",
          borderRadius: 12,
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: 32, marginBottom: 6 }}>🏆</div>
        <div style={{ fontFamily: "Syne, Georgia, serif", fontSize: 16, color: "#5C4A0F", fontWeight: 500 }}>
          Tu maîtrises le flow complet bilan → programme.
        </div>
        <div style={{ fontSize: 12, color: "#6B6B62", marginTop: 6 }}>
          Aucune donnée n'a été enregistrée — tu peux refaire l'exercice quand tu veux depuis l'Academy.
        </div>
      </div>
    </Card>
  );
}

// ─── UI helpers ──────────────────────────────────────────────────────────────

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        background: "var(--ls-surface, #FFFEF8)",
        border: "0.5px solid var(--ls-border, #E5DFCF)",
        borderRadius: 16,
        padding: 22,
      }}
    >
      <h2
        style={{
          fontFamily: "Syne, Georgia, serif",
          fontSize: 18,
          fontWeight: 500,
          margin: "0 0 14px 0",
          color: "var(--ls-text, #2C2C2A)",
        }}
      >
        {title}
      </h2>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "block", marginBottom: 14 }}>
      <div
        style={{
          fontSize: 12,
          color: "var(--ls-text-muted, #6B6B62)",
          marginBottom: 6,
          letterSpacing: 0.3,
          textTransform: "uppercase",
        }}
      >
        {label}
      </div>
      {children}
    </label>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  fontSize: 14,
  border: "0.5px solid var(--ls-border, #C9C2AB)",
  borderRadius: 8,
  background: "var(--ls-surface, #FFFEF8)",
  color: "var(--ls-text, #2C2C2A)",
  fontFamily: "inherit",
};

function RecapBlock({
  title,
  rows,
  highlightLast = false,
}: {
  title: string;
  rows: [string, string][];
  highlightLast?: boolean;
}) {
  return (
    <div
      style={{
        background: "var(--ls-surface2, #FAF6E8)",
        borderRadius: 10,
        padding: "12px 14px",
      }}
    >
      <div
        style={{
          fontSize: 11,
          color: "var(--ls-text-muted, #6B6B62)",
          letterSpacing: 0.4,
          textTransform: "uppercase",
          marginBottom: 8,
        }}
      >
        {title}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {rows.map(([label, value], i) => {
          const isLast = i === rows.length - 1 && highlightLast;
          return (
            <div
              key={`${label}-${i}`}
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 13,
                padding: isLast ? "6px 0 0 0" : 0,
                borderTop: isLast ? "0.5px solid var(--ls-border, #E5DFCF)" : "none",
                marginTop: isLast ? 6 : 0,
                color: isLast ? "#B8922A" : "var(--ls-text, #2C2C2A)",
                fontWeight: isLast ? 500 : 400,
              }}
            >
              <span>{label}</span>
              <span>{value}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
