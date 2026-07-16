// =============================================================================
// InlinePaymentButton — bouton d'encaissement réutilisable (2026-07-16).
//
// Génère un lien de paiement « montant libre » (edge create-manual-payment-link,
// Square OU Stripe selon la config du distri connecté) et affiche le lien prêt
// à envoyer (Ouvrir la caisse / Copier / WhatsApp). Utilisé sur le ticket
// programme du bilan (NewAssessmentPage, étape 11) — mêmes moteur et messages
// que la page « Félicitations » (ThankYouStep) et « Mon panier ».
//
// Thème coach interne : var(--ls-*) uniquement.
// =============================================================================

import { useState } from "react";
import { getSupabaseClient } from "../../services/supabaseClient";

interface Props {
  /** Montant à encaisser (€). Le bouton ne s'affiche pas si <= 0. */
  amount: number;
  description: string;
  clientName?: string;
}

export function InlinePaymentButton({ amount, description, clientName }: Props) {
  const [loading, setLoading] = useState(false);
  const [link, setLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  if (!(amount > 0)) return null;

  async function generate() {
    if (loading) return;
    setLoading(true);
    setError(null);
    setLink(null);
    try {
      const sb = await getSupabaseClient();
      if (!sb) throw new Error("Service indisponible");
      const { data, error: fnErr } = await sb.functions.invoke("create-manual-payment-link", {
        body: {
          amount_euros: Number(amount.toFixed(2)),
          description: description.trim() || "Programme La Base 360",
          client_name: clientName?.trim() ?? "",
        },
      });
      const payload = data as { url?: string; error?: string } | null;
      if (fnErr || !payload) throw new Error("Erreur réseau");
      if (payload.error === "not_configured") {
        throw new Error("Active d'abord ton encaissement (Mon business → Encaissement).");
      }
      if (payload.error || !payload.url) throw new Error("Lien indisponible — vérifie ta config d'encaissement.");
      setLink(payload.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setLoading(false);
    }
  }

  function copy() {
    if (!link) return;
    void navigator.clipboard?.writeText(link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  }

  const waMessage = encodeURIComponent(
    `Voici ton lien de paiement sécurisé${clientName ? ` ${clientName}` : ""} 👇\n${link ?? ""}`,
  );

  return (
    <div style={{ marginTop: 12 }}>
      {!link ? (
        <>
          <button
            type="button"
            onClick={() => void generate()}
            disabled={loading}
            style={{
              width: "100%",
              padding: "12px 14px",
              borderRadius: 12,
              border: "none",
              background: "var(--ls-gold)",
              color: "#1a1407",
              fontFamily: "Syne, sans-serif",
              fontWeight: 800,
              fontSize: 14,
              cursor: loading ? "wait" : "pointer",
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? "Génération du lien…" : `💶 Encaisser ${amount.toFixed(2)} €`}
          </button>
          {error ? (
            <div style={{ fontSize: 12, color: "var(--ls-coral, #f87171)", marginTop: 8 }}>{error}</div>
          ) : null}
        </>
      ) : (
        <div
          style={{
            display: "grid",
            gap: 8,
            padding: "12px 14px",
            borderRadius: 12,
            background: "var(--ls-surface2)",
            border: "1px solid var(--ls-border)",
          }}
        >
          <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--ls-text)" }}>✅ Lien de paiement prêt</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <a
              href={link}
              target="_blank"
              rel="noreferrer"
              style={{
                flex: 1,
                minWidth: 120,
                textAlign: "center",
                padding: "9px 12px",
                borderRadius: 10,
                background: "var(--ls-teal)",
                color: "#04211d",
                fontWeight: 700,
                fontSize: 12.5,
                textDecoration: "none",
              }}
            >
              💳 Ouvrir la caisse
            </a>
            <button type="button" onClick={copy} style={pill}>
              {copied ? "✅ Copié" : "📋 Copier"}
            </button>
            <a href={`https://wa.me/?text=${waMessage}`} target="_blank" rel="noreferrer" style={{ ...pill, textDecoration: "none" }}>
              💬 WhatsApp
            </a>
          </div>
          <div style={{ fontSize: 11, color: "var(--ls-text-muted)" }}>
            L&apos;argent arrive directement sur ton compte.
          </div>
        </div>
      )}
    </div>
  );
}

const pill: React.CSSProperties = {
  padding: "9px 12px",
  borderRadius: 10,
  border: "1px solid var(--ls-border)",
  background: "var(--ls-surface)",
  color: "var(--ls-teal)",
  fontSize: 12.5,
  fontWeight: 600,
  cursor: "pointer",
};
