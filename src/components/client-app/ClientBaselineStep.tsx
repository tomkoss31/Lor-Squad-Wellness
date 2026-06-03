// =============================================================================
// ClientBaselineStep — "Ton point de départ" (app client PWA)
// Chantier poids / point de départ — Couche 2 (2026-06-03)
//
// Affiché à l'onboarding APRÈS le tour 4 slides, seulement si le client n'a
// ni poids de départ ni mensuration. Obligatoire mais avec une porte de
// sortie discrète ("je le ferai avec mon coach" → notifie le coach).
//
// Choix body-positive : POIDS (rapide) OU MENSURATIONS (réutilise
// ClientMeasurementsSection, insert direct RLS client). Edge
// client-app-set-baseline stampe baseline_at pour ne plus re-demander.
//
// FAIL-OPEN : si l'edge échoue, on propose "Continuer quand même" → on entre
// dans l'app (jamais de client enfermé dehors).
// =============================================================================

import { useState } from "react";
import { ClientMeasurementsSection } from "../../features/measurements/ClientMeasurementsSection";

const FUNCTIONS_BASE_URL = (() => {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  if (!supabaseUrl) return null;
  return `${supabaseUrl}/functions/v1`;
})();
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

interface Props {
  token: string;
  clientId: string;
  firstName: string;
  coachFirstName?: string;
  /** Appelé quand le point de départ est posé (ou skippé / fail-open). */
  onDone: () => void;
}

type Choice = "none" | "weight" | "measurements";

const TEAL = "#0D9488";
const INK = "#0F172A";
const MUTED = "#64748B";

