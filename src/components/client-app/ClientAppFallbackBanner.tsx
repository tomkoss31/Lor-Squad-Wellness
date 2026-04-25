// Chantier observabilité (2026-04-25).
// Bandeau orange visible UNIQUEMENT quand l'edge function client-app-data
// a échoué et que l'app affiche le snapshot figé. Permet au client de
// comprendre que ses données ne sont pas fraîches et au coach de
// diagnostiquer (vu côté UI = bug remonté).

interface Props {
  onContact?: () => void;
}

export function ClientAppFallbackBanner({ onContact }: Props) {
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        background: "#FAEEDA",
        borderLeft: "4px solid #BA7517",
        padding: "12px 16px",
        margin: "8px 14px",
        borderRadius: 8,
        display: "flex",
        alignItems: "center",
        gap: 12,
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      <span style={{ fontSize: 20 }} aria-hidden="true">
        ⚠️
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#854F0B" }}>
          Données partielles affichées
        </div>
        <div
          style={{
            fontSize: 11,
            color: "#854F0B",
            opacity: 0.85,
            marginTop: 2,
            lineHeight: 1.4,
          }}
        >
          Tes dernières infos sont en cours de mise à jour. Contacte ton
          coach si le souci persiste.
        </div>
      </div>
      {onContact ? (
        <button
          type="button"
          onClick={onContact}
          style={{
            background: "#BA7517",
            color: "#fff",
            border: "none",
            padding: "6px 12px",
            borderRadius: 8,
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
            flexShrink: 0,
            fontFamily: "inherit",
          }}
        >
          Contacter
        </button>
      ) : null}
    </div>
  );
}
