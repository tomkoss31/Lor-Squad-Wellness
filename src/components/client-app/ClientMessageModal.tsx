// Chantier Messagerie client ↔ coach (2026-04-21).
// Modale réutilisable pour tous les messages envoyés DEPUIS l'app client
// AU coach. Insert dans client_messages → le trigger Postgres
// notify_new_client_message déclenche la push notif du coach.
//
// Utilisé par :
//   - ClientAppPage (fiche produit "Parler à mon coach")
//   - ClientAppPage (home tab "Demander une recommandation")
//   - ClientAppPage RDV fix (dual-write depuis sendRdvChangeRequest)
//
// Design volontairement grand + chaleureux (DM Sans + gold Herbalife
// classique #B8922A, cohérent avec le rest de ClientAppPage).

import { useEffect, useState } from "react";
import { getSupabaseClient } from "../../services/supabaseClient";

export type ClientMessageType = "product_request" | "recommendation" | "rdv_request" | "general";

export interface ClientMessageModalProps {
  open: boolean;
  onClose: () => void;
  /** Client (résolu depuis le token magic-link). */
  clientId: string;
  clientFirstName: string;
  clientLastName: string;
  /** Coach destinataire. */
  distributorId: string;
  /** Contexte du message — affiché dans le titre. */
  title: string;
  /** Texte en haut du formulaire (2-3 lignes max, ton chaleureux). */
  intro?: string;
  /** Type persisté dans client_messages.message_type. */
  messageType: ClientMessageType;
  /** Texte pré-rempli dans la textarea (éditable par le client). */
  defaultMessage?: string;
  /** Si le message porte sur un produit précis, son nom — persisté dans
   *  client_messages.product_name pour l'affichage coach. */
  productName?: string;
  /** Optionnel : remplacer le label du bouton d'envoi. */
  ctaLabel?: string;
}

export function ClientMessageModal({
  open,
  onClose,
  clientId,
  clientFirstName,
  clientLastName,
  distributorId,
  title,
  intro,
  messageType,
  defaultMessage,
  productName,
  ctaLabel,
}: ClientMessageModalProps) {
  const [message, setMessage] = useState<string>(defaultMessage ?? "");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  // Reset à chaque ouverture.
  useEffect(() => {
    if (!open) return;
    setMessage(defaultMessage ?? "");
    setSending(false);
    setError(null);
    setSent(false);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open, defaultMessage]);

  if (!open) return null;

  async function handleSend() {
    setError(null);
    const trimmed = message.trim();
    if (!trimmed) {
      setError("Écris un petit message avant d'envoyer.");
      return;
    }
    setSending(true);
    try {
      const sb = await getSupabaseClient();
      if (!sb) throw new Error("Service momentanément indisponible.");

      const { error: insertErr } = await sb.from("client_messages").insert({
        client_id: clientId,
        client_name: `${clientFirstName} ${clientLastName}`.trim(),
        distributor_id: distributorId,
        message_type: messageType,
        product_name: productName ?? null,
        message: trimmed,
        // Chantier messagerie bidirectionnelle (2026-04-22) : explicite pour
        // robustesse. Le default DB est 'client', mais on tient à marquer
        // l'origine au cas où le default est retiré plus tard.
        sender: "client",
      });
      if (insertErr) throw new Error(insertErr.message);

      setSent(true);
      // Laisse le toast visible 1,8s puis ferme.
      window.setTimeout(() => {
        onClose();
      }, 1800);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible d'envoyer ton message.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="Fermer"
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === "Escape" && !sending) onClose();
      }}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15, 20, 28, 0.55)",
        backdropFilter: "blur(4px)",
        zIndex: 10000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        fontFamily: "DM Sans, sans-serif",
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
        style={{
          background: "#FFFFFF",
          borderRadius: 18,
          maxWidth: 480,
          width: "100%",
          padding: 24,
          boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
          color: "#111827",
        }}
      >
        <p
          style={{
            fontFamily: "Syne, sans-serif",
            fontSize: 20,
            fontWeight: 700,
            color: "#111827",
            margin: 0,
            marginBottom: 6,
          }}
        >
          {title}
        </p>
        {intro ? (
          <p style={{ fontSize: 13, color: "#6B7280", lineHeight: 1.55, marginTop: 0 }}>
            {intro}
          </p>
        ) : null}

        {sent ? (
          <div
            style={{
              marginTop: 20,
              padding: "20px 16px",
              borderRadius: 14,
              background: "rgba(13,148,136,0.08)",
              border: "1px solid rgba(13,148,136,0.25)",
              color: "#0F766E",
              fontSize: 15,
              textAlign: "center",
              fontWeight: 600,
            }}
          >
            ✅ Ton message est parti. Ton coach te répondra très vite.
          </div>
        ) : (
          <>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={5}
              disabled={sending}
              placeholder="Explique en quelques mots ce dont tu as besoin…"
              style={{
                width: "100%",
                marginTop: 16,
                padding: "12px 14px",
                borderRadius: 12,
                border: "1px solid rgba(0,0,0,0.12)",
                background: "#FAFAFA",
                fontSize: 14,
                fontFamily: "DM Sans, sans-serif",
                color: "#111827",
                resize: "vertical",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
            {error ? (
              <p
                style={{
                  marginTop: 10,
                  padding: "10px 12px",
                  borderRadius: 10,
                  background: "rgba(220,38,38,0.08)",
                  color: "#B91C1C",
                  fontSize: 13,
                }}
              >
                {error}
              </p>
            ) : null}
            <div style={{ marginTop: 18, display: "flex", gap: 8 }}>
              <button
                type="button"
                onClick={onClose}
                disabled={sending}
                style={{
                  flex: 1,
                  padding: "12px 16px",
                  borderRadius: 12,
                  background: "#FFFFFF",
                  color: "#6B7280",
                  border: "1px solid rgba(0,0,0,0.12)",
                  fontFamily: "DM Sans, sans-serif",
                  fontWeight: 500,
                  fontSize: 14,
                  cursor: sending ? "default" : "pointer",
                }}
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => void handleSend()}
                disabled={sending || !message.trim()}
                style={{
                  flex: 1.4,
                  padding: "12px 16px",
                  borderRadius: 12,
                  background: sending || !message.trim() ? "#D5B880" : "#B8922A",
                  color: "#FFFFFF",
                  border: "none",
                  fontFamily: "Syne, sans-serif",
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: sending || !message.trim() ? "default" : "pointer",
                  letterSpacing: 0.3,
                }}
              >
                {sending ? "Envoi…" : (ctaLabel ?? "Envoyer à mon coach")}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