export function ClientBaselineStep({ token, clientId, firstName, coachFirstName, onDone }: Props) {
  const [choice, setChoice] = useState<Choice>("none");
  const [weightStr, setWeightStr] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [failed, setFailed] = useState(false);

  async function callEdge(payload: Record<string, unknown>): Promise<boolean> {
    if (!FUNCTIONS_BASE_URL || !SUPABASE_ANON_KEY) return false;
    try {
      const res = await fetch(`${FUNCTIONS_BASE_URL}/client-app-set-baseline`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ token, ...payload }),
      });
      const data = await res.json().catch(() => null);
      return Boolean(res.ok && data?.ok);
    } catch {
      return false;
    }
  }

  async function submitWeight() {
    const w = Number(weightStr.replace(",", "."));
    if (!Number.isFinite(w) || w < 20 || w > 400) return;
    setSubmitting(true);
    const ok = await callEdge({ mode: "weight", weight: w });
    setSubmitting(false);
    if (ok) onDone();
    else setFailed(true);
  }

  async function finishMeasurements() {
    setSubmitting(true);
    const ok = await callEdge({ mode: "measurements" });
    setSubmitting(false);
    // Même si le stamp échoue, les mensurations sont déjà enregistrées →
    // on laisse entrer dans l'app (fail-open).
    onDone();
    if (!ok) setFailed(true);
  }

  async function skip() {
    setSubmitting(true);
    await callEdge({ mode: "skip" });
    setSubmitting(false);
    onDone();
  }

  return (
    <div style={wrap}>
      <div style={card}>
        <div style={{ fontSize: 13, fontWeight: 700, color: TEAL, letterSpacing: "0.08em", textTransform: "uppercase" }}>
          📍 Ton point de départ
        </div>
        <h1 style={title}>
          {firstName ? `${firstName}, on fixe ton point de départ` : "On fixe ton point de départ"}
        </h1>
        <p style={subtitle}>
          Pour suivre tes progrès, on a besoin d'un repère de départ. Choisis ce
          qui te met le plus à l'aise — tu pourras changer plus tard.
        </p>

        {choice === "none" && (
          <>
            <button type="button" style={tile} onClick={() => setChoice("weight")}>
              <span style={{ fontSize: 30 }} aria-hidden="true">⚖️</span>
              <span style={tileTexts}>
                <span style={tileTitle}>Je me pèse</span>
                <span style={tileSub}>Rapide — un seul chiffre, vu par ton coach seul.</span>
              </span>
            </button>
            <button type="button" style={tile} onClick={() => setChoice("measurements")}>
              <span style={{ fontSize: 30 }} aria-hidden="true">📏</span>
              <span style={tileTexts}>
                <span style={tileTitle}>Je me mesure</span>
                <span style={tileSub}>Tour de taille, hanches… souvent plus parlant que la balance.</span>
              </span>
            </button>
          </>
        )}

        {choice === "weight" && (
          <div style={{ marginTop: 8 }}>
            <label style={fieldLabel}>Ton poids actuel (kg)</label>
            <input
              style={input}
              type="number"
              inputMode="numeric"
              value={weightStr}
              onChange={(e) => setWeightStr(e.target.value)}
              placeholder="ex. 72"
              autoFocus
            />
            <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
              <button
                type="button"
                style={{ ...primaryBtn, opacity: submitting || !weightStr ? 0.5 : 1 }}
                disabled={submitting || !weightStr}
                onClick={() => void submitWeight()}
              >
                {submitting ? "Enregistrement…" : "Valider"}
              </button>
              <button type="button" style={ghostBtn} onClick={() => setChoice("none")}>
                Retour
              </button>
            </div>
          </div>
        )}

        {choice === "measurements" && (
          <div style={{ marginTop: 8 }}>
            <ClientMeasurementsSection
              clientId={clientId}
              coachFirstName={coachFirstName}
              clientToken={token}
            />
            <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
              <button
                type="button"
                style={{ ...primaryBtn, opacity: submitting ? 0.5 : 1 }}
                disabled={submitting}
                onClick={() => void finishMeasurements()}
              >
                {submitting ? "…" : "J'ai fait mes mesures →"}
              </button>
              <button type="button" style={ghostBtn} onClick={() => setChoice("none")}>
                Retour
              </button>
            </div>
          </div>
        )}

        {/* Porte de sortie discrète — notifie le coach */}
        <button type="button" style={skipLink} disabled={submitting} onClick={() => void skip()}>
          Je le ferai avec mon coach
        </button>

        {failed && (
          <div style={failBox}>
            <p style={{ margin: "0 0 8px", fontSize: 13, color: INK }}>
              La connexion a échoué — pas grave, tu pourras le faire plus tard.
            </p>
            <button type="button" style={ghostBtn} onClick={onDone}>
              Continuer quand même →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Styles (palette app client : clair, accent teal) ───────────────────────
const wrap: React.CSSProperties = {
  minHeight: "100vh",
  background: "#FAFAFC",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 18,
  fontFamily: "Inter, system-ui, sans-serif",
};
const card: React.CSSProperties = {
  width: "100%",
  maxWidth: 460,
  background: "#fff",
  borderRadius: 22,
  padding: "28px 22px 22px",
  boxShadow: "0 12px 40px rgba(15,23,42,0.10)",
};
const title: React.CSSProperties = {
  fontFamily: "Syne, Inter, sans-serif",
  fontSize: 24,
  fontWeight: 800,
  color: INK,
  lineHeight: 1.15,
  margin: "10px 0 0",
};
const subtitle: React.CSSProperties = {
  fontSize: 14,
  color: MUTED,
  lineHeight: 1.55,
  margin: "10px 0 20px",
};
const tile: React.CSSProperties = {
  width: "100%",
  display: "flex",
  alignItems: "center",
  gap: 14,
  padding: "16px 16px",
  borderRadius: 16,
  border: "1px solid #E2E8F0",
  background: "#fff",
  cursor: "pointer",
  marginBottom: 12,
  textAlign: "left",
};
const tileTexts: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 3 };
const tileTitle: React.CSSProperties = { fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: 16, color: INK };
const tileSub: React.CSSProperties = { fontSize: 12.5, color: MUTED, lineHeight: 1.4 };
const fieldLabel: React.CSSProperties = { display: "block", fontSize: 13, fontWeight: 600, color: INK, marginBottom: 8 };
const input: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "12px 14px",
  borderRadius: 12,
  border: "1px solid #E2E8F0",
  fontSize: 16,
  fontFamily: "inherit",
  color: INK,
};
const primaryBtn: React.CSSProperties = {
  flex: 1,
  padding: "13px 18px",
  borderRadius: 12,
  border: "none",
  background: TEAL,
  color: "#fff",
  fontFamily: "Syne, sans-serif",
  fontSize: 15,
  fontWeight: 700,
  cursor: "pointer",
};
const ghostBtn: React.CSSProperties = {
  padding: "13px 16px",
  borderRadius: 12,
  border: "1px solid #E2E8F0",
  background: "#fff",
  color: MUTED,
  fontFamily: "inherit",
  fontSize: 14,
  fontWeight: 600,
  cursor: "pointer",
};
const skipLink: React.CSSProperties = {
  display: "block",
  width: "100%",
  marginTop: 18,
  background: "transparent",
  border: "none",
  color: MUTED,
  fontSize: 13,
  textDecoration: "underline",
  cursor: "pointer",
  fontFamily: "inherit",
};
const failBox: React.CSSProperties = {
  marginTop: 16,
  padding: 14,
  borderRadius: 12,
  background: "#FFF7ED",
  border: "1px solid #FED7AA",
};
