// =============================================================================
// SendBusinessPlanButton — V3 funnel business (chantier 2026-11-07)
// =============================================================================
//
// S'affiche dans ActionsTab si le client a coche un montant complement de
// revenus dans son bilan (business_interest_amount > 0). Permet au coach
// d'envoyer le plan d'opportunite (lien /opportunite) via WhatsApp, SMS,
// Email ou copier le lien.
//
// Au click sur un canal, le bouton :
// 1. Ouvre l'URL deep-link (wa.me, sms:, mailto:)
// 2. Appelle RPC mark_business_plan_sent pour tracker le timestamp
// =============================================================================

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppContext } from "../../context/AppContext";
import { useToast, buildSupabaseErrorToast } from "../../context/ToastContext";
import { getSupabaseClient } from "../../services/supabaseClient";
import type { Client } from "../../types/domain";

interface Props {
  client: Client;
}

function buildMessage(client: Client, coachFirstName: string, plansUrl: string): string {
  const fn = client.firstName.trim() || "toi";
  const amount = client.businessInterestAmount ?? 0;
  const amountTxt = amount > 0 ? ` pour viser +${amount} €/mois` : "";
  return (
    `Salut ${fn} !\n\n` +
    `J'ai vu que tu cherches un complément de revenu${amountTxt}. Voici un plan ` +
    `concret avec les paliers, les chiffres et comment ça se passe :\n\n` +
    `${plansUrl}\n\n` +
    `On en discute quand tu veux ?\n` +
    `${coachFirstName}`
  );
}

