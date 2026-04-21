// Chantier Lien d'invitation client app (2026-04-21) — commit 3/5.
//
// Bouton gold placé en tête de l'onglet Actions (ClientDetailPage). Au clic :
//   1. Vérifie l'existence d'un token non-consommé et non-expiré. Si oui,
//      propose de le remplacer.
//   2. Sinon (ou après confirmation de remplacement), génère un nouveau
//      token valable 7 jours, stocke en DB, ouvre une modale de partage.
//   3. Modale : lien complet + boutons Copier / WhatsApp / SMS. Info bas
//      "Valable 7 jours. Le client crée son mot de passe à la première
//      ouverture."

import { useCallback, useEffect, useState } from "react";
import type { Client } from "../../types/domain";
import { useAppContext } from "../../context/AppContext";
import { getSupabaseClient } from "../../services/supabaseClient";

function randomToken(): string {
  // 32 chars URL-safe — assez fort pour un magic link 7 jours.
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function buildInvitationUrl(token: string): string {
  const origin =
    typeof window !== "undefined" && window.location.origin
      ? window.location.origin
      : "https://lor-squad-wellness.vercel.app";
  return `${origin}/bienvenue?token=${token}`;
}

interface ActiveTokenInfo {
  token: string;
  expires_at: string;
}

export function ClientInvitationButton({ client }: { client: Client }) {
  const { currentUser } = useAppContext();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeToken, setActiveToken] = useState<ActiveTokenInfo | null>(null);
  const [showReplaceConfirm, setShowReplaceConfirm] = useState(false);
  const [copied, setCopied] = useState(false);

  const invitationUrl = activeToken ? buildInvitationUrl(activeToken.token) : "";

  const fetchActive = useCallback(async () => {
    const sb = await getSupabaseClient();
    if (!sb) return null;
    const nowIso = new Date().toISOString();
    const { data, error: err } = await sb
      .from("client_invitation_tokens")
      .select("token, expires_at, consumed_at")
      .eq("client_id", client.id)
      .is("consumed_at", null)
      .gt("expires_at", nowIso)
      .order("created_at", { ascending: false })
      .limit(1);
    if (err) return null;
    const row = data?.[0];
    if (!row) return null;
    return { token: row.token, expires_at: row.expires_at };
  }, [client.id]);

  async function generateLink(replace: boolean) {
    setLoading(true);
    setError(null);
    try {
      const sb = await getSupabaseClient();
      if (!sb) throw new Error("Supabase indisponible.");
      if (!currentUser) throw new Error("Utilisateur non connecté.");

      // Si remplacement : invalider l'ancien en le marquant consumed_at.
      if (replace) {
        await sb
          .from("client_invitation_tokens")
          .update({ consumed_at: new Date().toISOString() })
          .eq("client_id", client.id)
          .is("consumed_at", null);
      }

      const token = randomToken();
      const expiresAt = new Date(
        Date.now() + 7 * 24 * 60 * 60 * 1000,
      ).toISOString();

      const { error: insertErr } = await sb
        .from("client_invitation_tokens")
        .insert({
          client_id: client.id,
          token,
          created_by: currentUser.id,
          expires_at: expiresAt,
        });
      if (insertErr) throw new Error(insertErr.message);

      setActiveToken({ token, expires_at: expiresAt });
      setShowReplaceConfirm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de générer le lien.");
    } finally {
      setLoading(false);
    }
  }

  async function openModal() {
    setOpen(true);
    setError(null);
    setCopied(false);
    setLoading(true);
    try {
      const existing = await fetchActive();
      if (existing) {
        setActiveToken(existing);
        setShowReplaceConfirm(true);
      } else {
        setActiveToken(null);
        setShowReplaceConfirm(false);
        await generateLink(false);
      }
    } finally {
      setLoading(false);
    }
  }

  function closeModal() {
    setOpen(false);
    setActiveToken(null);
    setShowReplaceConfirm(false);
    setError(null);
    setCopied(false);
  }

  async function copyLink() {
    if (!invitationUrl) return;
    try {
      await navigator.clipboard.writeText(invitationUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("La copie automatique a échoué. Sélectionne le lien à la main.");
    }
  }

  function shareVia(channel: "whatsapp" | "sms") {
    if (!invitationUrl) return;
    const message = `Salut ${client.firstName} ! Voici le lien pour accéder à ton espace Lor'Squad : ${invitationUrl}`;
    const encoded = encodeURIComponent(message);
    const url =
      channel === "whatsapp"
        ? `https://wa.me/?text=${encoded}`
        : `sms:?&body=${encoded}`;
    window.open(url, "_blank");
  }

  // Body scroll lock while modal open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => void openModal()}
        className="ls-invitation-btn"
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 10,
          padding: "14px 18px",
          borderRadius: 14,
          background:
            "linear-gradient(135deg, rgba(201,168,76,0.18), rgba(201,168,76,0.32))",
          border: "1px solid rgba(201,168,76,0.45)",
          color: "#FDECC0",
          fontFamily: "Syne, sans-serif",
          fontWeight: 700,
          fontSize: 14,
          cursor: "pointer",
          letterSpacing: 0.2,
        }}
      >
        <span aria-hidden="true">🔗</span>
        Envoyer le lien d'accès à l'app
      </button>

      {open ? (
        <div
          role="button"
          tabIndex={0}
          aria-label="Fermer"
          onClick={closeModal}
          onKeyDown={(e) => {
            if (e.key === "Escape") closeModal();
          }}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
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
            aria-label="Partager le lien d'invitation"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
            style={{
              background: "var(--ls-surface)",
              borderRadius: 18,
              maxWidth: 520,
              width: "100%",
              padding: 24,
              border: "1px solid var(--ls-border)",
              boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
            }}
          >
            <p
              style={{
                fontFamily: "Syne, sans-serif",
                fontSize: 22,
                fontWeight: 700,
                color: "var(--ls-text)",
                marginBottom: 6,
              }}
            >
              Lien d'accès généré 🎉
            </p>
            <p style={{ fontSize: 13, color: "var(--ls-text-muted)", marginBottom: 16 }}>
              Pour {client.firstName} {client.lastName}
            </p>

            {loading ? (
              <p style={{ fontSize: 14, color: "var(--ls-text-muted)" }}>
                Génération en cours…
              </p>
            ) : showReplaceConfirm && activeToken ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div
                  style={{
                    padding: 14,
                    borderRadius: 12,
                    background: "rgba(251,113,133,0.12)",
                    border: "1px solid rgba(251,113,133,0.3)",
                    color: "#FBBFC8",
                    fontSize: 13,
                  }}
                >
                  Un lien actif existe déjà. Le remplacer invalide l'ancien —
                  utile si ton client n'a pas reçu le premier ou l'a perdu.
                </div>
                <button
                  type="button"
                  onClick={() => void generateLink(true)}
                  style={primaryBtnStyle()}
                >
                  Remplacer par un nouveau lien
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowReplaceConfirm(false);
                  }}
                  style={secondaryBtnStyle()}
                >
                  Utiliser le lien actuel
                </button>
              </div>
            ) : activeToken ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div
                  style={{
                    padding: 12,
                    borderRadius: 10,
                    background: "var(--ls-surface2)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    wordBreak: "break-all",
                    fontSize: 12,
                    color: "var(--ls-text)",
                    fontFamily: "DM Mono, monospace",
                  }}
                >
                  {invitationUrl}
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => void copyLink()}
                    style={shareBtnStyle("#C9A84C", "rgba(201,168,76,0.12)")}
                  >
                    {copied ? "✓ Copié" : "Copier"}
                  </button>
                  <button
                    type="button"
                    onClick={() => shareVia("whatsapp")}
                    style={shareBtnStyle("#25D366", "rgba(37,211,102,0.12)")}
                  >
                    WhatsApp
                  </button>
                  <button
                    type="button"
                    onClick={() => shareVia("sms")}
                    style={shareBtnStyle("#2DD4BF", "rgba(45,212,191,0.12)")}
                  >
                    SMS
                  </button>
                </div>

                <p style={{ fontSize: 12, color: "var(--ls-text-muted)", lineHeight: 1.5 }}>
                  Valable 7 jours. Le client crée son mot de passe à la première
                  ouverture.
                </p>
              </div>
            ) : null}

            {error ? (
              <p
                style={{
                  marginTop: 12,
                  padding: "10px 12px",
                  borderRadius: 10,
                  background: "rgba(251,113,133,0.12)",
                  color: "#FBBFC8",
                  fontSize: 13,
                }}
              >
                {error}
              </p>
            ) : null}

            <div style={{ marginTop: 18, textAlign: "right" }}>
              <button type="button" onClick={closeModal} style={secondaryBtnStyle()}>
                Fermer
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function primaryBtnStyle(): React.CSSProperties {
  return {
    padding: "12px 18px",
    borderRadius: 12,
    background: "var(--ls-gold)",
    color: "#0B0D11",
    border: "none",
    fontFamily: "Syne, sans-serif",
    fontWeight: 700,
    fontSize: 14,
    cursor: "pointer",
  };
}

function secondaryBtnStyle(): React.CSSProperties {
  return {
    padding: "10px 14px",
    borderRadius: 10,
    background: "transparent",
    color: "var(--ls-text-muted)",
    border: "1px solid var(--ls-border)",
    fontFamily: "DM Sans, sans-serif",
    fontWeight: 500,
    fontSize: 13,
    cursor: "pointer",
  };
}

function shareBtnStyle(color: string, bg: string): React.CSSProperties {
  return {
    padding: "12px 8px",
    borderRadius: 10,
    background: bg,
    color,
    border: "none",
    fontFamily: "DM Sans, sans-serif",
    fontWeight: 600,
    fontSize: 13,
    cursor: "pointer",
  };
}
