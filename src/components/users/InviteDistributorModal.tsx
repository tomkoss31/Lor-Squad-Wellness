// Chantier Invitation distributeur V2 (2026-04-24).
// Modale : prénom + téléphone → appel generate-distributor-invite-token
// → affiche le lien + bouton Copier + bouton WhatsApp.

import { useEffect, useState } from "react";
import { getSupabaseClient } from "../../services/supabaseClient";
import { useToast } from "../../context/ToastContext";
import { extractFunctionError } from "../../lib/utils/extractFunctionError";

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated?: () => void;
}

function buildWhatsAppUrl(phone: string, firstName: string, inviteUrl: string): string {
  const digits = phone.replace(/\D/g, "");
  const msg = `Salut ${firstName} ! Bienvenue dans l'équipe 💪 Voici ton lien d'accès : ${inviteUrl}`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(msg)}`;
}

function buildInviteUrl(token: string): string {
  if (typeof window === "undefined") return `/bienvenue-distri?token=${token}`;
  return `${window.location.origin}/bienvenue-distri?token=${token}`;
}

export function InviteDistributorModal({ open, onClose, onCreated }: Props) {
  const { push: pushToast } = useToast();
  const [firstName, setFirstName] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [generated, setGenerated] = useState<{ token: string; expires_at: string } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) {
      // reset sur fermeture
      setFirstName("");
      setPhone("");
      setErrorMsg("");
      setGenerated(null);
      setSubmitting(false);
      setCopied(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  async function handleGenerate() {
    setErrorMsg("");
    if (firstName.trim().length < 2) {
      setErrorMsg("Le prénom est trop court.");
      return;
    }
    if (phone.replace(/\D/g, "").length < 6) {
      setErrorMsg("Numéro de téléphone invalide.");
      return;
    }
    setSubmitting(true);
    try {
      const sb = await getSupabaseClient();
      if (!sb) throw new Error("Service indisponible.");
      const { data, error } = await sb.functions.invoke("generate-distributor-invite-token", {
        body: { first_name: firstName.trim(), phone: phone.trim() },
      });
      // Audit 2026-04-30 : extraction body via helper (cas 4xx/5xx).
      if (error || !data?.token) {
        const msg = await extractFunctionError(data, error, "Réponse invalide.");
        throw new Error(msg);
      }
      setGenerated({ token: data.token, expires_at: data.expires_at });
      onCreated?.();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erreur inconnue.";
      setErrorMsg(msg);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCopy() {
    if (!generated) return;
    const url = buildInviteUrl(generated.token);
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      pushToast({ tone: "success", title: "Lien copié" });
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      pushToast({ tone: "error", title: "Copie impossible", message: "Copie manuellement depuis le champ." });
    }
  }

  if (!open) return null;

  const inviteUrl = generated ? buildInviteUrl(generated.token) : "";
  const waUrl = generated ? buildWhatsAppUrl(phone, firstName, inviteUrl) : "";

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="Fermer"
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.55)",
        zIndex: 10000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Inviter un distributeur"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
        style={{
          background: "var(--ls-surface)",
          border: "1px solid var(--ls-border)",
          borderRadius: 18,
          maxWidth: 440,
          width: "100%",
          padding: 24,
          boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
          fontFamily: "DM Sans, sans-serif",
        }}
      >
        <h3
          style={{
            fontFamily: "Syne, sans-serif",
            fontSize: 18,
            fontWeight: 700,
            color: "var(--ls-text)",
            margin: 0,
            marginBottom: 14,
          }}
        >
          {generated ? "Lien généré 🎉" : "Inviter un nouveau distributeur"}
        </h3>

        {!generated ? (
          <>
            <label style={{ display: "block", marginBottom: 14 }}>
              <span style={{ fontSize: 11, color: "var(--ls-text-muted)", fontWeight: 600 }}>
                Prénom *
              </span>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Emma"
                style={{
                  display: "block",
                  width: "100%",
                  marginTop: 4,
                  padding: "9px 12px",
                  borderRadius: 10,
                  border: "1px solid var(--ls-border)",
                  background: "var(--ls-surface2)",
                  color: "var(--ls-text)",
                  fontSize: 14,
                  fontFamily: "DM Sans, sans-serif",
                }}
              />
            </label>

            <label style={{ display: "block", marginBottom: 14 }}>
              <span style={{ fontSize: 11, color: "var(--ls-text-muted)", fontWeight: 600 }}>
                Téléphone *
              </span>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="06 12 34 56 78"
                style={{
                  display: "block",
                  width: "100%",
                  marginTop: 4,
                  padding: "9px 12px",
                  borderRadius: 10,
                  border: "1px solid var(--ls-border)",
                  background: "var(--ls-surface2)",
                  color: "var(--ls-text)",
                  fontSize: 14,
                  fontFamily: "DM Sans, sans-serif",
                }}
              />
              <span style={{ fontSize: 11, color: "var(--ls-text-hint)", marginTop: 4, display: "block" }}>
                Format libre — sera nettoyé pour le lien WhatsApp.
              </span>
            </label>

            {errorMsg ? (
              <div
                style={{
                  background: "#FCEBEB",
                  color: "#501313",
                  border: "1px solid #E24B4A",
                  borderRadius: 10,
                  padding: "10px 12px",
                  fontSize: 12,
                  marginBottom: 14,
                }}
              >
                {errorMsg}
              </div>
            ) : null}

            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  padding: "10px 14px",
                  borderRadius: 10,
                  background: "transparent",
                  border: "1px solid var(--ls-border)",
                  color: "var(--ls-text-muted)",
                  cursor: "pointer",
                  fontSize: 13,
                  fontFamily: "DM Sans, sans-serif",
                }}
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => void handleGenerate()}
                disabled={submitting}
                style={{
                  padding: "10px 18px",
                  borderRadius: 10,
                  background: "linear-gradient(135deg, #EF9F27 0%, #BA7517 100%)",
                  border: "none",
                  color: "#FFFFFF",
                  cursor: submitting ? "wait" : "pointer",
                  fontSize: 13,
                  fontFamily: "DM Sans, sans-serif",
                  fontWeight: 600,
                }}
              >
                {submitting ? "Génération..." : "Générer le lien"}
              </button>
            </div>
          </>
        ) : (
          <>
            <p style={{ fontSize: 13, color: "var(--ls-text)", lineHeight: 1.5, marginTop: 0 }}>
              Envoie ce lien à <strong>{firstName}</strong> par WhatsApp. Il expire dans 7 jours.
            </p>

            <input
              readOnly
              value={inviteUrl}
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 10,
                border: "1px solid var(--ls-border)",
                background: "var(--ls-surface2)",
                color: "var(--ls-text)",
                fontSize: 12,
                fontFamily: "monospace",
                marginBottom: 12,
              }}
              onFocus={(e) => e.currentTarget.select()}
            />

            <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
              <button
                type="button"
                onClick={() => void handleCopy()}
                style={{
                  flex: 1,
                  padding: "11px 14px",
                  borderRadius: 10,
                  background: copied ? "#1D9E75" : "linear-gradient(135deg, #EF9F27 0%, #BA7517 100%)",
                  border: "none",
                  color: "#FFFFFF",
                  cursor: "pointer",
                  fontSize: 13,
                  fontFamily: "DM Sans, sans-serif",
                  fontWeight: 600,
                  transition: "background 0.2s",
                }}
              >
                {copied ? "✓ Copié" : "📋 Copier le lien"}
              </button>
              <a
                href={waUrl}
                target="_blank"
                rel="noreferrer"
                style={{
                  flex: 1,
                  padding: "11px 14px",
                  borderRadius: 10,
                  background: "#25D366",
                  color: "#FFFFFF",
                  cursor: "pointer",
                  fontSize: 13,
                  fontFamily: "DM Sans, sans-serif",
                  fontWeight: 600,
                  textDecoration: "none",
                  textAlign: "center",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                📱 WhatsApp
              </a>
            </div>

            <div style={{ textAlign: "right" }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  padding: "8px 14px",
                  borderRadius: 10,
                  background: "transparent",
                  border: "1px solid var(--ls-border)",
                  color: "var(--ls-text-muted)",
                  cursor: "pointer",
                  fontSize: 12,
                  fontFamily: "DM Sans, sans-serif",
                }}
              >
                Fermer
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
