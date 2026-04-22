// Chantier Polish V3 (2026-04-24).
// Bandeau Prochain RDV affiché à droite des onglets de la fiche client.
// Pastille verte/rouge + date ou "non planifié" + bouton action.

interface Props {
  /** Date du prochain RDV actif — null si aucun RDV planifié */
  nextAppointmentDate: string | null;
  /** Clic sur "+ Planifier" (quand pas de RDV) */
  onPlan: () => void;
  /** Clic sur "Voir détails" (quand RDV planifié) */
  onViewDetails: () => void;
}

function formatRdvShort(iso: string): string {
  try {
    const d = new Date(iso);
    const day = d.toLocaleDateString("fr-FR", { weekday: "short", day: "2-digit", month: "short" });
    const hour = d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
    // "lun. 28 avril 15h00"
    return `${day} ${hour.replace(":", "h")}`;
  } catch {
    return iso;
  }
}

export function NextAppointmentBanner({
  nextAppointmentDate,
  onPlan,
  onViewDetails,
}: Props) {
  const hasAppointment = !!nextAppointmentDate;

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 10,
        padding: "8px 12px",
        borderRadius: 10,
        background: "var(--ls-surface)",
        border: "1px solid var(--ls-border)",
        fontFamily: "DM Sans, sans-serif",
        maxWidth: "100%",
      }}
    >
      {/* Pastille d'état */}
      <span
        aria-hidden="true"
        style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: hasAppointment ? "#1D9E75" : "#E24B4A",
          flexShrink: 0,
          boxShadow: hasAppointment
            ? "0 0 0 3px rgba(29,158,117,0.15)"
            : "0 0 0 3px rgba(226,75,74,0.15)",
        }}
      />

      <span
        style={{
          fontSize: 12,
          color: "var(--ls-text-muted)",
          fontWeight: 500,
        }}
      >
        Prochain RDV :
      </span>

      <span
        style={{
          fontSize: 12,
          color: "var(--ls-text)",
          fontWeight: 600,
        }}
      >
        {hasAppointment ? formatRdvShort(nextAppointmentDate!) : "non planifié"}
      </span>

      <button
        type="button"
        onClick={hasAppointment ? onViewDetails : onPlan}
        style={{
          padding: "4px 10px",
          borderRadius: 8,
          border: "none",
          background: "transparent",
          color: "#BA7517",
          fontSize: 11,
          fontWeight: 600,
          fontFamily: "DM Sans, sans-serif",
          cursor: "pointer",
          whiteSpace: "nowrap",
        }}
      >
        {hasAppointment ? "Voir détails" : "+ Planifier"}
      </button>
    </div>
  );
}
