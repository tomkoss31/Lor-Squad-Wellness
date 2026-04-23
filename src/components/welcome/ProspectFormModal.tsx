// Chantier Welcome Page + Magic Links (2026-04-24).
// Modale formulaire prospect "Je veux rejoindre l'aventure".
// Soumission via Edge Function submit-prospect-lead (anti-spam IP).

import { useEffect, useState } from "react";
import { getSupabaseClient } from "../../services/supabaseClient";

interface Props {
  open: boolean;
  onClose: () => void;
}

type Phase = "form" | "submitting" | "success" | "error";

export function ProspectFormModal({ open, onClose }: Props) {
  const [phase, setPhase] = useState<Phase>("form");
  const [firstName, setFirstName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (!open) {
      setPhase("form");
      setFirstName("");
      setPhone("");
      setCity("");
      setErrorMsg("");
      return;
    }
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  async function submit() {
    setErrorMsg("");
    if (firstName.trim().length < 2) {
      setErrorMsg("Ton prénom est trop court.");
      return;
    }
    if (phone.replace(/\D/g, "").length < 6) {
      setErrorMsg("Numéro de téléphone invalide.");
      return;
    }
    setPhase("submitting");
    try {
      const sb = await getSupabaseClient();
      if (!sb) throw new Error("Service indisponible.");
      const { data, error } = await sb.functions.invoke("submit-prospect-lead", {
        body: { first_name: firstName.trim(), phone: phone.trim(), city: city.trim() || undefined },
      });
      if (error) throw new Error(error.message);
      if (!data?.success) {
        const msg =
          data?.error === "rate_limited"
            ? "Trop de tentatives — merci de réessayer dans une heure."
            : (data?.error as string) || "Erreur inconnue.";
        throw new Error(msg);
      }
      setPhase("success");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erreur inconnue.";
      setErrorMsg(msg);
      setPhase("error");
    }
  }

  if (!open) return null;

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
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
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
        aria-label="Rejoindre l'aventure Lor'Squad"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
        style={{
          background: "var(--ls-surface)",
          border: "1px solid rgba(239,159,39,0.18)",
          borderRadius: 20,
          maxWidth: 460,
          width: "100%",
          padding: 26,
          boxShadow: "0 24px 64px rgba(0,0,0,0.4), 0 4px 16px rgba(239,159,39,0.08)",
          fontFamily: "DM Sans, sans-serif",
          color: "var(--ls-text)",
        }}
      >
        {phase === "success" ? (
          <>
            <div style={{ fontSize: 44, textAlign: "center", marginBottom: 6 }}>✨</div>
            <h3
              style={{
                fontFamily: "Syne, sans-serif",
                fontSize: 20,
                fontWeight: 700,
                margin: 0,
                marginBottom: 10,
                textAlign: "center",
              }}
            >
              Merci {firstName} !
            </h3>
            <p
              style={{
                fontSize: 13,
                color: "var(--ls-text-muted)",
                lineHeight: 1.6,
                textAlign: "center",
                marginBottom: 16,
              }}
            >
              Un coach de l&apos;équipe te recontacte très bientôt pour te présenter Lor&apos;Squad
              Wellness et voir comment on peut travailler ensemble.
            </p>
            <button
              type="button"
              onClick={onClose}
              style={{
                width: "100%",
                padding: "12px 14px",
                borderRadius: 10,
                background: "linear-gradient(135deg, #1D9E75, #0F6E56)",
                border: "none",
                color: "#FFFFFF",
                cursor: "pointer",
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              Fermer
            </button>
          </>
        ) : (
          <>
            <h3
              style={{
                fontFamily: "Syne, sans-serif",
                fontSize: 22,
                fontWeight: 700,
                margin: 0,
                marginBottom: 6,
                letterSpacing: "-0.01em",
              }}
            >
              Prêt à changer ta vie ? ✨
            </h3>
            <p style={{ fontSize: 13, color: "var(--ls-text-muted)", marginBottom: 18, lineHeight: 1.55 }}>
              Laisse-nous ton numéro, un coach te contacte sous 24h.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 14 }}>
              <label>
                <span style={{ fontSize: 11, color: "var(--ls-text-muted)", fontWeight: 600 }}>Prénom *</span>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Ton prénom"
                  disabled={phase === "submitting"}
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
              <label>
                <span style={{ fontSize: 11, color: "var(--ls-text-muted)", fontWeight: 600 }}>Téléphone *</span>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="06 XX XX XX XX"
                  disabled={phase === "submitting"}
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
              <label>
                <span style={{ fontSize: 11, color: "var(--ls-text-muted)", fontWeight: 600 }}>Ville (optionnel)</span>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Lyon, Paris…"
                  disabled={phase === "submitting"}
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
            </div>

            {errorMsg ? (
              <div
                style={{
                  background: "#FCEBEB",
                  color: "#501313",
                  border: "1px solid #E24B4A",
                  borderRadius: 10,
                  padding: "9px 12px",
                  fontSize: 12,
                  marginBottom: 12,
                }}
              >
                {errorMsg}
              </div>
            ) : null}

            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={onClose}
                disabled={phase === "submitting"}
                style={{
                  padding: "10px 14px",
                  borderRadius: 10,
                  background: "transparent",
                  border: "1px solid var(--ls-border)",
                  color: "var(--ls-text-muted)",
                  cursor: "pointer",
                  fontSize: 13,
                }}
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => void submit()}
                disabled={phase === "submitting"}
                style={{
                  padding: "10px 18px",
                  borderRadius: 10,
                  background: "linear-gradient(135deg, #EF9F27 0%, #BA7517 100%)",
                  border: "none",
                  color: "#FFFFFF",
                  cursor: phase === "submitting" ? "wait" : "pointer",
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                {phase === "submitting" ? "Envoi…" : "Un coach me recontacte"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
