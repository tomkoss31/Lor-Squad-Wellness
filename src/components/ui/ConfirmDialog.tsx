// ConfirmDialog — modale de confirmation reutilisable (2026-04-30).
//
// Remplace window.confirm() qui bloque le thread principal et qui est
// non-personnalisable. Theme aware, animation fade, ESC pour annuler,
// click backdrop pour annuler.
//
// Usage :
//   const [confirm, setConfirm] = useState<{ open: boolean; onConfirm?: () => void }>({ open: false });
//   ...
//   <ConfirmDialog
//     open={confirm.open}
//     title="Supprimer ce RDV ?"
//     message="Cette action est irréversible."
//     confirmLabel="Supprimer"
//     tone="danger"
//     onConfirm={() => { confirm.onConfirm?.(); setConfirm({ open: false }); }}
//     onCancel={() => setConfirm({ open: false })}
//   />

import { useEffect } from "react";

interface Props {
  open: boolean;
  title: string;
  message: string | React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "danger" | "warning" | "neutral";
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirmer",
  cancelLabel = "Annuler",
  tone = "neutral",
  onConfirm,
  onCancel,
}: Props) {
  // ESC pour annuler
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onCancel]);

  if (!open) return null;

  const toneAccent =
    tone === "danger" ? "var(--ls-coral)" :
    tone === "warning" ? "var(--ls-gold)" :
    "var(--ls-teal)";
  const toneEmoji = tone === "danger" ? "⚠️" : tone === "warning" ? "💡" : "✨";

  return (
    // Backdrop : a11y compatible — onClick pour souris + ESC global handler
    // pour clavier (cf useEffect plus haut). role="presentation" silencie
    // les warnings a11y sur cet element (non-interactif semantiquement).
    <div
      role="presentation"
      aria-hidden="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10000,
        background: "rgba(0,0,0,0.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        animation: "ls-confirm-fade 0.18s ease-out",
        backdropFilter: "blur(4px)",
        WebkitBackdropFilter: "blur(4px)",
      }}
      onClick={onCancel}
    >
      <style>{`
        @keyframes ls-confirm-fade {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes ls-confirm-pop {
          from { opacity: 0; transform: scale(0.94) translateY(8px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
        @media (prefers-reduced-motion: reduce) {
          .ls-confirm-card { animation: none !important; }
        }
      `}</style>
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events -- stopPropagation only, dialog role on element */}
      <div
        className="ls-confirm-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--ls-surface)",
          border: "0.5px solid var(--ls-border)",
          borderTop: `3px solid ${toneAccent}`,
          borderRadius: 16,
          padding: "22px 24px",
          maxWidth: 420,
          width: "100%",
          fontFamily: "DM Sans, sans-serif",
          color: "var(--ls-text)",
          boxShadow: "0 24px 48px -16px rgba(0,0,0,0.45)",
          animation: "ls-confirm-pop 0.22s cubic-bezier(0.16,1,0.3,1)",
        }}
      >
        <div
          style={{
            fontSize: 32,
            marginBottom: 10,
            lineHeight: 1,
          }}
          aria-hidden="true"
        >
          {toneEmoji}
        </div>
        <h3
          id="confirm-dialog-title"
          style={{
            fontFamily: "Syne, serif",
            fontSize: 19,
            fontWeight: 800,
            letterSpacing: "-0.01em",
            margin: "0 0 8px",
            color: "var(--ls-text)",
          }}
        >
          {title}
        </h3>
        <div
          style={{
            fontSize: 13.5,
            color: "var(--ls-text-muted)",
            lineHeight: 1.55,
            margin: "0 0 22px",
          }}
        >
          {message}
        </div>
        <div
          style={{
            display: "flex",
            gap: 10,
            justifyContent: "flex-end",
            flexWrap: "wrap",
          }}
        >
          <button
            type="button"
            onClick={onCancel}
            style={{
              padding: "9px 18px",
              borderRadius: 999,
              border: "0.5px solid var(--ls-border)",
              background: "transparent",
              color: "var(--ls-text-muted)",
              fontSize: 13,
              fontWeight: 500,
              cursor: "pointer",
              fontFamily: "DM Sans, sans-serif",
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "var(--ls-text)";
              e.currentTarget.style.background = "var(--ls-surface2)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "var(--ls-text-muted)";
              e.currentTarget.style.background = "transparent";
            }}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            autoFocus
            style={{
              padding: "9px 22px",
              borderRadius: 999,
              border: "none",
              background: tone === "danger"
                ? "linear-gradient(135deg, #DC2626 0%, #991B1B 100%)"
                : tone === "warning"
                ? "linear-gradient(135deg, #EF9F27 0%, #BA7517 100%)"
                : "linear-gradient(135deg, #2DD4BF 0%, #0D9488 100%)",
              color: "white",
              fontFamily: "Syne, sans-serif",
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: "0.01em",
              cursor: "pointer",
              boxShadow: tone === "danger"
                ? "0 6px 16px -4px rgba(220,38,38,0.45), inset 0 1px 0 rgba(255,255,255,0.20)"
                : tone === "warning"
                ? "0 6px 16px -4px rgba(186,117,23,0.45), inset 0 1px 0 rgba(255,255,255,0.20)"
                : "0 6px 16px -4px rgba(13,148,136,0.45), inset 0 1px 0 rgba(255,255,255,0.20)",
              transition: "transform 0.15s, filter 0.15s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-1px)";
              e.currentTarget.style.filter = "brightness(1.06)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "none";
              e.currentTarget.style.filter = "none";
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
