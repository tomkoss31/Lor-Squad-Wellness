// =============================================================================
// _shared/icsInvite.ts — l'invitation calendrier, écrite une seule fois.
//
// Elle vivait à l'intérieur de `book-club-discovery`. En la sortant ici, le
// tunnel /rdv en profite sans qu'on la recopie — deux copies d'un format aussi
// pointilleux qu'iCalendar finissent toujours par diverger.
// (Convergence des deux tunnels, brique 3 — 2026-08-11.)
//
// METHOD:REQUEST + ORGANIZER + ATTENDEE = une VRAIE invitation : Gmail la
// reconnaît comme telle et la pose sur l'agenda, au lieu d'un fichier joint
// qu'il faudrait ouvrir à la main.
//
// Repliement des lignes à 75 octets non géré : les nôtres restent courtes.
// =============================================================================

export interface IcsOptions {
  /** Identifiant stable de l'événement — l'id de la réservation fait l'affaire. */
  uid: string;
  start: Date;
  end: Date;
  summary: string;
  description: string;
  location: string;
  /** L'adresse invitée (celle qui reçoit le mail). */
  attendee: string;
  /** Nom affiché de l'organisateur. Défaut : La Base 360. */
  organizerName?: string;
  organizerEmail?: string;
  /** Nom affiché de l'invité. */
  attendeeName?: string;
}

function horodate(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

/** Dans un .ics, ces caractères sont structurants : il faut les échapper. */
function echappe(s: string): string {
  return String(s)
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

export function buildIcs(opts: IcsOptions): string {
  const orgNom = opts.organizerName ?? "La Base 360";
  const orgMail = opts.organizerEmail ?? "rdv@labase360.fr";
  const invNom = opts.attendeeName ?? "Invité";
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//La Base 360//RDV//FR",
    "CALSCALE:GREGORIAN",
    "METHOD:REQUEST",
    "BEGIN:VEVENT",
    `UID:${opts.uid}`,
    `DTSTAMP:${horodate(new Date())}`,
    `DTSTART:${horodate(opts.start)}`,
    `DTEND:${horodate(opts.end)}`,
    `SUMMARY:${echappe(opts.summary)}`,
    `DESCRIPTION:${echappe(opts.description)}`,
    `LOCATION:${echappe(opts.location)}`,
    `ORGANIZER;CN=${echappe(orgNom)}:mailto:${orgMail}`,
    `ATTENDEE;CN=${echappe(invNom)};RSVP=FALSE;PARTSTAT=ACCEPTED:mailto:${opts.attendee}`,
    "STATUS:CONFIRMED",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

/**
 * Le .ics encodé pour Resend (base64).
 *
 * `unescape(encodeURIComponent(...))` : le passage obligé pour que `btoa`
 * accepte les accents. Sans lui, « Mélanie » fait planter l'encodage.
 */
export function icsEnPieceJointe(ics: string, nomFichier = "rendez-vous.ics") {
  return {
    filename: nomFichier,
    content: btoa(unescape(encodeURIComponent(ics))),
  };
}
