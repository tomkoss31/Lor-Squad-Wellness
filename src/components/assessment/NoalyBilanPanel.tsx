// =============================================================================
// NoalyBilanPanel — Noaly sur le bilan PHYSIQUE (étape « Programme proposé »).
//
// Principe « assistant, pas pilote auto » (validé Thomas 2026-06-11) : Noaly NE
// modifie JAMAIS le bilan ni la sélection produits. Elle s'appuie sur la logique
// déterministe déjà calculée (besoins / boosters / assiette / cibles) et la
// SYNTHÉTISE pour le coach pendant le RDV :
//   1. une synthèse claire du bilan,
//   2. un PITCH à dire à voix haute au client (copiable),
//   3. des points d'attention = simples suggestions (incohérences/manques),
//   4. un focus programme/assiette pour ce profil.
//
// Optionnel et non bloquant : un bouton « ✨ Demande à Noaly ». Le `summary` est
// construit côté NewAssessmentPage (le coach a déjà toutes les données saisies).
// Coach-facing → modèle Opus (défaut edge). Gate gracieux sans clé API (503).
// =============================================================================

import { useCallback, useState } from "react";
import { useAppContext } from "../../context/AppContext";
import { getSupabaseClient } from "../../services/supabaseClient";

interface BilanAnalysis {
  synthese?: string;
  pitch?: string;
  points_attention?: string[];
  programme_note?: string;
}

interface Props {
  /** Résumé du bilan construit par l'appelant (poids, composition, objectif,
   *  sport, apports, besoins détectés, assiette, programme choisi…). */
  summary: string;
  /** Désactivé tant que le bilan n'a pas assez de matière (ex : poids non saisi). */
  disabled?: boolean;
}

