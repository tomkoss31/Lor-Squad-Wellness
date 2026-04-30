// Chantier Welcome Page + Magic Links (2026-04-24).
// Filet de sécurité : après que le client a créé son compte, il peut
// recevoir un magic link 24h par WhatsApp pour se reconnecter plus tard
// dans la PWA installée (ou sur un autre appareil).

import { useState } from "react";
import { getSupabaseClient } from "../../services/supabaseClient";
import { extractFunctionError } from "../../lib/utils/extractFunctionError";

interface Props {
  firstName: string;
  clientPhone?: string | null;
}

function buildMagicUrl(token: string): string {
  if (typeof window === "undefined") return `/auto-login?token=${token}`;
  return `${window.location.origin}/auto-login?token=${token}`;
}

function buildWhatsAppMessage(firstName: string, magicUrl: string): string {
  return `🔐 ${firstName}, voici ton lien de connexion Lor'Squad (valide 24h, 3 usages) : ${magicUrl}`;
}

export function MagicLinkFallback({ firstName, clientPhone }: Props) {
  const [phase, setPhase] = useState<"idle" | "generating" | "ready" | "error">("idle");
  const [magicUrl, setMagicUrl] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string>("");

  async function generateAndOpen() {
    setPhase("generating");
    setErrorMsg("");
    try {
      const sb = await getSupabaseClient();
      if (!sb) throw new Error("Service indisponible.");

      // On a besoin d'une session active pour générer le token (Edge
      // Function auth Bearer). La session a été créée via
      // consume-invitation-token juste avant cet écran.
      const { data: sessionData } = await sb.auth.getSession();
      const accessToken = sessionData?.session?.access_token;
      if (!accessToken) {
        throw new Error("Session expirée, reconnecte-toi.");
      }

      const { data, error } = await sb.functions.invoke("generate-auto-login-token", {
        body: {},
      });
      // Audit 2026-04-30 : extraction body via helper (cas 4xx/5xx).
      if (error || !data?.token) {
        const msg = await extractFunctionError(data, error, "Génération impossible.");
        throw new Error(msg);
      }

      const url = buildMagicUrl(data.token as string);
      setMagicUrl(url);
      setPhase("ready");

      // Ouvre WhatsApp avec le message pré-rempli
      const msg = buildWhatsAppMessage(firstName, url);
      const digits = (clientPhone ?? "").replace(/\D/g, "");
      const waUrl = digits
        ? `https://wa.me/${digits}?text=${encodeURIComponent(msg)}`
        : `https://wa.me/?text=${encodeURIComponent(msg)}`;
      window.open(waUrl, "_blank");
    } catch (e) {
      const msgErr = e instanceof Error ? e.message : "Erreur inconnue.";
      setErrorMsg(msgErr);
      setPhase("error");
    }
  }

  async function copyLink() {
    if (!magicUrl) return;
    try {
      await navigator.clipboard.writeText(magicUrl);
    } catch {
      // silencieux
    }
  }

  return (
    <div
      style={{
        marginTop: 18,
        padding: "14px 16px",
        background: "rgba(37,211,102,0.08)",
        border: "1px solid rgba(37,211,102,0.28)",
        borderRadius: 14,
        color: "#FFFFFF",
        fontFamily: "DM Sans, sans-serif",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
        <span aria-hidden="true" style={{ fontSize: 18 }}>💬</span>
        <div style={{ fontSize: 14, fontWeight: 600, color: "#FDECC0" }}>
          Envoie-toi un lien magique
        </div>
      </div>
      <p style={{ fontSize: 12, lineHeight: 1.55, opacity: 0.8, margin: 0, marginBottom: 12, color: "#F4E9CF" }}>
        Tu as du mal à installer l&apos;app ou tu veux te connecter plus tard sur un autre
        appareil ? Reçois un lien WhatsApp valide 24h pour te reconnecter en 1 clic.
      </p>

      {phase === "ready" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div
            style={{
              padding: "9px 12px",
              borderRadius: 10,
              background: "rgba(0,0,0,0.35)",
              border: "1px solid rgba(255,255,255,0.12)",
              fontSize: 11,
              fontFamily: "monospace",
              color: "#F4E9CF",
              wordBreak: "break-all",
            }}
          >
            {magicUrl}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              onClick={() => void copyLink()}
              style={{
                flex: 1,
                padding: "9px 12px",
                borderRadius: 10,
                background: "rgba(255,255,255,0.1)",
                border: "1px solid rgba(255,255,255,0.2)",
                color: "#FFFFFF",
                cursor: "pointer",
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              📋 Copier
            </button>
            <button
              type="button"
              onClick={() => void generateAndOpen()}
              style={{
                flex: 1,
                padding: "9px 12px",
                borderRadius: 10,
                background: "#25D366",
                border: "none",
                color: "#FFFFFF",
                cursor: "pointer",
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              📱 Re-ouvrir WhatsApp
            </button>
          </div>
          <div style={{ fontSize: 10, color: "rgba(244,233,207,0.6)", textAlign: "center" }}>
            Valide 24h · 3 utilisations max
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => void generateAndOpen()}
          disabled={phase === "generating"}
          style={{
            width: "100%",
            padding: "11px 14px",
            borderRadius: 12,
            background: "#25D366",
            border: "none",
            color: "#FFFFFF",
            cursor: phase === "generating" ? "wait" : "pointer",
            fontSize: 13,
            fontWeight: 600,
            fontFamily: "DM Sans, sans-serif",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
          }}
        >
          {phase === "generating" ? "Génération…" : "📱 Envoyer le lien par WhatsApp"}
        </button>
      )}

      {phase === "error" && errorMsg ? (
        <div
          style={{
            marginTop: 8,
            fontSize: 11,
            color: "#FBBFC8",
            background: "rgba(251,113,133,0.12)",
            border: "1px solid rgba(251,113,133,0.3)",
            padding: "6px 10px",
            borderRadius: 8,
          }}
        >
          {errorMsg}
        </div>
      ) : null}
    </div>
  );
}
