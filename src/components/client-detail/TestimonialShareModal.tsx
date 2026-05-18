// =============================================================================
// TestimonialShareModal — Chantier #11 follow-up (2026-05-18)
// =============================================================================
// Modale qui resoud le client_app_accounts.token d'un client et affiche le
// lien /temoignage/<token> avec boutons copier + partage WhatsApp/SMS.
// Si pas de client_app_accounts existant, propose de l'envoyer via accès app
// (renvoie au flux ClientAccessModal existant).
// =============================================================================

import { useEffect, useState, type CSSProperties } from "react";
import { getSupabaseClient } from "../../services/supabaseClient";
import { useToast } from "../../context/ToastContext";

interface Props {
  open: boolean;
  onClose: () => void;
  clientId: string;
  clientFirstName: string;
  clientPhone?: string | null;
}

type LoadState =
  | { kind: "loading" }
  | { kind: "missing" }
  | { kind: "ready"; token: string };

function buildTestimonialUrl(token: string): string {
  const origin =
    typeof window !== "undefined" && window.location.origin
      ? window.location.origin
      : "https://lor-squad-wellness.vercel.app";
  return `${origin}/temoignage/${token}`;
}

function buildWhatsAppMessage(firstName: string, url: string): string {
  const greeting = firstName ? `Hey ${firstName} 🌱` : "Hey 🌱";
  return `${greeting}\n\nÇa fait quelques semaines qu'on bosse ensemble — j'aimerais beaucoup ton retour sur ce qui a changé pour toi !\n\nC'est super rapide (30 secondes) et ça aide énormément les prochains :\n${url}\n\nMerci 🙏`;
}

