// Chantier Client access unification (2026-04-24).
// Modale UNIQUE pour envoyer l'accès à l'app au client.
// - Gère tout le cycle du lien magique /bienvenue?token=XXX
//   (detect, create, regenerate).
// - 4 canaux de partage : QR code (par défaut), WhatsApp, Copier, SMS.
// - Badge d'état si le lien a déjà été consommé par le client.
// - Réutilisée depuis : fiche client (header + onglet Actions) + fin
//   de bilan (étape 13) → zéro doublon UI.

import { useCallback, useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { getSupabaseClient } from "../../services/supabaseClient";
import { useAppContext } from "../../context/AppContext";
import { useToast } from "../../context/ToastContext";

function randomToken(): string {
  // 48 chars hex — robuste pour un magic link 7 jours
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

function formatRelative(iso: string): string {
  try {
    const diff = Date.now() - new Date(iso).getTime();
    const days = Math.floor(diff / (24 * 60 * 60 * 1000));
    if (days <= 0) return "aujourd'hui";
    if (days === 1) return "hier";
    return `il y a ${days} jours`;
  } catch {
    return iso;
  }
}

function expiresInLabel(iso: string): string {
  try {
    const diff = new Date(iso).getTime() - Date.now();
    const days = Math.ceil(diff / (24 * 60 * 60 * 1000));
    if (days < 0) return "expiré";
    if (days === 0) return "expire aujourd'hui";
    if (days === 1) return "expire demain";
    return `expire dans ${days} jours`;
  } catch {
    return "";
  }
}

type TokenRow = {
  token: string;
  created_at: string;
  expires_at: string;
  consumed_at: string | null;
};

type LoadState =
  | { kind: "loading" }
  | { kind: "empty" }
  | { kind: "active"; row: TokenRow }
  | { kind: "consumed"; row: TokenRow };

interface Props {
  open: boolean;
  onClose: () => void;
  clientId: string;
  clientFirstName: string;
  clientLastName: string;
  clientPhone?: string | null;
  /** QR visible par défaut ? (true pour fin de bilan en présentiel) */
  qrDefault?: boolean;
}

export function ClientAccessModal({
  open,
  onClose,
  clientId,
  clientFirstName,
  clientLastName,
  clientPhone,
  qrDefault = false,
}: Props) {
  const { currentUser } = useAppContext();
  const { push: pushToast } = useToast();

  const [state, setState] = useState<LoadState>({ kind: "loading" });
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [confirmReplace, setConfirmReplace] = useState(false);
  const [showQr, setShowQr] = useState(qrDefault);

  const refresh = useCallback(async () => {
    setState({ kind: "loading" });
    const sb = await getSupabaseClient();
    if (!sb) {
      setState({ kind: "empty" });
      return;
    }
    try {
      const { data, error } = await sb
        .from("client_invitation_tokens")
        .select("token, created_at, expires_at, consumed_at")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false })
        .limit(1);
      if (error) throw error;
      const row = (data?.[0] as TokenRow | undefined) ?? null;
      if (!row) {
        setState({ kind: "empty" });
        return;
      }
      if (row.consumed_at) {
        setState({ kind: "consumed", row });
        return;
      }
      if (new Date(row.expires_at).getTime() < Date.now()) {
        setState({ kind: "empty" });
        return;
      }
      setState({ kind: "active", row });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erreur inconnue.";
      pushToast({ tone: "error", title: "Chargement lien", message: msg });
      setState({ kind: "empty" });
    }
  }, [clientId, pushToast]);

  useEffect(() => {
    if (!open) return;
    setCopied(false);
    setConfirmReplace(false);
    setShowQr(qrDefault);
    void refresh();
  }, [open, qrDefault, refresh]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  async function generateToken(replace: boolean) {
    if (!currentUser) {
      pushToast({ tone: "error", title: "Non authentifié" });
      return;
    }
    setBusy(true);
    try {
      const sb = await getSupabaseClient();
      if (!sb) throw new Error("Supabase indisponible.");
      if (replace) {
        await sb
          .from("client_invitation_tokens")
          .update({ consumed_at: new Date().toISOString() })
          .eq("client_id", clientId)
          .is("consumed_at", null);
      }
      const token = randomToken();
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      const { error: insertErr } = await sb.from("client_invitation_tokens").insert({
        client_id: clientId,
        token,
        created_by: currentUser.id,
        expires_at: expiresAt,
      });
      if (insertErr) throw insertErr;
      pushToast({ tone: "success", title: "Lien généré" });
      setConfirmReplace(false);
      await refresh();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erreur inconnue.";
      pushToast({ tone: "error", title: "Génération impossible", message: msg });
    } finally {
      setBusy(false);
    }
  }

  // URL active selon l'état
  const activeToken =
    state.kind === "active" || state.kind === "consumed" ? state.row.token : null;
  const url = activeToken ? buildInvitationUrl(activeToken) : "";

  async function copyUrl() {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      pushToast({ tone: "error", title: "Copie impossible" });
    }
  }

  function shareWhatsApp() {
    if (!url) return;
    const digits = (clientPhone ?? "").replace(/\D/g, "");
    const msg = `Salut ${clientFirstName} ! Voici ton accès à l'app Lor'Squad : ${url}`;
    const target = digits
      ? `https://wa.me/${digits}?text=${encodeURIComponent(msg)}`
      : `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(target, "_blank");
  }

  function shareSms() {
    if (!url) return;
    const msg = `Salut ${clientFirstName} ! Voici ton accès à l'app Lor'Squad : ${url}`;
    window.open(`sms:?&body=${encodeURIComponent(msg)}`, "_blank");
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
        aria-label="Envoyer l'accès à l'app"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
        style={{
          background: "var(--ls-surface)",
          border: "1px solid var(--ls-border)",
          borderRadius: 18,
          maxWidth: 480,
          width: "100%",
          maxHeight: "92vh",
          overflowY: "auto",
          padding: 22,
          boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
          fontFamily: "DM Sans, sans-serif",
          color: "var(--ls-text)",
        }}
      >
        <h3
          style={{
            fontFamily: "Syne, sans-serif",
            fontSize: 18,
            fontWeight: 700,
            margin: 0,
            marginBottom: 4,
            color: "var(--ls-text)",
          }}
        >
          Envoyer à {clientFirstName} son accès à l&apos;app
        </h3>
        <div style={{ fontSize: 12, color: "var(--ls-text-muted)", marginBottom: 14 }}>
          Un lien unique, valable 7 jours.
        </div>

        {/* ─── Loader ─────────────────────────────────────────────────── */}
        {state.kind === "loading" ? (
          <div style={{ padding: 30, textAlign: "center", color: "var(--ls-text-muted)", fontSize: 13 }}>
            Chargement…
          </div>
        ) : null}

        {/* ─── Badge d'état ────────────────────────────────────────────── */}
        {state.kind === "consumed" ? (
          <div
            style={{
              background: "rgba(29,158,117,0.12)",
              border: "1px solid rgba(29,158,117,0.35)",
              borderRadius: 10,
              padding: "10px 12px",
              marginBottom: 12,
              fontSize: 12,
              color: "#1D9E75",
              fontWeight: 500,
            }}
          >
            ✓ {clientFirstName} a déjà créé son accès
            {state.row.consumed_at ? ` ${formatRelative(state.row.consumed_at)}` : ""}.
            Si tu as besoin de lui renvoyer un lien (mot de passe oublié, etc.), régénère-le.
          </div>
        ) : null}
        {state.kind === "active" ? (
          <div
            style={{
              background: "rgba(239,159,39,0.12)",
              border: "1px solid rgba(239,159,39,0.35)",
              borderRadius: 10,
              padding: "10px 12px",
              marginBottom: 12,
              fontSize: 12,
              color: "#BA7517",
              fontWeight: 500,
            }}
          >
            Lien actif · envoyé {formatRelative(state.row.created_at)} · {expiresInLabel(state.row.expires_at)}
          </div>
        ) : null}

        {/* ─── État empty : générer ──────────────────────────────────── */}
        {state.kind === "empty" ? (
          <button
            type="button"
            onClick={() => void generateToken(false)}
            disabled={busy}
            style={{
              width: "100%",
              padding: "12px 16px",
              borderRadius: 12,
              background: "linear-gradient(135deg, #EF9F27 0%, #BA7517 100%)",
              border: "none",
              color: "#FFFFFF",
              cursor: busy ? "wait" : "pointer",
              fontSize: 14,
              fontWeight: 600,
              fontFamily: "DM Sans, sans-serif",
            }}
          >
            {busy ? "Génération…" : "🔗 Générer le lien"}
          </button>
        ) : null}

        {/* ─── URL readonly + 4 canaux de partage ────────────────────── */}
        {url ? (
          <>
            <input
              readOnly
              value={url}
              onFocus={(e) => e.currentTarget.select()}
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 10,
                border: "1px solid var(--ls-border)",
                background: "var(--ls-surface2)",
                color: "var(--ls-text)",
                fontSize: 11,
                fontFamily: "monospace",
                marginBottom: 12,
              }}
            />

            {/* QR code (présentiel) */}
            {showQr ? (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 10,
                  padding: 16,
                  background: "#FFFFFF",
                  borderRadius: 14,
                  border: "1px solid var(--ls-border)",
                  marginBottom: 12,
                }}
              >
                <div data-tour-id="client-access-qr">
                  <QRCodeSVG
                    value={url}
                    size={180}
                    level="M"
                    includeMargin={false}
                    fgColor="#0B0D11"
                    bgColor="#FFFFFF"
                  />
                </div>
                <div style={{ fontSize: 11, color: "#6b6f7a", textAlign: "center" }}>
                  Scan par {clientFirstName} pour ouvrir le lien directement
                </div>
              </div>
            ) : null}

            <button
              type="button"
              onClick={() => setShowQr((v) => !v)}
              style={{
                width: "100%",
                padding: "8px 12px",
                borderRadius: 10,
                background: "transparent",
                border: "1px dashed var(--ls-border)",
                color: "var(--ls-text-muted)",
                cursor: "pointer",
                fontSize: 12,
                marginBottom: 10,
                fontFamily: "DM Sans, sans-serif",
              }}
            >
              {showQr ? "Masquer le QR code" : "📱 Afficher le QR code (présentiel)"}
            </button>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }} data-tour-id="client-access-share">
              <button
                type="button"
                onClick={shareWhatsApp}
                style={{
                  padding: "11px 12px",
                  borderRadius: 10,
                  background: "#25D366",
                  border: "none",
                  color: "#FFFFFF",
                  cursor: "pointer",
                  fontSize: 13,
                  fontWeight: 600,
                  fontFamily: "DM Sans, sans-serif",
                }}
              >
                📱 WhatsApp
              </button>
              <button
                type="button"
                onClick={shareSms}
                style={{
                  padding: "11px 12px",
                  borderRadius: 10,
                  background: "rgba(45,212,191,0.12)",
                  border: "1px solid rgba(45,212,191,0.3)",
                  color: "#2DD4BF",
                  cursor: "pointer",
                  fontSize: 13,
                  fontWeight: 600,
                  fontFamily: "DM Sans, sans-serif",
                }}
              >
                💬 SMS
              </button>
            </div>

            <button
              type="button"
              onClick={() => void copyUrl()}
              style={{
                width: "100%",
                padding: "11px 12px",
                borderRadius: 10,
                background: copied ? "#1D9E75" : "linear-gradient(135deg, #EF9F27 0%, #BA7517 100%)",
                border: "none",
                color: "#FFFFFF",
                cursor: "pointer",
                fontSize: 13,
                fontWeight: 600,
                fontFamily: "DM Sans, sans-serif",
                marginBottom: 10,
              }}
            >
              {copied ? "✓ Copié" : "📋 Copier le lien"}
            </button>
          </>
        ) : null}

        {/* ─── Régénérer (si active ou consumed) ──────────────────────── */}
        {state.kind === "active" || state.kind === "consumed" ? (
          confirmReplace ? (
            <div
              style={{
                background: "rgba(226,75,74,0.1)",
                border: "1px solid #E24B4A",
                borderRadius: 10,
                padding: 12,
                marginBottom: 10,
              }}
            >
              <div style={{ fontSize: 12, color: "#501313", marginBottom: 8 }}>
                L&apos;ancien lien sera invalidé. Confirmer ?
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button
                  type="button"
                  onClick={() => setConfirmReplace(false)}
                  style={{
                    padding: "7px 12px",
                    borderRadius: 8,
                    background: "transparent",
                    border: "1px solid var(--ls-border)",
                    color: "var(--ls-text-muted)",
                    cursor: "pointer",
                    fontSize: 12,
                    flex: 1,
                  }}
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={() => void generateToken(true)}
                  disabled={busy}
                  style={{
                    padding: "7px 12px",
                    borderRadius: 8,
                    background: "#E24B4A",
                    border: "none",
                    color: "#FFFFFF",
                    cursor: busy ? "wait" : "pointer",
                    fontSize: 12,
                    fontWeight: 600,
                    flex: 1,
                  }}
                >
                  {busy ? "…" : "Confirmer"}
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmReplace(true)}
              style={{
                width: "100%",
                padding: "9px 12px",
                borderRadius: 10,
                background: "transparent",
                border: `1px solid ${state.kind === "consumed" ? "#E24B4A" : "var(--ls-border)"}`,
                color: state.kind === "consumed" ? "#E24B4A" : "var(--ls-text-muted)",
                cursor: "pointer",
                fontSize: 12,
                fontFamily: "DM Sans, sans-serif",
                fontWeight: 500,
              }}
            >
              ↻ Régénérer un nouveau lien
            </button>
          )
        ) : null}

        <div style={{ marginTop: 16, textAlign: "right" }}>
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
            }}
          >
            Fermer
          </button>
        </div>

        <div style={{ marginTop: 12, fontSize: 10, color: "var(--ls-text-hint)", textAlign: "center" }}>
          Pour {clientFirstName} {clientLastName}
        </div>
      </div>
    </div>
  );
}
