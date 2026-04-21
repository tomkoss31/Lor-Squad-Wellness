// Chantier Lien d'invitation client app (2026-04-21).
// Refonte UI 2026-04-21bis : 3 états visuels en tête d'onglet Actions.
//   État 1 (default, aucun token ou token expiré)  → carte CTA amber
//   État 2 (token actif, pas encore consommé)      → carte teal + 2 actions
//   État 3 (token consommé, client dans l'app)     → carte gris neutre
//
// Le flow de génération / modale de partage reste identique (token 24-bytes
// hex + INSERT client_invitation_tokens + modale 3 boutons Copier/WA/SMS).

import { useCallback, useEffect, useState } from "react";
import type { Client } from "../../types/domain";
import { useAppContext } from "../../context/AppContext";
import { getSupabaseClient } from "../../services/supabaseClient";

function randomToken(): string {
  // 48 chars hex — assez fort pour un magic link 7 jours.
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

function formatRelativeDays(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const days = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
  if (days === 0) return "aujourd'hui";
  if (days === 1) return "hier";
  return `il y a ${days} jours`;
}

function formatDaysUntil(iso: string): string {
  const diffMs = new Date(iso).getTime() - Date.now();
  const days = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  if (days === 0) return "expire aujourd'hui";
  if (days === 1) return "expire demain";
  return `expire dans ${days} jours`;
}

type LatestTokenRow = {
  token: string;
  created_at: string;
  expires_at: string;
  consumed_at: string | null;
};

type ViewState =
  | { kind: "empty" }
  | { kind: "active"; row: LatestTokenRow }
  | { kind: "consumed"; row: LatestTokenRow };

export function ClientInvitationButton({ client }: { client: Client }) {
  const { currentUser } = useAppContext();
  const [state, setState] = useState<ViewState>({ kind: "empty" });
  const [loadingState, setLoadingState] = useState(true);

  // Share modal
  const [modalOpen, setModalOpen] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [modalToken, setModalToken] = useState<string | null>(null);
  const [showReplaceConfirm, setShowReplaceConfirm] = useState(false);
  const [copied, setCopied] = useState(false);

  const modalUrl = modalToken ? buildInvitationUrl(modalToken) : "";

  // ─── Lecture de l'état le plus récent ────────────────────────────────────
  const refreshState = useCallback(async () => {
    setLoadingState(true);
    try {
      const sb = await getSupabaseClient();
      if (!sb) {
        setState({ kind: "empty" });
        return;
      }
      const { data } = await sb
        .from("client_invitation_tokens")
        .select("token, created_at, expires_at, consumed_at")
        .eq("client_id", client.id)
        .order("created_at", { ascending: false })
        .limit(1);
      const row = (data?.[0] as LatestTokenRow | undefined) ?? null;
      if (!row) {
        setState({ kind: "empty" });
        return;
      }
      if (row.consumed_at) {
        setState({ kind: "consumed", row });
        return;
      }
      if (new Date(row.expires_at).getTime() < Date.now()) {
        // expiré sans consommation → on traite comme empty pour re-proposer
        setState({ kind: "empty" });
        return;
      }
      setState({ kind: "active", row });
    } finally {
      setLoadingState(false);
    }
  }, [client.id]);

  useEffect(() => {
    void refreshState();
  }, [refreshState]);

  // ─── Génération d'un nouveau token ───────────────────────────────────────
  async function generateLink(replace: boolean): Promise<string | null> {
    setModalLoading(true);
    setModalError(null);
    try {
      const sb = await getSupabaseClient();
      if (!sb) throw new Error("Supabase indisponible.");
      if (!currentUser) throw new Error("Utilisateur non connecté.");

      if (replace) {
        // Invalider les anciens tokens actifs du client.
        await sb
          .from("client_invitation_tokens")
          .update({ consumed_at: new Date().toISOString() })
          .eq("client_id", client.id)
          .is("consumed_at", null);
      }

      const token = randomToken();
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

      const { error: insertErr } = await sb.from("client_invitation_tokens").insert({
        client_id: client.id,
        token,
        created_by: currentUser.id,
        expires_at: expiresAt,
      });
      if (insertErr) throw new Error(insertErr.message);

      setModalToken(token);
      setShowReplaceConfirm(false);
      // Rafraîchit le state 2 après génération.
      void refreshState();
      return token;
    } catch (err) {
      setModalError(
        err instanceof Error ? err.message : "Impossible de générer le lien.",
      );
      return null;
    } finally {
      setModalLoading(false);
    }
  }

  // ─── Ouverture modale depuis les différents états ───────────────────────
  async function handleGenerate() {
    setModalOpen(true);
    setCopied(false);
    setModalError(null);
    setShowReplaceConfirm(false);
    await generateLink(false);
  }

  function handleReview() {
    if (state.kind !== "active") return;
    setModalOpen(true);
    setCopied(false);
    setModalError(null);
    setShowReplaceConfirm(false);
    setModalToken(state.row.token);
  }

  function handleReplaceIntent() {
    if (state.kind !== "active") return;
    setModalOpen(true);
    setCopied(false);
    setModalError(null);
    setShowReplaceConfirm(true);
    setModalToken(state.row.token);
  }

  function closeModal() {
    setModalOpen(false);
    setModalToken(null);
    setShowReplaceConfirm(false);
    setModalError(null);
    setCopied(false);
  }

  async function copyLink() {
    if (!modalUrl) return;
    try {
      await navigator.clipboard.writeText(modalUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setModalError("La copie automatique a échoué. Sélectionne le lien à la main.");
    }
  }

  function shareVia(channel: "whatsapp" | "sms") {
    if (!modalUrl) return;
    const message = `Salut ${client.firstName} ! Voici le lien pour accéder à ton espace Lor'Squad : ${modalUrl}`;
    const encoded = encodeURIComponent(message);
    const url =
      channel === "whatsapp"
        ? `https://wa.me/?text=${encoded}`
        : `sms:?&body=${encoded}`;
    window.open(url, "_blank");
  }

  // Body scroll lock while modal open.
  useEffect(() => {
    if (!modalOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [modalOpen]);

  // ─── Rendu ───────────────────────────────────────────────────────────────
  return (
    <>
      {loadingState ? <LoadingCard /> : null}

      {!loadingState && state.kind === "empty" ? (
        <EmptyStateCard onGenerate={() => void handleGenerate()} />
      ) : null}

      {!loadingState && state.kind === "active" ? (
        <ActiveStateCard
          row={state.row}
          onReview={handleReview}
          onReplace={handleReplaceIntent}
        />
      ) : null}

      {!loadingState && state.kind === "consumed" ? (
        <ConsumedStateCard row={state.row} />
      ) : null}

      {modalOpen ? (
        <ShareModal
          firstName={client.firstName}
          lastName={client.lastName}
          loading={modalLoading}
          error={modalError}
          url={modalUrl}
          copied={copied}
          showReplaceConfirm={showReplaceConfirm}
          onReplaceConfirm={() => void generateLink(true)}
          onReplaceCancel={() => setShowReplaceConfirm(false)}
          onCopy={() => void copyLink()}
          onShareWhatsApp={() => shareVia("whatsapp")}
          onShareSms={() => shareVia("sms")}
          onClose={closeModal}
        />
      ) : null}
    </>
  );
}

// ─── État 1 : CTA amber ────────────────────────────────────────────────────
function EmptyStateCard({ onGenerate }: { onGenerate: () => void }) {
  return (
    <div
      style={{
        background: "#FAEEDA",
        border: "1px solid #EF9F27",
        borderRadius: 16,
        padding: 18,
        display: "flex",
        flexDirection: "column",
        gap: 14,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div
          aria-hidden="true"
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            background: "#BA7517",
            color: "#FFFFFF",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 16,
            flexShrink: 0,
          }}
        >
          🔗
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <p
            style={{
              margin: 0,
              fontSize: 14,
              fontWeight: 500,
              color: "#633806",
              fontFamily: "DM Sans, sans-serif",
            }}
          >
            Envoyer l'accès à l'app
          </p>
          <p
            style={{
              margin: 0,
              fontSize: 12,
              color: "#854F0B",
              fontFamily: "DM Sans, sans-serif",
            }}
          >
            Ton client crée son compte en 30 secondes
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={onGenerate}
        style={{
          width: "100%",
          padding: "11px 16px",
          borderRadius: 10,
          background: "#BA7517",
          color: "#FFFFFF",
          border: "none",
          fontFamily: "DM Sans, sans-serif",
          fontWeight: 500,
          fontSize: 14,
          cursor: "pointer",
        }}
      >
        Générer le lien
      </button>
    </div>
  );
}

// ─── État 2 : Lien actif teal ──────────────────────────────────────────────
function ActiveStateCard({
  row,
  onReview,
  onReplace,
}: {
  row: LatestTokenRow;
  onReview: () => void;
  onReplace: () => void;
}) {
  return (
    <div
      style={{
        background: "#E1F5EE",
        border: "1px solid #1D9E75",
        borderRadius: 16,
        padding: 18,
        display: "flex",
        flexDirection: "column",
        gap: 14,
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        <div
          aria-hidden="true"
          style={{
            width: 24,
            height: 24,
            borderRadius: "50%",
            background: "#0F6E56",
            color: "#FFFFFF",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 13,
            fontWeight: 700,
            flexShrink: 0,
            marginTop: 1,
          }}
        >
          ✓
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <p
            style={{
              margin: 0,
              fontSize: 13,
              fontWeight: 500,
              color: "#085041",
              fontFamily: "DM Sans, sans-serif",
            }}
          >
            Lien d'accès actif
          </p>
          <p
            style={{
              margin: 0,
              fontSize: 11,
              color: "#0F6E56",
              fontFamily: "DM Sans, sans-serif",
            }}
          >
            Envoyé {formatRelativeDays(row.created_at)} ·{" "}
            {formatDaysUntil(row.expires_at)}
          </p>
        </div>
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        <button
          type="button"
          onClick={onReview}
          style={{
            flex: 1,
            padding: "10px 12px",
            borderRadius: 10,
            background: "#FFFFFF",
            color: "#0F6E56",
            border: "1px solid #1D9E75",
            fontFamily: "DM Sans, sans-serif",
            fontWeight: 500,
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          Revoir le lien
        </button>
        <button
          type="button"
          onClick={onReplace}
          style={{
            flex: 1,
            padding: "10px 12px",
            borderRadius: 10,
            background: "#FFFFFF",
            color: "var(--ls-text-muted)",
            border: "1px solid var(--ls-border)",
            fontFamily: "DM Sans, sans-serif",
            fontWeight: 500,
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          Remplacer
        </button>
      </div>
    </div>
  );
}

// ─── État 3 : Client connecté — carte neutre ──────────────────────────────
function ConsumedStateCard({ row }: { row: LatestTokenRow }) {
  return (
    <div
      style={{
        background: "rgba(255,255,255,0.04)",
        border: "1px solid var(--ls-border)",
        borderRadius: 16,
        padding: 16,
        display: "flex",
        alignItems: "center",
        gap: 12,
      }}
    >
      <div
        aria-hidden="true"
        style={{
          width: 24,
          height: 24,
          borderRadius: "50%",
          background: "rgba(15,110,86,0.2)",
          color: "#2DD4BF",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 12,
          fontWeight: 700,
          flexShrink: 0,
        }}
      >
        ✓
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <p
          style={{
            margin: 0,
            fontSize: 13,
            fontWeight: 500,
            color: "var(--ls-text)",
            fontFamily: "DM Sans, sans-serif",
          }}
        >
          Client connecté à l'app
        </p>
        <p
          style={{
            margin: 0,
            fontSize: 11,
            color: "var(--ls-text-muted)",
            fontFamily: "DM Sans, sans-serif",
          }}
        >
          A créé son accès {formatRelativeDays(row.consumed_at ?? row.created_at)}
        </p>
      </div>
    </div>
  );
}

// ─── Loader discret ───────────────────────────────────────────────────────
function LoadingCard() {
  return (
    <div
      style={{
        background: "rgba(255,255,255,0.03)",
        border: "1px solid var(--ls-border)",
        borderRadius: 16,
        padding: 18,
        fontSize: 13,
        color: "var(--ls-text-muted)",
        fontFamily: "DM Sans, sans-serif",
      }}
    >
      Chargement…
    </div>
  );
}

// ─── Modale de partage (réutilisée par 3 flows : generate/review/replace) ─
function ShareModal({
  firstName,
  lastName,
  loading,
  error,
  url,
  copied,
  showReplaceConfirm,
  onReplaceConfirm,
  onReplaceCancel,
  onCopy,
  onShareWhatsApp,
  onShareSms,
  onClose,
}: {
  firstName: string;
  lastName: string;
  loading: boolean;
  error: string | null;
  url: string;
  copied: boolean;
  showReplaceConfirm: boolean;
  onReplaceConfirm: () => void;
  onReplaceCancel: () => void;
  onCopy: () => void;
  onShareWhatsApp: () => void;
  onShareSms: () => void;
  onClose: () => void;
}) {
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
          {showReplaceConfirm ? "Remplacer le lien ?" : "Lien d'accès 🎉"}
        </p>
        <p style={{ fontSize: 13, color: "var(--ls-text-muted)", marginBottom: 16 }}>
          Pour {firstName} {lastName}
        </p>

        {loading ? (
          <p style={{ fontSize: 14, color: "var(--ls-text-muted)" }}>
            Génération en cours…
          </p>
        ) : showReplaceConfirm ? (
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
              L'ancien lien sera invalidé. Utile si ton client ne l'a pas reçu
              ou l'a perdu.
            </div>
            <button
              type="button"
              onClick={onReplaceConfirm}
              style={{
                padding: "12px 18px",
                borderRadius: 12,
                background: "var(--ls-gold)",
                color: "#0B0D11",
                border: "none",
                fontFamily: "Syne, sans-serif",
                fontWeight: 700,
                fontSize: 14,
                cursor: "pointer",
              }}
            >
              Confirmer le remplacement
            </button>
            <button
              type="button"
              onClick={onReplaceCancel}
              style={{
                padding: "10px 14px",
                borderRadius: 10,
                background: "transparent",
                color: "var(--ls-text-muted)",
                border: "1px solid var(--ls-border)",
                fontFamily: "DM Sans, sans-serif",
                fontWeight: 500,
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              Annuler
            </button>
          </div>
        ) : url ? (
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
              {url}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
              <ShareBtn
                onClick={onCopy}
                color="#C9A84C"
                bg="rgba(201,168,76,0.12)"
                label={copied ? "✓ Copié" : "Copier"}
              />
              <ShareBtn
                onClick={onShareWhatsApp}
                color="#25D366"
                bg="rgba(37,211,102,0.12)"
                label="WhatsApp"
              />
              <ShareBtn
                onClick={onShareSms}
                color="#2DD4BF"
                bg="rgba(45,212,191,0.12)"
                label="SMS"
              />
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
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: "10px 14px",
              borderRadius: 10,
              background: "transparent",
              color: "var(--ls-text-muted)",
              border: "1px solid var(--ls-border)",
              fontFamily: "DM Sans, sans-serif",
              fontWeight: 500,
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}

function ShareBtn({
  onClick,
  color,
  bg,
  label,
}: {
  onClick: () => void;
  color: string;
  bg: string;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: "12px 8px",
        borderRadius: 10,
        background: bg,
        color,
        border: "none",
        fontFamily: "DM Sans, sans-serif",
        fontWeight: 600,
        fontSize: 13,
        cursor: "pointer",
      }}
    >
      {label}
    </button>
  );
}
