import { useToast, type Toast } from "../../context/ToastContext";

/**
 * Composant d'affichage des toasts. À monter une seule fois, au plus haut
 * niveau de l'app (après <ToastProvider />).
 */
export function ToastHost() {
  const { toasts, dismiss } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      style={{
        position: "fixed",
        bottom: "90px", // au-dessus de la bottom nav mobile
        right: "16px",
        left: "16px",
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        pointerEvents: "none",
      }}
    >
      {toasts.map((t) => (
        <ToastCard key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
      ))}
    </div>
  );
}

function ToastCard({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const toneBorder: Record<Toast["tone"], string> = {
    error: "var(--ls-coral)",
    warning: "var(--ls-gold)",
    success: "var(--ls-teal)",
    info: "var(--ls-text-muted)",
  };

  return (
    <div
      role="alert"
      style={{
        pointerEvents: "auto",
        background: "var(--ls-surface)",
        border: "1px solid var(--ls-border)",
        borderLeft: `4px solid ${toneBorder[toast.tone]}`,
        borderRadius: "12px",
        padding: "12px 16px",
        display: "flex",
        alignItems: "flex-start",
        gap: "12px",
        maxWidth: "420px",
        marginLeft: "auto",
        boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: "13px",
            fontWeight: 500,
            color: "var(--ls-text)",
            lineHeight: 1.3,
          }}
        >
          {toast.title}
        </div>
        {toast.message && (
          <div
            style={{
              fontSize: "12px",
              color: "var(--ls-text-muted)",
              marginTop: "4px",
              lineHeight: 1.4,
              wordBreak: "break-word",
            }}
          >
            {toast.message}
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Fermer la notification"
        style={{
          background: "transparent",
          border: "none",
          color: "var(--ls-text-muted)",
          cursor: "pointer",
          padding: "0 4px",
          fontSize: "18px",
          lineHeight: 1,
        }}
      >
        ×
      </button>
    </div>
  );
}
