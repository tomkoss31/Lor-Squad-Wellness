// Chantier Welcome Page + Magic Links (2026-04-24).
// Refonte G3 La Base 360 (chantier 2026-11-07) : palette emerald/cyan/violet,
// Sora/Inter, gradients alignes avec /opportunite et /simulateur.
// Modale formulaire prospect "Je veux rejoindre l'aventure".
// Soumission via Edge Function submit-prospect-lead (anti-spam IP).

import { useEffect, useState } from "react";
import { getSupabaseClient } from "../../services/supabaseClient";
import { extractFunctionError } from "../../lib/utils/extractFunctionError";

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
      // Hotfix 2026-04-30 : extraction body via helper (cas 4xx/5xx
      // supabase-js v2.101+).
      if (error || !data?.success) {
        const raw = await extractFunctionError(data, error, "Erreur inconnue.");
        const friendly = raw === "rate_limited"
          ? "Trop de tentatives — merci de réessayer dans une heure."
          : raw;
        throw new Error(friendly);
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
        aria-label="Rejoindre l'aventure La Base 360"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
        style={{
          background: "var(--ls-surface)",
          border: "1px solid color-mix(in srgb, #10B981 20%, transparent)",
          borderRadius: 22,
          maxWidth: 480,
          width: "100%",
          padding: 28,
          boxShadow: "0 24px 64px rgba(0,0,0,0.4), 0 8px 24px rgba(16,185,129,0.12)",
          fontFamily: "Inter, sans-serif",
          color: "var(--ls-text)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Glow décoratif G3 en haut */}
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            top: -100,
            right: -60,
            width: 240,
            height: 240,
            background: "radial-gradient(circle, rgba(16,185,129,0.16), transparent 65%)",
            borderRadius: "50%",
            pointerEvents: "none",
          }}
        />
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            bottom: -80,
            left: -40,
            width: 200,
            height: 200,
            background: "radial-gradient(circle, rgba(139,92,246,0.14), transparent 65%)",
            borderRadius: "50%",
            pointerEvents: "none",
          }}
        />
        <div style={{ position: "relative", zIndex: 1 }}>
        {phase === "success" ? (
          <>
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: "50%",
                background: "linear-gradient(135deg, #10B981, #06B6D4)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 16px",
                fontSize: 32,
                color: "white",
                fontWeight: 800,
                boxShadow: "0 8px 24px rgba(16,185,129,0.35)",
              }}
            >
              ✓
            </div>
            <h3
              style={{
                fontFamily: "Sora, sans-serif",
                fontSize: 22,
                fontWeight: 800,
                margin: 0,
                marginBottom: 10,
                textAlign: "center",
                letterSpacing: "-0.02em",
              }}
            >
              C&apos;est noté {firstName} !
            </h3>
            <p
              style={{
                fontSize: 14,
                color: "var(--ls-text-muted)",
                lineHeight: 1.6,
                textAlign: "center",
                marginBottom: 18,
              }}
            >
              On te rappelle <strong style={{ color: "var(--ls-text)" }}>dans les 48h max</strong>.
              Garde ton téléphone à portée 📞
            </p>
            <button
              type="button"
              onClick={onClose}
              style={{
                width: "100%",
                padding: "13px 16px",
                borderRadius: 12,
                background: "linear-gradient(135deg, #10B981 0%, #06B6D4 50%, #8B5CF6 100%)",
                border: "none",
                color: "#FFFFFF",
                cursor: "pointer",
                fontSize: 14,
                fontWeight: 700,
                fontFamily: "Sora, sans-serif",
                boxShadow: "0 8px 22px rgba(16,185,129,0.32)",
              }}
            >
              Fermer
            </button>
          </>
        ) : (
          <>
            {/* Eyebrow style La Base 360 */}
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                fontSize: 11,
                letterSpacing: "1.4px",
                textTransform: "uppercase",
                color: "#10B981",
                fontWeight: 700,
                padding: "5px 12px",
                borderRadius: 999,
                background: "color-mix(in srgb, #10B981 12%, transparent)",
                border: "0.5px solid color-mix(in srgb, #10B981 24%, transparent)",
                marginBottom: 14,
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: "#10B981",
                  boxShadow: "0 0 0 4px color-mix(in srgb, #10B981 22%, transparent)",
                }}
              />
              Rejoindre l&apos;aventure
            </div>
            <h3
              style={{
                fontFamily: "Sora, sans-serif",
                fontSize: 26,
                fontWeight: 800,
                margin: 0,
                marginBottom: 8,
                letterSpacing: "-0.025em",
                lineHeight: 1.15,
              }}
            >
              Et si tu transformais ce que tu fais déjà en{" "}
              <span
                style={{
                  background: "linear-gradient(120deg, #10B981, #06B6D4 55%, #8B5CF6)",
                  WebkitBackgroundClip: "text",
                  backgroundClip: "text",
                  color: "transparent",
                  fontStyle: "italic",
                }}
              >
                revenu
              </span>{" "}
              ?
            </h3>
            <p style={{ fontSize: 13, color: "var(--ls-text-muted)", marginBottom: 22, lineHeight: 1.6 }}>
              Laisse tes coordonnées. Un coach de l&apos;équipe te rappelle{" "}
              <strong style={{ color: "var(--ls-text)" }}>dans les 48h</strong> pour un échange
              simple, sans pression.
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
                    marginTop: 5,
                    padding: "11px 14px",
                    borderRadius: 10,
                    border: "1px solid var(--ls-border)",
                    background: "var(--ls-surface2)",
                    color: "var(--ls-text)",
                    fontSize: 15,
                    fontFamily: "Inter, sans-serif",
                    transition: "border-color 0.15s ease, box-shadow 0.15s ease",
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = "#10B981";
                    e.currentTarget.style.boxShadow = "0 0 0 4px color-mix(in srgb, #10B981 18%, transparent)";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "var(--ls-border)";
                    e.currentTarget.style.boxShadow = "none";
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
                    marginTop: 5,
                    padding: "11px 14px",
                    borderRadius: 10,
                    border: "1px solid var(--ls-border)",
                    background: "var(--ls-surface2)",
                    color: "var(--ls-text)",
                    fontSize: 15,
                    fontFamily: "Inter, sans-serif",
                    transition: "border-color 0.15s ease, box-shadow 0.15s ease",
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = "#10B981";
                    e.currentTarget.style.boxShadow = "0 0 0 4px color-mix(in srgb, #10B981 18%, transparent)";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "var(--ls-border)";
                    e.currentTarget.style.boxShadow = "none";
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
                    marginTop: 5,
                    padding: "11px 14px",
                    borderRadius: 10,
                    border: "1px solid var(--ls-border)",
                    background: "var(--ls-surface2)",
                    color: "var(--ls-text)",
                    fontSize: 15,
                    fontFamily: "Inter, sans-serif",
                    transition: "border-color 0.15s ease, box-shadow 0.15s ease",
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = "#10B981";
                    e.currentTarget.style.boxShadow = "0 0 0 4px color-mix(in srgb, #10B981 18%, transparent)";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "var(--ls-border)";
                    e.currentTarget.style.boxShadow = "none";
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
                  padding: "12px 22px",
                  borderRadius: 12,
                  background: phase === "submitting"
                    ? "var(--ls-surface2)"
                    : "linear-gradient(135deg, #10B981 0%, #06B6D4 50%, #8B5CF6 100%)",
                  border: "none",
                  color: "#FFFFFF",
                  cursor: phase === "submitting" ? "wait" : "pointer",
                  fontSize: 14,
                  fontWeight: 700,
                  fontFamily: "Sora, sans-serif",
                  boxShadow: phase === "submitting" ? "none" : "0 8px 22px rgba(16,185,129,0.32)",
                  transition: "transform 0.15s ease",
                }}
              >
                {phase === "submitting" ? "Envoi..." : "On m'appelle dans les 48h →"}
              </button>
            </div>
          </>
        )}
        </div>
      </div>
    </div>
  );
}
