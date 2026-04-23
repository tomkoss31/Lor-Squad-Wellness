// Chantier Fix 5 bugs (2026-04-24).
// Toggle "Vue globale" réutilisable (admin only) pour Co-pilote,
// Messagerie, Dossiers clients, Suivi PV.

import { useGlobalView } from "../../hooks/useGlobalView";
import { useAppContext } from "../../context/AppContext";

interface Props {
  /** Label personnalisé selon la page (ex: "mes messages" / "mes clients") */
  personalLabel?: string;
  globalLabel?: string;
}

export function GlobalViewToggle({
  personalLabel = "Vue personnelle",
  globalLabel = "Vue équipe (toute l'équipe)",
}: Props) {
  const { currentUser } = useAppContext();
  const [globalView, setGlobalView] = useGlobalView();

  if (!currentUser || currentUser.role !== "admin") return null;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "8px 14px",
        borderRadius: 12,
        background: "var(--ls-surface)",
        border: "1px solid var(--ls-border)",
        fontFamily: "DM Sans, sans-serif",
        justifyContent: "flex-end",
      }}
    >
      <span style={{ fontSize: 11, color: "var(--ls-text-muted)" }}>
        {globalView ? globalLabel : personalLabel}
      </span>
      <button
        type="button"
        onClick={() => setGlobalView(!globalView)}
        aria-pressed={globalView}
        aria-label={globalView ? "Désactiver vue globale" : "Activer vue globale"}
        style={{
          width: 38,
          height: 22,
          borderRadius: 999,
          background: globalView ? "#BA7517" : "var(--ls-border)",
          position: "relative",
          transition: "background 0.2s",
          flexShrink: 0,
          border: "none",
          cursor: "pointer",
          padding: 0,
        }}
      >
        <span
          aria-hidden="true"
          style={{
            position: "absolute",
            top: 2,
            left: globalView ? 18 : 2,
            width: 18,
            height: 18,
            borderRadius: "50%",
            background: "#FFFFFF",
            transition: "left 0.2s",
            boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
            display: "block",
          }}
        />
      </button>
    </div>
  );
}
