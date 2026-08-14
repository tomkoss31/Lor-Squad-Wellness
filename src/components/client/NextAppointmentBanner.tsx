// Chantier Polish V3 (2026-04-24).
// Bandeau Prochain RDV affiché à droite des onglets de la fiche client.
// Pastille verte/rouge + date ou "non planifié" + bouton action.
//
// 2026-08-14 — ajout de l'alerte « pas d'e-mail ». Un client sans e-mail ne
// reçoit AUCUN rappel de rendez-vous, et rien ne le disait nulle part : le
// coach croyait son client prévenu, le client ne voyait jamais rien passer, et
// l'échec restait silencieux des deux côtés. C'est exactement le défaut qui a
// laissé vivre l'incident des rappels (cf. client-rdv-reminder) : un garde-fou
// qui écarte quelqu'un doit le DIRE.
//
// Les couleurs passent par les tokens : ce fichier en avait quatre en dur
// (#1D9E75, #E24B4A, #0F766E), donc invisibles au changement de thème.

interface Props {
  /** Date du prochain RDV actif — null si aucun RDV planifié */
  nextAppointmentDate: string | null;
  /** E-mail du client. Vide ou null ⇒ aucun rappel ne peut partir. */
  clientEmail?: string | null;
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
  clientEmail,
  onPlan,
  onViewDetails,
}: Props) {
  const hasAppointment = !!nextAppointmentDate;
  // On n'alerte que s'il y a un RDV : sans rendez-vous, l'absence d'e-mail
  // n'empêche rien et le signal ne ferait que du bruit.
  const sansEmail = hasAppointment && !clientEmail?.trim();

  return (
    <div style={{ display: "inline-flex", flexWrap: "wrap", alignItems: "center", gap: 8, maxWidth: "100%" }}>
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
            flexShrink: 0,
            background: hasAppointment ? "var(--ls-teal)" : "var(--ls-coral)",
            boxShadow: `0 0 0 3px color-mix(in srgb, ${
              hasAppointment ? "var(--ls-teal)" : "var(--ls-coral)"
            } 18%, transparent)`,
          }}
        />

        <span style={{ fontSize: 12, color: "var(--ls-text-muted)", fontWeight: 500 }}>
          Prochain RDV :
        </span>

        <span style={{ fontSize: 12, color: "var(--ls-text)", fontWeight: 600 }}>
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
            color: "var(--ls-teal)",
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

      {sansEmail ? (
        <button
          type="button"
          onClick={onViewDetails}
          title="Les rappels de rendez-vous partent par e-mail. Sans adresse, ce client ne recevra ni le rappel de la veille, ni la confirmation."
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 7,
            minHeight: 36,
            padding: "6px 11px",
            borderRadius: 10,
            cursor: "pointer",
            textAlign: "left",
            fontFamily: "DM Sans, sans-serif",
            fontSize: 11.5,
            fontWeight: 600,
            color: "var(--ls-coral)",
            background: "transparent",
            border: "1px solid color-mix(in srgb, var(--ls-coral) 40%, transparent)",
          }}
        >
          <span aria-hidden="true">✉️</span>
          <span>Pas d'e-mail — aucun rappel ne partira</span>
          <span aria-hidden="true" style={{ opacity: 0.7 }}>›</span>
        </button>
      ) : null}
    </div>
  );
}