export function SendBusinessPlanButton({ client }: Props) {
  const navigate = useNavigate();
  const { currentUser } = useAppContext();
  const { push: pushToast } = useToast();
  const [open, setOpen] = useState(false);
  const [marking, setMarking] = useState(false);

  // Conditions d'affichage : uniquement si client a coche > 0
  const amount = client.businessInterestAmount ?? 0;
  if (amount <= 0) return null;

  const coachFirstName = (currentUser?.name ?? "").split(" ")[0] || "ton coach";
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  const plansUrl = `${baseUrl}/opportunite${
    currentUser?.id ? `?ref=${currentUser.id}` : ""
  }`;
  const message = buildMessage(client, coachFirstName, plansUrl);

  // Phone propre pour WhatsApp / SMS
  const phoneClean = (client.phone ?? "").replace(/[^\d+]/g, "");
  const phoneE164 = phoneClean.startsWith("+")
    ? phoneClean
    : phoneClean.startsWith("0")
      ? `+33${phoneClean.slice(1)}`
      : phoneClean;

  async function markSent(channel: string) {
    setMarking(true);
    try {
      const sb = await getSupabaseClient();
      if (!sb) throw new Error("Service indisponible.");
      const { error } = await sb.rpc("mark_business_plan_sent", { p_client_id: client.id });
      if (error) throw new Error(error.message);
      pushToast({
        tone: "success",
        title: "Plan envoyé",
        message: `${channel} — ${client.firstName}`,
      });
    } catch (e) {
      pushToast(buildSupabaseErrorToast(e, "Marquage échoué — l'envoi a quand même eu lieu."));
    } finally {
      setMarking(false);
      setOpen(false);
    }
  }

  function openWhatsApp() {
    const url = `https://wa.me/${phoneE164.replace("+", "")}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank", "noopener");
    void markSent("WhatsApp");
  }

  function openSMS() {
    // iOS et Android acceptent sms: avec body=
    const url = `sms:${phoneE164}?&body=${encodeURIComponent(message)}`;
    window.location.href = url;
    void markSent("SMS");
  }

  function openEmail() {
    if (!client.email) {
      pushToast({ tone: "warning", title: "Pas d'email", message: "Ce client n'a pas d'email." });
      return;
    }
    const subject = encodeURIComponent("Ton plan d'opportunité — La Base 360");
    const url = `mailto:${client.email}?subject=${subject}&body=${encodeURIComponent(message)}`;
    window.location.href = url;
    void markSent("Email");
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(plansUrl);
      pushToast({ tone: "success", title: "Lien copié", message: "Colle où tu veux." });
      void markSent("Lien copié");
    } catch {
      pushToast({ tone: "warning", title: "Copie échouée", message: "Sélectionne le lien à la main." });
    }
  }

  const wasSent = !!(client as Client & { businessPlanSentAt?: string | null }).businessPlanSentAt;

  return (
    <>
      <div
        style={{
          padding: 14,
          marginTop: 12,
          borderRadius: 16,
          background:
            "linear-gradient(135deg, color-mix(in srgb, #10B981 8%, var(--ls-surface)) 0%, color-mix(in srgb, #8B5CF6 6%, var(--ls-surface)) 100%)",
          border: "0.5px solid color-mix(in srgb, #10B981 30%, transparent)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 6,
            flexWrap: "wrap",
          }}
        >
          <span style={{ fontSize: 18 }}>🌟</span>
          <strong style={{ fontFamily: "Sora, sans-serif", fontSize: 14, color: "var(--ls-text)" }}>
            Client ouvert·e au business
          </strong>
          <span
            style={{
              padding: "2px 8px",
              borderRadius: 6,
              background: "color-mix(in srgb, #10B981 14%, transparent)",
              color: "#10B981",
              fontSize: 11,
              fontWeight: 700,
            }}
          >
            +{amount} €/mois souhaités
          </span>
        </div>
        <p
          style={{
            fontSize: 12,
            color: "var(--ls-text-muted)",
            lineHeight: 1.5,
            margin: "0 0 10px",
          }}
        >
          {wasSent
            ? "Plan déjà envoyé. Pense à le relancer si pas de retour."
            : "Envoie-lui le plan d'opportunité avec un lien personnalisé. Choisis ton canal."}
        </p>
        <button
          type="button"
          onClick={() => setOpen(true)}
          style={{
            width: "100%",
            padding: "10px 16px",
            borderRadius: 10,
            border: "none",
            background: "linear-gradient(135deg, #10B981 0%, #06B6D4 50%, #8B5CF6 100%)",
            color: "white",
            fontFamily: "Sora, sans-serif",
            fontSize: 13,
            fontWeight: 700,
            cursor: "pointer",
            boxShadow: "0 4px 14px rgba(16,185,129,0.25)",
          }}
        >
          📨 {wasSent ? "Renvoyer le plan d'opportunité" : "Envoyer le plan d'opportunité"}
        </button>
      </div>

      {open ? (
        <div
          role="button"
          tabIndex={0}
          onClick={() => setOpen(false)}
          onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
          aria-label="Fermer"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15,23,42,0.6)",
            backdropFilter: "blur(6px)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Choisir le canal"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
            style={{
              background: "var(--ls-surface)",
              borderRadius: 18,
              padding: 24,
              maxWidth: 400,
              width: "100%",
              border: "0.5px solid var(--ls-border)",
              boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
            }}
          >
            <h3
              style={{
                fontFamily: "Sora, sans-serif",
                fontWeight: 800,
                fontSize: 18,
                margin: "0 0 6px",
                color: "var(--ls-text)",
              }}
            >
              📨 Envoyer le plan
            </h3>
            <p
              style={{
                fontSize: 12,
                color: "var(--ls-text-muted)",
                margin: "0 0 18px",
                lineHeight: 1.5,
              }}
            >
              Le message est pré-rédigé avec le prénom de {client.firstName}. Tu peux
              l'éditer dans WhatsApp/SMS avant d'envoyer.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <button
                type="button"
                onClick={openWhatsApp}
                disabled={marking || !phoneE164}
                style={channelBtnStyle("#25D366")}
              >
                <span style={{ fontSize: 22 }}>💬</span>
                <span style={{ flex: 1, textAlign: "left" }}>WhatsApp</span>
                <span style={{ fontSize: 11, color: "var(--ls-text-muted)" }}>
                  {phoneE164 || "tél manquant"}
                </span>
              </button>
              <button
                type="button"
                onClick={openSMS}
                disabled={marking || !phoneE164}
                style={channelBtnStyle("#3B82F6")}
              >
                <span style={{ fontSize: 22 }}>💬</span>
                <span style={{ flex: 1, textAlign: "left" }}>SMS</span>
                <span style={{ fontSize: 11, color: "var(--ls-text-muted)" }}>
                  {phoneE164 || "tél manquant"}
                </span>
              </button>
              <button
                type="button"
                onClick={openEmail}
                disabled={marking || !client.email}
                style={channelBtnStyle("#A855F7")}
              >
                <span style={{ fontSize: 22 }}>📧</span>
                <span style={{ flex: 1, textAlign: "left" }}>Email</span>
                <span style={{ fontSize: 11, color: "var(--ls-text-muted)" }}>
                  {client.email || "email manquant"}
                </span>
              </button>
              <button
                type="button"
                onClick={copyLink}
                disabled={marking}
                style={channelBtnStyle("#64748B")}
              >
                <span style={{ fontSize: 22 }}>🔗</span>
                <span style={{ flex: 1, textAlign: "left" }}>Copier le lien</span>
                <span style={{ fontSize: 11, color: "var(--ls-text-muted)" }}>
                  /opportunite
                </span>
              </button>
            </div>

            {/* Lien vers Outils Prospection avec contexte client (admin only) */}
            {currentUser?.role === "admin" ? (
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  navigate(`/outils-prospection?client=${client.id}&from=business`);
                }}
                style={{
                  width: "100%",
                  marginTop: 12,
                  padding: "10px 14px",
                  borderRadius: 10,
                  border: "0.5px dashed color-mix(in srgb, #10B981 35%, var(--ls-border))",
                  background: "color-mix(in srgb, #10B981 6%, var(--ls-surface2))",
                  color: "#10B981",
                  fontFamily: "DM Sans, sans-serif",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                }}
              >
                🔍 Voir tous les outils prospection →
              </button>
            ) : null}

            <div
              style={{
                marginTop: 16,
                padding: "10px 12px",
                background: "var(--ls-surface2)",
                borderRadius: 10,
                fontSize: 11,
                color: "var(--ls-text-muted)",
                fontStyle: "italic",
              }}
            >
              💡 Le lien embarque ton ID de coach (?ref=) pour qu'on sache que c'est toi
              qui as partagé. Si {client.firstName} remplit le form, le lead est attribué
              à ton équipe.
            </div>

            <button
              type="button"
              onClick={() => setOpen(false)}
              style={{
                width: "100%",
                marginTop: 14,
                padding: "9px 16px",
                borderRadius: 10,
                border: "0.5px solid var(--ls-border)",
                background: "transparent",
                color: "var(--ls-text-muted)",
                fontFamily: "DM Sans, sans-serif",
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              Annuler
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}

function channelBtnStyle(accentColor: string): React.CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "12px 16px",
    borderRadius: 12,
    border: `0.5px solid ${accentColor}`,
    background: `color-mix(in srgb, ${accentColor} 6%, var(--ls-surface))`,
    color: "var(--ls-text)",
    fontFamily: "DM Sans, sans-serif",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    transition: "transform 0.15s ease",
  };
}