export function TestimonialShareModal({
  open,
  onClose,
  clientId,
  clientFirstName,
  clientPhone,
}: Props) {
  const { push: pushToast } = useToast();
  const [state, setState] = useState<LoadState>({ kind: "loading" });

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setState({ kind: "loading" });
    (async () => {
      try {
        const sb = await getSupabaseClient();
        if (!sb) {
          if (!cancelled) setState({ kind: "missing" });
          return;
        }
        const { data, error } = await sb
          .from("client_app_accounts")
          .select("token")
          .eq("client_id", clientId)
          .maybeSingle();
        if (cancelled) return;
        if (error || !data?.token) {
          setState({ kind: "missing" });
        } else {
          setState({ kind: "ready", token: data.token as string });
        }
      } catch {
        if (!cancelled) setState({ kind: "missing" });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, clientId]);

  if (!open) return null;

  const url = state.kind === "ready" ? buildTestimonialUrl(state.token) : "";

  function copyLink() {
    if (!url) return;
    navigator.clipboard
      .writeText(url)
      .then(() => pushToast({ tone: "success", title: "Lien copié 📋" }))
      .catch(() => pushToast({ tone: "error", title: "Impossible de copier" }));
  }
  function openWhatsApp() {
    if (!url) return;
    const msg = buildWhatsAppMessage(clientFirstName, url);
    const phone = clientPhone?.replace(/\D/g, "") ?? "";
    const waUrl = phone
      ? `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`
      : `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(waUrl, "_blank", "noopener,noreferrer");
  }
  function openSms() {
    if (!url) return;
    const msg = buildWhatsAppMessage(clientFirstName, url);
    const phone = clientPhone?.replace(/[^\d+]/g, "") ?? "";
    const smsUrl = `sms:${phone}?body=${encodeURIComponent(msg)}`;
    window.location.href = smsUrl;
  }

  return (
    <div style={overlayStyle} onClick={onClose} role="dialog" aria-modal="true">
      <div style={cardStyle} onClick={(e) => e.stopPropagation()}>
        <button type="button" onClick={onClose} aria-label="Fermer" style={closeBtnStyle}>
          ✕
        </button>

        <h2 style={titleStyle}>💬 Demander un témoignage</h2>
        <p style={subStyle}>
          Envoie le lien à <strong>{clientFirstName || "ton client"}</strong> par WhatsApp ou SMS.
          Le retour t'arrive en 30 secondes côté app.
        </p>

        {state.kind === "loading" && (
          <div style={infoBoxStyle}>Chargement…</div>
        )}

        {state.kind === "missing" && (
          <div style={{ ...infoBoxStyle, color: "var(--ls-coral)" }}>
            Ce client n'a pas encore d'accès app activé. Envoie-lui d'abord l'accès via
            « Envoyer l'accès app » dans la fiche.
          </div>
        )}

        {state.kind === "ready" && (
          <>
            <div style={linkBoxStyle}>
              <div
                style={{
                  fontFamily: "var(--ls-font-mono, monospace)",
                  fontSize: 12,
                  color: "var(--ls-text-muted)",
                  wordBreak: "break-all",
                  marginBottom: 8,
                }}
              >
                {url}
              </div>
              <button type="button" onClick={copyLink} style={primaryBtnStyle}>
                📋 Copier le lien
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 14 }}>
              <button type="button" onClick={openWhatsApp} style={waBtnStyle}>
                💬 Partager sur WhatsApp
                {clientPhone ? "" : " (choisir contact)"}
              </button>
              <button type="button" onClick={openSms} style={ghostBtnStyle}>
                ✉️ Partager par SMS
              </button>
            </div>

            <p style={legalStyle}>
              🔒 Le lien est unique au client. Tu reçois une notif quand il envoie son retour,
              et tu valides depuis <strong>/admin/testimonials</strong>.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

const overlayStyle: CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(11, 13, 17, 0.65)",
  backdropFilter: "blur(8px)",
  WebkitBackdropFilter: "blur(8px)",
  zIndex: 1000,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 20,
};

const cardStyle: CSSProperties = {
  background: "var(--ls-surface)",
  border: "1px solid var(--ls-border)",
  borderRadius: 16,
  padding: 24,
  maxWidth: 440,
  width: "100%",
  position: "relative",
  boxShadow: "0 24px 60px -10px rgba(0,0,0,0.5)",
};

const closeBtnStyle: CSSProperties = {
  position: "absolute",
  top: 12,
  right: 12,
  width: 32,
  height: 32,
  borderRadius: "50%",
  border: "1px solid var(--ls-border)",
  background: "transparent",
  color: "var(--ls-text-muted)",
  cursor: "pointer",
  fontSize: 14,
  lineHeight: 1,
};

const titleStyle: CSSProperties = {
  fontFamily: "'Syne', serif",
  fontSize: 20,
  fontWeight: 700,
  color: "var(--ls-text)",
  margin: 0,
  paddingRight: 32,
  marginBottom: 8,
};

const subStyle: CSSProperties = {
  fontSize: 13,
  color: "var(--ls-text-muted)",
  marginBottom: 18,
  lineHeight: 1.5,
};

const infoBoxStyle: CSSProperties = {
  padding: 14,
  background: "var(--ls-surface-2)",
  border: "1px solid var(--ls-border)",
  borderRadius: 10,
  fontSize: 13,
  color: "var(--ls-text)",
  lineHeight: 1.5,
};

const linkBoxStyle: CSSProperties = {
  padding: 14,
  background: "var(--ls-surface-2)",
  border: "1px solid var(--ls-border)",
  borderRadius: 12,
};

const primaryBtnStyle: CSSProperties = {
  width: "100%",
  padding: "10px 14px",
  background: "var(--ls-gold)",
  color: "var(--ls-charcoal)",
  border: "none",
  borderRadius: 10,
  fontWeight: 600,
  fontSize: 13,
  cursor: "pointer",
};

const waBtnStyle: CSSProperties = {
  width: "100%",
  padding: "12px 14px",
  background: "#25D366",
  color: "white",
  border: "none",
  borderRadius: 10,
  fontWeight: 600,
  fontSize: 13,
  cursor: "pointer",
};

const ghostBtnStyle: CSSProperties = {
  width: "100%",
  padding: "12px 14px",
  background: "transparent",
  color: "var(--ls-text)",
  border: "1px solid var(--ls-border)",
  borderRadius: 10,
  fontWeight: 600,
  fontSize: 13,
  cursor: "pointer",
};

const legalStyle: CSSProperties = {
  marginTop: 14,
  fontSize: 11,
  color: "var(--ls-text-muted)",
  lineHeight: 1.5,
  textAlign: "center" as const,
};

export default TestimonialShareModal;
