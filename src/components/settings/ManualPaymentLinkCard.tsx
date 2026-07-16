// =============================================================================
// ManualPaymentLinkCard — génère un lien de paiement « montant libre »
// (chantier Encaissement distri, 2026-06-15 ; Square ajouté 2026-07-16).
//
// Pour encaisser HORS bilan online (client au comptoir, panier perso) : le distri
// saisit un montant + une description → l'edge create-manual-payment-link crée un
// lien de paiement (Square ou Stripe, selon la config du distri) SUR SON compte
// (credentials côté serveur, jamais ici) → le distri copie / envoie par
// WhatsApp. Le client paie quand il veut.
// =============================================================================

import { useState } from "react";
import { getSupabaseClient } from "../../services/supabaseClient";

export function ManualPaymentLinkCard() {
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [clientName, setClientName] = useState("");
  const [loading, setLoading] = useState(false);
  const [link, setLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const amountNum = Number(amount.replace(",", "."));
  const canGenerate = Number.isFinite(amountNum) && amountNum > 0;

  async function generate() {
    setLoading(true);
    setError(null);
    setLink(null);
    setCopied(false);
    try {
      const sb = await getSupabaseClient();
      if (!sb) throw new Error("Service indisponible");
      const { data, error: fnErr } = await sb.functions.invoke("create-manual-payment-link", {
        body: {
          amount_euros: amountNum,
          description: description.trim(),
          client_name: clientName.trim(),
        },
      });
      const payload = data as { url?: string; error?: string } | null;
      if (fnErr || !payload) throw new Error("Erreur réseau");
      if (payload.error === "not_configured") {
        throw new Error("Active d'abord ton encaissement ci-dessus (credentials + Actif).");
      }
      if (payload.error || !payload.url) {
        throw new Error("Impossible de générer le lien — vérifie ta config d'encaissement.");
      }
      setLink(payload.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setLoading(false);
    }
  }

  function copyLink() {
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
    <div
      style={{
        borderRadius: 14,
        border: "1px solid var(--ls-border)",
        background: "var(--ls-surface)",
        padding: 18,
        marginTop: 16,
      }}
    >
      <div style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: 15, color: "var(--ls-text)" }}>
        🔗 Générer un lien de paiement
      </div>
      <div style={{ fontSize: 12.5, color: "var(--ls-text-muted)", marginTop: 3, maxWidth: 520 }}>
        Pour encaisser hors bilan (comptoir, panier, montant sur-mesure). Le client paie quand il veut,
        l&apos;argent arrive directement sur ton compte.
      </div>

      <div style={{ display: "grid", gap: 10, marginTop: 14 }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <div style={{ flex: "0 0 130px" }}>
            <div style={labelStyle}>Montant (€)</div>
            <input
              type="number"
              inputMode="decimal"
              min={1}
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="120"
              style={inputStyle}
            />
          </div>
          <div style={{ flex: 1, minWidth: 160 }}>
            <div style={labelStyle}>Nom du client (optionnel)</div>
            <input
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="Jean Dupont"
              style={inputStyle}
            />
          </div>
        </div>
        <div>
          <div style={labelStyle}>Description</div>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Programme La Base 360"
            style={inputStyle}
          />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() => void generate()}
            disabled={!canGenerate || loading}
            style={{
              padding: "9px 16px",
              borderRadius: 10,
              border: "none",
              background: "var(--ls-gold)",
              color: "#1a1407",
              fontFamily: "Syne, sans-serif",
              fontWeight: 700,
              fontSize: 13,
              cursor: !canGenerate || loading ? "default" : "pointer",
              opacity: !canGenerate || loading ? 0.6 : 1,
            }}
          >
            {loading ? "Génération…" : "Générer le lien"}
          </button>
          {error ? <span style={{ fontSize: 12.5, color: "var(--ls-coral, #f87171)" }}>{error}</span> : null}
        </div>

        {link ? (
          <div
            style={{
              display: "grid",
              gap: 10,
              padding: "12px 14px",
              borderRadius: 12,
              background: "var(--ls-surface2)",
              border: "1px solid var(--ls-border)",
            }}
          >
            <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ls-text)" }}>
              ✅ Lien prêt — envoie-le à ton client :
            </div>
            <div style={{ wordBreak: "break-all", fontFamily: "monospace", fontSize: 11.5, color: "var(--ls-text-muted)" }}>
              {link}
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button type="button" onClick={copyLink} style={pillBtn}>
                {copied ? "✅ Copié" : "📋 Copier"}
              </button>
              <a
                href={`https://wa.me/?text=${waMessage}`}
                target="_blank"
                rel="noreferrer"
                style={{ ...pillBtn, textDecoration: "none", display: "inline-flex", alignItems: "center" }}
              >
                💬 WhatsApp
              </a>
              <a href={`sms:?&body=${waMessage}`} style={{ ...pillBtn, textDecoration: "none", display: "inline-flex", alignItems: "center" }}>
                ✉️ SMS
              </a>
            </div>
            <div style={{ fontSize: 11, color: "var(--ls-text-muted)" }}>
              Tu es notifié dès que le client a payé (et tu le retrouves dans ton dashboard Square ou Stripe).
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  fontSize: 12.5,
  fontWeight: 600,
  color: "var(--ls-text)",
  marginBottom: 4,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "9px 12px",
  borderRadius: 10,
  border: "1px solid var(--ls-border)",
  background: "var(--ls-surface2)",
  color: "var(--ls-text)",
  fontSize: 13.5,
  outline: "none",
};

const pillBtn: React.CSSProperties = {
  padding: "7px 13px",
  borderRadius: 9,
  border: "1px solid var(--ls-border)",
  background: "var(--ls-surface)",
  color: "var(--ls-teal)",
  fontSize: 12.5,
  fontWeight: 600,
  cursor: "pointer",
};