export function NoalyBilanPanel({ summary, disabled }: Props) {
  const { currentUser } = useAppContext();
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<BilanAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refine, setRefine] = useState("");
  const [copied, setCopied] = useState(false);

  const ask = useCallback(
    async (refineText: string) => {
      setLoading(true);
      setError(null);
      try {
        const sb = await getSupabaseClient();
        if (!sb) throw new Error("Service indisponible.");
        const { data, error: invErr } = await sb.functions.invoke("noaly", {
          body: {
            mode: "bilan_analysis",
            summary,
            refine: refineText || undefined,
            coachUserId: currentUser?.id,
            coachFirstName: (currentUser?.name ?? "").split(/\s+/)[0],
          },
        });
        const payload = data as
          | { analysis?: BilanAnalysis; error?: string; message?: string }
          | null;

        if (invErr || payload?.error || !payload?.analysis) {
          // Tente de lire le corps d'une réponse non-2xx (503 « en attente »…).
          let friendly =
            payload?.message ??
            "Noaly est momentanément indisponible — réessaie dans un instant 🌿";
          const ctx = (invErr as { context?: Response } | null)?.context;
          if (ctx && typeof ctx.json === "function") {
            try {
              const body = await ctx.json();
              if (body?.message) friendly = body.message as string;
            } catch {
              /* ignore */
            }
          }
          setError(friendly);
          return;
        }
        setAnalysis(payload.analysis);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erreur inattendue.");
      } finally {
        setLoading(false);
      }
    },
    [summary, currentUser],
  );

  const copyPitch = useCallback(() => {
    if (!analysis?.pitch) return;
    void navigator.clipboard?.writeText(analysis.pitch).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    });
  }, [analysis]);

  const points = (analysis?.points_attention ?? []).filter(
    (p) => typeof p === "string" && p.trim().length > 0,
  );

  return (
    <section
      style={{
        borderRadius: 16,
        border: "0.5px solid color-mix(in srgb, var(--ls-gold) 40%, transparent)",
        background:
          "linear-gradient(180deg, color-mix(in srgb, var(--ls-gold) 8%, var(--ls-surface)) 0%, var(--ls-surface) 100%)",
        padding: 16,
      }}
    >
      {/* En-tête */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
        <span
          aria-hidden="true"
          style={{
            fontSize: 20,
            lineHeight: 1,
            filter: "drop-shadow(0 0 6px color-mix(in srgb, var(--ls-gold) 50%, transparent))",
          }}
        >
          ✨
        </span>
        <div>
          <div
            style={{
              fontFamily: "Syne, sans-serif",
              fontWeight: 700,
              fontSize: 15,
              color: "var(--ls-text)",
            }}
          >
            Demande à Noaly
          </div>
          <div style={{ fontSize: 12, color: "var(--ls-text-muted)", marginTop: 1 }}>
            Une lecture du bilan + un pitch à dire au client. Noaly ne modifie rien — elle te
            briefe.
          </div>
        </div>
      </div>

      {/* Bouton initial */}
      {!analysis && !error && (
        <button
          type="button"
          disabled={disabled || loading}
          onClick={() => void ask("")}
          style={{
            marginTop: 12,
            width: "100%",
            padding: "11px 14px",
            borderRadius: 12,
            border: "none",
            cursor: disabled || loading ? "not-allowed" : "pointer",
            opacity: disabled ? 0.5 : 1,
            fontFamily: "Syne, sans-serif",
            fontWeight: 700,
            fontSize: 14,
            color: "#1a1407",
            background:
              "linear-gradient(135deg, var(--ls-gold) 0%, color-mix(in srgb, var(--ls-gold) 70%, var(--ls-coral)) 100%)",
          }}
        >
          {loading
            ? "Noaly analyse le bilan…"
            : disabled
              ? "Renseigne le poids pour lancer Noaly"
              : "✨ Analyser ce bilan"}
        </button>
      )}

      {/* Erreur / gate */}
      {error && (
        <div style={{ marginTop: 12 }}>
          <div
            style={{
              padding: "10px 12px",
              borderRadius: 10,
              background: "color-mix(in srgb, var(--ls-coral) 12%, var(--ls-surface2))",
              border: "0.5px solid color-mix(in srgb, var(--ls-coral) 35%, transparent)",
              color: "var(--ls-text)",
              fontSize: 13,
              lineHeight: 1.45,
            }}
          >
            {error}
          </div>
          <button
            type="button"
            onClick={() => {
              setError(null);
              void ask(refine);
            }}
            style={{
              marginTop: 8,
              padding: "8px 12px",
              borderRadius: 10,
              border: "0.5px solid var(--ls-border)",
              background: "var(--ls-surface2)",
              color: "var(--ls-text)",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Réessayer
          </button>
        </div>
      )}

      {/* Résultat */}
      {analysis && (
        <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 12 }}>
          {/* Synthèse */}
          {analysis.synthese && (
            <Block label="Synthèse du bilan" emoji="🧭" color="var(--ls-teal)">
              <p style={pStyle}>{analysis.synthese}</p>
            </Block>
          )}

          {/* Pitch à dire */}
          {analysis.pitch && (
            <Block label="À dire au client" emoji="🎤" color="var(--ls-gold)">
              <p style={{ ...pStyle, whiteSpace: "pre-wrap", fontStyle: "italic" }}>
                {analysis.pitch}
              </p>
              <button
                type="button"
                onClick={copyPitch}
                style={{
                  marginTop: 8,
                  padding: "6px 12px",
                  borderRadius: 9,
                  border: "0.5px solid color-mix(in srgb, var(--ls-gold) 45%, transparent)",
                  background: "color-mix(in srgb, var(--ls-gold) 12%, transparent)",
                  color: "var(--ls-text)",
                  fontSize: 12.5,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {copied ? "✓ Copié" : "Copier le pitch"}
              </button>
            </Block>
          )}

          {/* Points d'attention (suggestions) */}
          {points.length > 0 && (
            <Block label="Points à vérifier" emoji="💡" color="var(--ls-coral)">
              <ul style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 5 }}>
                {points.map((p, i) => (
                  <li key={i} style={{ ...pStyle, marginTop: 0 }}>
                    {p}
                  </li>
                ))}
              </ul>
              <div style={{ fontSize: 11.5, color: "var(--ls-text-hint)", marginTop: 6 }}>
                Suggestions de Noaly — à toi de juger. Le bilan n'a pas été modifié.
              </div>
            </Block>
          )}

          {/* Focus programme */}
          {analysis.programme_note && (
            <Block label="Focus programme & assiette" emoji="🍽" color="var(--ls-purple)">
              <p style={pStyle}>{analysis.programme_note}</p>
            </Block>
          )}

          {/* Affiner */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <input
              type="text"
              value={refine}
              disabled={loading}
              onChange={(e) => setRefine(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && refine.trim()) void ask(refine.trim());
              }}
              placeholder="Affiner (ex : « plus axé sport », « ton plus doux »)…"
              style={{
                flex: "1 1 200px",
                minWidth: 0,
                padding: "9px 12px",
                borderRadius: 10,
                border: "0.5px solid var(--ls-border)",
                background: "var(--ls-input-bg, var(--ls-surface2))",
                color: "var(--ls-text)",
                fontSize: 13,
              }}
            />
            <button
              type="button"
              disabled={loading || !refine.trim()}
              onClick={() => void ask(refine.trim())}
              style={{
                padding: "9px 14px",
                borderRadius: 10,
                border: "none",
                background: "var(--ls-teal)",
                color: "#04201c",
                fontSize: 13,
                fontWeight: 700,
                cursor: loading || !refine.trim() ? "not-allowed" : "pointer",
                opacity: loading || !refine.trim() ? 0.5 : 1,
              }}
            >
              {loading ? "…" : "Affiner"}
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => void ask("")}
              style={{
                padding: "9px 14px",
                borderRadius: 10,
                border: "0.5px solid var(--ls-border)",
                background: "var(--ls-surface2)",
                color: "var(--ls-text)",
                fontSize: 13,
                fontWeight: 600,
                cursor: loading ? "not-allowed" : "pointer",
              }}
            >
              Régénérer
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

const pStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 13.5,
  lineHeight: 1.55,
  color: "var(--ls-text)",
};

function Block({
  label,
  emoji,
  color,
  children,
}: {
  label: string;
  emoji: string;
  color: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        borderRadius: 12,
        border: "0.5px solid var(--ls-border)",
        background: "var(--ls-surface2)",
        padding: 12,
        borderLeft: `3px solid ${color}`,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          marginBottom: 6,
          fontFamily: "Syne, sans-serif",
          fontWeight: 700,
          fontSize: 12.5,
          letterSpacing: 0.2,
          textTransform: "uppercase",
          color,
        }}
      >
        <span aria-hidden="true">{emoji}</span>
        {label}
      </div>
      {children}
    </div>
  );
}
